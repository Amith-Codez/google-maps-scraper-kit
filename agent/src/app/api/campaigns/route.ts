import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { enqueue } from "@/lib/jobs";
import { writeEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

const Body = z.object({
  service: z.string().trim().min(3, "Tell us what you sell").max(400),
  clients: z.string().trim().min(3, "Tell us who you sell to").max(400),
  language: z.enum(["en", "hi", "te"]).default("en"),
});

// Start a campaign from the two sentences. The web only writes the job; the worker does the work.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid input" }, { status: 400 });
  const { service, clients, language } = parsed.data;
  const c = getDb().insert(schema.campaigns).values({ service, clients, language, status: "planning" }).returning().get();
  writeEvent({ campaignId: c.id, agent: "user", type: "start", summary: `New campaign: "${service}" → "${clients}"` });
  enqueue("plan", `plan:${c.id}`, { campaignId: c.id }, { campaignId: c.id, priority: 5, maxAttempts: 2 });
  return NextResponse.json({ id: c.id });
}

export async function GET() {
  const rows = getDb().select().from(schema.campaigns).orderBy(desc(schema.campaigns.id)).limit(20).all();
  return NextResponse.json({ campaigns: rows });
}
