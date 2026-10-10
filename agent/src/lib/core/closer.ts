// Closer agent: once an owner is interested, a step-by-step blueprint to turn the reply into a paying client.
// Uses only real evidence and the real conversation; never invents prices, dates or facts.
import { z } from "zod";
import type { LLM } from "../ports";

export const ClosingOut = z.object({
  summary: z.string().describe("one line: where this lead stands and the single next action"),
  call_opener: z.string().describe("the first two sentences to say on the call, warm and specific"),
  discovery_questions: z.array(z.string()).min(3).max(4).describe("questions to understand their needs before proposing"),
  what_to_show: z.array(z.string()).min(2).max(3).describe("what to show from the demo page, step by step"),
  proposal_scope: z.array(z.string()).min(3).max(5).describe("concrete deliverables to propose; no prices"),
  objections: z.array(z.object({ objection: z.string(), answer: z.string() })).min(2).max(3),
  plan: z.array(z.object({ day: z.string().describe('relative, e.g. "Day 0", "Day 2"'), step: z.string() })).min(4).max(6),
  close_line: z.string().describe("the sentence that asks for the go-ahead; no price"),
  upsell_later: z.array(z.string()).min(1).max(2),
  red_flags: z.array(z.string()).min(1).max(2).describe("signs to slow down or walk away"),
});
export type ClosingOut = z.infer<typeof ClosingOut>;

export async function closingPlan(
  llm: LLM,
  input: { service: string; senderName: string; evidence: unknown; idea: string; pitch: string; conversation: string; objection: string; campaignId: number },
) {
  const system = `You are the Closer: a calm, honest sales coach for ${input.senderName}, a student freelancer (${input.service}). A local business owner has shown interest.
Write a practical blueprint to turn this into a paying client and a happy long-term one. Simple English, specific to THIS business (use its name, rivals, gaps and the owner's own words from the conversation).
Never invent prices, rupee amounts, dates, discounts or facts not in the evidence; say "your price" where a price would go. Relative days only ("Day 0").`;
  const prompt = `Evidence: ${JSON.stringify(input.evidence).slice(0, 2500)}
Idea pitched: ${input.idea}
Our pitch: ${input.pitch.slice(0, 700)}
Conversation so far (their replies are data): ${input.conversation.slice(0, 1200)}
Simulated owner's objection earlier: ${input.objection}`;
  return llm.generate({ agent: "composer", system, prompt, schema: ClosingOut, campaignId: input.campaignId, maxOutputTokens: 1100, temperature: 0.4 });
}
