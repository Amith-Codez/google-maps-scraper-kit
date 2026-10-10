"use client";

import Link from "next/link";
import useSWR from "swr";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

interface Row {
  id: number;
  name: string;
  stage: string;
  channel: string | null;
  needsReview: number;
  followUpAt: number | null;
  contactedAt: number | null;
  lastBody: string | null;
  lastDir: string | null;
  lastIntent: string | null;
  msgCount: number;
  previewReplies: number;
}

const COLUMNS: { id: string; label: string; stages: string[] }[] = [
  { id: "found", label: "Pitch ready", stages: ["ready"] },
  { id: "contacted", label: "Contacted", stages: ["contacted"] },
  { id: "replied", label: "Replied", stages: ["replied"] },
  { id: "interested", label: "Interested", stages: ["interested", "won"] },
];

const fetcher = (u: string) => fetch(u).then((r) => r.json());
const fmt = (t: number) => new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function Pipeline() {
  const { data } = useSWR<{ leads: Row[] }>("/api/pipeline", fetcher, { refreshInterval: 2000 });
  if (!data)
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-ink-3">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading pipeline…
      </div>
    );
  const lost = data.leads.filter((l) => l.stage === "lost");
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Pipeline</h1>
      <p className="mt-1 text-sm text-ink-2">Every conversation, from pitch to interested. Updates live.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = data.leads.filter((l) => col.stages.includes(l.stage));
          return (
            <div key={col.id} className="flex min-h-64 flex-col rounded-xl border border-line bg-white/50">
              <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
                <span className={`text-sm font-medium ${col.id === "interested" ? "text-go" : ""}`}>{col.label}</span>
                <span className="font-mono text-xs text-ink-3">{items.length}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: 640 }}>
                {!items.length && <p className="p-4 text-center text-xs text-ink-3">Nothing here yet.</p>}
                {items.map((l) => (
                  <motion.div key={l.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <Link
                      href={`/leads/${l.id}`}
                      className={`block rounded-lg border bg-white px-3 py-2 transition hover:border-ink ${col.id === "interested" ? "border-go/40" : "border-line"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{l.name}</span>
                        {l.needsReview && l.stage === "ready" ? <span className="shrink-0 text-[10px] text-chilli">review</span> : null}
                      </div>
                      {l.lastBody && (
                        <p className="mt-1 line-clamp-2 text-xs text-ink-2">
                          <span className="text-ink-3">{l.lastDir === "in" ? "them: " : "us: "}</span>
                          {l.lastBody}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-x-2 font-mono text-[10px] text-ink-3">
                        {l.contactedAt && <span>contacted {fmt(l.contactedAt)}</span>}
                        {l.followUpAt && l.stage === "contacted" && <span>follow-up {fmt(l.followUpAt)}</span>}
                        {l.lastIntent && <span>intent: {l.lastIntent}</span>}
                        {l.previewReplies > 0 && <span>{l.previewReplies} preview repl{l.previewReplies > 1 ? "ies" : "y"}</span>}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {lost.length > 0 && (
        <p className="mt-4 text-xs text-ink-3">
          Not interested / opted out ({lost.length}): {lost.map((l) => l.name).join(", ")}. They will never be contacted again.
        </p>
      )}
    </div>
  );
}
