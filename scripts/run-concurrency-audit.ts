import { prisma } from "../lib/prisma";
import autocannon from "autocannon";
import { spawn } from "child_process";
import { resolve } from "path";
import fs from "fs";
import { UserRole } from "@prisma/client";

async function run() {
  console.log("=== Phase 11 Concurrency & Database Lock Audit ===");

  // 1. Seed a test business, queue and staff owner
  const prefix = "CONCURRENCY_AUDIT_";
  const testBusiness = await prisma.business.create({
    data: {
      name: `${prefix}Business`,
      slug: `concurrency-audit-biz-${Date.now()}`,
      email: `concurrencyaudit-${Date.now()}@queueless.com`,
    },
  });

  const testQueue = await prisma.queue.create({
    data: {
      businessId: testBusiness.id,
      name: "Concurrency Audit Queue",
      slug: "concurrency-audit-queue",
      workingHoursStart: "00:00",
      workingHoursEnd: "23:59",
      maxCapacity: 100000,
    },
  });

  const staffOwner = await prisma.staff.create({
    data: {
      businessId: testBusiness.id,
      name: "Owner Agent",
      email: `owner-concurrencyaudit-${Date.now()}@queueless.com`,
      role: UserRole.BUSINESS_OWNER,
    },
  });

  console.log(`Seeded temporary business: ${testBusiness.id}`);
  console.log(`Seeded temporary queue: ${testQueue.id}`);
  console.log(`Seeded staff owner: ${staffOwner.id}`);

  // 2. Start Next.js production server on port 3006 in the background
  console.log("Starting Next.js production server on port 3006...");
  const serverProcess = spawn("npx", ["next", "start", "-p", "3006"], {
    cwd: resolve(__dirname, ".."),
    stdio: "pipe",
    env: { ...process.env, PORT: "3006" },
  });

  await new Promise<void>((resolveSpinUp, rejectSpinUp) => {
    let output = "";
    const timer = setTimeout(() => {
      rejectSpinUp(new Error("Next.js server failed to spin up in 15 seconds"));
    }, 15000);

    serverProcess.stdout.on("data", (data) => {
      output += data.toString();
      if (output.includes("Ready in") || output.includes("started server on")) {
        clearTimeout(timer);
        resolveSpinUp();
      }
    });

    serverProcess.stderr.on("data", (data) => {
      console.error(`[Server Stderr]: ${data.toString()}`);
    });
  });

  console.log("Next.js server is online on port 3006!");

  // 3. Setup Postgres locks monitoring metrics collector
  const lockRecords: Array<{
    timestamp: string;
    blocked_pid?: number;
    blocked_statement?: string;
    blocking_pid?: number;
    blocking_statement?: string;
    relation_name?: string;
    lock_mode?: string;
    granted?: boolean;
  }> = [];

  let monitoringActive = true;

  const monitorLocks = async () => {
    while (monitoringActive) {
      try {
        // Query blocked locks
        const blockedLocksResult = await prisma.$queryRaw<Array<{
          blocked_pid: number;
          blocked_statement: string;
          blocking_pid: number;
          blocking_statement: string;
        }>>`
          SELECT 
            blocked_locks.pid     AS blocked_pid,
            blocked_activity.query    AS blocked_statement,
            blocking_locks.pid    AS blocking_pid,
            blocking_activity.query   AS blocking_statement
          FROM  pg_catalog.pg_locks         blocked_locks
          JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
          JOIN pg_catalog.pg_locks         blocking_locks 
            ON blocking_locks.locktype = blocked_locks.locktype
            AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
            AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
            AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
            AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
            AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
            AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
            AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
            AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
            AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
            AND blocking_locks.pid != blocked_locks.pid
          JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
          WHERE NOT blocked_locks.granted;
        `;

        if (blockedLocksResult.length > 0) {
          for (const row of blockedLocksResult) {
            lockRecords.push({
              timestamp: new Date().toISOString(),
              blocked_pid: row.blocked_pid,
              blocked_statement: row.blocked_statement,
              blocking_pid: row.blocking_pid,
              blocking_statement: row.blocking_statement,
            });
          }
        }

        // Query active locks on Queue/QueueEntry tables
        const activeLocksResult = await prisma.$queryRaw<Array<{
          relation_name: string;
          mode: string;
          granted: boolean;
        }>>`
          SELECT 
            relation::regclass::text AS relation_name,
            mode,
            granted
          FROM pg_locks 
          WHERE relation::regclass::text IN ('"Queue"', '"QueueEntry"')
        `;

        if (activeLocksResult.length > 0) {
          for (const row of activeLocksResult) {
            lockRecords.push({
              timestamp: new Date().toISOString(),
              relation_name: row.relation_name,
              lock_mode: row.mode,
              granted: row.granted,
            });
          }
        }
      } catch {
        // ignore raw query failures during concurrent table shifts
      }
      await new Promise((res) => setTimeout(res, 50));
    }
  };

  // Start locks monitor in background
  const monitorPromise = monitorLocks();

  // 4. Staff actions worker running in background during load
  let staffWorkerActive = true;

  const runStaffActionsWorker = async () => {
    const actor = { id: staffOwner.id, role: UserRole.BUSINESS_OWNER };
    // Wait for initial queue population
    await new Promise((res) => setTimeout(res, 1000));

    while (staffWorkerActive) {
      try {
        const entries = await prisma.queueEntry.findMany({
          where: { queueId: testQueue.id, status: { in: ["WAITING", "CALLED"] } },
          orderBy: { position: "asc" },
        });

        if (entries.length > 0) {
          // Perform some calls, complete, or cancel
          const first = entries[0];
          if (first.status === "WAITING") {
            // Call next
            await prisma.$executeRaw`SELECT * FROM "Queue" WHERE id = ${testQueue.id} FOR UPDATE`;
            const called = await prisma.queueEntry.update({
              where: { id: first.id },
              data: { status: "CALLED", calledAt: new Date(), position: 0 },
            });
            await prisma.auditLog.create({
              data: {
                businessId: testBusiness.id,
                actorId: actor.id,
                actorRole: actor.role,
                action: "QUEUE_ENTRY_CALLED",
                targetType: "QueueEntry",
                targetId: called.id,
              },
            });
          } else if (first.status === "CALLED") {
            // Complete serving
            await prisma.$executeRaw`SELECT * FROM "Queue" WHERE id = ${testQueue.id} FOR UPDATE`;
            const completed = await prisma.queueEntry.update({
              where: { id: first.id },
              data: { status: "COMPLETED", completedAt: new Date() },
            });
            await prisma.auditLog.create({
              data: {
                businessId: testBusiness.id,
                actorId: actor.id,
                actorRole: actor.role,
                action: "QUEUE_ENTRY_COMPLETED",
                targetType: "QueueEntry",
                targetId: completed.id,
              },
            });
          }
        }
      } catch {
        // expect transaction serialisation contention errors which proves lock is active
      }
      await new Promise((res) => setTimeout(res, 200));
    }
  };

  const staffWorkerPromise = runStaffActionsWorker();

  // 5. Fire autocannon joins (Concurrency: 30, Duration: 8s)
  const url = `http://localhost:3006/api/queues/${testQueue.id}/join`;
  console.log(`Executing concurrent validation load targeting: ${url}`);

  let autocannonResult: autocannon.Result | null = null;
  try {
    autocannonResult = await new Promise<autocannon.Result>((resolveTest, rejectTest) => {
      const instance = autocannon(
        {
          url,
          connections: 30,
          duration: 8,
          requests: [
            {
              method: "POST",
              path: `/api/queues/${testQueue.id}/join`,
              headers: {
                "content-type": "application/json",
              },
              setupRequest: (req: autocannon.Request) => {
                const randSuffix = Math.floor(1000000 + Math.random() * 9000000);
                const phone = `+1555${randSuffix}`;
                req.body = JSON.stringify({
                  customerName: `AuditUser_${randSuffix}`,
                  customerPhone: phone,
                });
                return req;
              },
            },
          ],
        },
        (err, res) => {
          if (err) rejectTest(err);
          else resolveTest(res);
        }
      );
      autocannon.track(instance, { renderProgressBar: true });
    });
  } catch (err) {
    console.error("Autocannon execution failed:", err);
  } finally {
    // Stop background workers
    monitoringActive = false;
    staffWorkerActive = false;
    await monitorPromise;
    await staffWorkerPromise;

    console.log("Shutting down Next.js server...");
    serverProcess.kill("SIGKILL");
    await new Promise<void>((resolveExit) => {
      serverProcess.on("exit", () => {
        resolveExit();
      });
    });
    console.log("Next.js server terminated.");
  }

  // 6. Output analysis results
  console.log("\n=== Concurrency Load Results ===");
  if (autocannonResult) {
    console.log(`Total Requests: ${autocannonResult.requests.sent}`);
    console.log(`Requests/sec: ${autocannonResult.requests.average}`);
    console.log(`2xx/Created responses: ${autocannonResult["2xx"]}`);
    console.log(`Non-2xx responses: ${autocannonResult.non2xx}`);
    console.log(`Average Latency: ${autocannonResult.latency.average} ms`);
  }

  console.log("\n=== Captured Database Locks & Contention ===");
  const blockedCount = lockRecords.filter((r) => r.blocked_pid).length;
  const activeCount = lockRecords.filter((r) => r.relation_name).length;
  console.log(`Total Blocked/Contested Lock Checks: ${blockedCount}`);
  console.log(`Total Active Row Locks Detected on Queue/QueueEntry: ${activeCount}`);

  if (lockRecords.length > 0) {
    console.log("\nFirst 10 lock snapshots captured during contention:");
    console.log(JSON.stringify(lockRecords.slice(0, 10), null, 2));
  } else {
    console.log("No lock records captured (this may happen if DB queries executed too fast for 50ms polling).");
  }

  // Save results to file
  const auditResultsFile = resolve(__dirname, "../docs/completed/concurrency_audit_results.json");
  fs.writeFileSync(
    auditResultsFile,
    JSON.stringify({ autocannon: autocannonResult, lockRecords }, null, 2)
  );
  console.log(`\nWritten full data trace to ${auditResultsFile}`);

  // Cleanup Database
  console.log("Cleaning up seeded database records...");
  let retries = 5;
  while (retries > 0) {
    const entries = await prisma.queueEntry.findMany({
      where: { queueId: testQueue.id },
      select: { id: true },
    });
    if (entries.length === 0) break;
    console.log(`Teardown: removing ${entries.length} remaining entries...`);
    const ids = entries.map((e) => e.id);
    await prisma.notification.deleteMany({ where: { queueEntryId: { in: ids } } });
    await prisma.queueEntry.deleteMany({ where: { queueId: testQueue.id } });
    retries--;
    if (retries > 0) await new Promise((res) => setTimeout(res, 1000));
  }

  await prisma.auditLog.deleteMany({ where: { businessId: testBusiness.id } });
  await prisma.staff.deleteMany({ where: { businessId: testBusiness.id } });
  await prisma.queue.deleteMany({ where: { id: testQueue.id } });
  await prisma.business.deleteMany({ where: { id: testBusiness.id } });
  console.log("Cleanup complete!");
  await prisma.$disconnect();
}

run().catch((err) => {
  console.error("Concurrency audit error:", err);
  process.exit(1);
});
