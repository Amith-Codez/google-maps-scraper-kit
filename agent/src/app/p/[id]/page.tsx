import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { MapPin, Phone, Star, Check, Clock, MessageCircle, CalendarDays, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { buildEvidence, type LeadFacts } from "@/lib/core/evidence";
import { getSetting } from "@/lib/settings";
import { getEnv } from "@/lib/env";
import { TalkToPitchwala } from "@/components/TalkToPitchwala";
import { PreOrderWidget } from "@/components/PreOrderWidget";
import type { PageOut } from "@/lib/core/pageWriter";

export const dynamic = "force-dynamic";

type Theme = { bg: string; ink: string; soft: string; accent: string; accentInk: string; card: string; line: string };
const THEMES: Record<string, Theme> = {
  food: { bg: "#FFF6EA", ink: "#2B1A10", soft: "#7A5A45", accent: "#E8892B", accentInk: "#2B1A10", card: "#FFFFFF", line: "#F0DFC8" },
  learn: { bg: "#F2F5FF", ink: "#14204F", soft: "#56608A", accent: "#3D5AFE", accentInk: "#FFFFFF", card: "#FFFFFF", line: "#DCE3FA" },
  fit: { bg: "#0F1012", ink: "#F4F4F0", soft: "#A5A6A0", accent: "#C8FF3D", accentInk: "#0F1012", card: "#18191C", line: "#2A2B2F" },
  other: { bg: "#FAF8F4", ink: "#14110F", soft: "#6B635D", accent: "#D9381E", accentInk: "#FFFFFF", card: "#FFFFFF", line: "#E4DDD2" },
};
const PHOTOS: Record<string, string[]> = {
  food: ["photo-1554118811-1e0d58224f24", "photo-1495474472287-4d71bcdd2085", "photo-1555396273-367ea4eb4db5", "photo-1504674900247-0877df9cc836"],
  learn: ["photo-1523240795612-9a054b0db644", "photo-1509062522246-3755977927d7", "photo-1427504494785-3a9ca7044f45", "photo-1503676260728-1c00da094a0b"],
  fit: ["photo-1534438327276-14e5300c3a48", "photo-1571019613454-1cb2f99b2d8b", "photo-1517836357463-d25dfeac3438", "photo-1540497077202-7c8a3999166f"],
};
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function themeKey(category: string | null): "food" | "learn" | "fit" | "other" {
  const c = (category ?? "").toLowerCase();
  if (/caf|restaur|bakery|food|dhaba|biryani|tea/.test(c)) return "food";
  if (/coach|tuition|class|academy|school|college|institute/.test(c)) return "learn";
  if (/gym|fitness|yoga|sport/.test(c)) return "fit";
  return "other";
}

function themeFor(category: string | null): Theme {
  const c = (category ?? "").toLowerCase();
  if (/caf|restaur|bakery|food|dhaba|biryani|tea/.test(c)) return THEMES.food;
  if (/coach|tuition|class|academy|school|college|institute/.test(c)) return THEMES.learn;
  if (/gym|fitness|yoga|sport/.test(c)) return THEMES.fit;
  return THEMES.other;
}

function facts(r: typeof schema.leads.$inferSelect): LeadFacts {
  const ev = JSON.parse(r.evidenceJson ?? "{}");
  return { ...r, site: ev.site ?? null };
}

/** A mock of the idea itself, chosen from its words. Clearly labelled as a demo. */
function IdeaWidget({ text, t, cta }: { text: string; t: Theme; cta: string }) {
  const l = text.toLowerCase();
  const kind = /pre-?order|order/.test(l) ? "order" : /book|slot|class|trial|table|schedul|appoint/.test(l) ? "book" : /whatsapp|chat|enquir|inquir/.test(l) ? "chat" : "menu";
  const box = { background: t.card, borderColor: t.line };
  if (kind === "book")
    return (
      <div className="rounded-3xl border p-5 shadow-xl" style={box}>
        <div className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4" /> Pick a slot</div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
          {["Mon", "Tue", "Wed", "Thu"].map((d, i) => (
            <div key={d} className="rounded-xl border py-2 text-center" style={{ borderColor: i === 1 ? t.accent : t.line, background: i === 1 ? t.accent : "transparent", color: i === 1 ? t.accentInk : t.ink }}>{d}</div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          {["Morning", "Afternoon", "Evening"].map((s, i) => (
            <div key={s} className="rounded-xl border py-2 text-center" style={{ borderColor: t.line, opacity: i === 1 ? 0.4 : 1 }}>{s}</div>
          ))}
        </div>
        <div className="mt-4 rounded-xl py-3 text-center text-sm font-semibold" style={{ background: t.accent, color: t.accentInk }}>{cta}</div>
      </div>
    );
  if (kind === "order")
    return (
      <div className="rounded-3xl border p-5 shadow-xl" style={box}>
        <div className="flex items-center gap-2 text-sm font-semibold"><ShoppingBag className="h-4 w-4" /> Your pre-order</div>
        {["Your favourite #1", "Your favourite #2"].map((d, i) => (
          <div key={d} className="mt-3 flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: t.line }}>
            <span>{d}</span>
            <span className="rounded-lg px-2 py-0.5 text-xs" style={{ background: t.bg }}>× {i + 1}</span>
          </div>
        ))}
        <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: t.soft }}><Clock className="h-3.5 w-3.5" /> Ready when you arrive</div>
        <div className="mt-4 rounded-xl py-3 text-center text-sm font-semibold" style={{ background: t.accent, color: t.accentInk }}>{cta}</div>
      </div>
    );
  if (kind === "chat")
    return (
      <div className="rounded-3xl border p-5 shadow-xl" style={box}>
        <div className="flex items-center gap-2 text-sm font-semibold"><MessageCircle className="h-4 w-4" /> Ask us anything</div>
        <div className="mt-3 w-4/5 rounded-2xl rounded-bl-sm px-3 py-2 text-sm" style={{ background: t.bg }}>Hi! Which course fits me?</div>
        <div className="ml-auto mt-2 w-4/5 rounded-2xl rounded-br-sm px-3 py-2 text-sm" style={{ background: t.accent, color: t.accentInk }}>Tell us your class and goal, we'll reply on WhatsApp.</div>
        <div className="mt-4 rounded-xl py-3 text-center text-sm font-semibold" style={{ background: t.accent, color: t.accentInk }}>{cta}</div>
      </div>
    );
  return (
    <div className="rounded-3xl border p-5 shadow-xl" style={box}>
      <div className="flex items-center gap-2 text-sm font-semibold"><UtensilsCrossed className="h-4 w-4" /> Signature dishes</div>
      {["Your signature dish", "Chef's special", "Customer favourite"].map((d) => (
        <div key={d} className="mt-3 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl" style={{ background: `linear-gradient(135deg, ${t.accent}55, ${t.line})` }} />
          <div>
            <div className="text-sm font-medium">{d}</div>
            <div className="text-xs" style={{ color: t.soft }}>Photo + description from you</div>
          </div>
        </div>
      ))}
      <div className="mt-4 rounded-xl py-3 text-center text-sm font-semibold" style={{ background: t.accent, color: t.accentInk }}>{cta}</div>
    </div>
  );
}

export default async function DemoSite({ params }: PageProps<"/p/[id]">) {
  const id = Number((await params).id);
  const db = getDb();
  const lead = db.select().from(schema.leads).where(eq(schema.leads.id, id)).get();
  if (!lead || !lead.pageJson) notFound();
  const page = JSON.parse(lead.pageJson) as PageOut & { builtAt: number };
  const campaign = db.select().from(schema.campaigns).where(eq(schema.campaigns.id, lead.campaignId)).get()!;
  const all = db.select().from(schema.leads).where(eq(schema.leads.campaignId, lead.campaignId)).all();
  const ev = buildEvidence(facts(lead), all.map(facts));
  const idea = db.select().from(schema.ideas).where(eq(schema.ideas.leadId, id)).all().find((i) => i.verdict === "chosen");
  const t = themeFor(lead.category);
  const tk = themeKey(lead.category);
  const evRaw = JSON.parse(lead.evidenceJson ?? "{}") as { hours?: Record<string, string[]> | null };
  const hours = evRaw.hours && typeof evRaw.hours === "object" ? evRaw.hours : null;
  const today = DAYS[new Date().getDay()];
  const photos = PHOTOS[tk === "other" ? "food" : tk];
  const rivalsWith = (f: string) => ev.top_rivals.filter((r) => r.why_winning.includes(f)).map((r) => r.name);
  const sender = getEnv().SENDER_NAME;
  const agentId = getSetting("agent_id") || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "";
  const mapSrc =
    lead.lat && lead.lon
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${lead.lon - 0.006},${lead.lat - 0.004},${lead.lon + 0.006},${lead.lat + 0.004}&layer=mapnik&marker=${lead.lat},${lead.lon}`
      : null;

  return (
    <div style={{ background: t.bg, color: t.ink }} className="min-h-screen">
      {/* For the owner: what this is */}
      <div className="sticky top-0 z-50 bg-[#14110F] text-[#FAF8F4]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-2.5 text-sm">
          <span>
            <span className="mr-2 rounded-full bg-[#D9381E] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">Demo</span>
            Website preview made for <b>{lead.name}</b> by {sender}. Not live yet: reply YES to make it real.
          </span>
          <TalkToPitchwala
            agentId={agentId}
            leadId={lead.id}
            disabled={!idea}
            vars={{ sender_name: sender, idea_title: idea?.title ?? "", idea_pitch: idea?.pitchLine ?? "", service: campaign.service }}
          />
        </div>
      </div>

      {/* The mock site */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="font-display text-xl font-extrabold tracking-tight">{lead.name}</div>
        <nav className="hidden gap-6 text-sm sm:flex" style={{ color: t.soft }}>
          <span>{page.feature_title}</span>
          <span>Reviews</span>
          <span>Visit</span>
        </nav>
        <span className="rounded-full px-4 py-2 text-sm font-semibold" style={{ background: t.accent, color: t.accentInk }}>{page.cta}</span>
      </header>

      <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-6 md:grid-cols-[1.2fr_1fr]">
        <div className="pointer-events-none absolute -right-10 top-0 h-72 w-72 rounded-full opacity-30 blur-3xl" style={{ background: t.accent }} />
        <div>
          {lead.rating !== null && (
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm" style={{ borderColor: t.line, background: t.card }}>
              <Star className="h-4 w-4" style={{ color: t.accent, fill: t.accent }} />
              <b>{lead.rating.toFixed(1)}</b>
              <span style={{ color: t.soft }}>· rated by {lead.reviewCount ?? 0} people on Google</span>
            </div>
          )}
          <h1 className="rise font-display mt-5 text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">{page.headline}</h1>
          <p className="mt-5 max-w-xl text-lg" style={{ color: t.soft }}>{page.subheadline}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <span className="rounded-2xl px-6 py-3.5 font-semibold shadow-lg" style={{ background: t.accent, color: t.accentInk }}>{page.cta}</span>
            {lead.phone && (
              <span className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3.5 font-medium" style={{ borderColor: t.line }}>
                <Phone className="h-4 w-4" /> {lead.phone}
              </span>
            )}
          </div>
        </div>
        <PreOrderWidget t={t} kind={tk === "learn" ? "learn" : tk === "food" ? "food" : "other"} cta={page.cta} />
      </section>

      {/* gallery (sample photos, clearly labelled) */}
      <section className="mx-auto max-w-6xl px-5 pb-12">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {photos.map((id, i) => (
            <div
              key={id}
              className={`rounded-3xl bg-cover bg-center ${i === 0 ? "md:col-span-2 md:row-span-2 aspect-square md:aspect-auto" : "aspect-square"}`}
              style={{ backgroundImage: `url(https://images.unsplash.com/${id}?w=800&q=70&auto=format&fit=crop)`, backgroundColor: t.line }}
            />
          ))}
        </div>
        <p className="mt-2 text-xs" style={{ color: t.soft }}>Sample photos: your own photos go here.</p>
      </section>

      {/* real rating, big */}
      {lead.rating !== null && (
        <section className="mx-auto max-w-6xl px-5 pb-14">
          <div className="flex flex-wrap items-center gap-6 rounded-3xl border p-7" style={{ borderColor: t.line, background: t.card }}>
            <div className="font-display text-7xl font-extrabold" style={{ color: t.accent }}>{lead.rating.toFixed(1)}</div>
            <div>
              <div className="flex gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className="h-6 w-6" style={{ color: t.accent, fill: i < Math.round(lead.rating ?? 0) ? t.accent : "transparent" }} />
                ))}
              </div>
              <p className="mt-1 text-lg font-semibold">from {lead.reviewCount ?? 0} Google reviews</p>
              <p className="text-sm" style={{ color: t.soft }}>Your best reviews get pinned here, word for word.</p>
            </div>
          </div>
        </section>
      )}

      <section className="py-16" style={{ background: t.card }}>
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: t.accent }}>New</p>
          <h2 className="font-display mt-2 text-4xl font-extrabold tracking-tight">{page.feature_title}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {page.steps.map((s, i) => (
              <div key={i} className="rounded-3xl border p-6" style={{ borderColor: t.line, background: t.bg }}>
                <div className="font-display text-4xl font-extrabold" style={{ color: t.accent }}>0{i + 1}</div>
                <p className="mt-3 text-lg font-medium">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight">Come visit</h2>
          {lead.address && (
            <p className="mt-4 flex gap-2" style={{ color: t.soft }}>
              <MapPin className="mt-1 h-4 w-4 shrink-0" /> {lead.address}
            </p>
          )}
          {lead.phone && (
            <p className="mt-2 flex gap-2" style={{ color: t.soft }}>
              <Phone className="mt-1 h-4 w-4 shrink-0" /> {lead.phone}
            </p>
          )}
          {hours && Object.keys(hours).length > 0 && (
            <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: t.line, background: t.card }}>
              <p className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4" /> Opening hours</p>
              <ul className="mt-2 space-y-1 text-sm">
                {DAYS.filter((d) => hours[d]).map((d) => (
                  <li key={d} className="flex justify-between rounded-lg px-2 py-1" style={d === today ? { background: t.accent, color: t.accentInk, fontWeight: 600 } : { color: t.soft }}>
                    <span>{d}{d === today ? " · today" : ""}</span>
                    <span>{hours[d].join(", ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {mapSrc && <iframe title="map" src={mapSrc} className="h-64 w-full rounded-3xl border" style={{ borderColor: t.line }} loading="lazy" />}
      </section>

      {/* For the owner: why this, with real numbers */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="rounded-3xl bg-[#14110F] p-7 text-[#FAF8F4] md:p-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#D9381E]">For the owner · why this, why now</p>
          <p className="font-display mt-3 text-2xl font-bold leading-snug md:text-3xl">{page.owner_note}</p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-[1.1fr_1fr_1fr] bg-white/5 text-[11px] font-semibold uppercase tracking-widest">
              <div className="p-3 text-[#FAF8F4]/50"> </div>
              <div className="p-3 text-[#FAF8F4]/60">Today</div>
              <div className="p-3 text-[#C8FF3D]">With your website</div>
            </div>
            {[
              ["Seeing the menu", ev.no_own_website ? "Customers have to walk in or call" : "Only if they find your site", "They browse your signature dishes on their phone"],
              ["Ordering ahead", "Not possible: they queue when they arrive", "Pre-order, say when they'll arrive, food is ready"],
              ["Dine in or parcel", "Decided at the counter", "Chosen in one tap, table kept for them"],
              ["Booking", ev.online_booking_link ? "Online, but buried" : "Phone calls during your busiest hours", "Online in 10 seconds, any time of day"],
              [
                "Your rivals",
                rivalsWith("own website").length || rivalsWith("online booking").length
                  ? `${[...new Set([...rivalsWith("own website"), ...rivalsWith("online booking")])].slice(0, 2).join(" and ")} already online`
                  : "Nobody nearby does this well yet",
                "You're the one customers find first",
              ],
            ].map(([row, now, next]) => (
              <div key={row} className="grid grid-cols-[1.1fr_1fr_1fr] border-t border-white/10 text-sm">
                <div className="p-3 font-semibold">{row}</div>
                <div className="p-3 text-[#FAF8F4]/60">{now}</div>
                <div className="p-3 text-[#FAF8F4]">{next}</div>
              </div>
            ))}
          </div>
          {ev.top_rivals.length > 0 && (
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {ev.top_rivals.map((r) => (
                <div key={r.name} className="rounded-2xl bg-white/5 p-4">
                  <div className="truncate text-sm font-semibold">{r.name}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.why_winning.map((w) => (
                      <span key={w} className="rounded-full bg-white/10 px-2 py-0.5 text-[11px]">{w}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {ev.top_rivals.length > 0 && (
            <div className="mt-6 overflow-x-auto rounded-2xl bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#FAF8F4]/60">Quick check · you vs the 3 best-rated nearby</p>
              <table className="mt-3 w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] text-[#FAF8F4]/50">
                    <th className="py-1 pr-3 font-medium"> </th>
                    <th className="py-1 pr-3 font-semibold text-[#C8FF3D]">{lead.name.split(" ").slice(0, 2).join(" ")}</th>
                    {ev.top_rivals.map((r) => (
                      <th key={r.name} className="py-1 pr-3 font-medium">{r.name.split(" ").slice(0, 2).join(" ")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Own website", "own website", !ev.no_own_website],
                    ["Online booking", "online booking", ev.online_booking_link],
                    ["WhatsApp link", "WhatsApp link", ev.whatsapp_link],
                    ["Instagram linked", "Instagram", ev.instagram_link],
                    ["Menu online", "menu online", ev.menu_on_site],
                  ].map(([label, key, mine]) => (
                    <tr key={String(label)} className="border-t border-white/10">
                      <td className="py-1.5 pr-3 text-[#FAF8F4]/70">{label}</td>
                      <td className="py-1.5 pr-3">{mine ? "✓" : <span className="text-[#D9381E]">✗</span>}</td>
                      {ev.top_rivals.map((r) => (
                        <td key={r.name} className="py-1.5 pr-3">{r.why_winning.includes(String(key)) ? "✓" : <span className="text-[#FAF8F4]/30">✗</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {ev.gaps.length > 0 && (
            <ul className="mt-5 space-y-1 text-sm text-[#FAF8F4]/80">
              {ev.gaps.slice(0, 3).map((g) => (
                <li key={g} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-[#C8FF3D]" /> {g}</li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-sm text-[#FAF8F4]/60">
            Made by {sender} with Pitchwala, from public Google Maps data and your website. Reply YES to the email or WhatsApp for a 2-minute walkthrough.
          </p>
        </div>
      </section>
    </div>
  );
}
