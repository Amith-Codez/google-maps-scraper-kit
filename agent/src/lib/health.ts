import { kit } from "./adapters/kit";
import { gmail } from "./adapters/gmail";
import { telegram } from "./adapters/telegram";
import { elevenlabs } from "./adapters/elevenlabs";
import { activeModel, providerChain } from "./llm";
import { listModels } from "./providers";
import { getJsonSetting, setSetting } from "./settings";
import type { HealthResult } from "./ports";

export interface HealthSnapshot {
  checkedAt: number;
  engine: HealthResult;
  model: HealthResult & { provider?: string; model?: string };
  gmail: HealthResult;
  telegram: HealthResult;
  voice: HealthResult;
}

async function modelHealth(): Promise<HealthSnapshot["model"]> {
  const chain = providerChain();
  const p = chain[0];
  if (!p) return { ok: false, detail: "no provider configured" };
  const model = activeModel(p);
  try {
    const models = await listModels(p);
    const found = models.includes(model);
    return {
      ok: found,
      provider: p.id,
      model,
      detail: found ? `${p.label} · ${model}` : `${p.label}: model "${model}" not in /models`,
    };
  } catch (e) {
    return { ok: false, provider: p.id, model, detail: e instanceof Error ? e.message : "unreachable" };
  }
}

/** Run by the worker every 30 s; the web only reads the stored snapshot (no external calls from the web). */
export async function runHealthChecks(): Promise<HealthSnapshot> {
  const [engine, model, mail, tg, voice] = await Promise.all([
    kit.health(),
    modelHealth(),
    gmail.health(),
    telegram.health(),
    elevenlabs.health(),
  ]);
  const snap: HealthSnapshot = { checkedAt: Date.now(), engine, model, gmail: mail, telegram: tg, voice };
  setSetting("health", JSON.stringify(snap));
  return snap;
}

export function readHealth(): HealthSnapshot | undefined {
  return getJsonSetting<HealthSnapshot>("health");
}
