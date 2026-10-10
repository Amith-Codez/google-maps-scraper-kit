import { sqliteTable, integer, text, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";

const now = () => Date.now();

export const campaigns = sqliteTable("campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  service: text("service").notNull(),
  clients: text("clients").notNull(),
  area: text("area"),
  city: text("city"),
  lat: real("lat"),
  lon: real("lon"),
  language: text("language").notNull().default("en"),
  keywordsJson: text("keywords_json"),
  planWhy: text("plan_why"),
  status: text("status").notNull().default("planning"),
  found: integer("found").notNull().default(0),
  ideasRejected: integer("ideas_rejected").notNull().default(0),
  sent: integer("sent").notNull().default(0),
  replies: integer("replies").notNull().default(0),
  tokensIn: integer("tokens_in").notNull().default(0),
  tokensOut: integer("tokens_out").notNull().default(0),
  costUsd: real("cost_usd").notNull().default(0),
  createdAt: integer("created_at").notNull().$defaultFn(now),
});

export const leads = sqliteTable(
  "leads",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    campaignId: integer("campaign_id").notNull(),
    placeKey: text("place_key").notNull(),
    name: text("name").notNull(),
    category: text("category"),
    rating: real("rating"),
    reviewCount: integer("review_count"),
    address: text("address"),
    lat: real("lat"),
    lon: real("lon"),
    phone: text("phone"),
    website: text("website"),
    websiteKind: text("website_kind"),
    email: text("email"),
    emailStatus: text("email_status"),
    channel: text("channel"),
    evidenceJson: text("evidence_json"),
    score: integer("score"),
    scoreReason: text("score_reason"),
    stage: text("stage").notNull().default("found"),
    needsReview: integer("needs_review", { mode: "boolean" }).notNull().default(false),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    costUsd: real("cost_usd").notNull().default(0),
    followUpAt: integer("follow_up_at"),
    pageJson: text("page_json"),
    closingJson: text("closing_json"),
    contactedAt: integer("contacted_at"),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex("leads_campaign_place").on(t.campaignId, t.placeKey)],
);

export const ideas = sqliteTable(
  "ideas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leadId: integer("lead_id").notNull(),
    idx: integer("idx").notNull(),
    title: text("title").notNull(),
    pitchLine: text("pitch_line").notNull(),
    howServiceDelivers: text("how_service_delivers"),
    evidenceKey: text("evidence_key"),
    scoresJson: text("scores_json"),
    verdict: text("verdict").notNull().default("pending"),
    rejectReason: text("reject_reason"),
    twinVerdictJson: text("twin_verdict_json"),
    model: text("model"),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("ideas_lead").on(t.leadId)],
);

export const messages = sqliteTable(
  "messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leadId: integer("lead_id").notNull(),
    direction: text("direction").notNull(), // out | in
    kind: text("kind").notNull().default("initial"), // initial | follow_up | reply | preview | draft
    channel: text("channel").notNull(), // email | whatsapp | telegram
    toAddr: text("to_addr"),
    fromAddr: text("from_addr"),
    subject: text("subject"),
    body: text("body"),
    bodyBefore: text("body_before"),
    whyNeeded: text("why_needed"),
    principlesJson: text("principles_json"),
    voiceScript: text("voice_script"),
    imageUrl: text("image_url"),
    audioPath: text("audio_path"),
    messageId: text("message_id"),
    inReplyTo: text("in_reply_to"),
    isPreview: integer("is_preview", { mode: "boolean" }).notNull().default(false),
    intent: text("intent"),
    status: text("status").notNull().default("draft"), // draft | queued | sent | failed | blocked
    error: text("error"),
    sentAt: integer("sent_at"),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("messages_lead").on(t.leadId), index("messages_msgid").on(t.messageId)],
);

export const jobs = sqliteTable(
  "jobs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type").notNull(),
    key: text("key").notNull(),
    payloadJson: text("payload_json").notNull().default("{}"),
    status: text("status").notNull().default("queued"), // queued | running | done | failed | cancelled
    priority: integer("priority").notNull().default(100), // lower runs first
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    runAfter: integer("run_after").notNull().$defaultFn(now),
    campaignId: integer("campaign_id"),
    leadId: integer("lead_id"),
    error: text("error"),
    createdAt: integer("created_at").notNull().$defaultFn(now),
    updatedAt: integer("updated_at").notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex("jobs_key").on(t.key), index("jobs_claim").on(t.status, t.runAfter, t.priority)],
);

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    campaignId: integer("campaign_id"),
    leadId: integer("lead_id"),
    agent: text("agent").notNull(),
    type: text("type").notNull(),
    summary: text("summary").notNull(),
    dataJson: text("data_json"),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("events_lead").on(t.leadId), index("events_campaign").on(t.campaignId)],
);

export const suppression = sqliteTable("suppression", {
  contact: text("contact").primaryKey(),
  reason: text("reason").notNull(),
  createdAt: integer("created_at").notNull().$defaultFn(now),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
