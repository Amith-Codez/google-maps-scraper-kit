"use client";

import useSWR from "swr";

type Check = { ok: boolean; detail: string };
interface Health {
  ok: boolean;
  worker: boolean;
  checks: null | { checkedAt: number; engine: Check; model: Check; gmail: Check; telegram: Check; voice: Check };
}

const fetcher = (u: string) => fetch(u).then((r) => r.json());

function Dot({ state }: { state: "ok" | "bad" | "wait" }) {
  const cls = state === "ok" ? "bg-go" : state === "bad" ? "bg-chilli" : "bg-ink-3 animate-pulse";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

export function HealthStrip() {
  const { data, error } = useSWR<Health>("/api/health", fetcher, { refreshInterval: 5000 });
  const c = data?.checks;
  const items: { label: string; check?: Check }[] = [
    { label: "Engine", check: c?.engine },
    { label: "Model", check: c?.model },
    { label: "Gmail", check: c?.gmail },
    { label: "Telegram", check: c?.telegram },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-line bg-white/60 px-4 py-2.5 text-xs">
      <span className="flex items-center gap-1.5" title={data?.worker ? "worker running" : "worker not seen"}>
        <Dot state={error ? "bad" : !data ? "wait" : data.worker ? "ok" : "bad"} />
        <span className="text-ink-2">Worker</span>
      </span>
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5" title={i.check?.detail ?? "checking…"}>
          <Dot state={!i.check ? "wait" : i.check.ok ? "ok" : "bad"} />
          <span className="text-ink-2">{i.label}</span>
          {i.check && <span className="max-w-48 truncate font-mono text-[11px] text-ink-3">{i.check.detail}</span>}
        </span>
      ))}
    </div>
  );
}
