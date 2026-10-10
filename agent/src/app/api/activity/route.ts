import { NextResponse } from "next/server";
import { getRaw } from "@/lib/db";

export const dynamic = "force-dynamic";

// Latest real agent activity (for the live ticker) + totals for the celebration toast.
export async function GET() {
  const raw = getRaw();
  const events = raw
    .prepare(
      `SELECT e.id, e.agent, e.summary, e.created_at AS createdAt, l.name AS lead FROM events e LEFT JOIN leads l ON l.id = e.lead_id
       WHERE e.agent IN ('strategist','critic','twin','composer','mailer','notifier','voice','discovery') ORDER BY e.id DESC LIMIT 24`,
    )
    .all();
  const t = raw
    .prepare(
      `SELECT (SELECT COUNT(*) FROM leads) AS found, (SELECT COALESCE(SUM(ideas_rejected),0) FROM campaigns) AS rejected,
              (SELECT COUNT(*) FROM leads WHERE stage = 'interested') AS interested,
              (SELECT COUNT(*) FROM messages WHERE direction = 'in') AS replies`,
    )
    .get();
  return NextResponse.json({ events, totals: t });
}
