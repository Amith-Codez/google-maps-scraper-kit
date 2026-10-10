import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { enqueue } from "@/lib/jobs";

export const dynamic = "force-dynamic";

// Build (or rebuild) the demo website for this lead.
export async function POST(_req: Request, ctx: RouteContext<"/api/leads/[id]/page">) {
  const id = Number((await ctx.params).id);
  const lead = getDb().select().from(schema.leads).where(eq(schema.leads.id, id)).get();
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });
  enqueue("page", `page:${id}:${Date.now()}`, { leadId: id }, { leadId: id, campaignId: lead.campaignId, priority: 2, maxAttempts: 2 });
  return NextResponse.json({ ok: true });
}
