import { NextResponse } from "next/server";
import { dailyCap, sentToday } from "@/lib/outbox";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ sentToday: sentToday(), cap: dailyCap() });
}
