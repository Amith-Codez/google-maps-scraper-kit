import { NextResponse } from "next/server";
import { z } from "zod";
import { getSetting, setSetting } from "@/lib/settings";
import { isProviderId, PROVIDER_IDS, providerConfigs } from "@/lib/providers";
import { dailyCap, sentToday } from "@/lib/outbox";
import { writeEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

function snapshot() {
  const cfgs = providerConfigs();
  return {
    provider: getSetting("provider"),
    model: getSetting("model") ?? "",
    fallback: getSetting("fallback") ?? "",
    daily_cap: dailyCap(),
    opt_out_text: getSetting("opt_out_text"),
    language: getSetting("language"),
    auto_send: getSetting("auto_send"),
    sentToday: sentToday(),
    providers: PROVIDER_IDS.map((id) => ({
      id,
      label: cfgs[id].label,
      defaultModel: cfgs[id].defaultModel,
      configured: cfgs[id].apiKey.length > 0,
      local: id === "ollama",
    })),
  };
}

export async function GET() {
  return NextResponse.json(snapshot());
}

const Patch = z.object({
  provider: z.string().refine(isProviderId).optional(),
  model: z.string().max(80).optional(),
  fallback: z.string().max(80).optional(),
  daily_cap: z.coerce.number().int().min(1).max(50).optional(),
  opt_out_text: z.string().min(8).max(120).refine((s) => /stop/i.test(s), "must tell people how to stop (e.g. Reply STOP)").optional(),
  language: z.enum(["en", "hi", "te"]).optional(),
  auto_send: z.enum(["on", "off"]).optional(),
});

// Live settings: the worker reads them on its next model call, no restart needed.
export async function POST(req: Request) {
  const parsed = Patch.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid" }, { status: 400 });
  const p = parsed.data;
  if (p.provider !== undefined) {
    setSetting("provider", p.provider);
    setSetting("model", p.model ?? "");
    writeEvent({ agent: "user", type: "model_switch", summary: `Model switched to ${p.provider}${p.model ? ` · ${p.model}` : ""}` });
  } else if (p.model !== undefined) setSetting("model", p.model);
  if (p.fallback !== undefined) setSetting("fallback", p.fallback);
  if (p.daily_cap !== undefined) setSetting("daily_cap", String(p.daily_cap));
  if (p.opt_out_text !== undefined) setSetting("opt_out_text", p.opt_out_text);
  if (p.language !== undefined) setSetting("language", p.language);
  if (p.auto_send !== undefined) setSetting("auto_send", p.auto_send);
  return NextResponse.json(snapshot());
}
