// Application layer: wires the core agents to the adapters. Called by the worker's job handlers.
import { eq } from "drizzle-orm";
import { getDb, getRaw, schema } from "./db";
import { writeEvent } from "./events";
import { enqueue } from "./jobs";
import { llm } from "./llm";
import { kit } from "./adapters/kit";
import { geocode } from "./geo";
import { runPlanner } from "./core/planner";
import { channelFor, opportunityScore, rivalStats } from "./core/score";
import type { Place } from "./ports";

// The venue (Mana Katha Cafe, Vanasthalipuram): used only if geocoding fails.
const VENUE = { lat: 17.3297, lon: 78.556 };
const MAX_LEADS = 40;

function campaign(id: number) {
  const c = getDb().select().from(schema.campaigns).where(eq(schema.campaigns.id, id)).get();
  if (!c) throw new Error(`campaign ${id} not found`);
  return c;
}

function setCampaign(id: number, patch: Partial<typeof schema.campaigns.$inferInsert>) {
  getDb().update(schema.campaigns).set(patch).where(eq(schema.campaigns.id, id)).run();
}

export async function handlePlan(campaignId: number) {
  const c = campaign(campaignId);
  setCampaign(campaignId, { status: "planning" });
  const r = await runPlanner(llm, { service: c.service, clients: c.clients, language: c.language, campaignId });
  const p = r.output;
  writeEvent({
    campaignId,
    agent: "planner",
    type: "plan",
    summary: `Planner: ${p.keywords.map((k) => `"${k}"`).join(", ")} · ${p.why}`,
    data: { ...p, model: r.model, provider: r.provider },
  });
  setCampaign(campaignId, {
    keywordsJson: JSON.stringify(p.keywords),
    area: p.area,
    city: p.city,
    planWhy: p.why,
  });

  if (p.service_fit === "weak") {
    setCampaign(campaignId, { status: "weak_fit" });
    writeEvent({ campaignId, agent: "planner", type: "weak_fit", summary: `Weak fit, nothing will be sent: ${p.why}` });
    return;
  }

  let at = await geocode(`${p.area}, ${p.city}`).catch(() => null);
  if (!at) at = await geocode(p.city).catch(() => null);
  const lat = at?.lat ?? VENUE.lat;
  const lon = at?.lon ?? VENUE.lon;
  writeEvent({
    campaignId,
    agent: "planner",
    type: "geocode",
    summary: at ? `Area: ${p.area}, ${p.city} (${lat.toFixed(4)}, ${lon.toFixed(4)})` : `Couldn't place "${p.area}"; searching around the venue`,
  });
  setCampaign(campaignId, { lat, lon, status: "discovering" });
  enqueue("discover", `discover:${campaignId}`, { campaignId }, { campaignId, priority: 10, maxAttempts: 2 });
}

export async function handleDiscover(campaignId: number) {
  const c = campaign(campaignId);
  const keywords = JSON.parse(c.keywordsJson ?? "[]") as string[];
  const q = { keywords, lat: c.lat ?? VENUE.lat, lon: c.lon ?? VENUE.lon, depth: 1 };

  writeEvent({ campaignId, agent: "discovery", type: "search", summary: `Searching Google Maps via the kit (fast mode): ${keywords.join(" · ")}` });
  let places: Place[] = await kit.search({ ...q, radiusM: 3000 });
  if (!places.length) {
    writeEvent({ campaignId, agent: "discovery", type: "widen", summary: "No results within 3 km; widening to 8 km once" });
    places = await kit.search({ ...q, radiusM: 8000 });
  }

  const seen = new Set<string>();
  const open = places.filter((p) => {
    if (seen.has(p.placeKey)) return false;
    seen.add(p.placeKey);
    return !/closed/i.test(p.status ?? "");
  });
  const skipped = places.length - open.length;
  const leads = open.slice(0, MAX_LEADS);

  if (!leads.length) {
    setCampaign(campaignId, { status: "no_results" });
    writeEvent({ campaignId, agent: "discovery", type: "no_results", summary: "No businesses found, even after widening the search. Try another area or client type." });
    return;
  }

  const rivals = rivalStats(leads.map((p) => ({ phone: p.phone, website: p.website, rating: p.rating, reviewCount: p.reviewCount })));
  const raw = getRaw();
  const insert = raw.prepare(
    `INSERT OR IGNORE INTO leads (campaign_id, place_key, name, category, rating, review_count, address, lat, lon, phone, website, channel, evidence_json, score, score_reason, stage, created_at)
     VALUES (@campaignId, @placeKey, @name, @category, @rating, @reviewCount, @address, @lat, @lon, @phone, @website, @channel, @evidence, @score, @reason, 'found', @now)`,
  );
  let added = 0;
  raw.transaction(() => {
    for (const p of leads) {
      const { score, reason } = opportunityScore(p, rivals);
      const evidence = {
        name: p.name,
        category: p.category,
        rating: p.rating,
        review_count: p.reviewCount,
        phone: p.phone,
        website: p.website,
        address: p.address,
      };
      added += insert.run({
        campaignId,
        placeKey: p.placeKey,
        name: p.name,
        category: p.category,
        rating: p.rating,
        reviewCount: p.reviewCount,
        address: p.address,
        lat: p.lat,
        lon: p.lon,
        phone: p.phone,
        website: p.website,
        channel: channelFor({ phone: p.phone }),
        evidence: JSON.stringify(evidence),
        score,
        reason,
        now: Date.now(),
      }).changes;
    }
  })();

  const found = (raw.prepare(`SELECT COUNT(*) n FROM leads WHERE campaign_id = ?`).get(campaignId) as { n: number }).n;
  setCampaign(campaignId, { found, status: "found" });
  writeEvent({
    campaignId,
    agent: "discovery",
    type: "found",
    summary: `Found ${added} businesses${skipped ? ` (skipped ${skipped} closed or duplicate)` : ""} · ${rivals.withWebsite} list a website · median rating ${rivals.medianRating?.toFixed(1) ?? "n/a"}`,
    data: { rivals },
  });
}
