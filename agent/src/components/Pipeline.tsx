"use client";

import Link from "next/link";
import useSWR from "swr";
import { motion } from "motion/react";
import { Loader2, TrendingUp, Sparkles, Send, Check, X } from "lucide-react";
import { useState } from "react";
import { SentMail } from "./SentMail";

interface Row {
  id: number;
  name: string;
  stage: string;
  channel: string | null;
  email: string | null;
  needsReview: number;
  followUpAt: number | null;
  contactedAt: number | null;
  lastBody: string | null;
  lastDir: string | null;
  lastIntent: string | null;
  msgCount: number;
  previewReplies: number;
}

const COLUMNS: { id: string; label: string; stages: string[]; means: string; move: string; icon: string }[] = [
  { id: "found", label: "Pitch ready", stages: ["ready"], icon: "1", means: "The AI team wrote a pitch and built a demo page.", move: "Send the email, or forward the voice note on WhatsApp." },
  { id: "contacted", label: "Sent · waiting", stages: ["contacted"], icon: "2", means: "Email sent: it left Pitch ready. A follow-up is booked automatically.", move: "Nothing. Pitchwala waits and nudges once. Track it in Sent mail." },
  { id: "replied", label: "Replied", stages: ["replied"], icon: "3", means: "They wrote back. The agent answered in the thread.", move: "Check Telegram; step in if it needs you." },
  { id: "interested", label: "Interested", stages: ["interested", "won"], icon: "4", means: "They said yes. Your phone already buzzed.", move: "Call them today and close it." },
];

const fetcher = (u: string) => fetch(u).then((r) => r.json());
const fmt = (t: number) => new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

interface Insights {
  themes: { theme: string; pitched: number; replied: number; interested: number }[];
  winners: { title: string; theme: string; lead: string; intent: string }[];
  totalReplies: number;
}

/** Learning which ideas get replies: real replies grouped by idea theme; fed back to the Strategist. */
function WhatsWorking() {
  const { data } = useSWR<Insights>("/api/insights", fetcher, { refreshInterval: 5000 });
  return (
    <div className="rounded-3xl bg-ink p-5 text-paper">
      <div className="flex items-center gap-2 font-display font-bold"><Sparkles className="h-4 w-4 text-neon" /> What&apos;s working</div>
      {!data || !data.themes.length ? (
        <p className="mt-3 text-sm text-paper/60">Once replies come in, you&apos;ll see which kinds of ideas owners answer. The Strategist learns from them.</p>
      ) : (
        <>
          <ul className="mt-3 space-y-2">
            {data.themes.slice(0, 4).map((t) => (
              <li key={t.theme} className="flex items-center justify-between gap-3 text-sm">
                <span>{t.theme}</span>
                <span className="font-mono text-xs text-paper/70">
                  <b className="text-neon">{t.replied}</b> repl{t.replied === 1 ? "y" : "ies"} / {t.pitched} pitched{t.interested ? ` · ${t.interested} interested` : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-paper/50">Fed to the Strategist on every new lead. Counts include replies to preview copies.</p>
        </>
      )}
    </div>
  );
}

export function Pipeline() {
  const { data, mutate } = useSWR<{ leads: Row[] }>("/api/pipeline", fetcher, { refreshInterval: 2000 });
  const { data: stats } = useSWR<{ sentToday: number; cap: number }>("/api/stats", fetcher, { refreshInterval: 3000 });
  const [picked, setPicked] = useState<number[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "sent">("board");
  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  async function sendPicked() {
    setSending(true);
    const res = await fetch("/api/send-batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadIds: picked }) });
    const j = await res.json();
    const ok = (j.results ?? []).filter((r: { ok: boolean }) => r.ok).length;
    setResult(res.ok ? `${ok} email${ok === 1 ? "" : "s"} queued through the gate · ${j.sentToday}/${j.cap} sent today` : (j.error ?? "Failed"));
    setPicked([]);
    setConfirming(false);
    setSending(false);
    await mutate();
  }
  if (!data)
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-ink-3">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading pipeline…
      </div>
    );
  const lost = data.leads.filter((l) => l.stage === "lost");
  const n = (st: string[]) => data.leads.filter((l) => st.includes(l.stage)).length;
  const funnel = [
    { label: "Pitch ready", v: n(["ready", "contacted", "replied", "interested", "won", "lost"]) },
    { label: "Contacted", v: n(["contacted", "replied", "interested", "won", "lost"]) },
    { label: "Replied", v: n(["replied", "interested", "won"]) },
    { label: "Interested", v: n(["interested", "won"]) },
  ];
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Pipeline</h1>
        <Link href="/clients" className="rounded-2xl border-2 border-ink bg-neon px-4 py-2 font-display text-sm font-bold shadow-[3px_3px_0_0_#14110F]">Export clients + closing plans →</Link>
      </div>
      <div className="mt-4 inline-flex rounded-2xl border border-line bg-white p-1 text-sm">
        {([["board", "Board"], ["sent", "Sent mail"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} className={`rounded-xl px-4 py-1.5 font-semibold transition ${view === id ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2"}`}>
            {label}
          </button>
        ))}
      </div>
      {view === "sent" ? (
        <SentMail />
      ) : (
      <>
      <p className="mt-3 text-sm text-ink-2">Every business moves left to right: <b>pitch ready → contacted → replied → interested</b>. Each column tells you what it means and what to do. Updates live.</p>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border-2 border-ink bg-white p-5 shadow-[5px_5px_0_0_#14110F]">
          <div className="flex items-center gap-2 font-display font-bold"><TrendingUp className="h-4 w-4" /> Your funnel</div>
          <div className="mt-4 space-y-2">
            {funnel.map((f, i) => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-ink-2">{f.label}</span>
                <div className="h-7 flex-1 overflow-hidden rounded-full bg-paper-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(4, (f.v / Math.max(1, funnel[0].v)) * 100)}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                    className={`flex h-full items-center justify-end rounded-full px-3 font-display text-sm font-bold ${i === 3 ? "bg-go text-white" : i === 0 ? "bg-ink text-paper" : "bg-chilli text-white"}`}
                  >
                    {f.v}
                  </motion.div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <WhatsWorking />
      </div>
      {(picked.length > 0 || result) && (
        <div className="sticky top-16 z-30 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-ink bg-neon px-5 py-3 shadow-[4px_4px_0_0_#14110F]">
          {picked.length > 0 ? (
            <>
              <span className="font-display font-bold">{picked.length} selected to email</span>
              <span className="text-sm">{stats ? `${Math.max(0, stats.cap - stats.sentToday)} sends left today` : ""}</span>
              <div className="flex gap-2">
                <button onClick={() => setPicked([])} className="rounded-xl border border-ink px-3 py-2 text-sm">Clear</button>
                <button onClick={() => setConfirming(true)} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 font-display font-bold text-paper">
                  <Send className="h-4 w-4" /> Send email to {picked.length}
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="font-display font-bold">{result}</span>
              <button onClick={() => setResult(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button>
            </>
          )}
        </div>
      )}
      {confirming && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-6">
          <div className="w-full max-w-md rounded-3xl border-2 border-ink bg-white p-6 shadow-[6px_6px_0_0_#C8FF3D]">
            <div className="font-display text-xl font-extrabold">Send {picked.length} email{picked.length === 1 ? "" : "s"} from your Gmail?</div>
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm">
              {data.leads.filter((l) => picked.includes(l.id)).map((l) => (
                <li key={l.id} className="flex justify-between gap-2"><span className="truncate font-medium">{l.name}</span><span className="truncate text-ink-3">{l.email}</span></li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-3">Each one carries the opt-out line, respects today&apos;s cap and the never-contact-again list, and goes once per business.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirming(false)} className="rounded-xl border border-line px-4 py-2 text-sm">Cancel</button>
              <button onClick={sendPicked} disabled={sending} className="inline-flex items-center gap-2 rounded-xl bg-chilli px-4 py-2 font-display font-bold text-white disabled:opacity-60">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Yes, send
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mt-5 grid gap-4 md:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = data.leads.filter((l) => col.stages.includes(l.stage));
          return (
            <div key={col.id} className="flex min-h-64 flex-col overflow-hidden rounded-3xl border border-line bg-white/70">
              <div className={`px-4 py-3 ${col.id === "interested" ? "bg-go text-white" : col.id === "replied" ? "bg-neon text-ink" : col.id === "contacted" ? "bg-chilli text-white" : "bg-ink text-paper"}`}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-display text-sm font-bold">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-white/25 text-[11px]">{col.icon}</span>
                    {col.label}
                  </span>
                  <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/20 px-1.5 font-mono text-xs">{items.length}</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug opacity-85">{col.means}</p>
              </div>
              <div className="border-b border-line bg-paper px-4 py-2 text-[11px]">
                <b>Your move:</b> <span className="text-ink-2">{col.move}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: 640 }}>
                {!items.length && (
                  <p className="p-5 text-center text-xs text-ink-3">
                    {col.id === "interested" ? "Your first yes lands here, with confetti." : col.id === "replied" ? "Replies show up here within seconds." : col.id === "contacted" ? "Send a pitch to see it here." : "Start a campaign to fill this."}
                  </p>
                )}
                {items.map((l) => (
                  <motion.div key={l.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="relative">
                    {col.id === "found" && (
                      l.channel === "email" && l.email ? (
                        <button
                          onClick={() => toggle(l.id)}
                          aria-label={picked.includes(l.id) ? "Unselect" : "Select to send"}
                          className={`absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-lg border-2 transition ${picked.includes(l.id) ? "border-ink bg-neon" : "border-line bg-white hover:border-ink"}`}
                        >
                          {picked.includes(l.id) && <Check className="h-4 w-4" />}
                        </button>
                      ) : (
                        <span className="absolute right-2 top-2 z-10 rounded-md bg-paper-2 px-1.5 py-0.5 text-[9px] text-ink-3" title="No usable email: forward the voice note on WhatsApp">WhatsApp</span>
                      )
                    )}
                    <Link
                      href={`/leads/${l.id}`}
                      className={`block rounded-2xl border bg-white px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-ink hover:shadow-md ${col.id === "interested" ? "border-go/40" : "border-line"}`}
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
      </>
      )}
      {lost.length > 0 && (
        <p className="mt-4 text-xs text-ink-3">
          Not interested / opted out ({lost.length}): {lost.map((l) => l.name).join(", ")}. They will never be contacted again.
        </p>
      )}
    </div>
  );
}
