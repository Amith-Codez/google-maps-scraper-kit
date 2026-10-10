import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { enqueue } from "@/lib/jobs";

export const dynamic = "force-dynamic";

// Make a voice note in the owner's language and send it to your Telegram (you forward it on WhatsApp).
export async function POST(req: Request, ctx: RouteContext<"/api/leads/[id]/voice">) {
  const id = Number((await ctx.params).id);
  const parsed = z.object({ lang: z.enum(["en", "hi", "te"]) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "pick a language" }, { status: 400 });
  const lead = getDb().select().from(schema.leads).where(eq(schema.leads.id, id)).get();
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });
  enqueue("voice_note", `voice:${id}:${parsed.data.lang}:${Date.now()}`, { leadId: id, lang: parsed.data.lang }, { leadId: id, campaignId: lead.campaignId, priority: 2, maxAttempts: 1 });
  return NextResponse.json({ ok: true });
}
