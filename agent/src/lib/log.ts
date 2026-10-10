import pino from "pino";

// Structured JSON logs: one line per event, with job, lead and campaign IDs as fields.
export const log = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { proc: process.env.PITCHWALA_PROC ?? "web" },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: ["*.password", "*.apiKey", "*.token", "*.GMAIL_APP_PASSWORD"],
});
