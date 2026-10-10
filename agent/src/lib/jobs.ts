import { getRaw } from "./db";

export type JobType =
  | "ping"
  | "plan"
  | "discover"
  | "enrich"
  | "arena"
  | "send"
  | "follow_up"
  | "triage"
  | "voice_note"
  | "rerun_idea";

export interface JobRow {
  id: number;
  type: JobType;
  key: string;
  payload_json: string;
  status: string;
  priority: number;
  attempts: number;
  max_attempts: number;
  run_after: number;
  campaign_id: number | null;
  lead_id: number | null;
  error: string | null;
}

/**
 * Enqueue a job. `key` is the idempotency key: the same key is never queued twice,
 * so retries and double clicks can't duplicate work (or sends).
 * Returns the job id, or null if a job with this key already exists.
 */
export function enqueue(
  type: JobType,
  key: string,
  payload: Record<string, unknown> = {},
  opts: { runAfter?: number; priority?: number; campaignId?: number; leadId?: number; maxAttempts?: number } = {},
): number | null {
  const now = Date.now();
  const res = getRaw()
    .prepare(
      `INSERT OR IGNORE INTO jobs (type, key, payload_json, status, priority, attempts, max_attempts, run_after, campaign_id, lead_id, created_at, updated_at)
       VALUES (?, ?, ?, 'queued', ?, 0, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      type,
      key,
      JSON.stringify(payload),
      opts.priority ?? 100,
      opts.maxAttempts ?? 3,
      opts.runAfter ?? now,
      opts.campaignId ?? null,
      opts.leadId ?? null,
      now,
      now,
    );
  return res.changes ? Number(res.lastInsertRowid) : null;
}

/** Atomically claim the next runnable job (lowest priority number first, then oldest). */
export function claimNext(types?: JobType[]): JobRow | null {
  const raw = getRaw();
  const now = Date.now();
  const typeFilter = types?.length ? `AND type IN (${types.map(() => "?").join(",")})` : "";
  const tx = raw.transaction(() => {
    const row = raw
      .prepare(
        `SELECT * FROM jobs WHERE status = 'queued' AND run_after <= ? ${typeFilter}
         ORDER BY priority ASC, id ASC LIMIT 1`,
      )
      .get(now, ...(types ?? [])) as JobRow | undefined;
    if (!row) return null;
    raw
      .prepare(`UPDATE jobs SET status = 'running', attempts = attempts + 1, updated_at = ? WHERE id = ? AND status = 'queued'`)
      .run(now, row.id);
    return { ...row, status: "running", attempts: row.attempts + 1 };
  });
  return tx.immediate();
}

export function completeJob(id: number) {
  getRaw().prepare(`UPDATE jobs SET status = 'done', error = NULL, updated_at = ? WHERE id = ?`).run(Date.now(), id);
}

/** Fail a job: retried with backoff until max_attempts, then marked failed. */
export function failJob(job: JobRow, error: string, opts: { retry?: boolean } = {}) {
  const now = Date.now();
  const retry = opts.retry !== false && job.attempts < job.max_attempts;
  const backoff = Math.min(60_000, 2_000 * 2 ** (job.attempts - 1));
  getRaw()
    .prepare(`UPDATE jobs SET status = ?, error = ?, run_after = ?, updated_at = ? WHERE id = ?`)
    .run(retry ? "queued" : "failed", error.slice(0, 2000), retry ? now + backoff : job.run_after, now, job.id);
  return retry;
}

/** Cancel a queued job by key (e.g. a follow-up after the lead replied). */
export function cancelJob(key: string): boolean {
  const res = getRaw()
    .prepare(`UPDATE jobs SET status = 'cancelled', updated_at = ? WHERE key = ? AND status = 'queued'`)
    .run(Date.now(), key);
  return res.changes > 0;
}

/** On worker start: jobs left 'running' by a crash or sleep go back to the queue. */
export function recoverStuckJobs(): number {
  return getRaw()
    .prepare(`UPDATE jobs SET status = 'queued', updated_at = ? WHERE status = 'running'`)
    .run(Date.now()).changes;
}

export function getJobByKey(key: string): JobRow | undefined {
  return getRaw().prepare(`SELECT * FROM jobs WHERE key = ?`).get(key) as JobRow | undefined;
}

export function jobCounts(campaignId?: number) {
  const where = campaignId ? `WHERE campaign_id = ?` : "";
  return getRaw()
    .prepare(`SELECT type, status, COUNT(*) AS n FROM jobs ${where} GROUP BY type, status`)
    .all(...(campaignId ? [campaignId] : [])) as { type: string; status: string; n: number }[];
}
