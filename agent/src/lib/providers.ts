import { getEnv } from "./env";

export type ProviderId = "gemini" | "groq" | "openrouter" | "ollama";

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  baseURL: string;
  apiKey: string;
  defaultModel: string;
  // USD per million tokens, for the cost meter (0 for the local model).
  priceIn: number;
  priceOut: number;
  structured: boolean;
  // Extra request options, e.g. keep reasoning models from spending the token cap on thinking.
  options?: Record<string, unknown>;
  // Sibling models with their own rate limits, tried before moving to the next provider.
  backupModels?: string[];
}

// Small, fast model per provider (checked against each provider's /models list on the day).
export function providerConfigs(): Record<ProviderId, ProviderConfig> {
  const env = getEnv();
  return {
    gemini: {
      id: "gemini",
      label: "Gemini",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: env.GEMINI_API_KEY,
      defaultModel: "gemini-3.1-flash-lite",
      priceIn: 0.25,
      priceOut: 1.5,
      structured: true,
      backupModels: ["gemini-3.5-flash-lite", "gemini-flash-lite-latest"],
    },
    groq: {
      id: "groq",
      label: "Groq",
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: env.GROQ_API_KEY,
      defaultModel: "openai/gpt-oss-20b",
      priceIn: 0.075,
      priceOut: 0.3,
      structured: true,
      options: { reasoningEffort: "low" },
      backupModels: ["openai/gpt-oss-120b"],
    },
    openrouter: {
      id: "openrouter",
      label: "OpenRouter",
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY,
      defaultModel: "google/gemini-3.1-flash-lite",
      priceIn: 0.25,
      priceOut: 1.5,
      structured: false,
    },
    ollama: {
      id: "ollama",
      label: "Ollama (this laptop)",
      baseURL: env.OLLAMA_BASE_URL,
      apiKey: "ollama",
      defaultModel: "llama3.2:3b",
      priceIn: 0,
      priceOut: 0,
      structured: false,
    },
  };
}

export const PROVIDER_IDS: ProviderId[] = ["gemini", "groq", "openrouter", "ollama"];

export function isProviderId(s: string): s is ProviderId {
  return (PROVIDER_IDS as string[]).includes(s);
}

/** Lists the provider's models (no tokens spent). Used by the health strip. */
export async function listModels(p: ProviderConfig): Promise<string[]> {
  const res = await fetch(new URL("models", p.baseURL.endsWith("/") ? p.baseURL : p.baseURL + "/"), {
    headers: { Authorization: `Bearer ${p.apiKey}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`${p.label} /models → HTTP ${res.status}`);
  const body = (await res.json()) as { data?: { id: string }[] };
  return (body.data ?? []).map((m) => m.id.replace(/^models\//, ""));
}
