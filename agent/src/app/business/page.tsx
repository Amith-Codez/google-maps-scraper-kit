import Link from "next/link";
import { getRaw } from "@/lib/db";
import { LogoMark } from "@/components/Logo";
import { ArrowRight, Check, Search, Swords, Globe, BellRing, GraduationCap, Building2, Briefcase, Mic, TrendingUp, ShieldCheck, Target, Rocket, Repeat } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pitchwala · Investor pitch" };

function stats() {
  const raw = getRaw();
  const one = (q: string) => (raw.prepare(q).get() as { n: number | null }).n ?? 0;
  return {
    found: one(`SELECT COUNT(DISTINCT place_key) n FROM leads`),
    rejected: one(`SELECT COALESCE(SUM(ideas_rejected),0) n FROM campaigns`),
    pitched: one(`SELECT COUNT(DISTINCT place_key) n FROM leads WHERE stage != 'found'`),
    sites: one(`SELECT COUNT(*) n FROM leads WHERE page_json IS NOT NULL`),
    replies: one(`SELECT COUNT(*) n FROM messages WHERE direction = 'in'`),
    cost: one(`SELECT AVG(cost_usd) n FROM leads WHERE stage != 'found' AND cost_usd > 0`),
  };
}

function Label({ n, children, light }: { n: string; children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] ${light ? "text-neon" : "text-chilli"}`}>
      <span className={`grid h-7 w-7 place-items-center rounded-full font-display text-[11px] ${light ? "bg-neon text-ink" : "bg-ink text-neon"}`}>{n}</span>
      {children}
    </p>
  );
}

/** 39 businesses near the venue: 34 list a phone, only 3 have a usable email (measured 8 Oct). */
function DotGrid() {
  return (
    <div className="grid grid-cols-13 gap-1.5" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
      {Array.from({ length: 39 }, (_, i) => {
        const email = i < 3;
        const phone = i < 34;
        return (
          <span
            key={i}
            className={`aspect-square rounded-full ${email ? "bg-chilli ring-[3px] ring-neon" : phone ? "bg-chilli" : "bg-line"}`}
            title={email ? "usable email" : phone ? "phone only" : "neither"}
          />
        );
      })}
    </div>
  );
}

const FLOW = [
  { icon: Search, h: "Find", p: "Real shops from Google Maps, scored by need" },
  { icon: Swords, h: "Argue", p: "3 AI agents kill generic ideas, test on a simulated owner" },
  { icon: Globe, h: "Build", p: "A demo website of the idea, before asking" },
  { icon: BellRing, h: "Ping", p: "Email or desi-Hindi voice note; replies answered; phone buzzes" },
];

const GTM = [
  {
    icon: GraduationCap,
    who: "Students",
    how: "Bottom-up, free to start",
    steps: [
      "Launch at hackathons and college clubs: the “First Client in 7 Days” challenge",
      "Every demo site carries “made with Pitchwala”: owners and friends see it",
      "Campus ambassadors earn Pro months for every student who wins a client",
    ],
    metric: "Activation = first reply in week 1",
  },
  {
    icon: Building2,
    who: "Campuses & incubators",
    how: "Placement cells buy seats for a batch",
    steps: [
      "Pitch to placement officers: “real client experience” for a batch, not another course",
      "30-day pilot with one class; we report replies, clients won and income earned",
      "Convert the pilot to per-seat yearly licences; incubators use it for founders' first customers",
    ],
    metric: "Win = clients won per 100 students",
  },
  {
    icon: Briefcase,
    who: "Small agencies",
    how: "We sell with our own product",
    steps: [
      "Agencies are on Google Maps too: Pitchwala finds them and pitches them",
      "Their pitch is a demo of their own pipeline: their city, their niche, real leads",
      "14-day trial → team seats; agencies bring repeat volume",
    ],
    metric: "Win = qualified meetings per month",
  },
];

export default function BusinessPage() {
  const s = stats();
  const proof: [string, string][] = [
    [String(s.found), "unique local businesses found"],
    [String(s.rejected), "generic ideas killed by the critic"],
    [String(s.sites), "demo websites built before asking"],
    [`$${s.cost.toFixed(4)}`, "model cost per pitched lead"],
  ];
  return (
    <div className="bg-paper text-ink">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-ink/95 text-paper backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="flex items-center gap-2">
            <LogoMark size={30} className="floaty" />
            <span className="font-display text-xl font-extrabold">Pitch<span className="text-chilli">wala</span></span>
            <span className="ml-2 hidden rounded-full border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-paper/60 sm:inline">investor pitch</span>
          </span>
          <nav className="hidden gap-5 text-sm text-paper/70 lg:flex">
            {[["#problem", "Problem"], ["#solution", "Solution"], ["#proof", "Proof"], ["#model", "Model"], ["#gtm", "Go-to-market"], ["#moat", "Moat"], ["#ask", "Ask"]].map(([h, l]) => (
              <a key={h} href={h} className="hover:text-neon">{l}</a>
            ))}
          </nav>
          <Link href="/" className="rounded-full bg-neon px-4 py-1.5 text-sm font-bold text-ink">Live demo</Link>
        </div>
      </div>

      {/* 0 · one-liner */}
      <section className="relative overflow-hidden bg-ink text-paper">
        <div className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-chilli/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-neon/20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-16">
          <h1 className="rise font-display max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-tight md:text-7xl">
            The AI that gets students their <span className="text-neon">first paying client.</span>
          </h1>
          <p className="rise mt-6 max-w-2xl text-lg text-paper/75" style={{ animationDelay: "120ms" }}>
            Two sentences in. Pitchwala finds real local shops, invents the one idea each would want, builds a demo of it, and pitches it in the owner&apos;s language.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {proof.map(([v, l], i) => (
              <div key={l} className="rise rounded-3xl border border-white/10 bg-white/5 p-5" style={{ animationDelay: `${200 + i * 80}ms` }}>
                <div className="font-display text-4xl font-extrabold text-neon">{v}</div>
                <div className="mt-1 text-sm text-paper/60">{l}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-paper/40">Live from today&apos;s build, real data only.</p>
        </div>
      </section>

      {/* 1 · problem */}
      <section id="problem" className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center">
        <div>
          <Label n="1">Problem</Label>
          <h2 className="font-display mt-4 text-4xl font-extrabold tracking-tight">Two sides that can&apos;t find each other.</h2>
          <ul className="mt-5 space-y-3 text-lg text-ink-2">
            <li><b className="text-ink">Students</b> can design, code and edit, but nobody teaches them to land a client.</li>
            <li><b className="text-ink">Local shops</b> need a menu online, bookings, enquiries, and ignore generic &ldquo;we&apos;ll build you a website&rdquo; spam.</li>
            <li><b className="text-ink">Email-first tools</b> miss most of them: local owners live on the phone.</li>
          </ul>
        </div>
        <div className="rounded-3xl border-2 border-ink bg-white p-6 shadow-[6px_6px_0_0_#14110F]">
          <p className="text-sm text-ink-3">39 businesses within 2.2 km of this café (measured 8 Oct)</p>
          <div className="mt-4"><DotGrid /></div>
          <div className="mt-5 flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-chilli" /> <b>34</b> list a phone</span>
            <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-chilli ring-[3px] ring-neon" /> only <b>3</b> have a usable email</span>
          </div>
        </div>
      </section>

      {/* 2 · solution */}
      <section id="solution" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Label n="2">Solution</Label>
          <h2 className="font-display mt-4 text-4xl font-extrabold tracking-tight">An AI sales team that pitches like a local.</h2>
          <div className="mt-10 grid gap-3 md:grid-cols-4">
            {FLOW.map((f, i) => (
              <div key={f.h} className="relative rounded-3xl border border-line bg-paper p-6 transition hover:-translate-y-1 hover:shadow-xl">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-neon"><f.icon className="h-6 w-6" /></span>
                <div className="font-display mt-4 text-2xl font-extrabold">{f.h}</div>
                <p className="mt-1 text-sm text-ink-2">{f.p}</p>
                {i < 3 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 rounded-full bg-chilli p-1 text-white md:block" />}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              [Mic, "Desi Hindi, Telugu, English voice notes, in the student's own cloned voice"],
              [ShieldCheck, "Opt-out, daily cap, never-contact-again list, no WhatsApp automation"],
              [Repeat, "Runs on any AI model, even one on the laptop, switchable live"],
            ].map(([I, t]) => {
              const Icon = I as typeof Mic;
              return (
                <div key={t as string} className="flex items-center gap-3 rounded-2xl bg-paper-2 px-4 py-3 text-sm">
                  <Icon className="h-5 w-5 shrink-0 text-chilli" /> {t as string}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3 · proof */}
      <section id="proof" className="mx-auto max-w-6xl px-6 py-20">
        <Label n="3">Proof, built today</Label>
        <h2 className="font-display mt-4 text-4xl font-extrabold tracking-tight">Not a mock-up. It ran on this street.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-ink p-6 text-paper md:col-span-2">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
              {[
                [s.found, "businesses found"],
                [s.pitched, "got a specific pitch"],
                [s.rejected, "generic ideas rejected"],
                [s.sites, "demo websites built"],
                [s.replies, "replies handled in-thread"],
                [`$${s.cost.toFixed(4)}`, "per pitched lead"],
              ].map(([v, l]) => (
                <div key={l as string}>
                  <div className="font-display text-4xl font-extrabold text-neon">{v}</div>
                  <div className="text-sm text-paper/60">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border-2 border-ink bg-neon/50 p-6">
            <div className="font-display text-xl font-extrabold">A real reply, handled</div>
            <p className="mt-2 text-sm">&ldquo;What would be the cost?&rdquo; → answered in the same email thread in seconds, no invented price, and the student&apos;s phone pinged with the reply read aloud.</p>
          </div>
        </div>
      </section>

      {/* 4 · why now */}
      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 md:grid-cols-3">
          {[
            ["AI got cheap", `A full multi-agent pitch costs $${s.cost.toFixed(4)} per lead (measured): a student can afford a whole city.`],
            ["Voice got local", "Text-to-speech now speaks Hindi and Telugu naturally: the owner hears an idea, not spam."],
            ["India is phone-first", "34 of 39 shops nearby list a phone. The channel already exists; nobody uses it well."],
          ].map(([h, p], i) => (
            <div key={h} className="rounded-3xl border border-line bg-paper p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-chilli">Why now · {i + 1}</p>
              <div className="font-display mt-2 text-2xl font-extrabold">{h}</div>
              <p className="mt-1 text-sm text-ink-2">{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5 · model */}
      <section id="model" className="bg-ink py-20 text-paper">
        <div className="mx-auto max-w-6xl px-6">
          <Label n="4" light>Business model</Label>
          <h2 className="font-display mt-4 max-w-3xl text-4xl font-extrabold tracking-tight">We earn when students earn.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { h: "Pro subscription", v: "₹499/mo*", p: "Unlimited campaigns, demo sites, voice notes, voice agent, learning. For individual students." },
              { h: "Campus seats", v: "per seat / year", p: "Placement cells and incubators buy a batch; we report clients won and income earned." },
              { h: "Win + site upgrade", v: "only on success", p: "A small fee when a lead becomes a client, and hosting/domain to turn the demo into the real site." },
            ].map((m, i) => (
              <div key={m.h} className={`rounded-3xl p-6 ${i === 0 ? "bg-neon text-ink" : "border border-white/10 bg-white/5"}`}>
                <div className="font-display text-xl font-bold">{m.h}</div>
                <div className="font-display mt-2 text-3xl font-extrabold">{m.v}</div>
                <p className={`mt-2 text-sm ${i === 0 ? "text-ink/75" : "text-paper/70"}`}>{m.p}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-3xl bg-white/5 p-6">
            <div className="flex items-center gap-2 font-display text-lg font-bold"><TrendingUp className="h-5 w-5 text-neon" /> Unit economics</div>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <div className="flex justify-between text-paper/70"><span>AI cost to pitch 100 shops (measured rate)</span><b className="text-paper">${(s.cost * 100).toFixed(2)}</b></div>
                <div className="mt-1 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-chilli" style={{ width: "3%" }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-paper/70"><span>Email sending</span><b className="text-paper">₹0 · the student&apos;s own Gmail</b></div>
              </div>
              <div>
                <div className="flex justify-between text-paper/70"><span>Hosting</span><b className="text-paper">one container per user (Docker)</b></div>
              </div>
            </div>
            <p className="mt-4 text-xs text-paper/40">*Test price, not yet validated with paying users: our first campus pilot tests it.</p>
          </div>
        </div>
      </section>

      {/* 6 · go-to-market */}
      <section id="gtm" className="mx-auto max-w-6xl px-6 py-20">
        <Label n="5">Go-to-market</Label>
        <h2 className="font-display mt-4 text-4xl font-extrabold tracking-tight">Three doors in. One playbook each.</h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {GTM.map((g, i) => (
            <div key={g.who} className="flex flex-col rounded-3xl border-2 border-ink bg-white p-6 shadow-[5px_5px_0_0_#14110F]">
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-neon"><g.icon className="h-6 w-6" /></span>
                <span className="font-display text-4xl font-extrabold text-line">0{i + 1}</span>
              </div>
              <div className="font-display mt-4 text-2xl font-extrabold">{g.who}</div>
              <div className="text-sm font-semibold text-chilli">{g.how}</div>
              <ol className="mt-4 flex-1 space-y-2.5 text-sm text-ink-2">
                {g.steps.map((st, n) => (
                  <li key={st} className="flex gap-2.5">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-paper-2 text-[10px] font-bold">{n + 1}</span>
                    {st}
                  </li>
                ))}
              </ol>
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-lilac px-3 py-2 text-xs font-semibold"><Target className="h-4 w-4" /> {g.metric}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 7 · competition + moat */}
      <section id="moat" className="bg-white py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <Label n="6">Where we sit</Label>
            <h2 className="font-display mt-4 text-4xl font-extrabold tracking-tight">Lead lists are everywhere. Clients aren&apos;t.</h2>
            <div className="relative mt-8 aspect-square max-w-md rounded-3xl border border-line bg-paper p-4">
              <div className="absolute inset-x-4 top-1/2 h-px bg-line" />
              <div className="absolute inset-y-4 left-1/2 w-px bg-line" />
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest text-ink-3">generic → specific to each shop</span>
              <span className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] uppercase tracking-widest text-ink-3 whitespace-nowrap">email only → local voice</span>
              {[
                { l: "Lead scrapers", x: "18%", y: "78%", c: "bg-line" },
                { l: "Cold-email tools", x: "38%", y: "70%", c: "bg-line" },
                { l: "Website-audit tools", x: "58%", y: "62%", c: "bg-line" },
                { l: "Hiring an agency", x: "70%", y: "40%", c: "bg-lilac" },
              ].map((d) => (
                <span key={d.l} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2.5 py-1 text-[11px] ${d.c}`} style={{ left: d.x, top: d.y }}>{d.l}</span>
              ))}
              <span className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-chilli px-3 py-1.5 font-display text-sm font-extrabold text-white shadow-lg" style={{ left: "82%", top: "16%" }}>Pitchwala</span>
            </div>
          </div>
          <div>
            <Label n="7">Moat · the flywheel</Label>
            <div className="mt-6 space-y-3">
              {[
                ["More students pitch", "every pitch is tied to a real gap in a real shop"],
                ["More real replies", "the app learns which ideas owners answer, by area and business type"],
                ["Better ideas", "the Strategist is fed what worked; generic ideas die"],
                ["More clients won", "students share wins and their demo sites"],
              ].map(([h, p], i) => (
                <div key={h} className="flex items-center gap-4 rounded-2xl border border-line bg-paper p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink font-display font-extrabold text-neon">{i + 1}</span>
                  <div>
                    <div className="font-display font-bold">{h}</div>
                    <div className="text-sm text-ink-2">{p}</div>
                  </div>
                  {i < 3 ? <ArrowRight className="ml-auto h-4 w-4 rotate-90 text-chilli" /> : <Repeat className="ml-auto h-4 w-4 text-chilli" />}
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-2xl bg-paper-2 p-4 text-xs text-ink-2">
              <b className="text-ink">Risks we design around:</b> scraping Maps breaks Google&apos;s terms, so discovery sits behind one interface for the official Places API; WhatsApp needs opt-in, so we never automate it; every message has an opt-out and a daily cap.
            </p>
          </div>
        </div>
      </section>

      {/* 8 · ask */}
      <section id="ask" className="bg-ink py-20 text-paper">
        <div className="mx-auto max-w-6xl px-6">
          <Label n="8" light>Next 90 days &amp; the ask</Label>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Day 30", "3 campus pilots in Hyderabad; first 100 students; hosted pitch pages"],
              ["Day 60", "Official Places API; WhatsApp for opted-in owners; Hindi + Telugu app"],
              ["Day 90", "Paid Pro and first campus licence; win-fee test; agency plan"],
            ].map(([d, p]) => (
              <div key={d} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="font-display text-3xl font-extrabold text-neon">{d}</div>
                <p className="mt-2 text-paper/75">{p}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <div className="rounded-3xl bg-neon p-7 text-ink">
              <div className="flex items-center gap-2 font-display text-2xl font-extrabold"><Rocket className="h-6 w-6" /> What we&apos;re asking for</div>
              <ul className="mt-4 space-y-2">
                {["Introductions to placement cells and incubators for pilots", "Voice and cloud credits to run the pilots", "Mentors who've built B2B2C in education"].map((x) => (
                  <li key={x} className="flex gap-2"><Check className="mt-1 h-4 w-4" /> {x}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
              <div className="font-display text-xl font-extrabold">Team</div>
              <p className="mt-2 text-paper/75">Amith Bhambhu: built Pitchwala solo in six hours at Build in Café, Hyderabad. A student who freelances, building for students who freelance.</p>
              <Link href="/" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-chilli px-5 py-3 font-display font-bold text-white">See it live <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </div>
      </section>
      <footer className="py-8 text-center text-xs text-ink-3">Pitchwala · Two sentences in. Clients out. · Built on the Google Maps Scraper Kit</footer>
    </div>
  );
}
