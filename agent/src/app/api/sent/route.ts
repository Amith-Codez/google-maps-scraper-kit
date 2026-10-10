import { NextResponse } from "next/server";
import { getRaw } from "@/lib/db";

export const dynamic = "force-dynamic";

// Every email that left (or tried to leave) your Gmail, newest first, with how it's going.
export async function GET() {
  const rows = getRaw()
    .prepare(
      `SELECT m.id, m.lead_id AS leadId, l.name, m.to_addr AS toAddr, m.subject, m.kind, m.status, m.error, m.is_preview AS isPreview,
              COALESCE(m.sent_at, m.created_at) AS at, l.follow_up_at AS followUpAt, l.stage,
              (SELECT intent FROM messages r WHERE r.lead_id = m.lead_id AND r.direction = 'in' AND r.created_at >= m.created_at ORDER BY r.id DESC LIMIT 1) AS replyIntent,
              (SELECT body FROM messages r WHERE r.lead_id = m.lead_id AND r.direction = 'in' AND r.created_at >= m.created_at ORDER BY r.id DESC LIMIT 1) AS replyText
       FROM messages m JOIN leads l ON l.id = m.lead_id
       WHERE m.direction = 'out' AND m.channel = 'email' AND m.kind IN ('initial','follow_up','preview') AND m.status IN ('sent','sending','queued','failed','blocked')
       ORDER BY at DESC LIMIT 200`,
    )
    .all();
  return NextResponse.json({ sent: rows });
}
