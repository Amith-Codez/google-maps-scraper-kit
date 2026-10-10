import { NextResponse } from "next/server";
import { enqueue, getJobByKey } from "@/lib/jobs";

export const dynamic = "force-dynamic";

// Queues a test job for the worker (Step 1 check that the queue and worker are wired).
export async function POST() {
  const key = `ping:${Date.now()}`;
  enqueue("ping", key, { from: "web" }, { priority: 1 });
  return NextResponse.json({ key });
}

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  const job = getJobByKey(key);
  return NextResponse.json({ status: job?.status ?? "missing", attempts: job?.attempts ?? 0 });
}
