import { z } from "zod";

// Every agent's output is one of these schemas (BUILD_PLAN §12).

export const PlannerOut = z.object({
  keywords: z.array(z.string().min(3)).min(1).max(3).describe('Google Maps searches with the area baked in, e.g. "salon in Vanasthalipuram Hyderabad"'),
  area: z.string().describe("neighbourhood or locality to search"),
  city: z.string().describe("city"),
  why: z.string().describe("one line: why these searches fit the service; say plainly if the clients are not places or the fit is weak"),
  clients_are_places: z.boolean().describe("false if the clients are not physical businesses on Google Maps (e.g. startups, students)"),
  service_fit: z.enum(["good", "weak"]).describe("weak if the service makes little sense for these clients"),
  concrete_offers: z.array(z.string()).max(3).describe("if the service is vague, 2-3 concrete offers it could mean; else empty"),
});
export type PlannerOut = z.infer<typeof PlannerOut>;

export const StrategistOut = z.object({
  ideas: z
    .array(
      z.object({
        title: z.string().describe("catchy, at most 6 words"),
        customer_gets: z.string().describe("what the business's CUSTOMERS get, at most 14 words"),
        builds_on: z.string().describe("the evidence key this idea builds on, e.g. no_own_website, rating, review_count, rivals_with_website"),
        how_service_delivers: z.string().describe("how the freelancer's service delivers it, at most 12 words"),
      }),
    )
    .min(3)
    .max(8),
});
export type Idea = z.infer<typeof StrategistOut>["ideas"][number];

// Compact on purpose: 8 scored ideas must fit the per-lead output budget.
export const CriticOut = z.object({
  scores: z
    .array(
      z.object({
        i: z.number().int().min(0).max(7).describe("idea index"),
        s: z.string().regex(/^[1-5](,[1-5]){4}$/).describe('scores "creative,specific,grounded,deliverable,not_present", each 1-5, e.g. "4,5,3,4,5"'),
        keep: z.boolean(),
        why: z.string().describe("at most 10 words"),
      }),
    )
    .max(8),
  best: z.array(z.number().int().min(0).max(7)).max(2).describe("indexes of the best 2 kept ideas"),
});
export interface CriticScore {
  idx: number;
  creative: number;
  specific: number;
  grounded: number;
  deliverable: number;
  not_present: number;
  verdict: "keep" | "reject";
  reason: string;
}
export function expandScores(out: z.infer<typeof CriticOut>): CriticScore[] {
  return out.scores.map((x) => {
    const n = x.s.split(",").map(Number);
    return {
    idx: x.i,
    creative: n[0],
    specific: n[1],
    grounded: n[2],
    deliverable: n[3],
    not_present: n[4],
    verdict: x.keep ? ("keep" as const) : ("reject" as const),
    reason: x.why,
    };
  });
}

export const TwinOut = z.object({
  verdicts: z.array(
    z.object({
      idx: z.number().int(),
      would_reply: z.enum(["yes", "no"]),
      objection: z.string().describe("the one objection, at most 15 words"),
      what_would_change_my_mind: z.string().describe("at most 15 words"),
    }),
  ),
});
export type TwinVerdict = z.infer<typeof TwinOut>["verdicts"][number];

export const ComposerOut = z.object({
  subject: z.string().describe("short email subject, no clickbait"),
  why_needed: z.string().describe("the one evidence-backed reason this business needs the idea, at most 25 words"),
  body: z.string().describe("the message, under 90 words, ending with the opt-out line"),
  principles: z
    .array(
      z.object({
        line: z.string(),
        principle: z.enum(["specific_observation", "loss_aversion", "curiosity", "local_social_proof", "reciprocity", "low_effort_next_step", "respect"]),
      }),
    )
    .max(8),
  voice_script: z.string().describe("at most 55 words: the idea and the offer only; no business name, no ratings, no Maps data"),
});
export type ComposerOut = z.infer<typeof ComposerOut>;

export const ClaimCheckOut = z.object({
  ok: z.boolean(),
  cut_sentences: z.array(z.string()).max(5).describe("sentences stating a fact that is NOT in the evidence, copied exactly"),
});
