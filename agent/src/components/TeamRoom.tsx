"use client";

import { motion } from "motion/react";
import { Lightbulb, Gavel, Store, PenLine } from "lucide-react";

interface Idea {
  id: number;
  title: string;
  pitchLine: string;
  verdict: string;
  rejectReason: string | null;
}
interface Twin {
  would_reply: "yes" | "no";
  objection: string;
  what_would_change_my_mind: string;
}

const PEOPLE = {
  strategist: { name: "Strategist", role: "comes up with ideas", icon: Lightbulb, bg: "bg-neon", fg: "text-ink" },
  critic: { name: "Critic", role: "kills generic ideas", icon: Gavel, bg: "bg-chilli", fg: "text-white" },
  owner: { name: "Simulated owner", role: "AI playing the owner", icon: Store, bg: "bg-lilac", fg: "text-ink" },
  writer: { name: "Writer", role: "writes the pitch", icon: PenLine, bg: "bg-ink", fg: "text-neon" },
} as const;

function Bubble({ who, delay, children }: { who: keyof typeof PEOPLE; delay: number; children: React.ReactNode }) {
  const p = PEOPLE[who];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35 }} className="flex gap-2.5">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${p.bg} ${p.fg}`}>
        <p.icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-ink-3">
          <b className="text-ink">{p.name}</b> · {p.role}
        </div>
        <div className="mt-1 rounded-2xl rounded-tl-sm border border-line bg-white px-3 py-2 text-sm">{children}</div>
      </div>
    </motion.div>
  );
}

/** The Idea Arena as a team meeting anyone can follow: the agents' real outputs for this lead, in order. */
export function TeamRoom({ name, ideas, first, final, why }: { name: string; ideas: Idea[]; first?: Twin; final?: Twin; why?: string | null }) {
  const rejected = ideas.filter((i) => i.verdict === "rejected");
  const kept = ideas.filter((i) => i.verdict !== "rejected");
  const chosen = ideas.find((i) => i.verdict === "chosen");
  const d = (n: number) => 0.15 + n * 0.55;
  return (
    <div className="space-y-3">
      <Bubble who="strategist" delay={d(0)}>
        I&apos;ve got <b>{ideas.length} ideas</b> for {name}, each built on something real about them:
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ideas.map((i) => (
            <span key={i.id} className="rounded-full bg-paper-2 px-2 py-0.5 text-xs">{i.title}</span>
          ))}
        </div>
      </Bubble>
      <Bubble who="critic" delay={d(1)}>
        {rejected.length ? (
          <>
            Nope to <b className="text-chilli">{rejected.length}</b> of them:
            <ul className="mt-1.5 space-y-1">
              {rejected.map((i, n) => (
                <li key={i.id} className="text-xs">
                  <span className="relative inline-block font-medium">
                    {i.title}
                    <motion.span className="absolute left-0 top-1/2 h-[2px] bg-chilli" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ delay: d(1) + 0.3 + n * 0.12, duration: 0.35 }} />
                  </span>{" "}
                  <span className="text-ink-3">· {i.rejectReason}</span>
                </li>
              ))}
            </ul>
            {kept.length > 0 && (
              <p className="mt-1.5 text-xs">
                Keeping <b>{kept.map((k) => k.title).join(" + ")}</b>.
              </p>
            )}
          </>
        ) : (
          <>All of them pass. Rare.</>
        )}
      </Bubble>
      {first && (
        <Bubble who="owner" delay={d(2)}>
          <span className="text-ink-2">&ldquo;{first.objection}&rdquo;</span>
          <div className="mt-1 text-xs text-ink-3">Would change my mind: {first.what_would_change_my_mind}</div>
        </Bubble>
      )}
      {chosen && (
        <Bubble who="writer" delay={d(3)}>
          Fair point. Going with <b>{chosen.title}</b> and I&apos;ll answer that objection in the message.
          {why && <div className="mt-1.5 rounded-lg bg-chilli-soft/60 px-2 py-1 text-xs">Reason they need it: {why}</div>}
        </Bubble>
      )}
      {final && (
        <Bubble who="owner" delay={d(4)}>
          {final.would_reply === "yes" ? (
            <span>
              <b className="text-go">Okay, I&apos;d reply to that.</b> <span className="text-ink-3">(simulated, not a prediction)</span>
            </span>
          ) : (
            <span>
              <b className="text-chilli">Still not convinced:</b> &ldquo;{final.objection}&rdquo;. <span className="text-ink-3">Held for your review.</span>
            </span>
          )}
        </Bubble>
      )}
    </div>
  );
}
