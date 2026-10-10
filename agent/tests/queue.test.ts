import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// The idempotent outbox depends on the job queue never accepting the same key twice.
beforeAll(() => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pitchwala-test-"));
  process.env.DATABASE_PATH = path.join(dir, "test.db");
});

describe("job queue", () => {
  it("is idempotent by key (a rerun or double click can't send twice) (E23)", async () => {
    const { enqueue, claimNext, completeJob } = await import("../src/lib/jobs");
    const a = enqueue("send", "send:42:initial", { messageId: 1 });
    const b = enqueue("send", "send:42:initial", { messageId: 1 });
    expect(a).not.toBeNull();
    expect(b).toBeNull();
    const job = claimNext(["send"]);
    expect(job?.key).toBe("send:42:initial");
    expect(claimNext(["send"])).toBeNull(); // claimed once
    completeJob(job!.id);
  });
  it("puts jobs left running by a crash back in the queue (E49)", async () => {
    const { enqueue, claimNext, recoverStuckJobs } = await import("../src/lib/jobs");
    enqueue("ping", "ping:crash", {});
    expect(claimNext(["ping"])?.key).toBe("ping:crash");
    expect(recoverStuckJobs()).toBe(1);
    expect(claimNext(["ping"])?.key).toBe("ping:crash");
  });
  it("cancels a queued follow-up when the lead replies (E50)", async () => {
    const { enqueue, cancelJob, getJobByKey } = await import("../src/lib/jobs");
    enqueue("follow_up", "follow_up:7", { leadId: 7 }, { runAfter: Date.now() + 3 * 86_400_000 });
    expect(cancelJob("follow_up:7")).toBe(true);
    expect(getJobByKey("follow_up:7")?.status).toBe("cancelled");
  });
});
