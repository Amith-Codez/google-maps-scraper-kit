"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Mail, MessageCircle, PhoneOff, Search, Star } from "lucide-react";

const LeadMap = dynamic(() => import("./LeadMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-paper-2" />,
});

interface Lead {
  id: number;
  name: string;
  category: string | null;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  channel: string | null;
  score: number | null;
  scoreReason: string | null;
  stage: string;
  needsReview: boolean;
}
interface Data {
  campaign: {
    id: number;
    service: string;
    clients: string;
    area: string | null;
    city: string | null;
    lat: number | null;
    lon: number | null;
    status: string;
    planWhy: string | null;
    keywordsJson: string | null;
    found: number;
    ideasRejected: number;
    replies: number;
  };
  leads: Lead[];
  working: number[];
  events: { id: number; agent: string; summary: string; createdAt: number }[];
}

const fetcher = (u: string) =>
  fetch(u).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  });

const STATUS: Record<string, string> = {
  planning: "Planner is reading your two sentences…",
  discovering: "Searching Google Maps through the kit…",
  found: "Leads found",
  weak_fit: "Weak fit: nothing will be sent",
  no_results: "No businesses found",
};

export function ChannelChip({ channel }: { channel: string | null }) {
  if (channel === "email")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[11px] text-paper">
        <Mail className="h-3 w-3" /> Email
      </span>
    );
  if (channel === "whatsapp")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-ink/20 px-2 py-0.5 text-[11px] text-ink-2">
        <MessageCircle className="h-3 w-3" /> WhatsApp + voice
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-3">
      <PhoneOff className="h-3 w-3" /> None
    </span>
  );
}

export function StageChip({ stage, needsReview, working }: { stage: string; needsReview: boolean; working: boolean }) {
  if (working)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-paper-2 px-2 py-0.5 text-[11px] text-ink-2">
        <Loader2 className="h-3 w-3 animate-spin" /> agents working
      </span>
    );
  if (stage === "found") return null;
  if (stage === "ready" && needsReview) return <span className="rounded-full bg-chilli-soft px-2 py-0.5 text-[11px] text-chilli">needs your review</span>;
  const cls = stage === "interested" ? "bg-go-soft text-go" : "bg-paper-2 text-ink-2";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] ${cls}`}>{stage === "ready" ? "pitch ready" : stage}</span>;
}

export function LeadsView({ campaignId }: { campaignId: number }) {
  const { data, error } = useSWR<Data>(`/api/campaigns/${campaignId}`, fetcher, { refreshInterval: 2000 });
  const [selected, setSelected] = useState<number | null>(null);
  const router = useRouter();
  const { data: list } = useSWR<{ campaigns: { id: number; service: string; clients: string; found: number }[] }>("/api/campaigns", fetcher, { refreshInterval: 10000 });
  const [filter, setFilter] = useState<"all" | "email" | "whatsapp" | "ready" | "review">("all");
  const [q, setQ] = useState("");

  if (error) return <div className="p-10 text-center text-ink-2">Campaign not found.</div>;
  if (!data)
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-ink-3">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading campaign…
      </div>
    );

  const { campaign: c, events } = data;
  const allLeads = data.leads;
  const leads = allLeads.filter((l) => {
    if (q && !l.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === "email") return l.channel === "email";
    if (filter === "whatsapp") return l.channel === "whatsapp";
    if (filter === "ready") return l.stage !== "found" && !l.needsReview;
    if (filter === "review") return l.needsReview;
    return true;
  });
  const FILTERS: [typeof filter, string, number][] = [
    ["all", "All", allLeads.length],
    ["email", "Email", allLeads.filter((l) => l.channel === "email").length],
    ["whatsapp", "WhatsApp + voice", allLeads.filter((l) => l.channel === "whatsapp").length],
    ["ready", "Pitch ready", allLeads.filter((l) => l.stage !== "found" && !l.needsReview).length],
    ["review", "Needs review", allLeads.filter((l) => l.needsReview).length],
  ];
  const working = new Set(data.working ?? []);
  const busy = c.status === "planning" || c.status === "discovering";
  const center: [number, number] = [c.lat ?? 17.3297, c.lon ?? 78.556];
  const keywords: string[] = c.keywordsJson ? JSON.parse(c.keywordsJson) : [];

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <select
            value={c.id}
            onChange={(e) => router.push(`/leads?c=${e.target.value}`)}
            className="rounded-full border border-line bg-white px-3 py-1 text-xs text-ink-2 outline-none hover:border-ink"
          >
            {(list?.campaigns ?? [{ id: c.id, service: c.service, clients: c.clients, found: c.found }]).map((x) => (
              <option key={x.id} value={x.id}>
                #{x.id} · {x.clients.slice(0, 40)} ({x.found})
              </option>
            ))}
          </select>
          <h1 className="font-display mt-1 text-2xl font-extrabold tracking-tight">
            {c.service} <span className="text-ink-3">→</span> {c.clients}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-2">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-chilli" />}
            {STATUS[c.status] ?? c.status}
            {keywords.length > 0 && <span className="font-mono text-xs text-ink-3">· {keywords.join(" · ")}</span>}
          </p>
          {c.planWhy && <p className="mt-1 max-w-3xl text-xs text-ink-3">Planner: {c.planWhy}</p>}
        </div>
        <div className="flex gap-6 text-right">
          {[
            ["found", c.found],
            ["ideas rejected", c.ideasRejected],
            ["replies", c.replies],
          ].map(([l, v]) => (
            <div key={l as string}>
              <div className="font-display text-3xl font-extrabold tabular-nums">{v}</div>
              <div className="text-[11px] text-ink-3">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[3fr_2fr]">
        <div className="h-[560px] overflow-hidden rounded-xl border border-line">
          <LeadMap center={center} leads={leads} selected={selected} onSelect={setSelected} />
        </div>

        <div className="flex h-[560px] flex-col overflow-hidden rounded-xl border border-line bg-white/60">
          <div className="space-y-2 border-b border-line px-3 py-2.5">
            <label className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-ink-3" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search businesses…" className="w-full bg-transparent text-sm outline-none" />
            </label>
            <div className="flex flex-wrap gap-1">
              {FILTERS.map(([id, label, count]) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] transition ${filter === id ? "bg-ink text-paper" : "bg-paper-2 text-ink-2 hover:bg-line"}`}
                >
                  {label} <span className="opacity-60">{count}</span>
                </button>
              ))}
            </div>
            <div className="text-[11px] text-ink-3">{leads.length} shown · sorted by opportunity score</div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!leads.length && (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-sm text-ink-3">
                {busy ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-chilli" />
                    Finding real businesses near {c.area ?? "you"}… (fast mode takes under a minute)
                  </>
                ) : (
                  "No leads in this campaign."
                )}
              </div>
            )}
            <AnimatePresence initial={false}>
              {leads.map((l, i) => (
                <motion.div
                  key={l.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 20) * 0.04 }}
                  onMouseEnter={() => setSelected(l.id)}
                  className={`border-b border-line px-4 py-3 transition ${selected === l.id ? "bg-paper-2" : ""}`}
                >
                  <Link href={`/leads/${l.id}`} className="block">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{l.name}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-3">
                          {l.rating !== null && (
                            <span className="inline-flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-current" />
                              {l.rating.toFixed(1)}
                            </span>
                          )}
                          {l.reviewCount !== null && <span>{l.reviewCount} reviews</span>}
                          {l.phone && <span className="font-mono">{l.phone}</span>}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-lg font-semibold tabular-nums text-chilli">{l.score ?? "–"}</div>
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-[11px] text-ink-2">{l.scoreReason}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <StageChip stage={l.stage} needsReview={l.needsReview} working={working.has(l.id)} />
                        <ChannelChip channel={l.channel} />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-line bg-white/60 p-4">
        <p className="text-xs uppercase tracking-wider text-ink-3">Agent activity</p>
        <ul className="mt-2 space-y-1 font-mono text-xs text-ink-2">
          {events.slice(0, 8).map((e) => (
            <li key={e.id}>
              <span className="text-ink-3">{new Date(e.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>{" "}
              <span className="text-chilli">{e.agent}</span> {e.summary}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
