"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { motion } from "motion/react";
import { Download, Printer, Loader2, Phone, Mail, Globe, MapPin, Star, Target, MessageSquare, ShieldAlert, Rocket, CheckCircle2, Sparkles } from "lucide-react";

type Group = "interested" | "conversation" | "not_replied" | "not_interested" | "not_contacted";
interface Closing {
  summary: string;
  call_opener: string;
  discovery_questions: string[];
  what_to_show: string[];
  proposal_scope: string[];
  objections: { objection: string; answer: string }[];
  plan: { day: string; step: string }[];
  close_line: string;
  upsell_later: string[];
  red_flags: string[];
}
interface Row {
  id: number;
  group: Group;
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  emailStatus: string | null;
  website: string | null;
  address: string | null;
  rating: number | null;
  reviews: number | null;
  score: number | null;
  scoreReason: string | null;
  hours: Record<string, string[]> | null;
  idea: string | null;
  ideaPitch: string | null;
  whyNeeded: string | null;
  subject: string | null;
  pitch: string | null;
  voiceScript: string | null;
  conversation: { from: "owner" | "us"; text: string; at: number | null; intent: string | null }[];
  lastIntent: string | null;
  hasDemoSite: boolean;
  closing: Closing | null;
  next: string;
}
interface Data {
  groups: { id: Group; label: string; next: string }[];
  report: Record<Group, Row[]>;
}

const fetcher = (u: string) => fetch(u).then((r) => r.json());
const TONE: Record<Group, string> = {
  interested: "bg-go text-white",
  conversation: "bg-neon text-ink",
  not_replied: "bg-chilli text-white",
  not_interested: "bg-ink-3 text-white",
  not_contacted: "bg-ink text-paper",
};

function Blueprint({ c }: { c: Closing }) {
  return (
    <div className="mt-4 rounded-3xl bg-ink p-5 text-paper">
      <div className="flex items-center gap-2 font-display text-lg font-extrabold">
        <Rocket className="h-5 w-5 text-neon" /> Client-capture blueprint
      </div>
      <p className="mt-1 text-sm text-paper/80">{c.summary}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-neon">1 · Open the call</p>
          <p className="mt-2 text-sm">&ldquo;{c.call_opener}&rdquo;</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-neon">2 · Ask first</p>
          <ul className="mt-1 space-y-1 text-sm text-paper/85">{c.discovery_questions.map((q) => <li key={q}>· {q}</li>)}</ul>
        </div>
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-neon">3 · Show them</p>
          <ol className="mt-1 space-y-1 text-sm text-paper/85">{c.what_to_show.map((q, i) => <li key={q}>{i + 1}. {q}</li>)}</ol>
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-neon">4 · Propose</p>
          <ul className="mt-1 space-y-1 text-sm text-paper/85">{c.proposal_scope.map((q) => <li key={q} className="flex gap-1.5"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neon" /> {q}</li>)}</ul>
        </div>
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-neon">5 · Handle objections</p>
          <ul className="mt-2 space-y-2 text-sm">
            {c.objections.map((o) => (
              <li key={o.objection}>
                <b className="text-paper">&ldquo;{o.objection}&rdquo;</b>
                <div className="text-paper/75">→ {o.answer}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-neon">6 · Closing plan</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {c.plan.map((p) => (
              <li key={p.day + p.step} className="flex gap-2">
                <span className="shrink-0 rounded-md bg-neon px-1.5 py-0.5 font-mono text-[11px] font-bold text-ink">{p.day}</span>
                <span className="text-paper/85">{p.step}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-neon p-4 text-ink">
        <p className="text-xs font-bold uppercase tracking-widest">7 · Close</p>
        <p className="mt-1 font-display text-lg font-bold">&ldquo;{c.close_line}&rdquo;</p>
      </div>
      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
        <p><b className="text-neon">Later, upsell:</b> <span className="text-paper/80">{c.upsell_later.join(" · ")}</span></p>
        <p className="flex gap-1.5"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-chilli" /> <span className="text-paper/80">{c.red_flags.join(" · ")}</span></p>
      </div>
    </div>
  );
}

function ClientCard({ r, onBuild, building }: { r: Row; onBuild: (id: number) => void; building: boolean }) {
  const lastOwner = [...r.conversation].reverse().find((m) => m.from === "owner");
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="break-inside-avoid rounded-3xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/leads/${r.id}`} className="font-display text-xl font-extrabold hover:text-chilli">{r.name}</Link>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
            {r.category && <span>{r.category}</span>}
            {r.rating !== null && <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-current" />{r.rating.toFixed(1)} ({r.reviews ?? 0})</span>}
            {r.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{r.phone}</span>}
            {r.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{r.email}</span>}
            {r.website && <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" />{r.website.replace(/^https?:\/\//, "").slice(0, 30)}</span>}
          </div>
          {r.address && <div className="mt-1 flex items-center gap-1 text-xs text-ink-3"><MapPin className="h-3 w-3" />{r.address}</div>}
        </div>
        <div className="text-right">
          <div className="font-display text-2xl font-extrabold text-chilli">{r.score ?? "–"}</div>
          <div className="text-[10px] text-ink-3">opportunity</div>
        </div>
      </div>
      <div className="mt-3 rounded-2xl bg-paper px-3 py-2 text-sm"><b>Next move:</b> {r.next}</div>
      {r.idea && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-3">The idea</p>
            <p className="font-semibold">{r.idea}</p>
            <p className="text-sm text-ink-2">{r.ideaPitch}</p>
            {r.whyNeeded && <p className="mt-2 rounded-xl bg-chilli-soft/60 px-2 py-1 text-xs"><b>Why they need it:</b> {r.whyNeeded}</p>}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-3">The pitch{r.subject ? `: ${r.subject}` : ""}</p>
            <p className="line-clamp-5 whitespace-pre-line text-sm text-ink-2">{r.pitch}</p>
          </div>
        </div>
      )}
      {r.conversation.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-ink-3"><MessageSquare className="h-3 w-3" /> Conversation</p>
          {r.conversation.slice(-4).map((m, i) => (
            <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm ${m.from === "owner" ? "bg-lilac" : "ml-auto bg-paper-2"}`}>
              <span className="text-[10px] font-bold uppercase text-ink-3">{m.from === "owner" ? `owner${m.intent ? ` · ${m.intent}` : ""}` : "us"}</span>
              <p className="line-clamp-3">{m.text}</p>
            </div>
          ))}
        </div>
      )}
      {r.group === "interested" &&
        (r.closing ? (
          <Blueprint c={r.closing} />
        ) : (
          <button onClick={() => onBuild(r.id)} disabled={building} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-ink px-4 py-2.5 font-display font-bold text-paper disabled:opacity-60 print:hidden">
            {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-neon" />} Build the client-capture blueprint
          </button>
        ))}
      {r.group === "interested" && !lastOwner && <p className="mt-2 text-xs text-ink-3">Interested via the voice agent.</p>}
    </motion.div>
  );
}

export function ClientsReport() {
  const { data: camps } = useSWR<{ campaigns: { id: number; clients: string; service: string }[] }>("/api/campaigns", fetcher);
  const [camp, setCamp] = useState<number | 0 | null>(null);
  const current = camp ?? camps?.campaigns?.[0]?.id ?? 0;
  const { data, mutate } = useSWR<Data>(camps ? `/api/export${current ? `?c=${current}` : ""}` : null, fetcher, { refreshInterval: 4000 });
  const [tab, setTab] = useState<Group | "all">("interested");
  const [building, setBuilding] = useState<number | null>(null);
  if (!data)
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-ink-3">
        <Loader2 className="h-4 w-4 animate-spin" /> Gathering every client…
      </div>
    );
  const groups = data.groups.filter((g) => tab === "all" || g.id === tab);
  async function build(id: number) {
    setBuilding(id);
    await fetch(`/api/leads/${id}/closing`, { method: "POST" });
    setTimeout(() => {
      void mutate();
      setBuilding(null);
    }, 1500);
  }
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">Clients</h1>
          <p className="mt-1 text-sm text-ink-2">Everyone you&apos;ve pitched, sorted by where they stand, with everything we know and your next move.</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <select value={current} onChange={(e) => setCamp(Number(e.target.value))} className="rounded-2xl border border-line bg-white px-3 py-2 text-sm">
            <option value={0}>All campaigns</option>
            {(camps?.campaigns ?? []).map((c) => (
              <option key={c.id} value={c.id}>#{c.id} · {c.clients.slice(0, 36)}</option>
            ))}
          </select>
          <a href={`/api/export/csv${current ? `?c=${current}` : ""}`} className="inline-flex items-center gap-2 rounded-2xl border-2 border-ink bg-neon px-4 py-2.5 font-display font-bold shadow-[3px_3px_0_0_#14110F]">
            <Download className="h-4 w-4" /> Download CSV
          </a>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-2xl bg-ink px-4 py-2.5 font-display font-bold text-paper">
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5 print:hidden">
        {data.groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setTab(tab === g.id ? "all" : g.id)}
            className={`rounded-2xl p-3 text-left transition hover:-translate-y-0.5 ${tab === g.id ? `${TONE[g.id]} shadow-[3px_3px_0_0_#14110F]` : "border border-line bg-white"}`}
          >
            <div className="font-display text-3xl font-extrabold">{data.report[g.id].length}</div>
            <div className="text-xs font-semibold">{g.label}</div>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-3 print:hidden">{tab === "all" ? "Showing everyone." : "Tap the same tile again to show everyone."}</p>
      {groups.map((g) => (
        <section key={g.id} className="mt-8">
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 font-display text-sm font-bold ${TONE[g.id]}`}>{g.label}</span>
            <span className="text-sm text-ink-3">{data.report[g.id].length} · {g.next}</span>
          </div>
          <div className="mt-4 space-y-4">
            {data.report[g.id].length === 0 && (
              <p className="rounded-3xl border border-dashed border-line p-6 text-center text-sm text-ink-3">
                <Target className="mx-auto mb-1 h-5 w-5" /> Nobody here yet.
              </p>
            )}
            {data.report[g.id].map((r) => (
              <ClientCard key={r.id} r={r} onBuild={build} building={building === r.id} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
