// The Idea Arena (BUILD_PLAN §7, §12): Strategist → Critic → Owner Twin → Composer → Twin again.
// Core logic: depends only on the LLM port and pure guards, never on a vendor SDK.
import type { LLM } from "../ports";
import { ClaimCheckOut, ComposerOut, CriticOut, StrategistOut, TwinOut, type CriticScore, type Idea, type TwinVerdict } from "../schemas";
export { expandScores } from "../schemas";
import type { Evidence } from "./evidence";
import { genericPhrase } from "./guards";

const LANG: Record<string, string> = { en: "English", hi: "Hindi (Devanagari)", te: "Telugu (Telugu script)" };

const BAR = `Quality bar from the organisers: a salon doesn't get "we'll build you a website"; it gets "a virtual hairstyle try-on so customers preview a cut before booking".`;

export interface ArenaCtx {
  llm: LLM;
  leadId: number;
  campaignId: number;
  service: string;
  language: string;
  senderName: string;
  optOut: string;
  evidence: Evidence;
}

const ev = (e: Evidence) => JSON.stringify(e);

export async function strategist(ctx: ArenaCtx, avoid: string[] = []) {
  const system = `You are the Strategist. Invent 8 creative ideas for ONE local business, each a small product its CUSTOMERS would love, that the freelancer's service can deliver.
${BAR}
How to think: start from what makes THIS place special in the evidence (e.g. a 4.6 rating from 612 reviews means a much-loved place whose fans would share it; no own website means customers can't see the menu or book before visiting; rivals nearby with websites or booking show what customers here already expect). Turn that into something delightful the customers would use or share, made with the freelancer's skill.
Rules: every idea must close one of evidence.gaps, fix one of evidence.issues, or build on a stated strength, so there is a solid reason the owner needs it; builds_on names that gap/issue in a few words (e.g. "gap: online booking", "issue: no menu online"); no two ideas alike; never pitch "a website", "online presence", "SEO", "social media marketing", "digital marketing" or "boost sales"; don't propose what the business already has (check online_booking_link, whatsapp_link, website_kind). Titles at most 6 words. Be concrete and specific to this business type. English. Keep every field short; output compact JSON.`;
  const prompt = `Freelancer's service: ${ctx.service}
Evidence (JSON, the only facts you may use): ${ev(ctx.evidence)}${avoid.length ? `\nThese were rejected as generic; do better: ${avoid.join("; ")}` : ""}`;
  return ctx.llm.generate({ agent: "strategist", system, prompt, schema: StrategistOut, leadId: ctx.leadId, campaignId: ctx.campaignId, maxOutputTokens: 750, temperature: 0.9 });
}

export async function critic(ctx: ArenaCtx, ideas: Idea[]) {
  const system = `You are the Critic. Score each idea 1-5 on: creative (would surprise the owner), specific (to THIS business), grounded (builds on a real evidence fact), deliverable (by the freelancer's service), not_present (the business doesn't already have it).
"grounded" means the idea closes a real gap or issue in the evidence (the top rivals have it, this business doesn't) or builds on a stated strength; with no such reason, grounded is 1.
keep=false for any idea that could be sent to any business, has no solid evidence-backed reason, uses a generic phrase, or scores below 3 anywhere. "why" at most 10 words. Pick the best 2 kept ideas. Output compact JSON.
${BAR}`;
  const prompt = `Service: ${ctx.service}
Evidence: ${ev(ctx.evidence)}
Ideas: ${JSON.stringify(ideas.map((i, idx) => ({ idx, title: i.title, customer_gets: i.customer_gets, builds_on: i.builds_on })))}`;
  return ctx.llm.generate({ agent: "critic", system, prompt, schema: CriticOut, leadId: ctx.leadId, campaignId: ctx.campaignId, maxOutputTokens: 500, temperature: 0.2 });
}

/** Code-side enforcement of the Critic's rules: generic phrase or any score < 3 → reject. */
export function applyCriticRules(ideas: Idea[], scores: CriticScore[]) {
  return ideas.map((idea, idx) => {
    const s = scores.find((x) => x.idx === idx);
    const generic = genericPhrase(`${idea.title} ${idea.customer_gets} ${idea.how_service_delivers}`);
    const low = s ? Math.min(s.creative, s.specific, s.grounded, s.deliverable, s.not_present) < 3 : true;
    const keep = !!s && s.verdict === "keep" && !generic && !low;
    const total = s ? s.creative + s.specific + s.grounded + s.deliverable + s.not_present : 0;
    const reason = generic ? `Generic: "${generic}"` : !s ? "Not scored" : s.reason;
    return { idea, idx, score: s ?? null, total, keep, reason };
  });
}

export async function ownerTwin(ctx: ArenaCtx, pitches: { idx: number; pitch: string }[]) {
  const system = `You role-play the owner of this type of local business in India: busy, practical, gets many sales messages and ignores generic ones. Use ONLY the evidence; never invent facts about yourself.
You would reply "YES, show me the free demo" only if the message is clearly about YOUR place, the idea would bring or please your customers, and replying costs you nothing (no meeting, no money, no work). Answer honestly for each pitch: would you reply? The one objection you'd still have (at most 15 words) and what would change your mind (at most 15 words).`;
  const prompt = `Your business (evidence): ${ev(ctx.evidence)}
Pitches: ${JSON.stringify(pitches)}`;
  return ctx.llm.generate({ agent: "twin", system, prompt, schema: TwinOut, leadId: ctx.leadId, campaignId: ctx.campaignId, maxOutputTokens: 200, temperature: 0.4 });
}

export async function composer(ctx: ArenaCtx, idea: Idea, twin: TwinVerdict | null) {
  const system = `You are the Composer. Write a short first message from ${ctx.senderName}, a student freelancer, to the owner of this business, in ${LANG[ctx.language] ?? "English"}.
Rules:
- Under 85 words. One real fact about their business, one idea, one question. No hype, no prices, no dates, no promises of results.
- The FIRST sentence is a warm, true observation from the evidence (e.g. how many reviews they have and their rating = customers love them), never an insult or "you lack". Only mention websites if the service builds websites; use rival counts only when they relate to the idea.
- Make clear the freelancer does all the work and the 2-minute demo is free; the owner only has to reply. Never say the work itself is free or "at no cost", and never mention money.
- Structure: (1) a warm true observation; (2) WHY THEY NEED IT: one line with a solid reason from evidence.gaps or evidence.issues, using the real rival numbers (you may name one top rival from evidence.top_rivals, politely, e.g. "2 of the 3 best-rated cafés near you, like X, already let customers book online"); (3) the idea and what their customers get; (4) the offer; (5) the opt-out line.
- Use these persuasion principles and tag each line: specific_observation (one real fact from the evidence), local_social_proof (only if a rival count in the evidence supports it, e.g. "rivals_with_website of rivals_nearby cafés within rivals_radius_km km"), reciprocity (say you have already sketched this idea specifically for their place; never claim anything is attached), low_effort_next_step ("Reply YES and I'll send a 2-minute demo"), respect (end with exactly: "${ctx.optOut}").
- Every number you write must appear in the evidence. Never mention Google, scraping or ratings as a compliment-trick.
- If an owner objection is given, answer it inside the message without arguing.
- voice_script: at most 55 words, for a WhatsApp voice note: say it's an AI-made voice note from ${ctx.senderName}, explain the idea and the offer of a free 2-minute demo only (never say the work is free). NO business name, NO ratings, NO review counts, NO addresses.`;
  const prompt = `Service: ${ctx.service}
Evidence: ${ev(ctx.evidence)}
Idea: ${JSON.stringify(idea)}${twin ? `\nOwner objection to answer: ${twin.objection} (what would change their mind: ${twin.what_would_change_my_mind})` : ""}`;
  return ctx.llm.generate({ agent: "composer", system, prompt, schema: ComposerOut, leadId: ctx.leadId, campaignId: ctx.campaignId, maxOutputTokens: 500, temperature: 0.6 });
}

/** Claim check, model second (code already checked numbers): flags sentences whose facts aren't in the evidence. */
export async function modelClaimCheck(ctx: ArenaCtx, body: string) {
  const system = `You check a sales message against evidence. List any sentence that states a FACT about the business or its area that the evidence does not support (copy it exactly). Opinions, the idea itself, offers and questions are fine. If all facts are supported, ok=true and an empty list.`;
  const prompt = `Evidence: ${ev(ctx.evidence)}\nMessage: ${body}`;
  return ctx.llm.generate({ agent: "claimcheck", system, prompt, schema: ClaimCheckOut, leadId: ctx.leadId, campaignId: ctx.campaignId, maxOutputTokens: 150, temperature: 0 });
}
