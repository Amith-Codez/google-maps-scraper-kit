// Client report: every pitched business grouped by where it stands, with everything we know and the next move.
import { getRaw } from "../db";

export type Group = "interested" | "conversation" | "not_replied" | "not_interested" | "not_contacted";
export const GROUPS: { id: Group; label: string; next: string }[] = [
  { id: "interested", label: "Interested", next: "Follow the closing blueprint: call today." },
  { id: "conversation", label: "In conversation", next: "They replied; the agent answered. Read the thread and step in." },
  { id: "not_replied", label: "Not replied yet", next: "Follow-up is scheduled. Forward the voice note on WhatsApp if they have a mobile." },
  { id: "not_interested", label: "Not interested", next: "Never contact again (on the suppression list)." },
  { id: "not_contacted", label: "Not contacted yet", next: "Pitch is ready: send the email or forward the voice note." },
];

const groupOf = (stage: string): Group =>
  stage === "interested" || stage === "won" ? "interested" : stage === "replied" ? "conversation" : stage === "contacted" ? "not_replied" : stage === "lost" ? "not_interested" : "not_contacted";

export interface ClientRow {
  id: number;
  group: Group;
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  emailStatus: string | null;
  website: string | null;
  address: string | null;
  rating: number | null;
  reviews: number | null;
  score: number | null;
  scoreReason: string | null;
  hours: Record<string, string[]> | null;
  idea: string | null;
  ideaPitch: string | null;
  whyNeeded: string | null;
  subject: string | null;
  pitch: string | null;
  voiceScript: string | null;
  conversation: { from: "owner" | "us"; text: string; at: number | null; intent: string | null }[];
  lastIntent: string | null;
  hasDemoSite: boolean;
  closing: Record<string, unknown> | null;
  next: string;
}

const RANK: Record<string, number> = { ready: 1, contacted: 2, replied: 3, lost: 3, interested: 4, won: 5 };

export function clientReport(campaignId?: number): Record<Group, ClientRow[]> {
  const raw = getRaw();
  const leads = raw
    .prepare(
      `SELECT id, place_key, name, category, phone, email, email_status, website, address, rating, review_count, score, score_reason, stage, evidence_json, page_json, closing_json
       FROM leads WHERE stage != 'found' ${campaignId ? "AND campaign_id = ?" : ""} ORDER BY id DESC`,
    )
    .all(...(campaignId ? [campaignId] : [])) as Record<string, unknown>[];
  // The same shop can appear in several campaigns: keep its most advanced record.
  const best = new Map<string, Record<string, unknown>>();
  for (const l of leads) {
    const k = String(l.place_key);
    const cur = best.get(k);
    if (!cur || (RANK[String(l.stage)] ?? 0) > (RANK[String(cur.stage)] ?? 0)) best.set(k, l);
  }
  const out: Record<Group, ClientRow[]> = { interested: [], conversation: [], not_replied: [], not_interested: [], not_contacted: [] };
  for (const l of best.values()) {
    const id = Number(l.id);
    const idea = raw.prepare(`SELECT title, pitch_line FROM ideas WHERE lead_id = ? AND verdict = 'chosen' LIMIT 1`).get(id) as { title: string; pitch_line: string } | undefined;
    const pitch = raw
      .prepare(`SELECT subject, body, why_needed, voice_script FROM messages WHERE lead_id = ? AND kind = 'initial' AND direction = 'out' ORDER BY id DESC LIMIT 1`)
      .get(id) as { subject: string; body: string; why_needed: string | null; voice_script: string | null } | undefined;
    const convo = raw
      .prepare(`SELECT direction, body, sent_at, intent FROM messages WHERE lead_id = ? AND kind = 'reply' ORDER BY id`)
      .all(id) as { direction: string; body: string; sent_at: number | null; intent: string | null }[];
    const voice = raw.prepare(`SELECT voice_script FROM messages WHERE lead_id = ? AND kind = 'draft' ORDER BY id DESC LIMIT 1`).get(id) as { voice_script: string } | undefined;
    const ev = JSON.parse(String(l.evidence_json ?? "{}"));
    const g = groupOf(String(l.stage));
    out[g].push({
      id,
      group: g,
      name: String(l.name),
      category: (l.category as string) ?? null,
      phone: (l.phone as string) ?? null,
      email: (l.email as string) ?? null,
      emailStatus: (l.email_status as string) ?? null,
      website: (l.website as string) ?? null,
      address: (l.address as string) ?? null,
      rating: (l.rating as number) ?? null,
      reviews: (l.review_count as number) ?? null,
      score: (l.score as number) ?? null,
      scoreReason: (l.score_reason as string) ?? null,
      hours: ev.hours ?? null,
      idea: idea?.title ?? null,
      ideaPitch: idea?.pitch_line ?? null,
      whyNeeded: pitch?.why_needed ?? null,
      subject: pitch?.subject ?? null,
      pitch: pitch?.body ?? null,
      voiceScript: voice?.voice_script ?? pitch?.voice_script ?? null,
      conversation: convo.map((m) => ({ from: m.direction === "in" ? "owner" : "us", text: m.body, at: m.sent_at, intent: m.intent })),
      lastIntent: [...convo].reverse().find((m) => m.direction === "in")?.intent ?? null,
      hasDemoSite: !!l.page_json,
      closing: l.closing_json ? JSON.parse(String(l.closing_json)) : null,
      next: GROUPS.find((x) => x.id === g)!.next,
    });
  }
  for (const g of Object.keys(out) as Group[]) out[g].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return out;
}

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function clientCsv(campaignId?: number): string {
  const r = clientReport(campaignId);
  const cols = ["group", "name", "category", "phone", "email", "website", "address", "rating", "reviews", "score", "idea", "why_needed", "pitch_subject", "pitch", "last_reply", "intent", "next_action", "closing_next_step"];
  const lines = [cols.join(",")];
  for (const g of GROUPS) {
    for (const c of r[g.id]) {
      const lastReply = [...c.conversation].reverse().find((m) => m.from === "owner")?.text ?? "";
      lines.push(
        [g.label, c.name, c.category, c.phone, c.email, c.website, c.address, c.rating, c.reviews, c.score, c.idea, c.whyNeeded, c.subject, c.pitch, lastReply, c.lastIntent, c.next, (c.closing?.summary as string) ?? ""]
          .map(esc)
          .join(","),
      );
    }
  }
  return lines.join("\n");
}
