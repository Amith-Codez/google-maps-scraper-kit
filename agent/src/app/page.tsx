import { HealthStrip } from "@/components/HealthStrip";
import { StartForm } from "@/components/StartForm";
import { Counters } from "@/components/Counters";
import { Ticker } from "@/components/Ticker";
import { FreshFromAgents } from "@/components/FreshFromAgents";

export const dynamic = "force-dynamic";
import { Search, Swords, Send, BellRing } from "lucide-react";

const STEPS = [
  { icon: Search, title: "Finds them", text: "Real local businesses from Google Maps, scored by how much they need you." },
  { icon: Swords, title: "Argues for you", text: "3 AI agents debate: the critic kills generic ideas, a simulated owner pushes back." },
  { icon: Send, title: "Pitches like a human", text: "A short email, or a voice note in desi Hindi, Telugu or English for WhatsApp." },
  { icon: BellRing, title: "Pings your phone", text: "Replies get answered; the moment someone's interested, your Telegram buzzes." },
];

export default function StartPage() {
  return (
    <div>
      <Ticker />
      <div className="grain">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 pb-10 pt-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="sticker rotate-[-3deg] rounded-full bg-neon px-3 py-1 text-xs font-bold text-ink">for student freelancers</span>
              <span className="sticker rotate-[2deg] rounded-full bg-lilac px-3 py-1 text-xs font-bold text-ink">speaks desi Hindi + Telugu</span>
              <span className="sticker rotate-[-1deg] rounded-full border border-ink px-3 py-1 text-xs font-bold">never spams</span>
            </div>
            <h1 className="font-display mt-6 text-6xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
              Two sentences in.
              <br />
              <span className="highlight">Clients out.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-ink-2">
              Your first paying client is a café down the road that ignores generic pitches. Pitchwala finds them, invents the one
              idea <i>they</i> would want, builds a preview of it, and only bothers you when someone says yes.
            </p>
            <div className="mt-6 flex items-center gap-4 text-sm text-ink-2">
              <div className="font-display text-4xl font-extrabold text-chilli">3/39</div>
              <p className="max-w-xs">
                businesses near this café have an email you can use; 34 list a phone. So Pitchwala also makes WhatsApp voice notes.
              </p>
            </div>
          </div>
          <div>
            <StartForm />
            <div className="mt-4">
              <Counters />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-3 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="group rounded-3xl border border-line bg-white/70 p-5 transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-neon transition group-hover:rotate-6">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="font-display text-3xl font-extrabold text-line">0{i + 1}</span>
              </div>
              <div className="font-display mt-4 text-lg font-bold">{s.title}</div>
              <p className="mt-1 text-sm text-ink-2">{s.text}</p>
            </div>
          ))}
        </div>
        <FreshFromAgents />
        <div className="mt-6">
          <HealthStrip />
        </div>
      </div>
    </div>
  );
}
