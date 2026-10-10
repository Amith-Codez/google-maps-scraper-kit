import { NextResponse } from "next/server";
import { requestSend } from "@/lib/outbox";
import { writeEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

// You pressed Send (or "Approve & send" on a lead that needs review). The worker's gate still decides.
export async function POST(req: Request, ctx: RouteContext<"/api/leads/[id]/send">) {
  const id = Number((await ctx.params).id);
  const { approve } = (await req.json().catch(() => ({}))) as { approve?: boolean };
  try {
    const r = requestSend(id, { approved: !!approve });
    if (approve) writeEvent({ leadId: id, agent: "user", type: "approved", summary: "You approved this pitch for sending" });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 400 });
  }
}
