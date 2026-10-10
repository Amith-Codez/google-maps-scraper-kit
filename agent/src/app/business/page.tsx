import Link from "next/link";
import { getRaw } from "@/lib/db";
import { LogoMark } from "@/components/Logo";
import { ArrowRight, Zap, HeartHandshake, TrendingUp, Magnet, Crown, GraduationCap, Repeat, Globe2, Rocket, Flag, Target } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pitchwala · Business plan" };

const PILLARS = [
  { icon: Zap, h: "Impact", p: "Local shops get their menu, bookings and pre-orders online. Students get paid work.", c: "bg-chilli text-white" },
  { icon: TrendingUp, h: "Dynamic", p: "It learns from every reply which ideas owners say yes to, and pitches better next time.", c: "bg-neon text-ink" },
  { icon: HeartHandshake, h: "Empowerment", p: "A student's first income, first portfolio piece, first “I closed a client”.", c: "bg-lilac text-ink" },
  { icon: Magnet, h: "Attraction", p: "Owners see their own website working before they say yes. Hard to ignore.", c: "bg-ink text-neon" },
];

const MONEY = [
  { h: "Pro", v: "₹499/mo*", who: "Each student freelancer", p: "Unlimited campaigns, demo sites, voice notes in their language." },
  { h: "Campus seats", v: "per seat / year", who: "Placement cells & incubators", p: "A whole batch gets real client experience; we report clients won." },
  { h: "On every win", v: "small fee + hosting", who: "When a shop says yes", p: "A fee only when the student lands the client, plus hosting to make the demo site real." },
];

const PHASES = [
  {
    tag: "Phase 1 · Launch",
    when: "Month 0–1",
    where: "Hyderabad",
    icon: Flag,
    steps: ["“First Client in 7 Days” challenge at hackathons and college clubs", "3 campus pilots with placement cells", "Hosted pitch pages, so owners open their demo site from the email"],
    goal: "Target: 100 students, first clients won",
  },
  {
    tag: "Phase 2 · Prove",
    when: "Month 2–3",
    where: "Hyderabad",
    icon: Target,
    steps: ["Pilot reports: replies, clients won, money earned per student", "Test the Pro price with real students", "Official Places API instead of scraping"],
    goal: "Target: first paying campus + first Pro users",
  },
  {
    tag: "Phase 3 · Expand",
    when: "Month 4–6",
    where: "Telangana + Andhra Pradesh",
    icon: Rocket,
    steps: ["Placement-cell network and campus ambassadors", "Agency plan: Pitchwala pitches agencies with their own pipeline", "Full app in Hindi and Telugu"],
    goal: "Target: campuses across both states",
  },
  {
    tag: "Phase 4 · Scale",
    when: "Month 7–12",
    where: "Tier-2 cities across India",
    icon: Globe2,
    steps: ["More languages: Tamil, Kannada, Marathi", "WhatsApp for owners who opt in", "Partnerships with student communities and incubators"],
    goal: "Target: a national student-freelancer network",
  },
];

const ENGINE = ["Students pitch real shops", "Owners reply to specific ideas", "Students win clients and earn", "They share wins and demo sites", "More students join"];

export default function BusinessPlan() {
  const cost = (getRaw().prepare(`SELECT AVG(cost_usd) n FROM leads WHERE stage != 'found' AND cost_usd > 0`).get() as { n: number | null }).n ?? 0;
  return (
    <div className="bg-paper text-ink">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-ink/95 text-paper backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="flex items-center gap-2">
            <LogoMark size={30} className="floaty" />
            <span className="font-display text-xl font-extrabold">Pitch<span className="text-chilli">wala</span></span>
            <span className="ml-2 hidden rounded-full border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-paper/60 sm:inline">business plan</span>
          </span>
          <nav className="hidden gap-5 text-sm text-paper/70 md:flex">
            <a href="#money" className="hover:text-neon">Money</a>
            <a href="#blueprint" className="hover:text-neon">Blueprint</a>
            <a href="#engine" className="hover:text-neon">Growth engine</a>
          </nav>
          <Link href="/" className="rounded-full bg-neon px-4 py-1.5 text-sm font-bold text-ink">Live demo</Link>
        </div>
      </div>

      {/* one line */}
      <section className="relative overflow-hidden bg-ink text-paper">
        <div className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-chilli/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-neon/20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-16">
          <span className="sticker inline-block rotate-[-2deg] rounded-full bg-neon px-3 py-1 text-xs font-bold text-ink">the plan in one line</span>
          <h1 className="rise font-display mt-6 max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-tight md:text-7xl">
            Every student freelancer gets an AI sales team.{" "}
            <span className="bg-gradient-to-r from-neon via-[#E9E3FF] to-chilli bg-clip-text text-transparent">Every local shop gets online.</span>
          </h1>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p, i) => (
              <div key={p.h} className={`sticker rise rounded-3xl p-5 ${p.c}`} style={{ animationDelay: `${150 + i * 80}ms` }}>
                <p.icon className="h-6 w-6" />
                <div className="font-display mt-3 text-2xl font-extrabold">{p.h}</div>
                <p className="mt-1 text-sm opacity-85">{p.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* money */}
      <section id="money" className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-chilli">How we make money</p>
        <h2 className="font-display mt-2 text-4xl font-extrabold tracking-tight"><span className="highlight">We earn when students earn.</span></h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {MONEY.map((m, i) => (
            <div key={m.h} className={`sticker rounded-3xl border-2 border-ink p-6 ${["bg-white shadow-[6px_6px_0_0_#C8FF3D] rotate-[-1deg]", "bg-white shadow-[6px_6px_0_0_#D9381E] rotate-[0.7deg]", "bg-white shadow-[6px_6px_0_0_#E9E3FF] rotate-[-0.5deg]"][i]}`}>
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-3"><Crown className="h-4 w-4 text-chilli" /> {m.who}</div>
              <div className="font-display mt-3 text-2xl font-extrabold">{m.h}</div>
              <div className="font-display text-3xl font-extrabold text-chilli">{m.v}</div>
              <p className="mt-2 text-sm text-ink-2">{m.p}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-3xl bg-ink p-6 text-paper">
          <div className="font-display text-4xl font-extrabold text-neon">${(cost * 100).toFixed(2)}</div>
          <p className="max-w-xl text-sm text-paper/75">
            AI cost for one student to pitch <b className="text-paper">100 shops</b> (measured today at ${cost.toFixed(4)} a lead). Emails go through the student&apos;s own Gmail, so sending costs nothing. That&apos;s why one subscription stays almost all margin.
          </p>
        </div>
        <p className="mt-2 text-xs text-ink-3">*Test price, not yet validated with paying users: Phase 2 tests it.</p>
      </section>

      {/* blueprint */}
      <section id="blueprint" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-chilli">The blueprint</p>
          <h2 className="font-display mt-2 text-4xl font-extrabold tracking-tight"><span className="highlight">Launch in Hyderabad. Scale across India.</span></h2>
          <div className="relative mt-10 grid gap-4 lg:grid-cols-4">
            <div className="pointer-events-none absolute left-0 right-0 top-7 hidden h-1 rounded-full bg-gradient-to-r from-neon via-chilli to-ink lg:block" />
            {PHASES.map((ph, i) => (
              <div key={ph.tag} className="relative">
                <span className={`relative z-10 grid h-14 w-14 place-items-center rounded-2xl ${["bg-neon text-ink", "bg-lilac text-ink", "bg-chilli text-white", "bg-ink text-neon"][i]}`}>
                  <ph.icon className="h-6 w-6" />
                </span>
                <div className="mt-4 rounded-3xl border border-line bg-paper p-5 transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="font-display text-lg font-extrabold">{ph.tag}</div>
                  <div className="text-sm text-ink-3">{ph.when} · {ph.where}</div>
                  <ul className="mt-3 space-y-2 text-sm text-ink-2">
                    {ph.steps.map((st) => (
                      <li key={st} className="flex gap-2"><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-chilli" /> {st}</li>
                    ))}
                  </ul>
                  <div className="mt-4 rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-neon">{ph.goal}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* who we sell to, and how */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-chilli">Who pays, and how we reach them</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            [GraduationCap, "Students", "Free to start; hackathons, college clubs, campus ambassadors who earn Pro months for every student who wins a client."],
            [Crown, "Campuses & incubators", "Placement officers buy seats for a batch after a 30-day pilot shows replies, clients won and income earned."],
            [Rocket, "Small agencies", "Pitchwala finds agencies on Maps and pitches them a demo of their own pipeline; 14-day trial to team seats."],
          ].map(([I, h, p]) => {
            const Icon = I as typeof Crown;
            return (
              <div key={h as string} className="rounded-3xl border border-line bg-white p-6">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ink text-neon"><Icon className="h-5 w-5" /></span>
                <div className="font-display mt-4 text-xl font-extrabold">{h as string}</div>
                <p className="mt-1 text-sm text-ink-2">{p as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* growth engine */}
      <section id="engine" className="bg-ink py-16 text-paper">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-neon">The growth engine</p>
          <h2 className="font-display mt-2 text-4xl font-extrabold tracking-tight">Every win brings the next student.</h2>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {ENGINE.map((e, i) => (
              <div key={e} className="flex items-center gap-3">
                <span className={`rounded-2xl px-4 py-3 font-display font-bold ${i % 2 ? "bg-white/10" : "bg-neon text-ink"}`}>{e}</span>
                {i < ENGINE.length - 1 ? <ArrowRight className="h-5 w-5 text-chilli" /> : <Repeat className="h-5 w-5 text-chilli" />}
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-neon p-6 text-ink">
            <div className="font-display text-2xl font-extrabold">Two sentences in. Clients out.</div>
            <Link href="/" className="inline-flex items-center gap-2 rounded-2xl bg-ink px-5 py-3 font-display font-bold text-paper">See it live <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
      <footer className="py-8 text-center text-xs text-ink-3">Pitchwala · built by Amith Bhambhu at Build in Café, Hyderabad</footer>
    </div>
  );
}
