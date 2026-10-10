import { NextResponse } from "next/server";
import { getRaw } from "@/lib/db";

export const dynamic = "force-dynamic";

// Every lead that has a pitch or a conversation, with its latest message, grouped by stage on the client.
export async function GET() {
  const rows = getRaw()
    .prepare(
      `SELECT l.id, l.name, l.stage, l.channel, l.email, l.needs_review AS needsReview, l.follow_up_at AS followUpAt,
              l.contacted_at AS contactedAt, c.service,
              (SELECT body FROM messages m WHERE m.lead_id = l.id AND m.is_preview = 0 ORDER BY m.id DESC LIMIT 1) AS lastBody,
              (SELECT direction FROM messages m WHERE m.lead_id = l.id AND m.is_preview = 0 ORDER BY m.id DESC LIMIT 1) AS lastDir,
              (SELECT intent FROM messages m WHERE m.lead_id = l.id AND m.direction = 'in' ORDER BY m.id DESC LIMIT 1) AS lastIntent,
              (SELECT COUNT(*) FROM messages m WHERE m.lead_id = l.id AND m.is_preview = 0 AND m.status IN ('sent','received')) AS msgCount,
              (SELECT COUNT(*) FROM messages m WHERE m.lead_id = l.id AND m.is_preview = 1 AND m.direction = 'in') AS previewReplies
       FROM leads l JOIN campaigns c ON c.id = l.campaign_id
       WHERE l.stage != 'found'
       ORDER BY COALESCE(l.contacted_at, l.created_at) DESC LIMIT 200`,
    )
    .all();
  return NextResponse.json({ leads: rows });
}
