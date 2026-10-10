// Evidence pack per lead (BUILD_PLAN §7.1): only real fields from the scrape, the website and rival counts.
import { distanceM } from "../geo";
import { median } from "./score";

export interface LeadFacts {
  id: number;
  name: string;
  category: string | null;
  rating: number | null;
  reviewCount: number | null;
  phone: string | null;
  website: string | null;
  websiteKind: string | null;
  email: string | null;
  emailStatus: string | null;
  lat: number | null;
  lon: number | null;
  site?: { booking: string | null; whatsapp: string | null; instagram: string | null; menu: boolean; text?: string; ok: boolean } | null;
}

export interface Evidence {
  name: string;
  category: string | null;
  rating: number | null;
  review_count: number | null;
  has_phone: boolean;
  website_kind: string;
  no_own_website: boolean;
  online_booking_link: boolean;
  whatsapp_link: boolean;
  instagram_link: boolean;
  usable_email: boolean;
  menu_on_site: boolean;
  site_snippet: string | null;
  rivals_nearby: number;
  rivals_radius_km: number;
  rivals_with_website: number;
  rivals_with_online_booking: number;
  rivals_median_rating: number | null;
  rivals_rated_higher: number;
  /** The nearby competitors that are winning, and why (rating, reviews, what they offer online). */
  top_rivals: { name: string; rating: number | null; reviews: number | null; why_winning: string[] }[];
  /** What the winning rivals offer that this business doesn't. */
  gaps: string[];
  /** Plain-language issues for this business, each backed by the numbers above. */
  issues: string[];
}

const FEATURES: { key: string; label: string; has: (l: LeadFacts) => boolean }[] = [
  { key: "own website", label: "an own website", has: (l) => (l.websiteKind ?? (l.website ? "own" : "none")) === "own" },
  { key: "online booking", label: "online booking", has: (l) => !!l.site?.booking },
  { key: "WhatsApp link", label: "a WhatsApp chat link", has: (l) => !!l.site?.whatsapp },
  { key: "Instagram", label: "Instagram linked", has: (l) => !!l.site?.instagram || l.websiteKind === "instagram" },
  { key: "menu online", label: "a menu online", has: (l) => !!l.site?.menu },
];

/** Popularity = rating weighted by how many people rated it (a 4.9 from 8 reviews ranks below a 4.6 from 600). */
export const popularity = (l: { rating: number | null; reviewCount: number | null }) =>
  (l.rating ?? 0) * Math.log10(10 + (l.reviewCount ?? 0));

export const RIVAL_RADIUS_M = 1500;

export function buildEvidence(lead: LeadFacts, all: LeadFacts[]): Evidence {
  const near = all.filter(
    (o) =>
      o.id !== lead.id &&
      (o.category ?? "") === (lead.category ?? "") &&
      lead.lat !== null &&
      lead.lon !== null &&
      o.lat !== null &&
      o.lon !== null &&
      distanceM({ lat: lead.lat, lon: lead.lon }, { lat: o.lat, lon: o.lon }) <= RIVAL_RADIUS_M,
  );
  const ratings = near.map((o) => o.rating).filter((r): r is number => r !== null);
  const reviews = near.map((o) => o.reviewCount).filter((r): r is number => r !== null);
  const kind = lead.websiteKind ?? (lead.website ? "own" : "none");

  const top = [...near].sort((a, b) => popularity(b) - popularity(a)).slice(0, 3);
  const top_rivals = top.map((o) => ({
    name: o.name,
    rating: o.rating,
    reviews: o.reviewCount,
    why_winning: [
      o.rating !== null ? `${o.rating.toFixed(1)} rating` : null,
      o.reviewCount !== null ? `${o.reviewCount} reviews` : null,
      ...FEATURES.filter((f) => f.has(o)).map((f) => f.key),
    ].filter((x): x is string => !!x),
  }));

  const gaps: string[] = [];
  for (const f of FEATURES) {
    if (f.has(lead)) continue;
    const withIt = top.filter((o) => f.has(o)).length;
    const nearWith = near.filter((o) => f.has(o)).length;
    if (withIt > 0) gaps.push(`${withIt} of the top ${top.length} nearby rivals have ${f.label}; this business doesn't`);
    else if (nearWith > 0) gaps.push(`${nearWith} of ${near.length} nearby rivals have ${f.label}; this business doesn't`);
  }

  const issues: string[] = [];
  const rated_higher = lead.rating === null ? 0 : ratings.filter((r) => r > lead.rating!).length;
  const medRev = median(reviews);
  if (near.length && rated_higher > near.length / 2) issues.push(`${rated_higher} of ${near.length} nearby rivals are rated higher`);
  if (medRev !== null && lead.reviewCount !== null && lead.reviewCount < medRev)
    issues.push(`fewer reviews (${lead.reviewCount}) than the nearby median (${medRev})`);
  if (kind !== "own") issues.push(kind === "none" ? "customers can't find a website, menu or booking page before visiting" : `its only web page is ${kind}, not its own site`);
  if (kind === "own" && !lead.site?.booking) issues.push("its website has no way to book or enquire online");
  if (lead.rating !== null && lead.rating >= 4.5 && (lead.reviewCount ?? 0) >= 100) issues.push(`a strength to build on: ${lead.rating.toFixed(1)} from ${lead.reviewCount} reviews`);

  return {
    name: lead.name,
    category: lead.category,
    rating: lead.rating,
    review_count: lead.reviewCount,
    has_phone: !!lead.phone,
    website_kind: kind,
    no_own_website: kind !== "own",
    online_booking_link: !!lead.site?.booking,
    whatsapp_link: !!lead.site?.whatsapp,
    instagram_link: !!lead.site?.instagram || kind === "instagram",
    usable_email: lead.emailStatus === "usable",
    menu_on_site: !!lead.site?.menu,
    site_snippet: lead.site?.ok && lead.site.text ? lead.site.text.slice(0, 300) : null,
    rivals_nearby: near.length,
    rivals_radius_km: RIVAL_RADIUS_M / 1000,
    rivals_with_website: near.filter((o) => (o.websiteKind ?? (o.website ? "own" : "none")) === "own").length,
    rivals_with_online_booking: near.filter((o) => !!o.site?.booking).length,
    rivals_median_rating: median(ratings),
    rivals_rated_higher: rated_higher,
    top_rivals,
    gaps,
    issues,
  };
}

/** Numbers a message may state: everything numeric in the evidence (+ the "2-minute demo" offer). */
export function allowedNumbers(e: Evidence): Set<string> {
  const out = new Set<string>(["2"]);
  const add = (v: number) => {
    out.add(String(v));
    out.add(v.toFixed(1));
  };
  const walk = (v: unknown): void => {
    if (typeof v === "number") add(v);
    else if (typeof v === "string") for (const m of v.match(/\d+(?:\.\d+)?/g) ?? []) add(Number(m));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(e);
  return out;
}
