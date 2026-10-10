"use client";

import useSWR from "swr";
import { AnimatePresence, motion } from "motion/react";

interface Campaign {
  id: number;
  service: string;
  found: number;
  ideasRejected: number;
  replies: number;
  sent: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

const fetcher = (u: string) => fetch(u).then((r) => r.json());

function Tick({ value }: { value: number }) {
  return (
    <span className="relative inline-block overflow-hidden tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Three live counters for the latest campaign + the cost meter (BUILD_PLAN §10.1, §8a). */
export function Counters() {
  const { data } = useSWR<{ campaigns: Campaign[] }>("/api/campaigns", fetcher, { refreshInterval: 2000 });
  const { data: stats } = useSWR<{ sentToday: number; cap: number }>("/api/stats", fetcher, { refreshInterval: 3000 });
  const c = data?.campaigns?.[0];
  const items = [
    { label: "businesses found", value: c?.found ?? 0 },
    { label: "generic ideas rejected", value: c?.ideasRejected ?? 0 },
    { label: "replies", value: c?.replies ?? 0 },
  ];
  const tokens = (c?.tokensIn ?? 0) + (c?.tokensOut ?? 0);
  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-3">
        {items.map((i) => (
          <div key={i.label} className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-center">
            <div className="font-display text-4xl font-extrabold">
              <Tick value={i.value} />
            </div>
            <div className="mt-1 text-xs text-ink-3">{i.label}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center font-mono text-xs text-ink-3">
        {c ? (
          <>
            Latest campaign: {(tokens / 1000).toFixed(1)}k tokens · ${(c.costUsd ?? 0).toFixed(4)}
          </>
        ) : (
          "No campaign yet"
        )}
        {stats && (
          <>
            {" · "}
            <span className="text-ink-2">
              Sent today: {stats.sentToday} / {stats.cap}
            </span>
          </>
        )}
      </p>
    </div>
  );
}
