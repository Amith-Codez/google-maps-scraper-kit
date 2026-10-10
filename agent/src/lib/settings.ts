import { getRaw } from "./db";

// Runtime settings (changed live from the Settings screen), stored in SQLite so web and worker agree.
export const DEFAULT_SETTINGS = {
  provider: "gemini",
  model: "",
  fallback: "groq,ollama",
  daily_cap: "",
  opt_out_text: "Reply STOP and I won't write again.",
  language: "en",
  // Auto-send ready email pitches (off until the user approves real sends).
  auto_send: "off",
  // ElevenLabs voice (e.g. your own cloned voice) and the public voice-agent ID; override the env values live.
  voice_id: "",
  agent_id: "",
} as const;

export type SettingKey = keyof typeof DEFAULT_SETTINGS | "health" | "worker_heartbeat" | "telegram_chat_id" | "inbox_last_uid" | "inbox_status";

export function getSetting(key: SettingKey): string | undefined {
  const row = getRaw().prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as { value: string } | undefined;
  if (row) return row.value;
  return (DEFAULT_SETTINGS as Record<string, string>)[key];
}

export function setSetting(key: SettingKey, value: string) {
  getRaw()
    .prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
    .run(key, value);
}

export function getJsonSetting<T>(key: SettingKey): T | undefined {
  const v = getSetting(key);
  if (!v) return undefined;
  try {
    return JSON.parse(v) as T;
  } catch {
    return undefined;
  }
}
