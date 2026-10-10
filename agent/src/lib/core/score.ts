// Opportunity score (0-100) with a one-line reason. Plain code from the evidence and rival stats; no AI.

export interface ScoreInput {
  phone: string | null;
  website: string | null;
  websiteKind?: string | null;
  email?: string | null;
  rating: number | null;
  reviewCount: number | null;
}

export interface RivalStats {
  count: number;
  medianRating: number | null;
  withWebsite: number;
  withBooking?: number;
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function rivalStats(all: ScoreInput[]): RivalStats {
  return {
    count: all.length,
    medianRating: median(all.map((l) => l.rating).filter((r): r is number => r !== null)),
    withWebsite: all.filter((l) => !!l.website).length,
  };
}

/** Indian mobile numbers (10 digits starting 6-9) can receive a WhatsApp draft; landlines can't. */
export function isMobile(phone: string | null): boolean {
  if (!phone) return false;
  const d = phone.replace(/\D/g, "").replace(/^(91|0)/, "");
  return /^[6-9]\d{9}$/.test(d);
}

export function channelFor(l: { email?: string | null; emailStatus?: string | null; phone: string | null }): "email" | "whatsapp" | "none" {
  if (l.email && l.emailStatus === "usable") return "email";
  if (isMobile(l.phone)) return "whatsapp";
  return "none";
}

export function opportunityScore(l: ScoreInput, rivals: RivalStats): { score: number; reason: string } {
  let s = 35;
  const why: string[] = [];

  const reachable = !!l.email || !!l.phone;
  if (l.email) {
    s += 15;
    why.push("email");
  } else if (isMobile(l.phone)) {
    s += 12;
    why.push("phone only");
  } else if (l.phone) {
    s += 5;
    why.push("landline only");
  } else why.push("no contact");

  if (!l.website) {
    s += 12;
    why.push("no website");
  } else if (l.websiteKind && l.websiteKind !== "own") {
    s += 8;
    why.push(`${l.websiteKind} page only`);
  }

  if (l.rating !== null) {
    if (l.rating >= 4.3) s += 12;
    else if (l.rating >= 4.0) s += 6;
    else if (l.rating < 3.5) s -= 10;
    why.push(`${l.rating.toFixed(1)}★`);
  }
  if (l.reviewCount !== null) {
    if (l.reviewCount >= 200) s += 12;
    else if (l.reviewCount >= 50) s += 8;
    else if (l.reviewCount >= 15) s += 4;
    why.push(`${l.reviewCount} reviews`);
  }

  if (rivals.count > 1 && rivals.withWebsite > 0 && !l.website) {
    why.push(`${rivals.withWebsite} of ${rivals.count} nearby list a website`);
  }
  if (!reachable) s = Math.min(s, 20);
  return { score: Math.max(0, Math.min(100, Math.round(s))), reason: why.join(" · ") };
}
