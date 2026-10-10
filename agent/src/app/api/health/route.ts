import { NextResponse } from "next/server";
import { getRaw } from "@/lib/db";
import { readHealth } from "@/lib/health";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Liveness for Docker and the health strip. The worker runs the outside checks; we read its snapshot.
export async function GET() {
  let db = false;
  try {
    db = (getRaw().prepare("SELECT 1 AS ok").get() as { ok: number }).ok === 1;
  } catch {
    db = false;
  }
  const beat = Number(getSetting("worker_heartbeat") ?? 0);
  const worker = Date.now() - beat < 20_000;
  const checks = readHealth() ?? null;
  return NextResponse.json(
    { ok: db, db, worker, workerSeenAgoMs: beat ? Date.now() - beat : null, checks },
    { status: db ? 200 : 503 },
  );
}
