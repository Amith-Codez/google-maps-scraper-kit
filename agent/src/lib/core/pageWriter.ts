// Page writer: copy for the demo website Pitchwala builds for each business ("we built it before we asked").
// Facts come only from the evidence; no invented dishes, prices, dates or reviews.
import { z } from "zod";
import type { LLM } from "../ports";
import type { Evidence } from "./evidence";

export const PageOut = z.object({
  headline: z.string().describe("customer-facing hero headline, at most 9 words, about what customers get"),
  subheadline: z.string().describe("at most 20 words, warm, specific to this place"),
  feature_title: z.string().describe("the idea as a website section title, at most 6 words"),
  steps: z.array(z.string().describe("how it works for a customer, at most 10 words")).length(3),
  cta: z.string().describe("button label, at most 4 words, e.g. 'Pre-order now'"),
  owner_note: z.string().describe("one line to the OWNER: why this helps them, citing a real fact from the evidence, at most 28 words"),
});
export type PageOut = z.infer<typeof PageOut>;

export async function writePage(llm: LLM, input: { evidence: Evidence; ideaTitle: string; idea: string; how: string; service: string; campaignId: number }) {
  const system = `You write the copy for a one-page demo website that a freelancer (${input.service}) built for a local business, showing the idea live.
The page speaks to the business's CUSTOMERS, except owner_note which speaks to the owner.
Use only facts in the evidence. Never invent dishes, menu items, prices, dates, offers, awards or reviews; say "your favourites" / "signature dishes" instead of naming items. No superlatives or rankings ("best", "top-rated", "#1", "in Hyderabad") — let the real rating speak. Simple, warm Indian English.`;
  const prompt = `Evidence: ${JSON.stringify({ ...input.evidence, site_snippet: input.evidence.site_snippet?.slice(0, 200) })}
Idea: ${input.ideaTitle}: ${input.idea} (${input.how})`;
  return llm.generate({ agent: "composer", system, prompt, schema: PageOut, campaignId: input.campaignId, maxOutputTokens: 400, temperature: 0.6 });
}
