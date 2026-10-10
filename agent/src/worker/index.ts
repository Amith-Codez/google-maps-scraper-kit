import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
process.env.PITCHWALA_PROC = "worker";

import { getEnv } from "../lib/env";
import { log } from "../lib/log";
import { getDb } from "../lib/db";
import { claimNext, completeJob, failJob, recoverStuckJobs, type JobRow, type JobType } from "../lib/jobs";
import { writeEvent } from "../lib/events";
import { runHealthChecks } from "../lib/health";
import { setSetting } from "../lib/settings";
import { BudgetExceededError } from "../lib/llm";
import { handleArena, handleDiscover, handleEnrich, handlePlan } from "../lib/pipeline";
import { handleSend } from "../lib/outbox";

type Handler = (job: JobRow, payload: Record<string, unknown>) => Promise<void>;

// Job handlers. Each step of the pipeline registers its handler here.
const handlers: Partial<Record<JobType, Handler>> = {
  async ping(job, payload) {
    writeEvent({ agent: "system", type: "ping", summary: `Worker ran test job #${job.id}`, data: payload });
  },
  async plan(_job, payload) {
    await handlePlan(Number(payload.campaignId));
  },
  async discover(_job, payload) {
    await handleDiscover(Number(payload.campaignId));
  },
  async enrich(job, payload) {
    await handleEnrich(Number(payload.leadId), job.priority);
  },
  async arena(_job, payload) {
    await handleArena(Number(payload.leadId));
  },
  async send(_job, payload) {
    await handleSend(payload as { messageId: number; approved?: boolean; auto?: boolean });
  },
};

const CONCURRENCY = 3;
let stopping = false;

// The kit engine should run one search at a time, so discovery gets its own single runner.
const EXCLUSIVE: JobType[] = ["discover"];

async function runner(n: number, types: JobType[]) {
  while (!stopping) {
    const job = claimNext(types);
    if (!job) {
      await new Promise((r) => setTimeout(r, 500));
      continue;
    }
    const started = Date.now();
    const ctx = { jobId: job.id, type: job.type, leadId: job.lead_id, campaignId: job.campaign_id, runner: n };
    try {
      await handlers[job.type]!(job, JSON.parse(job.payload_json));
      completeJob(job.id);
      log.info({ ...ctx, ms: Date.now() - started }, "job done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const retried = failJob(job, msg, { retry: !(err instanceof BudgetExceededError) });
      log.error({ ...ctx, err: msg, retried }, "job failed");
      if (!retried)
        writeEvent({
          campaignId: job.campaign_id,
          leadId: job.lead_id,
          agent: "system",
          type: "job_failed",
          summary: `${job.type} failed: ${msg.slice(0, 140)}`,
        });
    }
  }
}

async function healthLoop() {
  while (!stopping) {
    setSetting("worker_heartbeat", String(Date.now()));
    try {
      const h = await runHealthChecks();
      log.debug({ health: h }, "health checked");
    } catch (e) {
      log.warn({ err: String(e) }, "health check error");
    }
    for (let i = 0; i < 6 && !stopping; i++) {
      setSetting("worker_heartbeat", String(Date.now()));
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

async function main() {
  try {
    getEnv();
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
  getDb();
  const recovered = recoverStuckJobs();
  log.info({ recovered, concurrency: CONCURRENCY }, "worker started");
  void healthLoop();
  const general = (Object.keys(handlers) as JobType[]).filter((t) => !EXCLUSIVE.includes(t));
  await Promise.all([runner(99, EXCLUSIVE), ...Array.from({ length: CONCURRENCY }, (_, i) => runner(i, general))]);
}

for (const sig of ["SIGINT", "SIGTERM"] as const)
  process.on(sig, () => {
    stopping = true;
    log.info("worker stopping");
    setTimeout(() => process.exit(0), 1500);
  });

void main();
