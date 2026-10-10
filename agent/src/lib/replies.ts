// Reply loop (BUILD_PLAN §9): inbox watcher → match to our thread → triage → answer / suppress / notify.
// Only replies to emails WE sent are touched; all other mail is ignored.
import { ImapFlow } from "imapflow";
import { simpleParser, type AddressObject } from "mailparser";
import { eq } from "drizzle-orm";
import { getDb, getRaw, schema } from "./db";
import { getEnv } from "./env";
import { log } from "./log";
import { writeEvent } from "./events";
import { cancelJob, enqueue } from "./jobs";
import { getSetting, setSetting } from "./settings";
import { llm } from "./llm";
import { gmail } from "./adapters/gmail";
import { telegram } from "./adapters/telegram";
import { elevenlabs } from "./adapters/elevenlabs";
import { preTriage, stripQuoted, triage, type Intent } from "./core/triage";
import { normalizeContact } from "./core/gate";
import { isSuppressed, suppress } from "./outbox";

const firstAddr = (a: AddressObject | AddressObject[] | undefined) =>
  (Array.isArray(a) ? a[0] : a)?.value?.[0]?.address?.toLowerCase() ?? "";

type Msg = typeof schema.messages.$inferSelect;

function ourMessageByIds(ids: string[]): Msg | undefined {
  const clean = ids.filter(Boolean);
  if (!clean.length) return undefined;
  return getRaw()
    .prepare(
      `SELECT * FROM messages WHERE direction = 'out' AND message_id IN (${clean.map(() => "?").join(",")}) ORDER BY id DESC LIMIT 1`,
    )
    .get(...clean) as Msg | undefined;
}

function toMsg(row: Record<string, unknown> | undefined): Msg | undefined {
  if (!row) return undefined;
  return getDb().select().from(schema.messages).where(eq(schema.messages.id, Number(row.id))).get();
}

/** Parse one raw email; if it answers one of our messages, store it and queue triage. */
export async function handleInbound(raw: Buffer) {
  const p = await simpleParser(raw);
  const messageId = p.messageId ?? "";
  if (messageId && getRaw().prepare(`SELECT 1 FROM messages WHERE message_id = ?`).get(messageId)) return; // ours or seen

  const refs = [p.inReplyTo ?? "", ...(Array.isArray(p.references) ? p.references : p.references ? [p.references] : [])];
  let ours = toMsg(ourMessageByIds(refs) as unknown as Record<string, unknown>);
  const text = p.text ?? "";
  const from = firstAddr(p.from);
  const autoSubmitted = (p.headers.get("auto-submitted") as string | undefined) ?? null;
  const pre = preTriage({ from, subject: p.subject ?? "", text, autoSubmitted });

  // Bounces quote our Message-ID in the body rather than the headers.
  if (!ours && pre === "bounce") {
    const ids = text.match(/<[^<>\s]+@[^<>\s]+>/g) ?? [];
    ours = toMsg(ourMessageByIds(ids) as unknown as Record<string, unknown>);
  }
  if (!ours) return;

  const lead = getDb().select().from(schema.leads).where(eq(schema.leads.id, ours.leadId)).get();
  if (!lead) return;
  const body = stripQuoted(text) || text.slice(0, 2000);
  const row = getDb()
    .insert(schema.messages)
    .values({
      leadId: lead.id,
      direction: "in",
      kind: "reply",
      channel: "email",
      fromAddr: from,
      toAddr: getEnv().GMAIL_ADDRESS,
      subject: p.subject ?? "",
      body: body.slice(0, 4000),
      messageId: messageId || `<in-${Date.now()}@pitchwala>`,
      inReplyTo: ours.messageId,
      isPreview: ours.isPreview,
      intent: pre,
      status: "received",
      sentAt: (p.date ?? new Date()).getTime(),
    })
    .returning({ id: schema.messages.id })
    .get();

  const otherSender = !ours.isPreview && lead.email && normalizeContact(from) !== normalizeContact(lead.email);
  if (pre !== "bounce" && pre !== "out_of_office") {
    getRaw()
      .prepare(`UPDATE leads SET stage = CASE WHEN stage IN ('ready','contacted','found') THEN 'replied' ELSE stage END, follow_up_at = NULL WHERE id = ?`)
      .run(lead.id);
    getRaw().prepare(`UPDATE campaigns SET replies = replies + 1 WHERE id = ?`).run(lead.campaignId);
    if (cancelJob(`follow_up:${lead.id}`))
      writeEvent({ campaignId: lead.campaignId, leadId: lead.id, agent: "system", type: "follow_up_cancelled", summary: "Follow-up cancelled: they replied" });
  }
  writeEvent({
    campaignId: lead.campaignId,
    leadId: lead.id,
    agent: "mailer",
    type: "reply_in",
    summary: `Reply from ${from}${ours.isPreview ? " (preview copy)" : ""}${otherSender ? " (a different address than we wrote to: matched by thread headers)" : ""}: "${body.slice(0, 80).replace(/\s+/g, " ")}"`,
  });
  enqueue("triage", `triage:${row.id}`, { messageId: row.id }, { campaignId: lead.campaignId, leadId: lead.id, priority: 1, maxAttempts: 2 });
}

async function notify(text: string, voiceOf?: string) {
  try {
    await telegram.text(text);
    if (voiceOf) {
      try {
        const mp3 = await elevenlabs.speak(voiceOf.slice(0, 400));
        await telegram.audio(mp3, "Their reply, read aloud (ElevenLabs)", "reply.mp3");
      } catch (e) {
        await telegram.text(`(voice skipped: ${e instanceof Error ? e.message.slice(0, 80) : "error"})`);
      }
    }
    return "telegram";
  } catch (e) {
    // Telegram down or misconfigured: fall back to an email to the user (E32).
    const env = getEnv();
    await gmail.send({ to: env.GMAIL_ADDRESS, subject: "Pitchwala: a lead needs you", text: `${text}\n\n(Telegram failed: ${e instanceof Error ? e.message : e})` });
    return "email";
  }
}

async function replyInThread(theirs: Msg, ours: Msg, text: string, withOptOut: boolean) {
  const optOut = getSetting("opt_out_text") ?? "Reply STOP and I won't write again.";
  const body = withOptOut ? `${text.trim()}\n\n${optOut}` : text.trim();
  const subject = /^re:/i.test(theirs.subject ?? "") ? theirs.subject! : `Re: ${ours.subject ?? ""}`;
  const refs = [ours.messageId, theirs.messageId].filter((x): x is string => !!x);
  const sent = await gmail.send({ to: theirs.fromAddr!, subject, text: body, inReplyTo: theirs.messageId ?? undefined, references: refs });
  getDb()
    .insert(schema.messages)
    .values({
      leadId: theirs.leadId,
      direction: "out",
      kind: "reply",
      channel: "email",
      toAddr: theirs.fromAddr,
      subject,
      body,
      messageId: sent.messageId,
      inReplyTo: theirs.messageId,
      isPreview: theirs.isPreview,
      status: "sent",
      sentAt: Date.now(),
    })
    .run();
}

export async function handleTriage(messageId: number) {
  const db = getDb();
  const theirs = db.select().from(schema.messages).where(eq(schema.messages.id, messageId)).get();
  if (!theirs) return;
  const ours = db.select().from(schema.messages).where(eq(schema.messages.messageId, theirs.inReplyTo ?? "")).get();
  const lead = db.select().from(schema.leads).where(eq(schema.leads.id, theirs.leadId)).get();
  const campaign = lead && db.select().from(schema.campaigns).where(eq(schema.campaigns.id, lead.campaignId)).get();
  if (!ours || !lead || !campaign) return;
  const env = getEnv();
  const E = (agent: Parameters<typeof writeEvent>[0]["agent"], type: string, summary: string, data?: unknown) =>
    writeEvent({ campaignId: lead.campaignId, leadId: lead.id, agent, type, summary, data });

  let intent = theirs.intent as Intent | null;
  let answer = "";
  let summary = "";
  let next = "";
  let needsHuman = false;
  if (!intent) {
    const t = await triage(llm, { reply: theirs.body ?? "", ourMessage: ours.body ?? "", senderName: env.SENDER_NAME, service: campaign.service, campaignId: campaign.id });
    intent = t.output.intent;
    answer = t.output.answer_draft;
    summary = t.output.summary;
    next = t.output.next_step;
    needsHuman = t.output.needs_human;
  }
  getRaw().prepare(`UPDATE messages SET intent = ? WHERE id = ?`).run(intent, theirs.id);
  E("triage", "intent", `Triage: ${intent}${summary ? ` · ${summary}` : ""}`);
  const who = `${lead.name}${theirs.isPreview ? " (preview copy)" : ""}`;
  const quote = (theirs.body ?? "").slice(0, 500);

  switch (intent) {
    case "out_of_office":
      E("triage", "ignored", "Out-of-office auto-reply: ignored (no reply loop)");
      return;
    case "bounce":
      getRaw().prepare(`UPDATE leads SET email_status = 'bounced' WHERE id = ?`).run(lead.id);
      if (!theirs.isPreview) cancelJob(`follow_up:${lead.id}`);
      E("mailer", "bounce", `Bounced: ${ours.toAddr} marked invalid; no retry`);
      return;
    case "stop": {
      if (!isSuppressed(theirs.fromAddr)) await replyInThread(theirs, ours, `Understood. I won't write again. Sorry for the bother. ${env.SENDER_NAME}`, false);
      suppress(theirs.fromAddr!, "replied STOP");
      if (!theirs.isPreview && lead.email) suppress(lead.email, "replied STOP");
      getRaw().prepare(`UPDATE leads SET stage = 'lost' WHERE id = ?`).run(lead.id);
      E("gate", "suppressed", `Suppressed ${theirs.fromAddr} forever (every campaign); one polite line sent; no ping`);
      return;
    }
    case "angry": {
      await replyInThread(theirs, ours, answer || `I'm sorry for the bother. You won't hear from me again. ${env.SENDER_NAME}`, false);
      suppress(theirs.fromAddr!, "angry reply");
      if (!theirs.isPreview && lead.email) suppress(lead.email, "angry reply");
      getRaw().prepare(`UPDATE leads SET stage = 'lost' WHERE id = ?`).run(lead.id);
      const via = await notify(`😠 ${who} replied angrily. I apologised once and won't contact them again.\n\n"${quote}"`, quote);
      E("notifier", "ping", `Apologised, suppressed, pinged you on ${via}`);
      return;
    }
    case "instruction": {
      await replyInThread(theirs, ours, answer || `Thanks for your message. ${env.SENDER_NAME} will read it personally.`, true);
      const via = await notify(`⚠️ ${who} sent instructions to the agent. Treated as text; nothing revealed.\n\n"${quote}"`);
      E("notifier", "ping", `Treated as text, revealed nothing, pinged you on ${via}`);
      return;
    }
    case "interested": {
      if (answer) await replyInThread(theirs, ours, answer, true);
      getRaw().prepare(`UPDATE leads SET stage = 'interested' WHERE id = ?`).run(lead.id);
      const via = await notify(
        `🔥 ${who} is interested!\n\n"${quote}"\n\nNext step: ${next || "send the 2-minute demo"}\nReply to: ${theirs.fromAddr}`,
        quote,
      );
      E("notifier", "ping", `Interested → answered in the thread and pinged you on ${via} (with the reply read aloud)`);
      return;
    }
    default: {
      if (answer) await replyInThread(theirs, ours, answer, true);
      const via = await notify(`💬 ${who} replied${needsHuman ? " (needs you)" : ""}:\n\n"${quote}"\n\n${answer ? `I answered: "${answer.slice(0, 300)}"` : "Not answered automatically."}\nNext step: ${next || "read and reply"}`, quote);
      E("notifier", "ping", `${answer ? "Answered in the thread" : "Not answered"}; pinged you on ${via}`);
    }
  }
}

// ---------------- the IMAP IDLE watcher ----------------

export async function runInboxWatcher(isStopping: () => boolean) {
  while (!isStopping()) {
    const env = getEnv();
    const client = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: { user: env.GMAIL_ADDRESS, pass: env.GMAIL_APP_PASSWORD },
      logger: false,
    });
    try {
      await client.connect();
      const box = await client.mailboxOpen("INBOX");
      let last = Number(getSetting("inbox_last_uid") ?? 0);
      if (!last) {
        last = Number(box.uidNext) - 1; // start from now; never touch old mail
        setSetting("inbox_last_uid", String(last));
      }
      log.info({ last }, "inbox watcher connected (IMAP IDLE)");
      setSetting("inbox_status", JSON.stringify({ ok: true, at: Date.now() }));

      let running = false;
      const pull = async () => {
        if (running) return;
        running = true;
        try {
          const uids: number[] = [];
          for await (const m of client.fetch(`${last + 1}:*`, { uid: true }, { uid: true })) if (m.uid > last) uids.push(m.uid);
          for (const uid of uids.sort((a, b) => a - b)) {
            const m = await client.fetchOne(String(uid), { source: true }, { uid: true });
            if (m && m.source) {
              try {
                await handleInbound(m.source);
              } catch (e) {
                log.error({ uid, err: String(e) }, "inbound mail failed");
              }
            }
            last = uid;
            setSetting("inbox_last_uid", String(last));
          }
        } finally {
          running = false;
        }
      };
      client.on("exists", () => void pull());
      await pull();
      // IDLE delivers new mail in seconds; a 15 s poll is the safety net.
      const timer = setInterval(() => void pull().catch(() => {}), 15_000);
      await new Promise<void>((resolve) => {
        client.on("close", () => resolve());
        const check = setInterval(() => {
          if (isStopping()) {
            clearInterval(check);
            resolve();
          }
        }, 1000);
      });
      clearInterval(timer);
      await client.logout().catch(() => {});
    } catch (e) {
      log.warn({ err: String(e) }, "inbox watcher error; reconnecting in 10 s");
      setSetting("inbox_status", JSON.stringify({ ok: false, at: Date.now(), err: String(e).slice(0, 120) }));
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }
}

// ---------------- follow-up ----------------

export function scheduleFollowUp(leadId: number, sentAt: number) {
  const days = getEnv().FOLLOW_UP_DAYS;
  const at = sentAt + days * 86_400_000;
  const lead = getDb().select().from(schema.leads).where(eq(schema.leads.id, leadId)).get();
  if (!lead) return;
  enqueue("follow_up", `follow_up:${leadId}`, { leadId }, { campaignId: lead.campaignId, leadId, runAfter: at, maxAttempts: 1 });
  getRaw().prepare(`UPDATE leads SET follow_up_at = ? WHERE id = ?`).run(at, leadId);
  writeEvent({ campaignId: lead.campaignId, leadId, agent: "system", type: "follow_up_scheduled", summary: `Follow-up scheduled · ${new Date(at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` });
}

/** One gentle follow-up in the same thread, through the same gate, cap and opt-out. */
export async function handleFollowUp(leadId: number, requestFollowUpSend: (messageId: number, leadId: number) => void) {
  const db = getDb();
  const lead = db.select().from(schema.leads).where(eq(schema.leads.id, leadId)).get();
  if (!lead || lead.stage !== "contacted") return; // replied, interested or lost: nothing to do
  const first = getRaw()
    .prepare(`SELECT * FROM messages WHERE lead_id = ? AND kind = 'initial' AND status = 'sent' AND is_preview = 0 ORDER BY id LIMIT 1`)
    .get(leadId) as Record<string, unknown> | undefined;
  if (!first) return;
  const idea = db.select().from(schema.ideas).where(eq(schema.ideas.leadId, leadId)).all().find((i) => i.verdict === "chosen");
  const optOut = getSetting("opt_out_text") ?? "Reply STOP and I won't write again.";
  const body = `Quick nudge: the demo page I built for ${lead.name}${idea ? ` ("${idea.title}")` : ""} is still waiting for you. One "YES" and I'll send the link with a 2-minute walkthrough. If it's not for you, no worries at all.\n\n${optOut}`;
  const row = db
    .insert(schema.messages)
    .values({
      leadId,
      direction: "out",
      kind: "follow_up",
      channel: "email",
      toAddr: lead.email,
      subject: `Re: ${String(first.subject ?? "")}`,
      body,
      inReplyTo: String(first.message_id ?? ""),
      status: "queued",
    })
    .returning({ id: schema.messages.id })
    .get();
  requestFollowUpSend(row.id, leadId);
}
