// "Learning which ideas get replies" (Problem 2 bonus): which idea themes earn replies, from real replies only.
import { getRaw } from "../db";

export interface ThemeStat {
  theme: string;
  pitched: number;
  replied: number;
  interested: number;
}

/** "gap: online booking" / "issue: no menu online" / "rating" → a short theme label. */
export function themeOf(evidenceKey: string | null, title: string): string {
  const k = `${evidenceKey ?? ""} ${title}`.toLowerCase();
  if (/book|slot|schedul|trial|reserv|appoint/.test(k)) return "online booking";
  if (/pre-?order|order/.test(k)) return "pre-orders";
  if (/menu|dish|signature/.test(k)) return "menu showcase";
  if (/whatsapp|chat|enquir|inquir/.test(k)) return "WhatsApp enquiries";
  if (/review|rating|reputation|loved/.test(k)) return "reviews & reputation";
  if (/instagram|social|reel|video/.test(k)) return "social & video";
  return "other";
}

export function themeStats(): { themes: ThemeStat[]; winners: { title: string; theme: string; lead: string; intent: string }[]; totalReplies: number } {
  const rows = getRaw()
    .prepare(
      `SELECT i.title, i.evidence_key AS key, l.name AS lead,
              EXISTS (SELECT 1 FROM messages m WHERE m.lead_id = l.id AND m.direction = 'out' AND m.status = 'sent' AND m.kind IN ('initial','preview')) AS pitched,
              (SELECT m.intent FROM messages m WHERE m.lead_id = l.id AND m.direction = 'in' AND m.intent NOT IN ('out_of_office','bounce') ORDER BY m.id DESC LIMIT 1) AS intent
       FROM ideas i JOIN leads l ON l.id = i.lead_id WHERE i.verdict = 'chosen'`,
    )
    .all() as { title: string; key: string | null; lead: string; pitched: number; intent: string | null }[];
  const map = new Map<string, ThemeStat>();
  const winners: { title: string; theme: string; lead: string; intent: string }[] = [];
  for (const r of rows) {
    if (!r.pitched) continue;
    const theme = themeOf(r.key, r.title);
    const t = map.get(theme) ?? { theme, pitched: 0, replied: 0, interested: 0 };
    t.pitched++;
    if (r.intent && r.intent !== "stop" && r.intent !== "angry") {
      t.replied++;
      if (r.intent === "interested") t.interested++;
      winners.push({ title: r.title, theme, lead: r.lead, intent: r.intent });
    }
    map.set(theme, t);
  }
  const themes = [...map.values()].sort((a, b) => b.replied / Math.max(1, b.pitched) - a.replied / Math.max(1, a.pitched) || b.pitched - a.pitched);
  return { themes, winners, totalReplies: winners.length };
}

/** A short hint for the Strategist: real ideas that earned replies (empty until there are some). */
export function learningHint(): string {
  const { winners } = themeStats();
  if (!winners.length) return "";
  const top = winners.slice(0, 4).map((w) => `"${w.title}" (${w.theme}, got a ${w.intent} reply)`);
  return `Ideas that earned real replies before (learn from their angle, don't copy them): ${top.join("; ")}.`;
}
