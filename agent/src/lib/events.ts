import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { log } from "./log";

export type Agent =
  | "system"
  | "planner"
  | "discovery"
  | "enrich"
  | "strategist"
  | "critic"
  | "twin"
  | "composer"
  | "claimcheck"
  | "gate"
  | "mailer"
  | "triage"
  | "notifier"
  | "voice"
  | "user";

// Every job writes events; the lead card's agent trace reads them back.
export function writeEvent(e: {
  campaignId?: number | null;
  leadId?: number | null;
  agent: Agent;
  type: string;
  summary: string;
  data?: unknown;
}) {
  const db = getDb();
  db.insert(schema.events)
    .values({
      campaignId: e.campaignId ?? null,
      leadId: e.leadId ?? null,
      agent: e.agent,
      type: e.type,
      summary: e.summary,
      dataJson: e.data === undefined ? null : JSON.stringify(e.data),
    })
    .run();
  log.info({ campaignId: e.campaignId, leadId: e.leadId, agent: e.agent, type: e.type }, e.summary);
}

export function eventsForLead(leadId: number, limit = 100) {
  return getDb()
    .select()
    .from(schema.events)
    .where(eq(schema.events.leadId, leadId))
    .orderBy(desc(schema.events.id))
    .limit(limit)
    .all();
}

export function eventsForCampaign(campaignId: number, limit = 100) {
  return getDb()
    .select()
    .from(schema.events)
    .where(eq(schema.events.campaignId, campaignId))
    .orderBy(desc(schema.events.id))
    .limit(limit)
    .all();
}
