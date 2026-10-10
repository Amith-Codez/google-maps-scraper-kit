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
}

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
  const kind = lead.websiteKind ?? (lead.website ? "own" : "none");
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
    rivals_rated_higher: lead.rating === null ? 0 : ratings.filter((r) => r > lead.rating!).length,
  };
}

/** Numbers a message may state: everything numeric in the evidence (+ the "2-minute demo" offer). */
export function allowedNumbers(e: Evidence): Set<string> {
  const out = new Set<string>(["2"]);
  for (const v of Object.values(e)) {
    if (typeof v === "number") {
      out.add(String(v));
      out.add(v.toFixed(1));
      if (Number.isInteger(v)) out.add(String(v));
    }
  }
  return out;
}
