import { generateText, Output } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { getRaw } from "./db";
import { log } from "./log";
import { getSetting } from "./settings";
import { isProviderId, providerConfigs, type ProviderConfig, type ProviderId } from "./providers";
import type { LLM, LlmCall, LlmResult } from "./ports";

// We log our own warnings; the SDK's console warnings would flood the worker log.
(globalThis as { AI_SDK_LOG_WARNINGS?: boolean }).AI_SDK_LOG_WARNINGS = false;

// Per-lead budget across ALL agent calls (BUILD_PLAN §2). Enforced here, not by convention.
export const LEAD_BUDGET_IN = 6000;
export const LEAD_BUDGET_OUT = 2000;

export class BudgetExceededError extends Error {}

/** Rough token estimate (≈4 characters per token) used before a call; real usage is recorded after. */
export const estimateTokens = (s: string) => Math.ceil(s.length / 4);

/** Active provider first, then the fallback chain from Settings. Providers without a key are skipped. */
export function providerChain(): ProviderConfig[] {
  const cfgs = providerConfigs();
  const active = getSetting("provider") ?? "gemini";
  const fallback = (getSetting("fallback") ?? "").split(",").map((s) => s.trim());
  const ids = [active, ...fallback].filter(isProviderId);
  const seen = new Set<ProviderId>();
  return ids
    .filter((id) => (seen.has(id) ? false : (seen.add(id), true)))
    .map((id) => cfgs[id])
    .filter((p) => p.apiKey.length > 0);
}

export function activeModel(p: ProviderConfig): string {
  const model = getSetting("model");
  const active = getSetting("provider");
  return active === p.id && model ? model : p.defaultModel;
}

function leadUsage(leadId: number) {
  return (getRaw().prepare(`SELECT tokens_in, tokens_out FROM leads WHERE id = ?`).get(leadId) as
    | { tokens_in: number; tokens_out: number }
    | undefined) ?? { tokens_in: 0, tokens_out: 0 };
}

function recordUsage(call: LlmCall<unknown>, inT: number, outT: number, cost: number) {
  const raw = getRaw();
  if (call.leadId)
    raw
      .prepare(`UPDATE leads SET tokens_in = tokens_in + ?, tokens_out = tokens_out + ?, cost_usd = cost_usd + ? WHERE id = ?`)
      .run(inT, outT, cost, call.leadId);
  if (call.campaignId)
    raw
      .prepare(`UPDATE campaigns SET tokens_in = tokens_in + ?, tokens_out = tokens_out + ?, cost_usd = cost_usd + ? WHERE id = ?`)
      .run(inT, outT, cost, call.campaignId);
}

function schemaHint(schema: z.ZodType<unknown>): string {
  try {
    return JSON.stringify(z.toJSONSchema(schema));
  } catch {
    return "";
  }
}

async function callOnce<T>(p: ProviderConfig, call: LlmCall<T>, prompt: string, maxOut: number, modelOverride?: string) {
  const provider = createOpenAICompatible({
    name: p.id,
    baseURL: p.baseURL,
    apiKey: p.apiKey,
    supportsStructuredOutputs: p.structured,
    includeUsage: true,
  });
  const model = modelOverride ?? activeModel(p);
  const system = p.structured
    ? call.system
    : `${call.system}\n\nRespond with ONLY a JSON object (no prose, no code fences) that matches this JSON Schema:\n${schemaHint(call.schema)}`;
  const res = await generateText({
    model: provider(model),
    system,
    prompt,
    output: Output.object({ schema: call.schema }),
    maxOutputTokens: maxOut,
    temperature: call.temperature ?? 0.7,
    maxRetries: 1,
    timeout: 60_000,
    providerOptions: p.options ? { [p.id]: p.options as Record<string, string> } : undefined,
  });
  return { res, model };
}

/** The model router: budget check → active provider → (retry once on bad JSON) → next provider. */
export const llm: LLM = {
  async generate<T>(call: LlmCall<T>): Promise<LlmResult<T>> {
    let prompt = call.prompt;
    let maxOut = call.maxOutputTokens ?? 1200;

    if (call.leadId) {
      const used = leadUsage(call.leadId);
      const leftIn = LEAD_BUDGET_IN - used.tokens_in - estimateTokens(call.system) - 150;
      const leftOut = LEAD_BUDGET_OUT - used.tokens_out;
      if (leftIn < 200 || leftOut < 100)
        throw new BudgetExceededError(`lead ${call.leadId} token budget used (${used.tokens_in} in / ${used.tokens_out} out)`);
      if (estimateTokens(prompt) > leftIn) prompt = prompt.slice(0, leftIn * 4) + "\n[truncated to fit the token budget]";
      maxOut = Math.min(maxOut, leftOut);
    }

    const chain = providerChain();
    if (!chain.length) throw new Error("No model provider configured");
    const errors: string[] = [];

    for (const p of chain) {
      const models = [activeModel(p), ...(p.backupModels ?? []).filter((m) => m !== activeModel(p))];
      let mi = 0;
      for (let attempt = 1; attempt <= 2 + (p.backupModels?.length ?? 0); attempt++) {
        try {
          const { res, model } = await callOnce(p, call, prompt, maxOut, models[mi]);
          const inT = res.usage.inputTokens ?? estimateTokens(call.system + prompt);
          const outT = res.usage.outputTokens ?? estimateTokens(JSON.stringify(res.output));
          const cost = (inT * p.priceIn + outT * p.priceOut) / 1e6;
          recordUsage(call as LlmCall<unknown>, inT, outT, cost);
          log.info({ agent: call.agent, provider: p.id, model, inT, outT, leadId: call.leadId }, "llm call ok");
          return { output: res.output as T, provider: p.id, model, inputTokens: inT, outputTokens: outT, costUsd: cost };
        } catch (err) {
          const e2 = err as { finishReason?: string; text?: string };
          const msg = (err instanceof Error ? err.message : String(err)) + (e2.finishReason ? ` [finish=${e2.finishReason}, ${e2.text?.length ?? 0} chars]` : "");
          errors.push(`${p.id}#${attempt}: ${msg.slice(0, 200)}`);
          log.warn({ agent: call.agent, provider: p.id, attempt, err: msg.slice(0, 300) }, "llm call failed");
          // Broken JSON gets one retry on the same provider; HTTP/auth/rate-limit errors go straight to the next one.
          // A cut-off answer (finishReason "length") won't parse on a retry either: move on.
          const truncated = (err as { finishReason?: string }).finishReason === "length";
          const badJson = !truncated && /No (object|output) generated|parse|schema|JSON/i.test(msg);
          // Rate-limited: try this provider's sibling model (its own quota) before the next provider.
          const limited = /too many requests|rate limit|429|quota/i.test(msg);
          if (limited && mi < models.length - 1) {
            mi++;
            continue;
          }
          if (!badJson) break;
        }
      }
    }
    throw new Error(`All model providers failed: ${errors.join(" | ")}`);
  },
};
