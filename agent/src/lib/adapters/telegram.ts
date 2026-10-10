import { getEnv } from "../env";
import { getSetting, setSetting } from "../settings";
import type { Notifier, HealthResult } from "../ports";

const api = (method: string) => `https://api.telegram.org/bot${getEnv().TELEGRAM_BOT_TOKEN}/${method}`;

async function call(method: string, body: BodyInit, headers?: Record<string, string>) {
  const res = await fetch(api(method), { method: "POST", body, headers, signal: AbortSignal.timeout(20_000) });
  const json = (await res.json()) as { ok: boolean; description?: string; result?: unknown };
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description ?? res.status}`);
  return json.result;
}

type Update = { message?: { chat?: { id: number; type: string } } };

/** Chat ID from env, else the one found earlier, else look it up from the "hi" the user sent the bot. */
export async function resolveChatId(): Promise<string | null> {
  const fromEnv = getEnv().TELEGRAM_CHAT_ID;
  if (fromEnv) return fromEnv;
  const saved = getSetting("telegram_chat_id");
  if (saved) return saved;
  const updates = (await call("getUpdates", JSON.stringify({ limit: 20 }), { "Content-Type": "application/json" })) as Update[];
  const priv = updates.map((u) => u.message?.chat).find((c) => c?.type === "private");
  if (!priv) return null;
  setSetting("telegram_chat_id", String(priv.id));
  return String(priv.id);
}

async function chatId(): Promise<string> {
  const id = await resolveChatId();
  if (!id) throw new Error('Telegram chat unknown: send your bot "hi" first');
  return id;
}

export const telegram: Notifier = {
  async text(message: string) {
    await call(
      "sendMessage",
      JSON.stringify({ chat_id: await chatId(), text: message, disable_web_page_preview: true }),
      { "Content-Type": "application/json" },
    );
  },
  async audio(mp3: Buffer, caption: string, filename = "pitchwala.mp3") {
    const form = new FormData();
    form.set("chat_id", await chatId());
    form.set("caption", caption.slice(0, 1000));
    form.set("audio", new Blob([new Uint8Array(mp3)], { type: "audio/mpeg" }), filename);
    await call("sendAudio", form);
  },
  async health(): Promise<HealthResult> {
    try {
      const me = (await call("getMe", "{}", { "Content-Type": "application/json" })) as { username: string };
      const id = await resolveChatId();
      return id
        ? { ok: true, detail: `@${me.username} · chat linked` }
        : { ok: false, detail: `send @${me.username} "hi" to link your phone` };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message.slice(0, 120) : "Telegram unreachable" };
    }
  },
};
