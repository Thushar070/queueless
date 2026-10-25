/** @jest-environment node */

jest.mock("@/lib/services/queue-service", () => ({
  QueueService: { joinQueue: jest.fn() },
}));

import { POST } from "@/app/api/queues/[queueId]/join/route";
import { QueueService } from "@/lib/services/queue-service";

const joinQueue = jest.mocked(QueueService.joinQueue);
let consoleErrorSpy: jest.SpyInstance;

function makeRequest() {
  return new Request("http://localhost/api/queues/queue-id/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerName: "Sam Lee", customerPhone: "+15551234567" }),
  });
}

describe("POST /api/queues/[queueId]/join error responses", () => {
  beforeEach(() => {
    joinQueue.mockReset();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => consoleErrorSpy.mockRestore());

  it("returns forbidden when the business is suspended", async () => {
    joinQueue.mockRejectedValueOnce(new Error("Business is suspended"));

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ queueId: "queue-id" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Business is suspended" });
  });

  it("returns not found for an unavailable queue", async () => {
    joinQueue.mockRejectedValueOnce(new Error("Queue not found"));

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ queueId: "queue-id" }),
    });

    expect(response.status).toBe(404);
  });

  it("does not expose unexpected server error details", async () => {
    joinQueue.mockRejectedValueOnce(new Error("database password was rejected"));

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ queueId: "queue-id" }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Internal server error" });
  });
});
