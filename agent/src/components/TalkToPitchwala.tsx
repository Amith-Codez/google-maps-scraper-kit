"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

// ElevenLabs Agents web widget (BUILD_PLAN §8b). Pinned version; loaded only when the user opens it.
const WIDGET_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed@0.18.2/dist/index.js";
const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "";

let loader: Promise<void> | null = null;
function loadWidget(): Promise<void> {
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = WIDGET_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loader = null;
      reject(new Error("widget script failed to load"));
    };
    document.body.appendChild(s);
  });
  return loader;
}

/**
 * Only four variables reach the voice agent: sender name, idea title, idea pitch, service.
 * Never the business name, rating or any other Maps data (E48).
 */
export function TalkToPitchwala({
  leadId,
  vars,
  disabled,
}: {
  leadId: number;
  vars: { sender_name: string; idea_title: string; idea_pitch: string; service: string };
  disabled: boolean;
}) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable">(AGENT_ID ? "idle" : "unavailable");
  const [note, setNote] = useState<string | null>(null);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state !== "ready" || !host.current) return;
    const el = host.current.querySelector("elevenlabs-convai");
    if (!el) return;
    const onCall = (event: Event) => {
      const detail = (event as CustomEvent).detail as { config: { clientTools?: Record<string, unknown> } };
      detail.config.clientTools = {
        markInterested: async ({ summary }: { summary?: string }) => {
          const res = await fetch("/api/interest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leadId, summary: summary ?? "" }),
          });
          const j = await res.json().catch(() => ({}));
          setNote(j.already ? "Already marked interested (one ping per lead)." : "Marked interested · your phone was pinged.");
          return "Noted. The freelancer will call at the time you mentioned.";
        },
      };
    };
    el.addEventListener("elevenlabs-convai:call", onCall);
    return () => el.removeEventListener("elevenlabs-convai:call", onCall);
  }, [state, leadId]);

  async function open() {
    setState("loading");
    try {
      await loadWidget();
      if (!customElements.get("elevenlabs-convai")) await customElements.whenDefined("elevenlabs-convai");
      setState("ready");
    } catch {
      setState("unavailable");
    }
  }

  if (state === "unavailable")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-ink-3" title={AGENT_ID ? "Couldn't load the voice widget (offline or quota used)" : "No voice agent ID set"}>
        <MicOff className="h-4 w-4" /> Voice unavailable
      </span>
    );

  return (
    <div>
      {state !== "ready" ? (
        <button
          onClick={open}
          disabled={disabled || state === "loading"}
          title={disabled ? "Available once the pitch is ready" : "Let the owner talk to Pitchwala about this idea"}
          className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm text-paper disabled:opacity-40"
        >
          <Mic className="h-4 w-4" /> {state === "loading" ? "Loading voice…" : "Talk to Pitchwala"}
        </button>
      ) : (
        <div ref={host} className="mt-2">
          {createElement("elevenlabs-convai", {
            "agent-id": AGENT_ID,
            "dynamic-variables": JSON.stringify(vars),
            variant: "expanded",
          })}
          <p className="mt-1 text-[11px] text-ink-3">Allow the microphone to talk. The agent says it's an AI and never quotes prices or dates.</p>
        </div>
      )}
      {note && <p className="mt-1 text-xs text-go">{note}</p>}
    </div>
  );
}
