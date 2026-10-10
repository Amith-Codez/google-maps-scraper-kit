"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { motion } from "motion/react";
import { ArrowLeft, ArrowUpRight, Check, Globe, Loader2, Mail, MessageCircle, Mic, RefreshCw, Send, Sparkles, Star } from "lucide-react";
import { ChannelChip } from "./LeadsView";
import { TalkToPitchwala } from "./TalkToPitchwala";
import { TeamRoom } from "./TeamRoom";

interface Idea {
  id: number;
  idx: number;
  title: string;
  pitchLine: string;
  howServiceDelivers: string | null;
  evidenceKey: string | null;
  scoresJson: string | null;
  verdict: string;
  rejectReason: string | null;
  twinVerdictJson: string | null;
  model: string | null;
}
interface Msg {
  id: number;
  kind: string;
  direction: string;
  channel: string;
  toAddr: string | null;
  subject: string | null;
  body: string | null;
  bodyBefore: string | null;
  whyNeeded: string | null;
  principlesJson: string | null;
  voiceScript: string | null;
  audioPath: string | null;
  status: string;
  sentAt: number | null;
  isPreview: boolean;
}
interface Twin {
  would_reply: "yes" | "no";
  objection: string;
  what_would_change_my_mind: string;
}
interface Data {
  activeModel: { provider: string; model: string } | null;
  agentId: string;
  senderName: string;
  lead: {
    id: number;
    campaignId: number;
    name: string;
    category: string | null;
    rating: number | null;
    reviewCount: number | null;
    address: string | null;
    phone: string | null;
    website: string | null;
    websiteKind: string | null;
    email: string | null;
    emailStatus: string | null;
    channel: string | null;
    score: number | null;
    scoreReason: string | null;
    stage: string;
    needsReview: boolean;
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
    followUpAt: number | null;
    contactedAt: number | null;
    pageJson: string | null;
  };
  site: { ok: boolean; error?: string; booking: string | null; whatsapp: string | null; instagram: string | null } | null;
  campaign: { id: number; service: string; language: string };
  evidence: Record<string, unknown>;
  ideas: Idea[];
  messages: Msg[];
  events: { id: number; agent: string; type: string; summary: string; createdAt: number }[];
  jobs: { type: string; status: string; error: string | null }[];
}

const fetcher = (u: string) => fetch(u).then((r) => r.json());

const PRINCIPLE: Record<string, string> = {
  specific_observation: "Specific observation",
  loss_aversion: "What they're missing",
  curiosity: "Customer moment",
  local_social_proof: "Local social proof",
  reciprocity: "Reciprocity",
  low_effort_next_step: "Low-effort next step",
  respect: "Respect",
};

const AGENT_COLOR: Record<string, string> = {
  strategist: "text-ink",
  critic: "text-chilli",
  twin: "text-warn",
  composer: "text-ink",
  enrich: "text-ink-3",
};

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white/70">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="text-xs font-medium uppercase tracking-wider text-ink-3">{title}</h2>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function EvidenceRow({ k, v }: { k: string; v: unknown }) {
  const val = v === null || v === undefined ? "–" : typeof v === "boolean" ? (v ? "yes" : "no") : String(v);
  return (
    <div className="flex justify-between gap-3 border-b border-dashed border-line py-1 last:border-0">
      <span className="text-ink-3">{k}</span>
      <span className="max-w-[60%] truncate text-right text-ink" title={val}>
        {val}
      </span>
    </div>
  );
}

function IdeaRow({ idea, i }: { idea: Idea; i: number }) {
  const scores = idea.scoresJson ? (JSON.parse(idea.scoresJson) as Record<string, number>) : null;
  const rejected = idea.verdict === "rejected";
  const chosen = idea.verdict === "chosen";
  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.06 }}
      className={`relative rounded-lg border px-3 py-2 ${chosen ? "border-ink bg-paper" : "border-line"} ${rejected ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="relative inline-block font-medium">
            {idea.title}
            {rejected && (
              <motion.span
                className="absolute left-0 top-1/2 h-[2px] bg-chilli"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.45, ease: "easeOut" }}
              />
            )}
          </div>
          <p className="mt-0.5 text-xs text-ink-2">{idea.pitchLine}</p>
          {rejected && idea.rejectReason && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 + i * 0.12 }} className="mt-1 text-xs text-chilli">
              Critic: {idea.rejectReason}
            </motion.p>
          )}
        </div>
        <div className="shrink-0 text-right">
          {chosen && (
            <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[10px] text-paper">
              <Check className="h-3 w-3" /> chosen
            </span>
          )}
          {scores && <div className="mt-1 font-mono text-[10px] text-ink-3">{scores.total}/25</div>}
        </div>
      </div>
      {scores && (
        <div className="mt-1.5 flex gap-2 font-mono text-[10px] text-ink-3">
          {(["creative", "specific", "grounded", "deliverable", "not_present"] as const).map((k) => (
            <span key={k} title={k}>
              {k.slice(0, 4)} {scores[k]}
            </span>
          ))}
          {idea.evidenceKey && <span className="ml-auto truncate">← {idea.evidenceKey}</span>}
        </div>
      )}
    </motion.li>
  );
}

function TwinBubble({ label, t }: { label: string; t: Twin }) {
  const yes = t.would_reply === "yes";
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative mt-3 rounded-2xl rounded-tl-sm border border-line bg-paper px-4 py-3">
      <div className="flex items-center justify-between text-[11px] text-ink-3">
        <span>Simulated owner · {label}</span>
        <span className={yes ? "text-go" : "text-chilli"}>{yes ? "would reply" : "wouldn't reply"}</span>
      </div>
      <p className="mt-1 text-sm">"{t.objection}"</p>
      <p className="mt-1 text-xs text-ink-3">What would change my mind: {t.what_would_change_my_mind}</p>
    </motion.div>
  );
}

interface Rival {
  name: string;
  rating: number | null;
  reviews: number | null;
  why_winning: string[];
}

/** Who's winning nearby and why, what this business is missing, and its issues (all computed from real data). */
function RivalsPanel({ evidence }: { evidence: Record<string, unknown> }) {
  const top = (evidence.top_rivals as Rival[] | undefined) ?? [];
  const gaps = (evidence.gaps as string[] | undefined) ?? [];
  const issues = (evidence.issues as string[] | undefined) ?? [];
  if (!top.length && !gaps.length && !issues.length) return null;
  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-ink-3">
        Rivals within {String(evidence.rivals_radius_km)} km · who's winning and why
      </p>
      <ul className="mt-2 space-y-1.5">
        {top.map((r) => (
          <li key={r.name} className="rounded-md bg-paper px-2 py-1.5">
            <div className="truncate text-xs font-medium">{r.name}</div>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {r.why_winning.map((w) => (
                <span key={w} className="rounded border border-line bg-white px-1 font-mono text-[10px] text-ink-2">
                  {w}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {gaps.length > 0 && (
        <>
          <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-ink-3">What they have that this business doesn't</p>
          <ul className="mt-1 space-y-0.5 text-xs text-chilli">
            {gaps.map((g) => (
              <li key={g}>— {g}</li>
            ))}
          </ul>
        </>
      )}
      {issues.length > 0 && (
        <>
          <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-ink-3">Issues</p>
          <ul className="mt-1 space-y-0.5 text-xs text-ink-2">
            {issues.map((g) => (
              <li key={g}>· {g}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

const VOICE_LANGS = [
  { id: "hi", label: "Hindi (desi)" },
  { id: "te", label: "Telugu" },
  { id: "en", label: "English" },
];

/** AI-made voice notes in the owner's language (no business name or ratings), sent to your Telegram to forward. */
function VoiceNotes({ notes, working, onMake, busy }: { leadId: number; notes: Msg[]; working: boolean; onMake: (lang: string) => void; busy: boolean }) {
  const latest = notes[0];
  return (
    <div className="mt-3 rounded-lg bg-paper-2 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wider text-ink-3">Voice note for WhatsApp · in the owner's language</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {VOICE_LANGS.map((l) => (
          <button
            key={l.id}
            disabled={busy || working}
            onClick={() => onMake(l.id)}
            className="inline-flex items-center gap-1 rounded-md border border-ink/15 bg-white px-2.5 py-1 text-xs hover:border-ink disabled:opacity-50"
          >
            <Mic className="h-3 w-3" /> {l.label}
          </button>
        ))}
        {working && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-3">
            <Loader2 className="h-3 w-3 animate-spin" /> writing + speaking…
          </span>
        )}
      </div>
      {latest?.voiceScript && <p className="mt-2 text-xs leading-relaxed text-ink-2">{latest.voiceScript}</p>}
      {latest?.audioPath && <audio key={latest.audioPath} controls src={`/api/audio/${latest.audioPath}`} className="mt-2 h-9 w-full" />}
      <p className="mt-1 text-[10.5px] text-ink-3">Never sent automatically: it goes to your Telegram with the WhatsApp draft, and you forward it.</p>
    </div>
  );
}

export function LeadCard({ leadId }: { leadId: number }) {
  const { data, mutate } = useSWR<Data>(`/api/leads/${leadId}`, fetcher, { refreshInterval: 2000 });
  const [busy, setBusy] = useState(false);
  const [previewTo, setPreviewTo] = useState("");
  const [view, setView] = useState<"chat" | "scores">("chat");
  const [note, setNote] = useState<string | null>(null);

  if (!data || !data.lead)
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-ink-3">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading lead…
      </div>
    );

  const { lead: l, evidence, ideas, messages, events, jobs } = data;
  const draft = messages.find((m) => m.direction === "out" && m.kind === "initial");
  const previews = messages.filter((m) => m.kind === "preview");
  const sentAt = draft?.status === "sent" && draft.sentAt ? new Date(draft.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  const chosen = ideas.find((i) => i.verdict === "chosen");
  const twin = chosen?.twinVerdictJson ? (JSON.parse(chosen.twinVerdictJson) as { first?: Twin; final?: Twin }) : null;
  const working = jobs.some((j) => (j.type === "enrich" || j.type === "arena") && (j.status === "queued" || j.status === "running"));
  const failed = jobs.find((j) => j.type === "arena" && j.status === "failed");
  const principles = draft?.principlesJson ? (JSON.parse(draft.principlesJson) as { line: string; principle: string }[]) : [];
  const rejectedCount = ideas.filter((i) => i.verdict === "rejected").length;
  const waDigits = (l.phone ?? "").replace(/\D/g, "").replace(/^0/, "");
  const waLink = draft && waDigits ? `https://wa.me/${waDigits.length === 10 ? "91" + waDigits : waDigits}?text=${encodeURIComponent(draft.body ?? "")}` : null;

  async function post(url: string, body: unknown, ok: string) {
    setBusy(true);
    setNote(null);
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    setNote(res.ok ? ok : (j.error ?? "Failed"));
    await mutate();
    setBusy(false);
  }

  async function runArena() {
    setBusy(true);
    await fetch(`/api/leads/${leadId}/arena`, { method: "POST" });
    await mutate();
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <Link href={`/leads?c=${l.campaignId}`} className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> All leads
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">{l.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-ink-2">
            {l.rating !== null && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-current" /> {l.rating.toFixed(1)} ({l.reviewCount ?? 0})
              </span>
            )}
            <ChannelChip channel={l.channel} />
            <span className="rounded-full border border-line px-2 py-0.5 text-[11px]">{l.stage}</span>
            {l.needsReview && <span className="rounded-full bg-chilli-soft px-2 py-0.5 text-[11px] text-chilli">needs your review</span>}
          </div>
        </div>
        <div className="text-right font-mono text-xs text-ink-3">
          <div>
            score <span className="text-lg text-chilli">{l.score}</span> · {l.scoreReason}
          </div>
          <div>
            this lead: {(l.tokensIn + l.tokensOut).toLocaleString()} tokens ({l.tokensIn} in / {l.tokensOut} out) · ${l.costUsd.toFixed(4)}
          </div>
        </div>
      </div>

      {chosen && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-ink bg-neon/40 px-5 py-4 shadow-[5px_5px_0_0_#14110F]">
          <div>
            <div className="font-display text-lg font-extrabold">We built it before we asked.</div>
            <p className="text-sm text-ink-2">A live demo website for {l.name}, with their real rating, location and the idea working on it.</p>
          </div>
          {l.pageJson ? (
            <div className="flex gap-2">
              <a href={`/p/${l.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-2xl bg-ink px-4 py-2.5 font-display font-bold text-paper">
                <Globe className="h-4 w-4" /> Open their website <ArrowUpRight className="h-4 w-4" />
              </a>
              <button onClick={() => post(`/api/leads/${leadId}/page`, {}, "Rebuilding the demo website…")} disabled={busy} className="rounded-2xl border border-ink px-3 py-2.5 text-sm">
                Rebuild
              </button>
            </div>
          ) : jobs.some((j) => j.type === "page" && (j.status === "queued" || j.status === "running")) ? (
            <span className="inline-flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Building their website…</span>
          ) : (
            <button onClick={() => post(`/api/leads/${leadId}/page`, {}, "Building their demo website…")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-2xl bg-ink px-4 py-2.5 font-display font-bold text-paper">
              <Globe className="h-4 w-4" /> Build their demo website
            </button>
          )}
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.35fr_1.15fr]">
        {/* Evidence */}
        <Section title="Evidence">
          <div className="font-mono text-[11.5px]">
            {Object.entries(evidence)
              .filter(([k]) => !["site_snippet", "top_rivals", "gaps", "issues"].includes(k))
              .map(([k, v]) => (
                <EvidenceRow key={k} k={k} v={v} />
              ))}
            <EvidenceRow k="phone" v={l.phone} />
            <EvidenceRow k="website" v={l.website} />
            <EvidenceRow k="email" v={l.email ? `${l.email} (${l.emailStatus})` : null} />
          </div>
          {typeof evidence.site_snippet === "string" && (
            <p className="mt-3 line-clamp-4 font-mono text-[11px] text-ink-3">site: "{evidence.site_snippet}"</p>
          )}
          <RivalsPanel evidence={evidence} />
        </Section>

        {/* Idea Arena */}
        <Section
          title="Idea Arena · 3 AI agents argue"
          right={
            ideas.length > 0 && (
              <span className="font-mono text-[11px] text-ink-3">
                {ideas.length} ideas · <span className="text-chilli">{rejectedCount} rejected</span>
              </span>
            )
          }
        >
          {!ideas.length ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-ink-3">
              {working ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-chilli" /> Strategist, Critic and Owner Twin are working…
                </>
              ) : (
                <>
                  {failed ? <p className="text-chilli">Last run failed: {failed.error?.slice(0, 140)}</p> : <p>No ideas yet for this lead.</p>}
                  <button onClick={runArena} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-paper disabled:opacity-60">
                    <Sparkles className="h-4 w-4" /> Generate ideas
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="mb-3 inline-flex rounded-full bg-paper-2 p-0.5 text-xs">
                {(["chat", "scores"] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)} className={`rounded-full px-3 py-1 ${view === v ? "bg-ink text-paper" : "text-ink-2"}`}>
                    {v === "chat" ? "Team chat" : "Scorecard"}
                  </button>
                ))}
              </div>
              {view === "chat" ? (
                <TeamRoom name={l.name} ideas={ideas} first={twin?.first} final={twin?.final} why={draft?.whyNeeded} />
              ) : (
                <>
                  <ul className="space-y-2">
                    {ideas.map((idea, i) => (
                      <IdeaRow key={idea.id} idea={idea} i={i} />
                    ))}
                  </ul>
                  {twin?.first && <TwinBubble label="first read" t={twin.first} />}
                </>
              )}
            </>
          )}
        </Section>

        {/* Pitch */}
        <Section
          title="Pitch"
          right={
            draft &&
            !working &&
            l.stage === "ready" && (
              <button onClick={runArena} disabled={busy} className="inline-flex items-center gap-1 text-[11px] text-ink-3 hover:text-ink" title="Reruns the whole Arena on the model selected in Settings">
                <RefreshCw className="h-3 w-3" /> rerun with {data.activeModel?.provider ?? "model"}
              </button>
            )
          }
        >
          {!draft ? (
            <p className="py-10 text-center text-sm text-ink-3">{working ? "Writing the pitch…" : "The pitch appears after the Arena runs."}</p>
          ) : (
            <div>
              <div className="rounded-lg border border-dashed border-line bg-paper px-3 py-2">
                <p className="text-[11px] uppercase tracking-wider text-ink-3">Before (raw idea)</p>
                <p className="mt-1 text-sm text-ink-2">{draft.bodyBefore}</p>
              </div>
              {draft.whyNeeded && (
                <div className="mt-3 rounded-lg border-l-2 border-chilli bg-chilli-soft/50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wider text-chilli">Why they need it</p>
                  <p className="mt-0.5 text-sm">{draft.whyNeeded}</p>
                </div>
              )}
              <div className="mt-3 rounded-lg border border-line bg-white px-3 py-3">
                <p className="text-[11px] uppercase tracking-wider text-ink-3">After (answers the owner's objection)</p>
                {draft.subject && <p className="mt-1 text-sm font-medium">{draft.subject}</p>}
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{draft.body}</p>
              </div>
              {principles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {principles.map((p, i) => (
                    <span key={i} title={p.line} className="rounded-full border border-line bg-paper px-2 py-0.5 text-[11px] text-ink-2">
                      {PRINCIPLE[p.principle] ?? p.principle}
                    </span>
                  ))}
                </div>
              )}
              {twin?.final && <TwinBubble label="after rewrite" t={twin.final} />}
              <VoiceNotes leadId={leadId} notes={messages.filter((m) => m.kind === "draft" && m.channel === "whatsapp")} working={jobs.some((j) => j.type === "voice_note" && (j.status === "queued" || j.status === "running"))} onMake={(lang) => post(`/api/leads/${leadId}/voice`, { lang }, "Making the voice note… it will arrive on your Telegram")} busy={busy} />
              {sentAt && (
                <p className="mt-4 rounded-lg bg-paper-2 px-3 py-2 text-sm">
                  Contacted · {sentAt} <span className="text-ink-3">to {draft.toAddr}</span>
                </p>
              )}
              {draft.status === "blocked" || draft.status === "failed" ? (
                <p className="mt-3 text-xs text-chilli">Not sent: {(draft as Msg & { error?: string }).error}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {l.channel === "email" && !sentAt && draft.status !== "sending" && draft.status !== "queued" && (
                  <button
                    onClick={() => post(`/api/leads/${leadId}/send`, { approve: l.needsReview }, "Queued: the gate checks cap, opt-out and suppression")}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-chilli px-3 py-2 text-sm text-white disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" /> {l.needsReview ? "Approve & send email" : "Send email"}
                  </button>
                )}
                {(draft.status === "queued" || draft.status === "sending") && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-paper-2 px-3 py-2 text-sm text-ink-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> sending…
                  </span>
                )}
                {waLink && (
                  <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-ink/20 px-3 py-2 text-sm hover:border-ink">
                    <MessageCircle className="h-4 w-4" /> WhatsApp draft
                  </a>
                )}
              </div>
              <div className="mt-3">
                <TalkToPitchwala
                  agentId={data.agentId}
                  leadId={leadId}
                  disabled={!chosen || !draft}
                  vars={{ sender_name: data.senderName, idea_title: chosen?.title ?? "", idea_pitch: chosen?.pitchLine ?? "", service: data.campaign.service }}
                />
              </div>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  post(`/api/leads/${leadId}/preview`, { to: previewTo }, `Preview queued to ${previewTo}`);
                }}
              >
                <input
                  type="email"
                  required
                  value={previewTo}
                  onChange={(e) => setPreviewTo(e.target.value)}
                  placeholder="Send a preview to… (any inbox)"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink"
                />
                <button disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-ink/20 px-3 py-2 text-sm hover:border-ink disabled:opacity-60">
                  <Mail className="h-4 w-4" /> Preview
                </button>
              </form>
              {note && <p className="mt-2 text-xs text-ink-2">{note}</p>}
              {previews.length > 0 && (
                <ul className="mt-2 space-y-0.5 font-mono text-[11px] text-ink-3">
                  {previews.map((p) => (
                    <li key={p.id}>
                      preview → {p.toAddr} · {p.status}
                      {p.sentAt ? ` ${new Date(p.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Section>
      </div>

      <section className="mt-5 rounded-xl border border-line bg-white/70 p-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-ink-3">Agent trace</h2>
        <ol className="mt-2 space-y-1 font-mono text-xs">
          {events.length === 0 && <li className="text-ink-3">Nothing yet.</li>}
          {[...events].reverse().map((e) => (
            <motion.li key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span className="text-ink-3">{new Date(e.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>{" "}
              <span className={AGENT_COLOR[e.agent] ?? "text-ink-2"}>{e.agent}</span> <span className="text-ink-2">{e.summary}</span>
            </motion.li>
          ))}
        </ol>
      </section>
    </div>
  );
}
