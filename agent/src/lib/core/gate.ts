// The send gate (BUILD_PLAN §2, §3.9): pure rules, checked inside the same transaction that claims a send.

export interface GateInput {
  body: string;
  optOut: string;
  toAddr: string | null;
  isPreview: boolean;
  kind: "initial" | "follow_up" | "reply" | "preview";
  suppressed: boolean;
  alreadySentToLead: boolean; // a non-preview message of this kind already went to this lead
  sentToday: number;
  cap: number;
  emailUsable: boolean;
  needsReview: boolean;
  approvedByUser: boolean;
}

export type GateResult = { ok: true } | { ok: false; reason: string };

export function hasOptOut(body: string, optOut: string): boolean {
  const b = body.toLowerCase();
  return b.includes(optOut.toLowerCase()) || /reply\s+stop/.test(b);
}

export function gate(g: GateInput): GateResult {
  if (!g.toAddr) return { ok: false, reason: "no address" };
  if (!hasOptOut(g.body, g.optOut)) return { ok: false, reason: "missing opt-out line" };
  if (g.suppressed) return { ok: false, reason: "contact is on the never-contact-again list" };
  if (g.isPreview) return { ok: true }; // previews go to an inbox you typed; not counted in the cap
  if (!g.emailUsable) return { ok: false, reason: "email isn't this business's own (branch/corporate check)" };
  if (g.alreadySentToLead) return { ok: false, reason: "already contacted (once per lead)" };
  if (g.kind === "initial" && g.needsReview && !g.approvedByUser) return { ok: false, reason: "needs your review before sending" };
  if (g.sentToday >= g.cap) return { ok: false, reason: `daily cap reached (${g.sentToday}/${g.cap})` };
  return { ok: true };
}

export function startOfToday(now = new Date()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const normalizeContact = (c: string) => c.trim().toLowerCase().replace(/^mailto:/, "");
