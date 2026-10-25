import { prisma } from "../lib/prisma";
import autocannon from "autocannon";
import { spawn } from "child_process";
import { resolve } from "path";
import fs from "fs";
import type { ChildProcess } from "child_process";

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

async function run() {
  console.log("=== Phase 10 Load-Test Orchestrator ===");

  // 1. Seed a test business and queue
  const testBusiness = await prisma.business.create({
    data: {
      name: "LOAD_TEST_Business",
      slug: `load-test-biz-${Date.now()}`,
      email: `loadtest-${Date.now()}@queueless.com`,
    },
  });

  const testQueue = await prisma.queue.create({
    data: {
      businessId: testBusiness.id,
      name: "Load Test Queue",
      slug: "load-test-queue",
      workingHoursStart: "00:00",
      workingHoursEnd: "23:59",
      maxCapacity: 100000, // allow all joins
    },
  });

  console.log(`Seeded temporary business: ${testBusiness.id}`);
  console.log(`Seeded temporary queue: ${testQueue.id}`);

  // 2. Start the production Next.js server in the background
  console.log("Starting Next.js production server on port 3005...");
  const serverProcess = spawn(process.execPath, [resolve(__dirname, "../node_modules/next/dist/bin/next"), "start", "-p", "3005"], {
    cwd: resolve(__dirname, ".."),
    stdio: "pipe",
    env: { ...process.env, PORT: "3005", SMS_ENABLED: "false" },
  });

  // Wait for the server to spin up and bind to port 3005
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

  console.log("Next.js server is online on port 3005!");

  // 3. Configure autocannon with dynamic payload bodies (concurrency = 20)
  const url = `http://localhost:3005/api/queues/${testQueue.id}/join`;
  console.log(`Targeting join API: ${url}`);
  console.log("Executing autocannon load-test (Concurrency: 20, Requests: 500)...");

  try {
    let requestNumber = 0;
    const result = await new Promise<autocannon.Result>((resolveTest, rejectTest) => {
      const instance = autocannon(
        {
          url,
          connections: 20,
          amount: 500,
          requests: [
            {
              method: "POST",
              path: `/api/queues/${testQueue.id}/join`,
              headers: {
                "content-type": "application/json",
              },
              setupRequest: (req: autocannon.Request) => {
                // Avoid random collisions being counted as join failures.
                const phone = `+1555${String(++requestNumber).padStart(7, "0")}`;
                req.body = JSON.stringify({
                  customerName: `LoadTestUser_${requestNumber}`,
                  customerPhone: phone,
                  customerEmail: `loadtest_${requestNumber}@queueless.com`,
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

    // 4. Output the results
    console.log("\n=== Load Test Summary ===");
    console.log(`Total Requests: ${result.requests.sent}`);
    console.log(`Requests/sec: ${result.requests.average}`);
    console.log(`Errors/Non-2xx: ${result.non2xx}`);
    console.log(`Average Latency: ${result.latency.average} ms`);
    console.log(`p50 Latency: ${result.latency.p50} ms`);
    console.log(`p99 Latency: ${result.latency.p99} ms`);
    console.log("==========================\n");

    // Write results to artifacts
    const testResultFile = resolve(__dirname, "../docs/completed/load_test_results.json");
    fs.writeFileSync(testResultFile, JSON.stringify(result, null, 2));
    console.log(`Recorded results to ${testResultFile}`);
  } catch (err) {
    console.error("Load test failed to execute:", err);
  } finally {
    try {
      await waitForJoinNotifications(testQueue.id);
    } catch (notificationError) {
      console.error("Notification work did not drain before cleanup:", notificationError);
    }

    // 5. Cleanup Next.js server
    console.log("Shutting down Next.js server...");
    await stopServerProcess(serverProcess);
    console.log("Next.js server terminated.");

    // 6. Cleanup seeded records in correct dependency order with retries for late-committing transactions
    console.log("Cleaning up seeded database records...");
    
    let retries = 5;
    while (retries > 0) {
      const entries = await prisma.queueEntry.findMany({
        where: { queueId: testQueue.id },
        select: { id: true },
      });
      
      if (entries.length === 0) {
        break;
      }

      console.log(`Cleanup retry: removing ${entries.length} remaining entries...`);
      const entryIds = entries.map((e) => e.id);
      
      await prisma.notification.deleteMany({
        where: { queueEntryId: { in: entryIds } },
      });

      await prisma.queueEntry.deleteMany({
        where: { queueId: testQueue.id },
      });

      retries--;
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    await prisma.auditLog.deleteMany({
      where: { businessId: testBusiness.id },
    });

    await prisma.queue.deleteMany({
      where: { id: testQueue.id },
    });

    await prisma.business.deleteMany({
      where: { id: testBusiness.id },
    });
    console.log("Cleanup complete!");
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error("Fatal load orchestrator error:", err);
  process.exit(1);
});
