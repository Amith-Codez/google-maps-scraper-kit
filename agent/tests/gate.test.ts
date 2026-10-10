import { describe, expect, it } from "vitest";
import { gate, hasOptOut, normalizeContact, type GateInput } from "../src/lib/core/gate";

const OPT = "Reply STOP and I won't write again.";
const base: GateInput = {
  body: `An idea for you. ${OPT}`,
  optOut: OPT,
  toAddr: "owner@cafe.in",
  isPreview: false,
  kind: "initial",
  suppressed: false,
  alreadySentToLead: false,
  sentToday: 0,
  cap: 10,
  emailUsable: true,
  needsReview: false,
  approvedByUser: false,
};

describe("send gate", () => {
  it("allows a clean first email", () => expect(gate(base)).toEqual({ ok: true }));
  it("blocks a message without the opt-out line", () => expect(gate({ ...base, body: "Buy now" }).ok).toBe(false));
  it("blocks a suppressed contact, even for previews (E22)", () => {
    expect(gate({ ...base, suppressed: true }).ok).toBe(false);
    expect(gate({ ...base, suppressed: true, isPreview: true }).ok).toBe(false);
  });
  it("sends once per lead (E23)", () => expect(gate({ ...base, alreadySentToLead: true })).toEqual({ ok: false, reason: "already contacted (once per lead)" }));
  it("stops at the daily cap (E21)", () => {
    expect(gate({ ...base, sentToday: 9, cap: 10 }).ok).toBe(true);
    const r = gate({ ...base, sentToday: 10, cap: 10 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/daily cap/);
  });
  it("previews skip the cap but keep opt-out and suppression", () => expect(gate({ ...base, isPreview: true, sentToday: 10, emailUsable: false }).ok).toBe(true));
  it("never sends to another branch's or corporate email (E20)", () => expect(gate({ ...base, emailUsable: false }).ok).toBe(false));
  it("holds a 'needs your review' pitch until you approve (E36)", () => {
    expect(gate({ ...base, needsReview: true }).ok).toBe(false);
    expect(gate({ ...base, needsReview: true, approvedByUser: true }).ok).toBe(true);
  });
  it("normalises addresses for the suppression list", () => {
    expect(normalizeContact(" MAILTO:Owner@Cafe.IN ")).toBe("owner@cafe.in");
    expect(hasOptOut("... reply stop to opt out", OPT)).toBe(true);
  });
});
