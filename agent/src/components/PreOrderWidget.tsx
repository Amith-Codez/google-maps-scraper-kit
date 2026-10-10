"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, Minus, Plus, Users, ShoppingBag, UtensilsCrossed, CheckCircle2, CalendarDays } from "lucide-react";

type Theme = { bg: string; ink: string; soft: string; accent: string; accentInk: string; card: string; line: string };

/** Live demo of the idea a customer would use: order ahead, say when you'll arrive, dine in or parcel. */
export function PreOrderWidget({ t, kind, cta }: { t: Theme; kind: "food" | "learn" | "other"; cta: string }) {
  const [mode, setMode] = useState<"dine" | "parcel">("dine");
  const [eta, setEta] = useState(20);
  const [people, setPeople] = useState(2);
  const [qty, setQty] = useState([1, 0, 1]);
  const [slot, setSlot] = useState(1);
  const [done, setDone] = useState(false);
  const items = kind === "learn" ? ["Trial class", "Counselling call", "Course brochure"] : ["Your signature dish", "Chef's special", "Customer favourite"];
  const box = { background: t.card, borderColor: t.line, color: t.ink };
  const chip = (on: boolean) => ({ background: on ? t.accent : "transparent", color: on ? t.accentInk : t.ink, borderColor: on ? t.accent : t.line });

  if (kind === "learn")
    return (
      <div className="rounded-3xl border p-5 shadow-2xl" style={box}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4" /> Book a free trial class</span>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: t.bg, color: t.soft }}>live demo</span>
        </div>
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="mt-4 text-xs" style={{ color: t.soft }}>Pick a day</p>
              <div className="mt-1.5 grid grid-cols-4 gap-2 text-sm">
                {["Mon", "Tue", "Wed", "Thu"].map((d, i) => (
                  <button key={d} onClick={() => setSlot(i)} className="rounded-xl border py-2 transition" style={chip(slot === i)}>{d}</button>
                ))}
              </div>
              <p className="mt-3 text-xs" style={{ color: t.soft }}>Time</p>
              <div className="mt-1.5 grid grid-cols-3 gap-2 text-sm">
                {["10 am", "4 pm", "6 pm"].map((d, i) => (
                  <button key={d} onClick={() => setEta(i)} className="rounded-xl border py-2" style={chip(eta === i)}>{d}</button>
                ))}
              </div>
              <button onClick={() => setDone(true)} className="mt-4 w-full rounded-xl py-3 font-semibold" style={{ background: t.accent, color: t.accentInk }}>{cta}</button>
            </motion.div>
          ) : (
            <motion.div key="ok" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10" style={{ color: t.accent }} />
              <p className="mt-2 font-semibold">Trial class booked (demo)</p>
              <p className="text-sm" style={{ color: t.soft }}>{["Mon", "Tue", "Wed", "Thu"][slot]} · {["10 am", "4 pm", "6 pm"][eta] ?? "4 pm"} · a WhatsApp reminder goes out</p>
              <button onClick={() => setDone(false)} className="mt-3 text-xs underline" style={{ color: t.soft }}>try again</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );

  const total = qty.reduce((a, b) => a + b, 0);
  return (
    <div className="rounded-3xl border p-5 shadow-2xl" style={box}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold"><ShoppingBag className="h-4 w-4" /> Order ahead</span>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: t.bg, color: t.soft }}>live demo</span>
      </div>
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {([["dine", "Dine in", UtensilsCrossed], ["parcel", "Parcel", ShoppingBag]] as const).map(([id, label, Icon]) => (
                <button key={id} onClick={() => setMode(id)} className="flex items-center justify-center gap-1.5 rounded-xl border py-2 font-medium" style={chip(mode === id)}>
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
            {items.map((d, i) => (
              <div key={d} className="mt-2.5 flex items-center justify-between rounded-xl border px-3 py-2 text-sm" style={{ borderColor: t.line }}>
                <span>{d}</span>
                <span className="flex items-center gap-2">
                  <button aria-label="less" onClick={() => setQty(qty.map((q, j) => (j === i ? Math.max(0, q - 1) : q)))} className="grid h-6 w-6 place-items-center rounded-lg border" style={{ borderColor: t.line }}><Minus className="h-3 w-3" /></button>
                  <span className="w-4 text-center tabular-nums">{qty[i]}</span>
                  <button aria-label="more" onClick={() => setQty(qty.map((q, j) => (j === i ? q + 1 : q)))} className="grid h-6 w-6 place-items-center rounded-lg" style={{ background: t.accent, color: t.accentInk }}><Plus className="h-3 w-3" /></button>
                </span>
              </div>
            ))}
            <p className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: t.soft }}><Clock className="h-3.5 w-3.5" /> I&apos;ll arrive in</p>
            <div className="mt-1.5 grid grid-cols-4 gap-2 text-sm">
              {[10, 20, 30, 45].map((m) => (
                <button key={m} onClick={() => setEta(m)} className="rounded-xl border py-1.5" style={chip(eta === m)}>{m} min</button>
              ))}
            </div>
            {mode === "dine" && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5" style={{ color: t.soft }}><Users className="h-4 w-4" /> Table for</span>
                <span className="flex items-center gap-2">
                  <button aria-label="fewer" onClick={() => setPeople(Math.max(1, people - 1))} className="grid h-6 w-6 place-items-center rounded-lg border" style={{ borderColor: t.line }}><Minus className="h-3 w-3" /></button>
                  <span className="w-4 text-center tabular-nums">{people}</span>
                  <button aria-label="more people" onClick={() => setPeople(Math.min(12, people + 1))} className="grid h-6 w-6 place-items-center rounded-lg" style={{ background: t.accent, color: t.accentInk }}><Plus className="h-3 w-3" /></button>
                </span>
              </div>
            )}
            <button disabled={!total} onClick={() => setDone(true)} className="mt-4 w-full rounded-xl py-3 font-semibold disabled:opacity-40" style={{ background: t.accent, color: t.accentInk }}>
              Place pre-order · {total} item{total === 1 ? "" : "s"}
            </button>
          </motion.div>
        ) : (
          <motion.div key="ok" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10" style={{ color: t.accent }} />
            <p className="mt-2 font-semibold">Order received (demo)</p>
            <p className="text-sm" style={{ color: t.soft }}>
              Ready in {eta} min · {mode === "dine" ? `table for ${people} kept` : "parcel at the counter"}
            </p>
            <p className="mt-1 text-xs" style={{ color: t.soft }}>The kitchen starts when you&apos;re {Math.max(5, eta - 10)} min away. No queue.</p>
            <button onClick={() => setDone(false)} className="mt-3 text-xs underline" style={{ color: t.soft }}>try again</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
