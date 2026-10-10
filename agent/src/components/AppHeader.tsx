"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";

const nav = [
  { href: "/", label: "Start" },
  { href: "/leads", label: "Leads" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/settings", label: "Settings" },
];

const fetcher = (u: string) => fetch(u).then((r) => r.json());

/** App chrome; hidden on the per-business demo websites (/p/…). */
export function AppHeader() {
  const path = usePathname();
  const { data } = useSWR<{ sentToday: number; cap: number }>(path.startsWith("/p/") ? null : "/api/stats", fetcher, { refreshInterval: 4000 });
  if (path.startsWith("/p/") || path === "/login") return null;
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink font-display text-sm font-extrabold text-neon">P</span>
          <span className="font-display text-lg font-extrabold tracking-tight">Pitchwala</span>
          <span className="hidden rotate-[-2deg] rounded-md bg-neon px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink sm:inline">no generic pitches</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {nav.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={`rounded-full px-3 py-1.5 transition ${active ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2"}`}>
                {n.label}
              </Link>
            );
          })}
          {data && (
            <span className="ml-2 hidden items-center gap-2 rounded-full border border-line px-3 py-1 font-mono text-[11px] text-ink-2 md:inline-flex" title="Daily send cap">
              <span className="relative h-1.5 w-12 overflow-hidden rounded-full bg-paper-2">
                <span className="absolute inset-y-0 left-0 rounded-full bg-chilli" style={{ width: `${Math.min(100, (data.sentToday / data.cap) * 100)}%` }} />
              </span>
              {data.sentToday}/{data.cap} today
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
