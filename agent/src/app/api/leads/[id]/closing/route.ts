import { NextResponse } from "next/server";
import { getRaw } from "@/lib/db";
import { enqueue } from "@/lib/jobs";

export const dynamic = "force-dynamic";

// Build (or rebuild) the client-capture blueprint for an interested lead.
export async function POST(_req: Request, ctx: RouteContext<"/api/leads/[id]/closing">) {
  const id = Number((await ctx.params).id);
  const lead = getRaw().prepare(`SELECT campaign_id FROM leads WHERE id = ?`).get(id) as { campaign_id: number } | undefined;
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });
  enqueue("closing", `closing:${id}:${Date.now()}`, { leadId: id }, { leadId: id, campaignId: lead.campaign_id, priority: 2, maxAttempts: 2 });
  return NextResponse.json({ ok: true });
}
