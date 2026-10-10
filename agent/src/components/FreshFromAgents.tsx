import Link from "next/link";
import { getRaw } from "@/lib/db";
import { Gavel, Globe, Mic, ArrowUpRight } from "lucide-react";

// Real, latest outputs from the agents (no samples): a killed idea, a demo website, a voice note.
export function FreshFromAgents() {
  const raw = getRaw();
  const kill = raw
    .prepare(`SELECT i.title, i.reject_reason AS reason, l.name FROM ideas i JOIN leads l ON l.id = i.lead_id WHERE i.verdict = 'rejected' AND i.reject_reason IS NOT NULL ORDER BY i.id DESC LIMIT 1`)
    .get() as { title: string; reason: string; name: string } | undefined;
  const site = raw
    .prepare(`SELECT id, name, page_json FROM leads WHERE page_json IS NOT NULL ORDER BY id DESC LIMIT 1`)
    .get() as { id: number; name: string; page_json: string } | undefined;
  const voice = raw
    .prepare(`SELECT m.voice_script AS script, l.name FROM messages m JOIN leads l ON l.id = m.lead_id WHERE m.kind = 'draft' AND m.voice_script LIKE '[hi]%' ORDER BY m.id DESC LIMIT 1`)
    .get() as { script: string; name: string } | undefined;
  if (!kill && !site && !voice) return null;
  const headline = site ? (JSON.parse(site.page_json) as { headline: string }).headline : "";
  return (
    <div className="mt-10">
      <div className="flex items-end justify-between">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Fresh from the agents</h2>
        <span className="text-xs text-ink-3">real outputs, latest first</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {kill && (
          <div className="rounded-3xl border border-line bg-white p-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-chilli"><Gavel className="h-4 w-4" /> Critic said no</div>
            <div className="mt-3 font-display text-lg font-bold line-through decoration-chilli decoration-2">{kill.title}</div>
            <p className="mt-1 text-sm text-ink-2">&ldquo;{kill.reason}&rdquo;</p>
            <p className="mt-3 text-xs text-ink-3">for {kill.name}</p>
          </div>
        )}
        {site && (
          <Link href={`/p/${site.id}`} target="_blank" className="group rounded-3xl border-2 border-ink bg-neon/40 p-5 shadow-[4px_4px_0_0_#14110F] transition hover:-translate-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><Globe className="h-4 w-4" /> Built before asking</div>
            <div className="mt-3 font-display text-lg font-bold">{headline}</div>
            <p className="mt-1 text-sm text-ink-2">A demo website for {site.name}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold">Open it <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
          </Link>
        )}
        {voice && (
          <div className="rounded-3xl bg-ink p-5 text-paper">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neon"><Mic className="h-4 w-4" /> Voice note · desi Hindi</div>
            <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-paper/85">{voice.script.replace(/^\[hi\]\s*/, "")}</p>
            <p className="mt-3 text-xs text-paper/50">for {voice.name} · no business name, no ratings</p>
          </div>
        )}
      </div>
    </div>
  );
}
