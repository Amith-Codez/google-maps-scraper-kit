"use client";

import Link from "next/link";
import useSWR from "swr";
import { Mail, CheckCircle2, Clock, AlertTriangle, Ban, Reply, CalendarClock, Eye } from "lucide-react";

interface Sent {
  id: number;
  leadId: number;
  name: string;
  toAddr: string;
  subject: string | null;
  kind: string;
  status: string;
  error: string | null;
  isPreview: number;
  at: number;
  followUpAt: number | null;
  stage: string;
  replyIntent: string | null;
  replyText: string | null;
}

const fetcher = (u: string) => fetch(u).then((r) => r.json());
const fmt = (t: number) => new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Status({ s }: { s: Sent }) {
  if (s.status === "sent")
    return <span className="inline-flex items-center gap-1 rounded-full bg-go-soft px-2 py-0.5 text-[11px] font-semibold text-go"><CheckCircle2 className="h-3 w-3" /> sent</span>;
  if (s.status === "queued" || s.status === "sending")
    return <span className="inline-flex items-center gap-1 rounded-full bg-paper-2 px-2 py-0.5 text-[11px] text-ink-2"><Clock className="h-3 w-3" /> {s.status}</span>;
  if (s.status === "blocked")
    return <span title={s.error ?? ""} className="inline-flex items-center gap-1 rounded-full bg-chilli-soft px-2 py-0.5 text-[11px] text-chilli"><Ban className="h-3 w-3" /> blocked</span>;
  return <span title={s.error ?? ""} className="inline-flex items-center gap-1 rounded-full bg-chilli-soft px-2 py-0.5 text-[11px] text-chilli"><AlertTriangle className="h-3 w-3" /> failed</span>;
}

/** Monitor every email that went out: delivery, reply and follow-up, live. */
export function SentMail() {
  const { data } = useSWR<{ sent: Sent[] }>("/api/sent", fetcher, { refreshInterval: 3000 });
  const rows = data?.sent ?? [];
  const real = rows.filter((r) => !r.isPreview);
  const replied = real.filter((r) => r.replyIntent && r.replyIntent !== "out_of_office" && r.replyIntent !== "bounce").length;
  const bounced = real.filter((r) => r.replyIntent === "bounce").length;
  return (
    <div className="mt-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Sent to businesses", real.filter((r) => r.status === "sent").length, "bg-ink text-paper"],
          ["Replied", replied, "bg-neon text-ink"],
          ["Waiting", real.filter((r) => r.status === "sent" && !r.replyIntent).length, "bg-white border border-line"],
          ["Bounced", bounced, "bg-chilli-soft text-chilli"],
        ].map(([l, v, c]) => (
          <div key={l as string} className={`rounded-2xl p-4 ${c}`}>
            <div className="font-display text-3xl font-extrabold">{v as number}</div>
            <div className="text-xs font-semibold opacity-80">{l as string}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-white">
        {rows.length === 0 && <p className="p-8 text-center text-sm text-ink-3">No emails sent yet. Pick businesses in the board and press Send.</p>}
        {rows.map((s) => (
          <Link key={s.id} href={`/leads/${s.leadId}`} className="grid gap-2 border-b border-line px-4 py-3 transition last:border-0 hover:bg-paper md:grid-cols-[1.4fr_1.6fr_0.9fr_1.3fr] md:items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-ink-3" />
                <span className="truncate font-semibold">{s.name}</span>
                {s.isPreview ? <span className="inline-flex items-center gap-0.5 rounded-md bg-lilac px-1.5 text-[10px] font-bold"><Eye className="h-3 w-3" /> preview</span> : null}
                {s.kind === "follow_up" && <span className="rounded-md bg-paper-2 px-1.5 text-[10px] font-bold">follow-up</span>}
              </div>
              <div className="truncate pl-6 text-xs text-ink-3">{s.toAddr}</div>
            </div>
            <div className="truncate text-sm text-ink-2">{s.subject}</div>
            <div className="flex items-center gap-2">
              <Status s={s} />
              <span className="text-[11px] text-ink-3">{fmt(s.at)}</span>
            </div>
            <div className="text-xs">
              {s.replyIntent === "bounce" ? (
                <span className="inline-flex items-center gap-1 font-semibold text-chilli">
                  <AlertTriangle className="h-3.5 w-3.5" /> bounced: address doesn&apos;t exist, won&apos;t retry
                </span>
              ) : s.replyIntent ? (
                <span className="inline-flex items-start gap-1 text-ink">
                  <Reply className="mt-0.5 h-3.5 w-3.5 shrink-0 text-go" />
                  <span>
                    <b>{s.replyIntent}</b>
                    {s.replyText ? <span className="text-ink-2">: &ldquo;{s.replyText.slice(0, 50)}&rdquo;</span> : null}
                  </span>
                </span>
              ) : s.status === "sent" && !s.isPreview ? (
                <span className="inline-flex items-center gap-1 text-ink-3">
                  <CalendarClock className="h-3.5 w-3.5" /> {s.followUpAt && s.stage === "contacted" ? `no reply yet · follow-up ${fmt(s.followUpAt)}` : "no reply yet"}
                </span>
              ) : (
                <span className="text-ink-3">{s.error ?? "—"}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
