// Pure guardrail rules (no I/O). Unit-tested in tests/.

export const GENERIC_PHRASES = [
  "build you a website",
  "build a website",
  "online presence",
  "boost sales",
  "boost your sales",
  "seo",
  "search engine optimization",
  "social media marketing",
  "digital marketing",
  "grow your business",
  "increase visibility",
  "reach more customers",
];

/** Returns the generic phrase found in the text, if any (whole-word match for short ones like "SEO"). */
export function genericPhrase(text: string): string | null {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ")} `;
  for (const p of GENERIC_PHRASES) if (t.includes(` ${p} `)) return p;
  return null;
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

/**
 * Claim check, code first: every number in a sentence must exist in the evidence (or the allowed set).
 * Sentences with an unbacked number are cut. The opt-out sentence is always kept.
 */
export function claimCheck(body: string, allowed: Set<string>, optOut: string) {
  const kept: string[] = [];
  const cut: string[] = [];
  for (const s of splitSentences(body)) {
    if (optOut && s.toLowerCase().includes("stop")) {
      kept.push(s);
      continue;
    }
    const nums = s.match(/\d+(?:\.\d+)?/g) ?? [];
    const bad = nums.filter((n) => !allowed.has(n) && !allowed.has(String(Number(n))));
    if (bad.length) cut.push(s);
    else kept.push(s);
  }
  return { ok: cut.length === 0, body: kept.join(" "), cut };
}

/** Makes sure the opt-out line is present exactly once, at the end. */
export function ensureOptOut(body: string, optOut: string): string {
  const withoutStop = splitSentences(body).filter((s) => !/reply stop|stop\b.*(write|contact|message)/i.test(s));
  return `${withoutStop.join(" ")}\n\n${optOut}`.trim();
}

/** Trims to at most `max` words by dropping whole sentences from the end (opt-out is re-added later). */
export function trimWords(body: string, max: number): string {
  const sentences = splitSentences(body);
  while (sentences.length > 1 && wordCount(sentences.join(" ")) > max) sentences.pop();
  return sentences.join(" ");
}

/** Voice scripts carry only the idea and the offer: strip the business name, ratings and review counts. */
export function stripVoiceScript(script: string, businessName: string): { script: string; stripped: string[] } {
  const name = businessName.toLowerCase();
  const firstWord = name.split(/[\s\-–,&]+/).find((w) => w.length >= 4) ?? "";
  const stripped: string[] = [];
  const kept = splitSentences(script).filter((s) => {
    const l = s.toLowerCase();
    const bad =
      (name && l.includes(name)) ||
      (firstWord && new RegExp(`\\b${firstWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(l)) ||
      /\b\d(\.\d)?\s*(★|stars?|rating|rated)\b|\brated\b|\breviews?\b|\bgoogle maps\b/i.test(s);
    if (bad) stripped.push(s);
    return !bad;
  });
  return { script: kept.join(" "), stripped };
}
