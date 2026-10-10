"use client";

import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { Wordmark } from "@/components/Logo";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: code }) });
    if (res.ok) {
      const next = new URLSearchParams(window.location.search).get("next") || "/";
      window.location.href = next.startsWith("/") ? next : "/";
    } else {
      setErr("Wrong passcode");
      setBusy(false);
    }
  }
  return (
    <div className="grain flex min-h-screen items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border-2 border-ink bg-white p-7 shadow-[6px_6px_0_0_#14110F]">
        <Wordmark />
        <p className="mt-3 text-sm text-ink-2">Your instance, your leads, your Gmail. Enter the passcode to continue.</p>
        <label className="mt-5 flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 focus-within:border-ink">
          <Lock className="h-4 w-4 text-ink-3" />
          <input type="password" autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="Passcode" className="w-full bg-transparent outline-none" />
        </label>
        {err && <p className="mt-2 text-sm text-chilli">{err}</p>}
        <button disabled={busy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-chilli py-3 font-display font-bold text-white disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enter
        </button>
      </form>
    </div>
  );
}
