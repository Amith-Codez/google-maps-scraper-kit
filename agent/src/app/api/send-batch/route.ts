import { NextResponse } from "next/server";
import { z } from "zod";
import { requestSend, dailyCap, sentToday } from "@/lib/outbox";
import { writeEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

// You picked these businesses in the Pipeline and pressed Send: each goes through the same gate
// (opt-out line, daily cap, never-contact-again list, once per lead, own email only).
export async function POST(req: Request) {
  const parsed = z.object({ leadIds: z.array(z.number().int()).min(1).max(50) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Pick at least one business" }, { status: 400 });
  const results: { leadId: number; ok: boolean; note: string }[] = [];
  for (const id of parsed.data.leadIds) {
    try {
      const r = requestSend(id, { approved: true });
      results.push({ leadId: id, ok: r.queued, note: r.queued ? "queued" : "already queued or sent" });
      if (r.queued) writeEvent({ leadId: id, agent: "user", type: "approved", summary: "You selected this lead in the Pipeline and pressed Send" });
    } catch (e) {
      results.push({ leadId: id, ok: false, note: e instanceof Error ? e.message : "failed" });
    }
  }
  return NextResponse.json({ results, sentToday: sentToday(), cap: dailyCap() });
}
