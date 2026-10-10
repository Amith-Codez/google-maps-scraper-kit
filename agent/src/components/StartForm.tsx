"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

const LANGS = [
  { id: "en", label: "English" },
  { id: "hi", label: "Hindi" },
  { id: "te", label: "Telugu" },
];

export function StartForm() {
  const router = useRouter();
  const [service, setService] = useState("");
  const [clients, setClients] = useState("");
  const [language, setLanguage] = useState("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, clients, language }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't start");
      router.push(`/leads?c=${body.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start");
      setBusy(false);
    }
  }

  const field =
    "w-full resize-none rounded-lg border border-line bg-white px-4 py-3 text-base outline-none transition focus:border-ink focus:ring-2 focus:ring-chilli/15";

  return (
    <form onSubmit={submit} className="w-full rounded-2xl border border-line bg-white/70 p-6 shadow-[0_1px_0_rgba(20,17,15,0.04)]">
      <label className="block text-sm font-medium text-ink-2">1 · What's your service?</label>
      <textarea
        className={`${field} mt-2`}
        rows={2}
        placeholder="I build websites for local businesses."
        value={service}
        onChange={(e) => setService(e.target.value)}
        required
      />
      <label className="mt-5 block text-sm font-medium text-ink-2">2 · Who are your clients?</label>
      <textarea
        className={`${field} mt-2`}
        rows={2}
        placeholder="Cafés and salons in Vanasthalipuram, Hyderabad."
        value={clients}
        onChange={(e) => setClients(e.target.value)}
        required
      />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-lg border border-line bg-paper p-1 text-sm">
          {LANGS.map((l) => (
            <button
              type="button"
              key={l.id}
              onClick={() => setLanguage(l.id)}
              className={`rounded-md px-3 py-1.5 transition ${language === l.id ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-chilli px-5 py-2.5 font-medium text-white transition hover:bg-[#c22f17] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Find my clients
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-chilli">{error}</p>}
    </form>
  );
}
