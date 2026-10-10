import { z } from "zod";

// Every setting the app reads. Validated once; the app refuses to start if one is missing.
const schema = z.object({
  NODE_ENV: z.string().default("development"),
  SCRAPER_BASE_URL: z.url().default("http://localhost:8080"),
  DATABASE_PATH: z.string().min(1).default("data/agent.db"),
  APP_PASSCODE: z.string().min(4, "APP_PASSCODE must be at least 4 characters"),

  GEMINI_API_KEY: z.string().min(10, "GEMINI_API_KEY is required (aistudio.google.com/apikey)"),
  GROQ_API_KEY: z.string().min(10, "GROQ_API_KEY is required (console.groq.com/keys)"),
  OPENROUTER_API_KEY: z.string().optional().default(""),
  OLLAMA_BASE_URL: z.url().default("http://localhost:11434/v1"),

  GMAIL_ADDRESS: z.email("GMAIL_ADDRESS must be an email address"),
  GMAIL_APP_PASSWORD: z
    .string()
    .transform((s) => s.replace(/\s+/g, ""))
    .pipe(z.string().length(16, "GMAIL_APP_PASSWORD must be the 16-letter app password")),
  SENDER_NAME: z.string().min(1, "SENDER_NAME is required"),

  TELEGRAM_BOT_TOKEN: z.string().regex(/^\d+:[\w-]+$/, "TELEGRAM_BOT_TOKEN looks wrong (expected 123456:ABC...)"),
  // Optional: if empty, the worker finds it from getUpdates once you send the bot "hi".
  TELEGRAM_CHAT_ID: z.string().regex(/^-?\d*$/, "TELEGRAM_CHAT_ID must be a number (from getUpdates)").default(""),

  ELEVENLABS_API_KEY: z.string().min(10, "ELEVENLABS_API_KEY is required"),
  ELEVENLABS_VOICE_ID: z.string().optional().default(""),
  NEXT_PUBLIC_ELEVENLABS_AGENT_ID: z.string().optional().default(""),

  DAILY_CAP: z.coerce.number().int().min(1).max(100).default(10),
  FOLLOW_UP_DAYS: z.coerce.number().int().min(1).max(30).default(3),
  LOG_LEVEL: z.string().default("info"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (i) => `  - ${i.path.join(".")}: ${i.code === "invalid_type" ? "missing" : i.message}`,
    );
    const msg = `Pitchwala cannot start: missing or invalid settings in .env.local\n${lines.join("\n")}\nSee .env.example for every setting.`;
    throw new Error(msg);
  }
  cached = parsed.data;
  return cached;
}
