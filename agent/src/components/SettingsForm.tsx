"use client";

import { useState } from "react";
import useSWR from "swr";
import { Check, Cpu, Loader2 } from "lucide-react";

interface S {
  provider: string;
  model: string;
  fallback: string;
  daily_cap: number;
  opt_out_text: string;
  language: string;
  auto_send: string;
  sentToday: number;
  providers: { id: string; label: string; defaultModel: string; configured: boolean; local: boolean }[];
}

const fetcher = (u: string) => fetch(u).then((r) => r.json());

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white/70 p-5">
      <h2 className="font-medium">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-ink-3">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SettingsForm() {
  const { data, mutate } = useSWR<S>("/api/settings", fetcher, { refreshInterval: 3000 });
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(patch: Partial<S>, label: string) {
    setSaving(label);
    setMsg(null);
    const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const j = await res.json();
    setMsg(res.ok ? `${label} saved` : j.error);
    await mutate();
    setSaving(null);
  }

  if (!data)
    return (
      <div className="flex items-center gap-2 text-ink-3">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
      </div>
    );

  const fallbackIds = data.fallback.split(",").filter(Boolean);

  return (
    <div className="space-y-5">
      <Card title="Model" hint="Pitchwala runs on any model. Pick the active provider; if it fails, the fallback chain takes over.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {data.providers.map((p) => {
            const active = data.provider === p.id;
            return (
              <button
                key={p.id}
                disabled={!p.configured || saving !== null}
                onClick={() => save({ provider: p.id } as Partial<S>, `Model: ${p.label}`)}
                className={`rounded-lg border px-3 py-3 text-left transition ${active ? "border-ink bg-ink text-paper" : "border-line bg-white hover:border-ink"} disabled:opacity-40`}
              >
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  {active ? <Check className="h-4 w-4" /> : <Cpu className="h-4 w-4" />} {p.label}
                </div>
                <div className={`mt-1 truncate font-mono text-[10.5px] ${active ? "text-paper/70" : "text-ink-3"}`}>
                  {p.configured ? p.defaultModel : "no key"}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-3">Fallback:</span>
          {data.providers
            .filter((p) => p.configured && p.id !== data.provider)
            .map((p) => {
              const on = fallbackIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() =>
                    save({ fallback: (on ? fallbackIds.filter((f) => f !== p.id) : [...fallbackIds, p.id]).join(",") }, "Fallback")
                  }
                  className={`rounded-full border px-3 py-1 text-xs ${on ? "border-ink bg-paper-2" : "border-line text-ink-3"}`}
                >
                  {on ? "✓ " : ""}
                  {p.label}
                </button>
              );
            })}
        </div>
      </Card>

      <Card title="Sending" hint="Every message carries the opt-out line; the cap and the never-contact-again list are enforced by the worker.">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-3xl font-semibold tabular-nums">
              {data.sentToday} <span className="text-ink-3">/ {data.daily_cap}</span>
            </div>
            <div className="text-xs text-ink-3">Sent today</div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            Daily cap
            <input
              type="number"
              min={1}
              max={50}
              defaultValue={data.daily_cap}
              onBlur={(e) => Number(e.target.value) !== data.daily_cap && save({ daily_cap: Number(e.target.value) }, "Daily cap")}
              className="w-20 rounded-lg border border-line bg-white px-2 py-1.5"
            />
          </label>
          <button
            onClick={() => save({ auto_send: data.auto_send === "on" ? "off" : "on" }, "Auto-send")}
            className={`rounded-lg border px-3 py-2 text-sm ${data.auto_send === "on" ? "border-chilli bg-chilli text-white" : "border-line"}`}
          >
            Auto-send ready email pitches: {data.auto_send === "on" ? "ON" : "OFF"}
          </button>
        </div>
        <label className="mt-4 block text-sm">
          Opt-out line (added to every message)
          <input
            defaultValue={data.opt_out_text}
            onBlur={(e) => e.target.value !== data.opt_out_text && save({ opt_out_text: e.target.value }, "Opt-out line")}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
          />
        </label>
      </Card>

      <Card title="Default language" hint="Messages and voice notes; can be changed per campaign on the Start screen.">
        <div className="flex gap-2">
          {[
            ["en", "English"],
            ["hi", "Hindi"],
            ["te", "Telugu"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => save({ language: id }, "Language")}
              className={`rounded-lg border px-3 py-1.5 text-sm ${data.language === id ? "border-ink bg-ink text-paper" : "border-line"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>
      {(msg || saving) && <p className="text-sm text-ink-2">{saving ? `Saving ${saving}…` : msg}</p>}
    </div>
  );
}
