import Link from "next/link";
import { getRaw } from "@/lib/db";
import { LogoMark } from "@/components/Logo";
import { ArrowRight, Check, Crown, GraduationCap, Building2, Store, Sparkles, Mic, Globe, Swords, ShieldCheck, TrendingUp, Users, Repeat, Rocket } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pitchwala · The business" };

function stats() {
  const raw = getRaw();
  const one = (q: string) => (raw.prepare(q).get() as { n: number | null }).n ?? 0;
  return {
    found: one(`SELECT COUNT(DISTINCT place_key) n FROM leads`),
    rejected: one(`SELECT COALESCE(SUM(ideas_rejected),0) n FROM campaigns`),
    pitched: one(`SELECT COUNT(*) n FROM leads WHERE stage != 'found'`),
    sites: one(`SELECT COUNT(*) n FROM leads WHERE page_json IS NOT NULL`),
    costPerLead: one(`SELECT AVG(cost_usd) n FROM leads WHERE stage != 'found' AND cost_usd > 0`),
  };
}

const JOURNEY = [
  { t: "Mon 9:00", h: "Two sentences", p: "“I build websites. Cafés in Vanasthalipuram.” That's the whole setup." },
  { t: "9:02", h: "Real leads on a map", p: "Scored by how much they need you, with who's winning nearby and why." },
  { t: "9:05", h: "The AI team argues", p: "8 ideas each; the critic kills the generic ones; a simulated owner objects; the writer fixes it." },
  { t: "9:15", h: "You approve, it reaches out", p: "Emails within your daily cap; desi Hindi / Telugu voice notes you forward on WhatsApp." },
  { t: "Any time", h: "Your phone pings", p: "Replies are answered in the thread; the moment someone says yes, you get the call." },
];

const PLANS = [
  { name: "Starter", price: "Free", who: "Try it on your street", items: ["One campaign at a time", "Email pitches with opt-out + cap", "Runs on your own Gmail", "Local AI model option"], cta: "Start free" },
  { name: "Pro", price: "₹499", per: "/month*", who: "Student freelancers", items: ["Unlimited campaigns", "Demo website per lead", "Voice notes in desi Hindi, Telugu, English", "Your own cloned voice", "Talk to Pitchwala voice agent", "“What's working” learning"], cta: "Go Pro", hot: true },
  { name: "Campus & Agency", price: "Per seat", who: "Placement cells, incubators, small agencies", items: ["Seats for a whole batch or team", "Shared “what’s working” across the batch (roadmap)", "Leaderboard of first clients won (roadmap)", "Mentor view (roadmap)"], cta: "Talk to us" },
];

const STREAMS = [
  { icon: Crown, h: "Subscriptions", p: "Pro for individual freelancers; seats for campuses and agencies. Predictable, recurring." },
  { icon: Repeat, h: "Win fee (optional)", p: "A small fee only when a lead becomes a paying client: we earn when the student earns." },
  { icon: Globe, h: "Demo-site upgrades", p: "Turn the demo website into the real one: hosting and a domain, sold to the business the student just won." },
];

const MOAT = [
  { icon: TrendingUp, h: "It learns what gets replies", p: "Every reply teaches the Strategist which ideas work for which kind of shop, in which area. More users, better ideas." },
  { icon: Mic, h: "Speaks like the street", p: "Desi Hindi and Telugu voice notes, because most local owners list a phone, not an email." },
  { icon: Globe, h: "Built before asked", p: "The owner sees their own website working before saying yes. Nobody ignores their own name on a live page." },
  { icon: ShieldCheck, h: "Safe by design", p: "Opt-out in every message, daily cap, never-contact-again list, no WhatsApp automation, facts checked in code." },
];

const CRITERIA = [
  { w: "35%", h: "Idea quality & creativity", p: "8 ideas per business, each tied to a real gap vs the top 3 nearby rivals; the critic rejects generic pitches; the simulated owner pushes back; a demo website of the winning idea." },
  { w: "30%", h: "Works end to end from two inputs", p: "Two sentences → real leads (kit engine) → ideas → real email / voice note → reply answered in the thread → Telegram ping." },
  { w: "15%", h: "Model independence", p: "Gemini, Groq, OpenRouter or Llama on the laptop; switch live in Settings; automatic fallback; typed outputs." },
  { w: "15%", h: "Real-world usefulness", p: "Built for how local India works: phone-first owners, local languages, the freelancer's own phone, strict anti-spam rules." },
  { w: "5%", h: "Code & docs", p: "Ports and adapters, durable job queue + outbox, 28 automated guardrail tests, Docker Compose, README with architecture." },
];

export default function BusinessPage() {
  const s = stats();
  return (
    <div className="bg-paper text-ink">
      {/* nav */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-ink/95 text-paper backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="flex items-center gap-2">
            <LogoMark size={30} className="floaty" />
            <span className="font-display text-xl font-extrabold">Pitch<span className="text-chilli">wala</span></span>
          </span>
          <nav className="hidden gap-6 text-sm text-paper/70 md:flex">
            <a href="#how">How it works</a>
            <a href="#money">How it earns</a>
            <a href="#pricing">Pricing</a>
            <a href="#why">Why we win</a>
            <a href="#judges">For judges</a>
          </nav>
          <Link href="/" className="rounded-full bg-neon px-4 py-1.5 text-sm font-bold text-ink">Open the app</Link>
        </div>
      </div>

      {/* hero */}
      <section className="relative overflow-hidden bg-ink text-paper">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-chilli/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-neon/20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-16">
          <span className="sticker inline-block rotate-[-2deg] rounded-full bg-neon px-3 py-1 text-xs font-bold text-ink">the business model</span>
          <h1 className="rise font-display mt-6 max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-tight md:text-7xl">
            Every student can do the work. <span className="text-neon">Pitchwala gets them the client.</span>
          </h1>
          <p className="rise mt-6 max-w-2xl text-lg text-paper/75" style={{ animationDelay: "120ms" }}>
            An AI sales partner that turns two sentences into real local clients: it finds the shops, invents the one idea each would want,
            builds a demo of it, pitches in the owner&apos;s language and pings the student when someone says yes.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [s.found.toLocaleString("en-IN"), "unique real businesses found today"],
              [s.rejected.toLocaleString("en-IN"), "generic ideas killed by the critic"],
              [s.sites.toLocaleString("en-IN"), "demo websites built before asking"],
              [`$${s.costPerLead.toFixed(4)}`, "model cost per pitched lead (measured)"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="font-display text-4xl font-extrabold text-neon">{v}</div>
                <div className="mt-1 text-sm text-paper/60">{l}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-paper/40">Live numbers from this instance&apos;s database.</p>
        </div>
      </section>

      {/* problem */}
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-20 md:grid-cols-[1fr_1.2fr] md:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-chilli">The problem</p>
          <h2 className="font-display mt-3 text-4xl font-extrabold tracking-tight">The first client is the hardest job a freelancer ever does.</h2>
        </div>
        <div className="space-y-4 text-lg text-ink-2">
          <p>Students learn design, code and video. Nobody teaches them how to find someone who will pay. Local shops are the obvious first clients, and they ignore generic &ldquo;we&apos;ll build you a website&rdquo; messages.</p>
          <div className="flex items-center gap-5 rounded-3xl border-2 border-ink bg-white p-5 shadow-[5px_5px_0_0_#14110F]">
            <div className="font-display text-6xl font-extrabold text-chilli">3/39</div>
            <p className="text-base">businesses within 2.2 km of this café have an email you can use; <b>34 list a phone</b>. An email-only tool can&apos;t reach most of them. Pitchwala speaks their language on WhatsApp.</p>
          </div>
        </div>
      </section>

      {/* journey */}
      <section id="how" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-sm font-bold uppercase tracking-widest text-chilli">How a student uses it</p>
          <h2 className="font-display mt-3 text-4xl font-extrabold tracking-tight">Fifteen minutes on a Monday. Clients all week.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-5">
            {JOURNEY.map((j, i) => (
              <div key={j.h} className="relative rounded-3xl border border-line bg-paper p-5 transition hover:-translate-y-1 hover:shadow-lg">
                <div className="font-mono text-xs text-ink-3">{j.t}</div>
                <div className="font-display mt-2 text-lg font-bold">{j.h}</div>
                <p className="mt-1 text-sm text-ink-2">{j.p}</p>
                <span className="absolute right-4 top-4 font-display text-2xl font-extrabold text-line">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* who */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-sm font-bold uppercase tracking-widest text-chilli">Who it&apos;s for</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { icon: GraduationCap, h: "Student freelancers", p: "Designers, developers, video editors chasing their first paying client and a real portfolio.", tag: "first" },
            { icon: Building2, h: "Campuses & incubators", p: "Placement cells give a batch real client experience and income, and see who's winning.", tag: "next" },
            { icon: Users, h: "Small agencies", p: "Two-to-ten person shops that need a steady local pipeline without a sales hire.", tag: "then" },
          ].map((c) => (
            <div key={c.h} className="rounded-3xl border border-line bg-white p-6">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ink text-neon"><c.icon className="h-5 w-5" /></span>
                <span className="rounded-full bg-lilac px-2.5 py-0.5 text-xs font-bold">{c.tag}</span>
              </div>
              <div className="font-display mt-4 text-xl font-bold">{c.h}</div>
              <p className="mt-1 text-ink-2">{c.p}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-3xl bg-neon/40 p-5">
          <Store className="h-6 w-6 shrink-0" />
          <p><b>And the shop owner wins too:</b> they get a specific, useful idea, a preview of it, in their own language, with one tap to say no forever.</p>
        </div>
      </section>

      {/* money */}
      <section id="money" className="bg-ink py-20 text-paper">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-sm font-bold uppercase tracking-widest text-neon">How it earns</p>
          <h2 className="font-display mt-3 max-w-3xl text-4xl font-extrabold tracking-tight">We make money when students make money.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {STREAMS.map((r) => (
              <div key={r.h} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <r.icon className="h-6 w-6 text-neon" />
                <div className="font-display mt-4 text-xl font-bold">{r.h}</div>
                <p className="mt-1 text-paper/70">{r.p}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-white/5 p-6">
              <div className="font-display text-xl font-bold">Unit economics</div>
              <ul className="mt-3 space-y-2 text-paper/75">
                <li className="flex gap-2"><Check className="mt-1 h-4 w-4 text-neon" /> Model cost measured today: <b className="text-paper">${s.costPerLead.toFixed(4)} per pitched lead</b> on Gemini Flash-Lite; zero on the local model.</li>
                <li className="flex gap-2"><Check className="mt-1 h-4 w-4 text-neon" /> Sends go through the user&apos;s own Gmail: no email bill, and replies land in their own inbox.</li>
                <li className="flex gap-2"><Check className="mt-1 h-4 w-4 text-neon" /> Each user runs their own instance (Docker), so hosting scales with paying users.</li>
              </ul>
            </div>
            <div className="rounded-3xl bg-white/5 p-6">
              <div className="font-display text-xl font-bold">Go to market</div>
              <ul className="mt-3 space-y-2 text-paper/75">
                <li className="flex gap-2"><Rocket className="mt-1 h-4 w-4 text-neon" /> Student communities, campus clubs and hackathon networks: where our first users already are.</li>
                <li className="flex gap-2"><Rocket className="mt-1 h-4 w-4 text-neon" /> Campus ambassadors who show their own first client, won with Pitchwala.</li>
                <li className="flex gap-2"><Rocket className="mt-1 h-4 w-4 text-neon" /> Placement cells: &ldquo;real client experience&rdquo; for a whole batch, measured by clients won.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-sm font-bold uppercase tracking-widest text-chilli">Pricing</p>
        <h2 className="font-display mt-3 text-4xl font-extrabold tracking-tight">Cheaper than one lost client.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={`relative rounded-3xl p-6 ${p.hot ? "border-2 border-ink bg-white shadow-[6px_6px_0_0_#14110F]" : "border border-line bg-white/70"}`}>
              {p.hot && <span className="absolute -top-3 right-5 rotate-[3deg] rounded-full bg-chilli px-3 py-1 text-xs font-bold text-white">most students</span>}
              <div className="font-display text-xl font-bold">{p.name}</div>
              <div className="text-sm text-ink-3">{p.who}</div>
              <div className="mt-4 font-display text-5xl font-extrabold">
                {p.price}
                <span className="text-base font-medium text-ink-3">{p.per}</span>
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {p.items.map((i) => (
                  <li key={i} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-go" /> {i}</li>
                ))}
              </ul>
              <div className={`mt-6 rounded-2xl py-3 text-center font-display font-bold ${p.hot ? "bg-chilli text-white" : "bg-ink text-paper"}`}>{p.cta}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-3">*Test price, not yet validated with paying users. We&apos;ll test it with our first campus cohort.</p>
      </section>

      {/* moat */}
      <section id="why" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-sm font-bold uppercase tracking-widest text-chilli">Why we win</p>
          <h2 className="font-display mt-3 text-4xl font-extrabold tracking-tight">Lead lists are everywhere. Clients aren&apos;t.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {MOAT.map((m) => (
              <div key={m.h} className="flex gap-4 rounded-3xl border border-line bg-paper p-6">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-neon"><m.icon className="h-5 w-5" /></span>
                <div>
                  <div className="font-display text-xl font-bold">{m.h}</div>
                  <p className="mt-1 text-ink-2">{m.p}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-3xl bg-paper-2 p-6 text-sm text-ink-2">
            <b className="text-ink">Honest about the risks.</b> Scraping Google Maps is against Google&apos;s terms (the kit says so): discovery sits behind one interface so the
            official Places API replaces it in production. WhatsApp needs opt-in, so we never automate it. Every message carries an opt-out and respects a daily cap.
          </div>
        </div>
      </section>

      {/* impact + roadmap */}
      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-20 md:grid-cols-2">
        <div className="rounded-3xl border-2 border-ink bg-neon/40 p-7">
          <Sparkles className="h-6 w-6" />
          <div className="font-display mt-3 text-2xl font-extrabold">The impact</div>
          <p className="mt-2 text-ink-2">A student&apos;s first income, a real portfolio piece and the confidence of having closed a client. A local shop&apos;s first website, menu or booking page. Both found each other because an AI did the boring part.</p>
        </div>
        <div className="rounded-3xl border border-line bg-white p-7">
          <div className="font-display text-2xl font-extrabold">What&apos;s next</div>
          <ul className="mt-3 space-y-2 text-ink-2">
            {["Hosted pitch pages with the voice button, linked from every email", "Official Places API behind the same interface", "WhatsApp for owners who opt in", "Playbooks: ideas that won clients, shared across a campus", "Hindi + Telugu everywhere in the app"].map((x) => (
              <li key={x} className="flex gap-2"><ArrowRight className="mt-1 h-4 w-4 text-chilli" /> {x}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* judges */}
      <section id="judges" className="bg-ink py-20 text-paper">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-sm font-bold uppercase tracking-widest text-neon">For the judges · Problem 2 criteria</p>
          <div className="mt-8 space-y-3">
            {CRITERIA.map((c) => (
              <div key={c.h} className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 md:grid-cols-[90px_220px_1fr] md:items-center">
                <div className="font-display text-3xl font-extrabold text-neon">{c.w}</div>
                <div className="font-display text-lg font-bold">{c.h}</div>
                <p className="text-paper/75">{c.p}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-paper/60">Bonus items in the brief: learning which ideas get replies, follow-up scheduling, a dashboard, opt-out handling and send limits: all built.</p>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-neon p-6 text-ink">
            <div className="font-display text-2xl font-extrabold">Two sentences in. Clients out.</div>
            <Link href="/" className="inline-flex items-center gap-2 rounded-2xl bg-ink px-5 py-3 font-display font-bold text-paper">Try it live <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
      <footer className="py-8 text-center text-xs text-ink-3">Built solo in six hours at Build in Café, Hyderabad · by Amith Bhambhu · on the Google Maps Scraper Kit</footer>
    </div>
  );
}
