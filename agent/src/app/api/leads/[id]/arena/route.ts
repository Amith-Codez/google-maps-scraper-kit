import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { enqueue } from "@/lib/jobs";
import { writeEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

// Generate (or regenerate) ideas for one lead on demand.
export async function POST(_req: Request, ctx: RouteContext<"/api/leads/[id]/arena">) {
  const id = Number((await ctx.params).id);
  const lead = getDb().select().from(schema.leads).where(eq(schema.leads.id, id)).get();
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (["contacted", "replied", "interested", "won", "lost"].includes(lead.stage))
    return NextResponse.json({ error: "Already contacted; ideas are locked" }, { status: 409 });
  const stamp = Date.now();
  if (!lead.websiteKind) enqueue("enrich", `enrich:${id}:${stamp}`, { leadId: id }, { campaignId: lead.campaignId, leadId: id, priority: 2 });
  else enqueue("arena", `arena:${id}:${stamp}`, { leadId: id }, { campaignId: lead.campaignId, leadId: id, priority: 2, maxAttempts: 2 });
  writeEvent({ campaignId: lead.campaignId, leadId: id, agent: "user", type: "arena_requested", summary: "You asked for ideas for this lead" });
  return NextResponse.json({ ok: true });
}
