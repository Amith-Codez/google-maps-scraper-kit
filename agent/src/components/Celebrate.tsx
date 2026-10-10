"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "motion/react";
import { PartyPopper } from "lucide-react";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

/** Peak moment: the second a lead turns "interested", anywhere in the app, confetti + a toast. */
export function Celebrate() {
  const { data } = useSWR<{ totals: { interested: number } }>("/api/activity", fetcher, { refreshInterval: 3000 });
  const prev = useRef<number | null>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const n = data?.totals?.interested;
    if (n === undefined) return;
    if (prev.current !== null && n > prev.current) {
      confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 }, colors: ["#D9381E", "#C8FF3D", "#14110F", "#E9E3FF"] });
      setShow(true);
      setTimeout(() => setShow(false), 6000);
    }
    prev.current = n;
  }, [data]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-2xl bg-ink px-5 py-3 text-paper shadow-2xl"
        >
          <div className="flex items-center gap-3">
            <PartyPopper className="h-5 w-5 text-neon" />
            <div>
              <div className="font-display font-bold">Someone's interested!</div>
              <div className="text-xs text-paper/70">Your phone just got the ping. Go close it.</div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
