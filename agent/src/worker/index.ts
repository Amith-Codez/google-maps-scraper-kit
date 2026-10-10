import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
process.env.PITCHWALA_PROC = "worker";

import { getEnv } from "../lib/env";
import { log } from "../lib/log";
import { getDb, schema } from "../lib/db";
import { eq } from "drizzle-orm";
import { claimNext, completeJob, failJob, recoverStuckJobs, type JobRow, type JobType } from "../lib/jobs";
import { writeEvent } from "../lib/events";
import { runHealthChecks } from "../lib/health";
import { setSetting } from "../lib/settings";
import { BudgetExceededError } from "../lib/llm";
import { handleArena, handleDiscover, handleEnrich, handlePlan } from "../lib/pipeline";
import { handleSend, requestFollowUpSend, setOnSent } from "../lib/outbox";
import { handleFollowUp, handleTriage, runInboxWatcher, scheduleFollowUp } from "../lib/replies";
import { handleVoiceNote } from "../lib/voice";

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
    await handleEnrich(Number(payload.leadId), job.priority, payload.arena !== false);
  },
  async arena(_job, payload) {
    await handleArena(Number(payload.leadId));
  },
  async send(_job, payload) {
    await handleSend(payload as { messageId: number; approved?: boolean; auto?: boolean });
  },
  async triage(_job, payload) {
    await handleTriage(Number(payload.messageId));
  },
  // Voice agent's markInterested → one Telegram ping per lead (the job key is interest:<leadId>).
  async notify(_job, payload) {
    const { telegram } = await import("../lib/adapters/telegram");
    const lead = getDb().select().from(schema.leads).where(eq(schema.leads.id, Number(payload.leadId))).get();
    if (!lead) return;
    await telegram.text(`🔥 ${lead.name} is interested (Talk to Pitchwala voice call)\n\n"${String(payload.summary)}"\n\nNext step: call them at the time they mentioned.${lead.phone ? `\nPhone: ${lead.phone}` : ""}`);
    writeEvent({ campaignId: lead.campaignId, leadId: lead.id, agent: "notifier", type: "ping", summary: "Pinged you on Telegram: interested via voice" });
  },
  async voice_note(_job, payload) {
    await handleVoiceNote(Number(payload.leadId), (payload.lang as "en" | "hi" | "te") ?? "en");
  },
  async follow_up(_job, payload) {
    await handleFollowUp(Number(payload.leadId), requestFollowUpSend);
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
  // Every first email schedules one follow-up; a reply or STOP cancels it.
  setOnSent((leadId, kind, at) => {
    if (kind === "initial") scheduleFollowUp(leadId, at);
  });
  void runInboxWatcher(() => stopping);
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
