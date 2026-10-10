import * as cheerio from "cheerio";

// Reads a business's website (10 s timeout) for text, emails, and booking / WhatsApp / Instagram links.
// Pure helpers are exported for tests.

export type WebsiteKind = "own" | "instagram" | "facebook" | "whatsapp" | "linktree" | "listing" | "chain" | "none";

const LISTING_HOSTS = ["zomato.com", "swiggy.com", "justdial.com", "dineout.co.in", "eazydiner.com", "magicpin.in", "google.com", "business.site", "sulekha.com"];
const CHAIN_HOSTS = ["lakmeindia.com", "lakmesalon.in", "naturals.in", "naturalssalon.com", "greentrends.in", "jawedhabib.co.in", "starbucks.in", "cafecoffeeday.com", "dominos.co.in", "mcdonaldsindia.com", "kfc.co.in", "unilever.com"];
const FREE_MAIL = ["gmail.com", "yahoo.com", "yahoo.co.in", "outlook.com", "hotmail.com", "rediffmail.com", "icloud.com", "live.com"];
const BOOKING_HINTS = /(book|reserv|appointment|table|order online|fresha|booksy|dineout|eazydiner|zomato\.com\/.*book|calendly|setmore)/i;

export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function websiteKind(url: string | null | undefined, sharedHosts: Set<string> = new Set()): WebsiteKind {
  const h = hostOf(url);
  if (!h) return "none";
  if (h.includes("instagram.com")) return "instagram";
  if (h.includes("facebook.com") || h === "fb.com") return "facebook";
  if (h.includes("wa.me") || h.includes("wa.link") || h.includes("whatsapp.com")) return "whatsapp";
  if (h.includes("linktr.ee") || h.includes("bio.link")) return "linktree";
  if (LISTING_HOSTS.some((l) => h.endsWith(l))) return "listing";
  if (CHAIN_HOSTS.some((c) => h.endsWith(c)) || sharedHosts.has(h)) return "chain";
  return "own";
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/**
 * Email branch check: an address is usable only if it plausibly belongs to THIS business.
 * Rejects: chain/corporate sites, pages listing many addresses (branch directories), image-like
 * false positives, and addresses on a domain that is neither the site's own nor a personal mailbox.
 */
export function classifyEmails(
  emails: string[],
  site: { url: string | null; kind: WebsiteKind },
): { email: string | null; status: "usable" | "other_branch" | "corporate" | "none" } {
  const clean = [
    ...new Set(
      emails.map((e) =>
        e
          .toLowerCase()
          .replace(/^mailto:/, "")
          .trim()
          // Page text glues a phone number onto the address ("8185910485name@gmail.com"): drop it.
          .replace(/^\+?\d{10,13}(?=[a-z])/, "")
          // ...or a word after the TLD ("care@site.inpopular"): keep known TLDs only.
          .replace(/(\.(?:com|in|org|net|co\.in|edu|info|io))[a-z]+$/, "$1"),
      ),
    ),
  ].filter(
    (e) => !/\.(png|jpe?g|gif|webp|svg)$/.test(e) && !/(example|sentry|wixpress|domain)\./.test(e),
  );
  if (!clean.length) return { email: null, status: "none" };
  if (site.kind === "chain") return { email: clean[0], status: "corporate" };
  if (clean.length > 3) return { email: clean[0], status: "other_branch" };
  const siteHost = hostOf(site.url);
  const own = clean.find((e) => siteHost && e.endsWith(`@${siteHost}`));
  if (own) return { email: own, status: "usable" };
  const personal = clean.find((e) => FREE_MAIL.some((d) => e.endsWith(`@${d}`)));
  if (personal) return { email: personal, status: "usable" };
  return { email: clean[0], status: "corporate" };
}

export interface SiteFacts {
  ok: boolean;
  error?: string;
  title?: string;
  text?: string;
  emails: string[];
  booking: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  menu: boolean;
}

export function extractFacts(html: string, baseUrl: string): SiteFacts {
  const $ = cheerio.load(html);
  const links = $("a[href]")
    .map((_, a) => ({ href: String($(a).attr("href") ?? ""), text: $(a).text().trim() }))
    .get();
  const abs = (h: string) => {
    try {
      return new URL(h, baseUrl).toString();
    } catch {
      return h;
    }
  };
  const find = (re: RegExp) => links.find((l) => re.test(l.href));
  $("script,style,noscript,svg").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const mailtos = links.filter((l) => l.href.startsWith("mailto:")).map((l) => l.href.slice(7).split("?")[0]);
  const emails = [...mailtos, ...(text.match(EMAIL_RE) ?? [])];
  const booking = links.find((l) => BOOKING_HINTS.test(l.href) || BOOKING_HINTS.test(l.text));
  return {
    ok: true,
    title: $("title").first().text().trim().slice(0, 120),
    text: text.slice(0, 1200),
    emails,
    booking: booking ? abs(booking.href) : null,
    whatsapp: find(/wa\.me|api\.whatsapp\.com|wa\.link/i)?.href ?? null,
    instagram: find(/instagram\.com\//i)?.href ?? null,
    facebook: find(/facebook\.com\//i)?.href ?? null,
    menu: /\bmenu\b/i.test(text),
  };
}

export async function readWebsite(url: string): Promise<SiteFacts> {
  const target = url.startsWith("http") ? url : `https://${url}`;
  try {
    const res = await fetch(target, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Pitchwala/1.0)", Accept: "text/html" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, emails: [], booking: null, whatsapp: null, instagram: null, facebook: null, menu: false };
    const html = (await res.text()).slice(0, 400_000);
    return extractFacts(html, res.url || target);
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "TimeoutError" ? "timed out after 10 s" : e.message) : "failed";
    return { ok: false, error: msg.slice(0, 100), emails: [], booking: null, whatsapp: null, instagram: null, facebook: null, menu: false };
  }
}
