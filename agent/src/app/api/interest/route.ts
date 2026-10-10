import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, getRaw, schema } from "@/lib/db";
import { enqueue } from "@/lib/jobs";
import { writeEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

// Client tool `markInterested` from the voice agent: stage → interested and ONE Telegram ping per lead (E45).
export async function POST(req: Request) {
  const parsed = z.object({ leadId: z.number().int(), summary: z.string().max(500).default("") }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { leadId, summary } = parsed.data;
  const lead = getDb().select().from(schema.leads).where(eq(schema.leads.id, leadId)).get();
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });
  getRaw().prepare(`UPDATE leads SET stage = 'interested' WHERE id = ?`).run(leadId);
  const id = enqueue("notify", `interest:${leadId}`, { leadId, summary: summary.trim() || "said they're interested" }, { leadId, campaignId: lead.campaignId, priority: 1 });
  if (id !== null)
    writeEvent({ campaignId: lead.campaignId, leadId, agent: "voice", type: "interested", summary: `Voice agent: owner is interested · "${summary.slice(0, 120)}"` });
  return NextResponse.json({ ok: true, already: id === null });
}
