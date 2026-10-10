import { NextResponse } from "next/server";
import { themeStats } from "@/lib/core/learning";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(themeStats());
}
