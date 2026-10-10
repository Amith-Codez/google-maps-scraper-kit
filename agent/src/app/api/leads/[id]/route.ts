import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { eventsForLead } from "@/lib/events";
import { buildEvidence, type LeadFacts } from "@/lib/core/evidence";
import { getRaw } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { activeModel, providerChain } from "@/lib/llm";
import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

function facts(r: typeof schema.leads.$inferSelect): LeadFacts {
  const ev = JSON.parse(r.evidenceJson ?? "{}");
  return { ...r, site: ev.site ?? null };
}

// Everything the lead card shows: evidence, the Idea Arena, the pitch, and this lead's agent trace.
export async function GET(_req: Request, ctx: RouteContext<"/api/leads/[id]">) {
  const id = Number((await ctx.params).id);
  const db = getDb();
  const lead = db.select().from(schema.leads).where(eq(schema.leads.id, id)).get();
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });
  const campaign = db.select().from(schema.campaigns).where(eq(schema.campaigns.id, lead.campaignId)).get();
  const all = db.select().from(schema.leads).where(eq(schema.leads.campaignId, lead.campaignId)).all();
  const evidence = buildEvidence(facts(lead), all.map(facts));
  const ideas = db.select().from(schema.ideas).where(eq(schema.ideas.leadId, id)).orderBy(asc(schema.ideas.idx)).all();
  const messages = db.select().from(schema.messages).where(eq(schema.messages.leadId, id)).orderBy(desc(schema.messages.id)).all();
  const jobs = getRaw()
    .prepare(`SELECT type, status, error FROM jobs WHERE lead_id = ? ORDER BY id DESC LIMIT 10`)
    .all(id) as { type: string; status: string; error: string | null }[];
  const site = JSON.parse(lead.evidenceJson ?? "{}").site ?? null;
  const p = providerChain()[0];
  return NextResponse.json({
    activeModel: p ? { provider: p.label, model: activeModel(p) } : null,
    agentId: getSetting("agent_id") || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "",
    senderName: getEnv().SENDER_NAME,
    lead: { ...lead, evidenceJson: undefined },
    site,
    campaign: campaign && { id: campaign.id, service: campaign.service, language: campaign.language },
    evidence,
    ideas,
    messages,
    events: eventsForLead(id, 60),
    jobs,
  });
}
