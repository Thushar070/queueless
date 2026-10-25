import { prisma } from "../lib/prisma";
import { QueueService } from "../lib/services/queue-service";
import autocannon from "autocannon";
import { ChildProcess, spawn } from "child_process";
import { resolve } from "path";
import fs from "fs";
import { QueueEntryStatus, UserRole } from "@prisma/client";
import { QueueEntryService } from "../lib/services/queue-entry-service";

const waitForJoinNotifications = async (queueId: string): Promise<void> => {
  const entries = await prisma.queueEntry.findMany({
    where: { queueId },
    select: { id: true },
  });
  if (entries.length === 0) return;

  const entryIds = entries.map((entry) => entry.id);
  for (let attempt = 0; attempt < 100; attempt++) {
    const completed = await prisma.notification.count({
      where: { queueEntryId: { in: entryIds }, type: "JOINED" },
    });
    if (completed >= entries.length) {
      // Let any position-triggered notifications settle before fixture cleanup.
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
      return;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }

  throw new Error("Timed out waiting for asynchronous join notifications to finish");
};

const stopServerProcess = async (serverProcess: ChildProcess): Promise<void> => {
  if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) return;
  await new Promise<void>((resolveExit) => {
    serverProcess.once("exit", () => resolveExit());
    if (!serverProcess.kill("SIGTERM")) resolveExit();
  });
};

const cleanupAuditFixtures = async (businessId: string, queueId: string): Promise<void> => {
  const entries = await prisma.queueEntry.findMany({
    where: { queueId },
    select: { id: true },
  });
  const entryIds = entries.map((entry) => entry.id);
  await prisma.notification.deleteMany({ where: { queueEntryId: { in: entryIds } } });
  await prisma.queueEntry.deleteMany({ where: { queueId } });
  await prisma.auditLog.deleteMany({ where: { businessId } });
  await prisma.staff.deleteMany({ where: { businessId } });
  await prisma.queue.deleteMany({ where: { id: queueId } });
  await prisma.business.deleteMany({ where: { id: businessId } });
};

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
  const serverProcess = spawn(process.execPath, [resolve(__dirname, "../node_modules/next/dist/bin/next"), "start", "-p", "3006"], {
    cwd: resolve(__dirname, ".."),
    stdio: "pipe",
    env: { ...process.env, PORT: "3006", SMS_ENABLED: "false" },
  });

  try {
    await new Promise<void>((resolveSpinUp, rejectSpinUp) => {
    let output = "";
    let ready = false;
    const timer = setTimeout(() => {
      rejectSpinUp(new Error("Next.js server failed to spin up in 15 seconds"));
    }, 15000);

    serverProcess.stdout.on("data", (data) => {
      output += data.toString();
      if (output.includes("Ready in") || output.includes("started server on")) {
        ready = true;
        clearTimeout(timer);
        resolveSpinUp();
      }
    });

    serverProcess.once("error", (error) => {
      clearTimeout(timer);
      rejectSpinUp(error);
    });
    serverProcess.once("exit", (code, signal) => {
      if (!ready) {
        clearTimeout(timer);
        rejectSpinUp(new Error(`Next.js server exited before ready (code=${code}, signal=${signal})`));
      }
    });

    serverProcess.stderr.on("data", (data) => {
      console.error(`[Server Stderr]: ${data.toString()}`);
    });
    });
  } catch (error) {
    await stopServerProcess(serverProcess);
    await cleanupAuditFixtures(testBusiness.id, testQueue.id);
    await prisma.$disconnect();
    throw error;
  }

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
  let staffActionErrors = 0;

  const runStaffActionsWorker = async () => {
    const actor = { id: staffOwner.id, role: UserRole.BUSINESS_OWNER };
    // Wait for initial queue population
    await new Promise((res) => setTimeout(res, 1000));

    while (staffWorkerActive) {
      try {
        // Use the production transaction and lock path instead of issuing a
        // SELECT FOR UPDATE in autocommit mode, where its lock ends immediately.
        await QueueService.withQueueLock(testQueue.id, async (tx) => {
          const waiting = await tx.queueEntry.findFirst({
            where: { queueId: testQueue.id, status: QueueEntryStatus.WAITING },
            orderBy: { position: "asc" },
          });

          if (waiting) {
            await QueueEntryService.transition(
              waiting.id,
              QueueEntryStatus.CALLED,
              actor,
              tx
            );
            await QueueEntryService.transition(
              waiting.id,
              QueueEntryStatus.SERVING,
              actor,
              tx
            );
            await QueueEntryService.transition(
              waiting.id,
              QueueEntryStatus.COMPLETED,
              actor,
              tx
            );
          }
        });
      } catch (error) {
        staffActionErrors++;
        console.error("Concurrent staff action failed:", error);
      }
      await new Promise((res) => setTimeout(res, 200));
    }
  };

  const staffWorkerPromise = runStaffActionsWorker();

  // 5. Fire a fixed number of autocannon joins (30 concurrent connections).
  const url = `http://localhost:3006/api/queues/${testQueue.id}/join`;
  console.log(`Executing 300 concurrent-user validation requests targeting: ${url}`);

  let autocannonResult: autocannon.Result | null = null;
  let requestNumber = 0;
  try {
    autocannonResult = await new Promise<autocannon.Result>((resolveTest, rejectTest) => {
      const instance = autocannon(
        {
          url,
          connections: 30,
          amount: 300,
          requests: [
            {
              method: "POST",
              path: `/api/queues/${testQueue.id}/join`,
              headers: {
                "content-type": "application/json",
              },
              setupRequest: (req: autocannon.Request) => {
                const requestId = ++requestNumber;
                const phone = `+1555${String(requestId).padStart(7, "0")}`;
                req.body = JSON.stringify({
                  customerName: `AuditUser_${requestId}`,
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

    try {
      await waitForJoinNotifications(testQueue.id);
    } catch (notificationError) {
      console.error("Notification work did not drain before cleanup:", notificationError);
    }

    console.log("Shutting down Next.js server...");
    await stopServerProcess(serverProcess);
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

  const loadPassed =
    autocannonResult !== null &&
    autocannonResult.requests.sent === 300 &&
    autocannonResult.requests.total === 300 &&
    autocannonResult["2xx"] === 300 &&
    autocannonResult.non2xx === 0 &&
    autocannonResult.errors === 0 &&
    autocannonResult.timeouts === 0 &&
    staffActionErrors === 0 &&
    lockRecords.some((record) => record.blocked_pid !== undefined);
  console.log(`Load and lock invariants: ${loadPassed ? "PASS" : "FAIL"}`);

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
  const auditResultsFile = process.env.CONCURRENCY_AUDIT_OUTPUT
    ? resolve(process.env.CONCURRENCY_AUDIT_OUTPUT)
    : resolve(__dirname, "../docs/completed/concurrency_audit_results.json");
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

  if (!loadPassed) {
    throw new Error("Concurrency audit failed one or more load, response, staff-action, or lock invariants");
  }
}

run().catch((err) => {
  console.error("Concurrency audit error:", err);
  process.exit(1);
});
