"use client";

import useSWR from "swr";

const fetcher = (u: string) => fetch(u).then((r) => r.json());
const LABEL: Record<string, string> = {
  strategist: "Strategist",
  critic: "Critic",
  twin: "Simulated owner",
  composer: "Writer",
  mailer: "Mail",
  notifier: "Phone ping",
  voice: "Voice",
  discovery: "Scout",
};

/** A live marquee of what the agents are actually doing (real events, newest first). */
export function Ticker() {
  const { data } = useSWR<{ events: { id: number; agent: string; summary: string; lead: string | null }[] }>("/api/activity", fetcher, { refreshInterval: 4000 });
  const items = data?.events ?? [];
  if (!items.length) return null;
  const row = items.map((e) => (
    <span key={e.id} className="mx-6 inline-flex items-center gap-2 whitespace-nowrap">
      <span className="rounded-full bg-neon px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">{LABEL[e.agent] ?? e.agent}</span>
      <span className="text-paper/90">{e.lead ? `${e.lead}: ` : ""}{e.summary.replace(/^[A-Za-z ]+: /, "").slice(0, 90)}</span>
    </span>
  ));
  return (
    <div className="overflow-hidden bg-ink py-2 text-xs">
      <div className="marquee flex w-max">
        {row}
        {row}
      </div>
    </div>
  );
}
