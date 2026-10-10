import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { eventsForCampaign } from "@/lib/events";
import { jobCounts } from "@/lib/jobs";
import { getRaw } from "@/lib/db";

export const dynamic = "force-dynamic";

// Live campaign state for the Leads screen (polled every 2 s).
export async function GET(_req: Request, ctx: RouteContext<"/api/campaigns/[id]">) {
  const id = Number((await ctx.params).id);
  const db = getDb();
  const campaign = db.select().from(schema.campaigns).where(eq(schema.campaigns.id, id)).get();
  if (!campaign) return NextResponse.json({ error: "not found" }, { status: 404 });
  const leads = db
    .select({
      id: schema.leads.id,
      name: schema.leads.name,
      category: schema.leads.category,
      rating: schema.leads.rating,
      reviewCount: schema.leads.reviewCount,
      address: schema.leads.address,
      lat: schema.leads.lat,
      lon: schema.leads.lon,
      phone: schema.leads.phone,
      website: schema.leads.website,
      email: schema.leads.email,
      channel: schema.leads.channel,
      score: schema.leads.score,
      scoreReason: schema.leads.scoreReason,
      stage: schema.leads.stage,
      needsReview: schema.leads.needsReview,
      tokensIn: schema.leads.tokensIn,
      tokensOut: schema.leads.tokensOut,
    })
    .from(schema.leads)
    .where(eq(schema.leads.campaignId, id))
    .orderBy(desc(schema.leads.score), schema.leads.id)
    .all();
  const working = (
    getRaw()
      .prepare(`SELECT DISTINCT lead_id FROM jobs WHERE campaign_id = ? AND type IN ('enrich','arena') AND status IN ('queued','running')`)
      .all(id) as { lead_id: number }[]
  ).map((r) => r.lead_id);
  return NextResponse.json({ campaign, leads, working, events: eventsForCampaign(id, 30), jobs: jobCounts(id) });
}
