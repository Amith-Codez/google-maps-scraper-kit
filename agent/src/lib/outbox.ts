// Outbox pattern (BUILD_PLAN §3.9): a message is written first, then a `send` job delivers it.
// The gate runs in the same transaction that claims the send, so a crash or retry can never send twice.
import { eq } from "drizzle-orm";
import { getDb, getRaw, schema } from "./db";
import { enqueue } from "./jobs";
import { writeEvent } from "./events";
import { getEnv } from "./env";
import { getSetting } from "./settings";
import { gmail } from "./adapters/gmail";
import { gate, normalizeContact, startOfToday } from "./core/gate";

export function dailyCap(): number {
  const s = Number(getSetting("daily_cap"));
  return Number.isFinite(s) && s > 0 ? s : getEnv().DAILY_CAP;
}

export function sentToday(): number {
  return (
    getRaw()
      .prepare(
        `SELECT COUNT(*) n FROM messages WHERE direction = 'out' AND channel = 'email' AND is_preview = 0
         AND kind IN ('initial','follow_up') AND status IN ('sent','sending') AND COALESCE(sent_at, created_at) >= ?`,
      )
      .get(startOfToday()) as { n: number }
  ).n;
}

export function isSuppressed(contact: string | null): boolean {
  if (!contact) return false;
  return !!getRaw().prepare(`SELECT 1 FROM suppression WHERE contact = ?`).get(normalizeContact(contact));
}

export function suppress(contact: string, reason: string) {
  getRaw()
    .prepare(`INSERT OR IGNORE INTO suppression (contact, reason, created_at) VALUES (?, ?, ?)`)
    .run(normalizeContact(contact), reason, Date.now());
}

/** Queue the lead's draft pitch for sending by email. `approved` = the user pressed Send on a "needs review" lead. */
export function requestSend(leadId: number, opts: { approved?: boolean; auto?: boolean } = {}) {
  const db = getDb();
  const lead = db.select().from(schema.leads).where(eq(schema.leads.id, leadId)).get();
  if (!lead) throw new Error("lead not found");
  const draft = getRaw()
    .prepare(`SELECT id FROM messages WHERE lead_id = ? AND kind = 'initial' AND direction = 'out' AND is_preview = 0 ORDER BY id DESC LIMIT 1`)
    .get(leadId) as { id: number } | undefined;
  if (!draft) throw new Error("no pitch yet");
  getRaw()
    .prepare(`UPDATE messages SET channel = 'email', to_addr = ?, status = CASE WHEN status = 'draft' THEN 'queued' ELSE status END WHERE id = ?`)
    .run(lead.email, draft.id);
  const id = enqueue(
    "send",
    `send:${leadId}:initial`,
    { messageId: draft.id, approved: !!opts.approved, auto: !!opts.auto },
    { campaignId: lead.campaignId, leadId, priority: 3, maxAttempts: 1 },
  );
  return { queued: id !== null, messageId: draft.id };
}

/** Same pitch to any inbox you type, linked to the lead, marked as a preview, not counted in the cap. */
export function requestPreview(leadId: number, to: string) {
  const src = getRaw()
    .prepare(`SELECT * FROM messages WHERE lead_id = ? AND kind = 'initial' AND direction = 'out' ORDER BY id DESC LIMIT 1`)
    .get(leadId) as Record<string, unknown> | undefined;
  if (!src) throw new Error("no pitch yet");
  const lead = getDb().select().from(schema.leads).where(eq(schema.leads.id, leadId)).get()!;
  const row = getDb()
    .insert(schema.messages)
    .values({
      leadId,
      direction: "out",
      kind: "preview",
      channel: "email",
      toAddr: normalizeContact(to),
      subject: String(src.subject ?? ""),
      body: String(src.body ?? ""),
      principlesJson: (src.principles_json as string) ?? null,
      voiceScript: (src.voice_script as string) ?? null,
      isPreview: true,
      status: "queued",
    })
    .returning({ id: schema.messages.id })
    .get();
  enqueue("send", `preview:${row.id}`, { messageId: row.id }, { campaignId: lead.campaignId, leadId, priority: 1, maxAttempts: 1 });
  return { messageId: row.id };
}

type Claim = { ok: true; msg: typeof schema.messages.$inferSelect; lead: typeof schema.leads.$inferSelect } | { ok: false; reason: string; quiet?: boolean };

function claimSend(messageId: number, approved: boolean): Claim {
  const raw = getRaw();
  return raw.transaction((): Claim => {
    const db = getDb();
    const msg = db.select().from(schema.messages).where(eq(schema.messages.id, messageId)).get();
    if (!msg) return { ok: false, reason: "message missing", quiet: true };
    if (msg.status === "sent") return { ok: false, reason: "already sent", quiet: true };
    if (msg.status === "sending") {
      // A crash happened mid-send: we can't know if Gmail accepted it, so we never retry.
      raw.prepare(`UPDATE messages SET status = 'failed', error = ? WHERE id = ?`).run("interrupted mid-send; not retried (check Sent folder)", messageId);
      return { ok: false, reason: "interrupted mid-send; not retried" };
    }
    const lead = db.select().from(schema.leads).where(eq(schema.leads.id, msg.leadId)).get()!;
    const already = !!raw
      .prepare(`SELECT 1 FROM messages WHERE lead_id = ? AND kind = ? AND is_preview = 0 AND status IN ('sent','sending') AND id != ?`)
      .get(msg.leadId, msg.kind, messageId);
    const g = gate({
      body: msg.body ?? "",
      optOut: getSetting("opt_out_text") ?? "Reply STOP",
      toAddr: msg.toAddr,
      isPreview: msg.isPreview,
      kind: msg.kind as "initial",
      suppressed: isSuppressed(msg.toAddr),
      alreadySentToLead: already,
      sentToday: sentToday(),
      cap: dailyCap(),
      emailUsable: lead.emailStatus === "usable" && normalizeContact(lead.email ?? "") === normalizeContact(msg.toAddr ?? ""),
      needsReview: lead.needsReview,
      approvedByUser: approved,
    });
    if (!g.ok) {
      raw.prepare(`UPDATE messages SET status = CASE WHEN ? THEN 'queued' ELSE 'blocked' END, error = ? WHERE id = ?`).run(
        g.reason.startsWith("daily cap") ? 1 : 0,
        g.reason,
        messageId,
      );
      return { ok: false, reason: g.reason };
    }
    raw.prepare(`UPDATE messages SET status = 'sending', error = NULL WHERE id = ?`).run(messageId);
    return { ok: true, msg, lead };
  }).immediate();
}

export async function handleSend(payload: { messageId: number; approved?: boolean; auto?: boolean }) {
  const c = claimSend(payload.messageId, !!payload.approved);
  if (!c.ok) {
    if (!c.quiet) {
      const m = getDb().select().from(schema.messages).where(eq(schema.messages.id, payload.messageId)).get();
      writeEvent({ leadId: m?.leadId, agent: "gate", type: "blocked", summary: `Gate blocked the send: ${c.reason}` });
      // Over the cap: queue it for tomorrow (E21).
      if (c.reason.startsWith("daily cap") && m) {
        enqueue("send", `send:${m.leadId}:${m.kind}:${startOfToday() + 86_400_000}`, payload, {
          leadId: m.leadId,
          runAfter: startOfToday() + 86_400_000 + 9 * 3_600_000,
          maxAttempts: 1,
        });
      }
    }
    return;
  }
  const { msg, lead } = c;
  try {
    const sent = await gmail.send({
      to: msg.toAddr!,
      subject: msg.subject ?? "An idea for you",
      text: msg.body ?? "",
      inReplyTo: msg.inReplyTo ?? undefined,
      references: msg.inReplyTo ? [msg.inReplyTo] : undefined,
    });
    const now = Date.now();
    getRaw().prepare(`UPDATE messages SET status = 'sent', message_id = ?, sent_at = ? WHERE id = ?`).run(sent.messageId, now, msg.id);
    if (msg.isPreview) {
      writeEvent({ campaignId: lead.campaignId, leadId: lead.id, agent: "mailer", type: "preview_sent", summary: `Preview sent to ${msg.toAddr} (not counted in the cap)` });
      return;
    }
    getRaw()
      .prepare(`UPDATE leads SET stage = CASE WHEN stage IN ('found','ready') THEN 'contacted' ELSE stage END, contacted_at = COALESCE(contacted_at, ?) WHERE id = ?`)
      .run(now, lead.id);
    getRaw().prepare(`UPDATE campaigns SET sent = sent + 1 WHERE id = ?`).run(lead.campaignId);
    writeEvent({
      campaignId: lead.campaignId,
      leadId: lead.id,
      agent: "mailer",
      type: "sent",
      summary: `${msg.kind === "follow_up" ? "Follow-up" : "Email"} ${payload.auto ? "sent automatically" : payload.approved ? "sent after your approval" : "sent"} to ${msg.toAddr} · ${sentToday()}/${dailyCap()} today`,
    });
    onSent?.(lead.id, msg.kind, now);
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    getRaw().prepare(`UPDATE messages SET status = 'failed', error = ? WHERE id = ?`).run(err.slice(0, 300), msg.id);
    writeEvent({ campaignId: lead.campaignId, leadId: lead.id, agent: "mailer", type: "send_failed", summary: `Send failed: ${err.slice(0, 120)}` });
  }
}

/** Hook for Step 5 (follow-up scheduling). */
export let onSent: ((leadId: number, kind: string, at: number) => void) | undefined;
export function setOnSent(fn: typeof onSent) {
  onSent = fn;
}

/** Queue a follow-up message created by the follow-up job (same gate, cap and opt-out). */
export function requestFollowUpSend(messageId: number, leadId: number) {
  enqueue("send", `send:${leadId}:follow_up`, { messageId, auto: true }, { leadId, priority: 3, maxAttempts: 1 });
}
