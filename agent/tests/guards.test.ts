import { describe, expect, it } from "vitest";
import { claimCheck, ensureOptOut, genericPhrase, stripVoiceScript, trimWords, wordCount } from "../src/lib/core/guards";
import { applyCriticRules } from "../src/lib/core/arena";
import type { CriticScore } from "../src/lib/schemas";

const OPT = "Reply STOP and I won't write again.";

describe("generic filter", () => {
  it("catches the organisers' banned pitches", () => {
    expect(genericPhrase("We'll build you a website")).toBe("build you a website");
    expect(genericPhrase("Boost your online presence")).toBe("online presence");
    expect(genericPhrase("Local SEO package")).toBe("seo");
    expect(genericPhrase("Social media marketing for cafés")).toBe("social media marketing");
  });
  it("lets specific ideas through", () => {
    expect(genericPhrase("A pre-order page for the Sunday biryani so regulars skip the queue")).toBeNull();
    expect(genericPhrase("Virtual hairstyle try-on before booking")).toBeNull();
    expect(genericPhrase("Seoul-style menu")).toBeNull(); // "SEO" only as a whole word
  });
  it("critic rules reject generic ideas and any score below 3, whatever the model said", () => {
    const ideas = [
      { title: "Build you a website", customer_gets: "x", builds_on: "gap", how_service_delivers: "y" },
      { title: "Biryani pre-order page", customer_gets: "skip the queue", builds_on: "gap: pre-order", how_service_delivers: "a page" },
      { title: "Dish-of-the-day menu", customer_gets: "see dishes", builds_on: "issue: no menu", how_service_delivers: "a page" },
    ];
    const s = (idx: number, low = 4): CriticScore => ({ idx, creative: 4, specific: low, grounded: 4, deliverable: 5, not_present: 5, verdict: "keep", reason: "ok" });
    const out = applyCriticRules(ideas, [s(0), s(1), s(2, 2)]);
    expect(out.map((o) => o.keep)).toEqual([false, true, false]);
    expect(out[0].reason).toMatch(/Generic/);
  });
});

describe("claim check", () => {
  const allowed = new Set(["612", "4.6", "3", "22", "2"]);
  it("keeps sentences whose numbers are in the evidence", () => {
    const r = claimCheck("You have 612 reviews at 4.6. 3 of 22 cafés nearby take bookings online.", allowed, OPT);
    expect(r.ok).toBe(true);
    expect(r.cut).toHaveLength(0);
  });
  it("cuts a sentence with a made-up number (E18)", () => {
    const r = claimCheck("You have 612 reviews. Sites like this raise sales by 40%. Reply YES for a 2-minute demo.", allowed, OPT);
    expect(r.cut).toEqual(["Sites like this raise sales by 40%."]);
    expect(r.body).not.toMatch(/40%/);
  });
  it("always ends with exactly one opt-out line", () => {
    const b = ensureOptOut(`Hello. ${OPT}`, OPT);
    expect(b.endsWith(OPT)).toBe(true);
    expect(b.split("STOP").length).toBe(2);
  });
  it("trims to the word limit by whole sentences", () => {
    const long = Array.from({ length: 20 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
    expect(wordCount(trimWords(long, 90))).toBeLessThanOrEqual(90);
  });
});

describe("voice script", () => {
  it("strips the business name and ratings (E39)", () => {
    const r = stripVoiceScript("Hi, Mana Katha Cafe is rated 4.6 stars. I have an idea for a pre-order page. Want a demo?", "Mana Katha Cafe & Restaurant");
    expect(r.script).toBe("I have an idea for a pre-order page. Want a demo?");
    expect(r.stripped).toHaveLength(1);
  });
});

import { sanitizeBody } from "../src/lib/core/guards";
describe("message sanitizer", () => {
  it("cuts money talk, generic phrases, insults and leaked labels; keeps the demo offer", () => {
    const r = sanitizeBody(
      "specific_observation: Your 178 reviews show customers love you. There are never any monthly costs. You're missing an online presence. 16 of 17 rivals are rated higher than you. Reply YES and I'll send a free 2-minute demo.",
    );
    expect(r.body).toBe("Your 178 reviews show customers love you. Reply YES and I'll send a free 2-minute demo.");
    expect(r.cut).toHaveLength(3);
  });
});
