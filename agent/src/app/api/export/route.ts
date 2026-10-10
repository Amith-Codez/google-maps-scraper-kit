import { NextResponse } from "next/server";
import { clientReport, GROUPS } from "@/lib/report/clients";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const c = Number(new URL(req.url).searchParams.get("c")) || undefined;
  return NextResponse.json({ groups: GROUPS, report: clientReport(c) });
}
