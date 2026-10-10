import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPreview } from "@/lib/outbox";

export const dynamic = "force-dynamic";

// "Send a preview to…": the same pitch to an inbox you type (e.g. a judge's), not counted in the cap.
export async function POST(req: Request, ctx: RouteContext<"/api/leads/[id]/preview">) {
  const id = Number((await ctx.params).id);
  const parsed = z.object({ to: z.email() }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Type a valid email address" }, { status: 400 });
  try {
    return NextResponse.json(requestPreview(id, parsed.data.to));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 400 });
  }
}
