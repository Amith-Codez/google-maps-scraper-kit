// Voice notes for phone-only leads (BUILD_PLAN §8): script → ElevenLabs → MP3 → your Telegram with the wa.me link.
// You forward both in two taps; we never auto-send WhatsApp.
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb, getRaw, schema } from "./db";
import { getEnv } from "./env";
import { writeEvent } from "./events";
import { llm } from "./llm";
import { elevenlabs } from "./adapters/elevenlabs";
import { telegram } from "./adapters/telegram";
import { stripVoiceScript } from "./core/guards";
import { writeVoiceScript, VOICE_LANGS, type VoiceLang } from "./core/voiceWriter";

export const audioDir = () => path.resolve(/* turbopackIgnore: true */ process.cwd(), path.dirname(getEnv().DATABASE_PATH), "audio");

export function waLink(phone: string | null, text: string): string | null {
  const d = (phone ?? "").replace(/\D/g, "").replace(/^0/, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.length === 10 ? "91" + d : d}?text=${encodeURIComponent(text)}`;
}

export async function handleVoiceNote(leadId: number, lang: VoiceLang) {
  const db = getDb();
  const lead = db.select().from(schema.leads).where(eq(schema.leads.id, leadId)).get();
  if (!lead) return;
  const campaign = db.select().from(schema.campaigns).where(eq(schema.campaigns.id, lead.campaignId)).get()!;
  const draft = db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.leadId, leadId))
    .all()
    .find((m) => m.kind === "initial" && m.direction === "out");
  const idea = db.select().from(schema.ideas).where(eq(schema.ideas.leadId, leadId)).all().find((i) => i.verdict === "chosen");
  if (!draft || !idea) throw new Error("no pitch yet");
  const env = getEnv();
  const E = (type: string, summary: string) => writeEvent({ campaignId: lead.campaignId, leadId, agent: "voice", type, summary });

  const w = await writeVoiceScript(llm, {
    lang,
    senderName: env.SENDER_NAME,
    ideaTitle: idea.title,
    idea: idea.pitchLine,
    why: draft.whyNeeded ?? "",
    service: campaign.service,
    campaignId: campaign.id,
  });
  // Never Maps data in the voice: strip the business name / ratings if the model slipped (E39).
  const { script, stripped } = stripVoiceScript(w.output.script, lead.name);
  if (stripped.length) E("voice_strip", `Stripped ${stripped.length} sentence(s) with the business name or ratings`);
  E("script", `Voice script (${VOICE_LANGS[lang].label}): "${script.slice(0, 120)}…"`);

  const wa = waLink(lead.phone, draft.body ?? "");
  let file: string | null = null;
  try {
    const mp3 = await elevenlabs.speak(script, { language: lang });
    fs.mkdirSync(audioDir(), { recursive: true });
    file = `lead-${leadId}-${lang}-${Date.now()}.mp3`;
    fs.writeFileSync(path.join(audioDir(), file), mp3);
    await telegram.audio(
      mp3,
      `🎙 AI-made voice note (${VOICE_LANGS[lang].label}) for ${lead.name}.\nForward it on WhatsApp with the draft:\n${wa ?? "(no mobile number)"}`,
      `pitch-${lang}.mp3`,
    );
    E("sent_to_you", `Voice note (${VOICE_LANGS[lang].label}) made with ElevenLabs and sent to your Telegram with the WhatsApp draft link`);
  } catch (e) {
    // ElevenLabs down or quota used (E40): the text draft still reaches you.
    const msg = e instanceof Error ? e.message.slice(0, 120) : "error";
    await telegram.text(`Voice skipped (${msg}). Text draft for ${lead.name}:\n${wa ?? draft.body}`).catch(() => {});
    E("skipped", `Voice skipped: ${msg}; text draft sent to your Telegram`);
  }
  getRaw()
    .prepare(
      `INSERT INTO messages (lead_id, direction, kind, channel, to_addr, body, voice_script, audio_path, is_preview, status, created_at)
       VALUES (?, 'out', 'draft', 'whatsapp', ?, ?, ?, ?, 0, 'draft', ?)`,
    )
    .run(leadId, lead.phone, draft.body, `[${lang}] ${script}`, file, Date.now());
}
