import { describe, expect, it } from "vitest";
import { classifyEmails, extractFacts, websiteKind } from "../src/lib/enrich";
import { channelFor, isMobile, opportunityScore, rivalStats } from "../src/lib/core/score";

describe("email branch check", () => {
  it("accepts the business's own domain or a personal mailbox", () => {
    expect(classifyEmails(["info@theeliteclasses.com"], { url: "https://www.theeliteclasses.com/", kind: "own" }).status).toBe("usable");
    expect(classifyEmails(["gnk9654@gmail.com"], { url: "https://gnk.com", kind: "own" }).status).toBe("usable");
  });
  it("rejects chain/corporate sites and branch directories (E20)", () => {
    expect(classifyEmails(["care@lakmeindia.com"], { url: "https://lakmeindia.com/x", kind: "chain" }).status).toBe("corporate");
    const many = ["a@naturals.in", "b@naturals.in", "c@naturals.in", "d@naturals.in"];
    expect(classifyEmails(many, { url: "https://example-salon.in", kind: "own" }).status).toBe("other_branch");
  });
  it("repairs text-glued addresses", () => {
    expect(classifyEmails(["8185910485sktuitionshub@gmail.com"], { url: "https://sk.com", kind: "own" }).email).toBe("sktuitionshub@gmail.com");
    expect(classifyEmails(["care@magicpin.inpopular"], { url: null, kind: "listing" }).email).toBe("care@magicpin.in");
  });
});

describe("website kind (E13)", () => {
  it("tells own sites from Instagram, WhatsApp links, listings and chains", () => {
    expect(websiteKind("https://www.instagram.com/waffleonia")).toBe("instagram");
    expect(websiteKind("https://wa.link/abc")).toBe("whatsapp");
    expect(websiteKind("https://www.zomato.com/hyderabad/x")).toBe("listing");
    expect(websiteKind("https://lakmeindia.com/salon")).toBe("chain");
    expect(websiteKind("http://poleyscafe.in/")).toBe("own");
    expect(websiteKind("https://shared.in", new Set(["shared.in"]))).toBe("chain");
    expect(websiteKind(null)).toBe("none");
  });
  it("reads booking, WhatsApp and Instagram links from HTML", () => {
    const f = extractFacts(
      `<html><body><a href="https://wa.me/919999999999">Chat</a><a href="/book-a-table">Reserve</a><a href="https://instagram.com/x">IG</a><p>Our menu</p></body></html>`,
      "https://cafe.in/",
    );
    expect(f.whatsapp).toContain("wa.me");
    expect(f.booking).toBe("https://cafe.in/book-a-table");
    expect(f.instagram).toContain("instagram.com");
    expect(f.menu).toBe(true);
  });
});

describe("opportunity score and channel", () => {
  it("phone-only businesses get the WhatsApp channel; landlines get none", () => {
    expect(isMobile("09121612356")).toBe(true);
    expect(isMobile("040 2412 3456")).toBe(false);
    expect(channelFor({ phone: "+91 91216 12356" })).toBe("whatsapp");
    expect(channelFor({ phone: "09121612356", email: "a@b.in", emailStatus: "usable" })).toBe("email");
  });
  it("ranks a loved, unreachable-online business high with a readable reason", () => {
    const r = opportunityScore({ phone: "08883031111", website: null, rating: 4.6, reviewCount: 612 }, rivalStats([]));
    expect(r.score).toBeGreaterThan(70);
    expect(r.reason).toContain("no website");
  });
});
