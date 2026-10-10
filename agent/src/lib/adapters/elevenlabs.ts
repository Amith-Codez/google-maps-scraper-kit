import { getEnv } from "../env";
import type { Voice, HealthResult } from "../ports";

const BASE = "https://api.elevenlabs.io/v1";
// A stock multilingual voice used when ELEVENLABS_VOICE_ID isn't set.
const DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb";

export const elevenlabs: Voice = {
  async speak(text: string, opts: { language?: string } = {}) {
    const env = getEnv();
    const voice = env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE;
    const res = await fetch(`${BASE}/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: "eleven_v3", language_code: opts.language }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`ElevenLabs TTS HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return Buffer.from(await res.arrayBuffer());
  },
  async health(): Promise<HealthResult> {
    try {
      const res = await fetch(`${BASE}/user/subscription`, {
        headers: { "xi-api-key": getEnv().ELEVENLABS_API_KEY },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        // A restricted key (TTS only) is valid but can't read the subscription: that's still healthy.
        const body = (await res.json().catch(() => ({}))) as { detail?: { status?: string } };
        if (body.detail?.status === "missing_permissions") return { ok: true, detail: "key valid · restricted to TTS" };
        return { ok: false, detail: `HTTP ${res.status}` };
      }
      const s = (await res.json()) as { character_count?: number; character_limit?: number; tier?: string };
      return { ok: true, detail: `${s.tier ?? "plan"} · ${s.character_count ?? 0}/${s.character_limit ?? "?"} chars` };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message.slice(0, 120) : "unreachable" };
    }
  },
};
