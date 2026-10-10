// Application layer: wires the core agents to the adapters. Called by the worker's job handlers.
import { eq } from "drizzle-orm";
import { getDb, getRaw, schema } from "./db";
import { writeEvent } from "./events";
import { enqueue } from "./jobs";
import { llm } from "./llm";
import { kit } from "./adapters/kit";
import { geocode } from "./geo";
import { runPlanner } from "./core/planner";
import { channelFor, opportunityScore, rivalStats } from "./core/score";
import type { Place } from "./ports";
import { writePage } from "./core/pageWriter";
import { classifyEmails, hostOf, readWebsite, websiteKind, type SiteFacts } from "./enrich";
import { allowedNumbers, buildEvidence, type LeadFacts } from "./core/evidence";
import { applyCriticRules, composer, critic, expandScores, modelClaimCheck, ownerTwin, strategist, type ArenaCtx } from "./core/arena";
import { claimCheck, ensureOptOut, genericPhrase, sanitizeBody, splitSentences, stripVoiceScript, trimWords, wordCount } from "./core/guards";
import { getSetting } from "./settings";
import { getEnv } from "./env";
import { requestSend } from "./outbox";
import type { TwinVerdict } from "./schemas";

// The venue (Mana Katha Cafe, Vanasthalipuram): used only if geocoding fails.
const VENUE = { lat: 17.3297, lon: 78.556 };
const MAX_LEADS = 60;

function campaign(id: number) {
  const c = getDb().select().from(schema.campaigns).where(eq(schema.campaigns.id, id)).get();
  if (!c) throw new Error(`campaign ${id} not found`);
  return c;
}

function setCampaign(id: number, patch: Partial<typeof schema.campaigns.$inferInsert>) {
  getDb().update(schema.campaigns).set(patch).where(eq(schema.campaigns.id, id)).run();
}

export async function handlePlan(campaignId: number) {
  const c = campaign(campaignId);
  setCampaign(campaignId, { status: "planning" });
  const r = await runPlanner(llm, { service: c.service, clients: c.clients, language: c.language, campaignId });
  const p = r.output;
  writeEvent({
    campaignId,
    agent: "planner",
    type: "plan",
    summary: `Planner: ${p.keywords.map((k) => `"${k}"`).join(", ")} · ${p.why}`,
    data: { ...p, model: r.model, provider: r.provider },
  });
  setCampaign(campaignId, {
    keywordsJson: JSON.stringify(p.keywords),
    area: p.area,
    city: p.city,
    planWhy: p.why,
  });

  if (p.service_fit === "weak") {
    setCampaign(campaignId, { status: "weak_fit" });
    writeEvent({ campaignId, agent: "planner", type: "weak_fit", summary: `Weak fit, nothing will be sent: ${p.why}` });
    return;
  }

  let at = await geocode(`${p.area}, ${p.city}`).catch(() => null);
  if (!at) at = await geocode(p.city).catch(() => null);
  const lat = at?.lat ?? VENUE.lat;
  const lon = at?.lon ?? VENUE.lon;
  writeEvent({
    campaignId,
    agent: "planner",
    type: "geocode",
    summary: at ? `Area: ${p.area}, ${p.city} (${lat.toFixed(4)}, ${lon.toFixed(4)})` : `Couldn't place "${p.area}"; searching around the venue`,
  });
  setCampaign(campaignId, { lat, lon, status: "discovering" });
  enqueue("discover", `discover:${campaignId}`, { campaignId }, { campaignId, priority: 10, maxAttempts: 2 });
}

export async function handleDiscover(campaignId: number) {
  const c = campaign(campaignId);
  const keywords = JSON.parse(c.keywordsJson ?? "[]") as string[];
  const q = { keywords, lat: c.lat ?? VENUE.lat, lon: c.lon ?? VENUE.lon, depth: 1 };

  // One kit job per search, one after another: fast mode returns no category, so each search's
  // business type becomes the category (rivals are then compared like with like).
  const searchAll = async (radiusM: number) => {
    const out: Place[] = [];
    for (const k of keywords) {
      writeEvent({ campaignId, agent: "discovery", type: "search", summary: `Searching Google Maps via the kit (fast mode): ${k}` });
      const cat = k.split(/\s+(?:in|near)\s+/i)[0].trim().toLowerCase();
      const found = await kit.search({ ...q, keywords: [k], radiusM });
      out.push(...found.map((p) => ({ ...p, category: p.category && p.category !== cat ? p.category : cat })));
    }
    return out;
  };
  let places: Place[] = await searchAll(3000);
  if (!places.length) {
    writeEvent({ campaignId, agent: "discovery", type: "widen", summary: "No results within 3 km; widening to 8 km once" });
    places = await searchAll(8000);
  }

  const seen = new Set<string>();
  const open = places.filter((p) => {
    if (seen.has(p.placeKey)) return false;
    seen.add(p.placeKey);
    return !/closed/i.test(p.status ?? "");
  });
  const skipped = places.length - open.length;
  const leads = open.slice(0, MAX_LEADS);

  if (!leads.length) {
    setCampaign(campaignId, { status: "no_results" });
    writeEvent({ campaignId, agent: "discovery", type: "no_results", summary: "No businesses found, even after widening the search. Try another area or client type." });
    return;
  }

  const rivals = rivalStats(leads.map((p) => ({ phone: p.phone, website: p.website, rating: p.rating, reviewCount: p.reviewCount })));
  const raw = getRaw();
  const insert = raw.prepare(
    `INSERT OR IGNORE INTO leads (campaign_id, place_key, name, category, rating, review_count, address, lat, lon, phone, website, channel, evidence_json, score, score_reason, stage, created_at)
     VALUES (@campaignId, @placeKey, @name, @category, @rating, @reviewCount, @address, @lat, @lon, @phone, @website, @channel, @evidence, @score, @reason, 'found', @now)`,
  );
  let added = 0;
  raw.transaction(() => {
    for (const p of leads) {
      const { score, reason } = opportunityScore(p, rivals);
      const evidence = {
        name: p.name,
        category: p.category,
        rating: p.rating,
        review_count: p.reviewCount,
        phone: p.phone,
        website: p.website,
        address: p.address,
      };
      added += insert.run({
        campaignId,
        placeKey: p.placeKey,
        name: p.name,
        category: p.category,
        rating: p.rating,
        reviewCount: p.reviewCount,
        address: p.address,
        lat: p.lat,
        lon: p.lon,
        phone: p.phone,
        website: p.website,
        channel: channelFor({ phone: p.phone }),
        evidence: JSON.stringify(evidence),
        score,
        reason,
        now: Date.now(),
      }).changes;
    }
  })();

  const found = (raw.prepare(`SELECT COUNT(*) n FROM leads WHERE campaign_id = ?`).get(campaignId) as { n: number }).n;
  setCampaign(campaignId, { found, status: "found" });
  writeEvent({
    campaignId,
    agent: "discovery",
    type: "found",
    summary: `Found ${added} businesses${skipped ? ` (skipped ${skipped} closed or duplicate)` : ""} · ${rivals.withWebsite} list a website · median rating ${rivals.medianRating?.toFixed(1) ?? "n/a"}`,
    data: { rivals },
  });
  queueTopLeads(campaignId);
}

// ---------------- Step 3: enrich + Idea Arena ----------------

/** How many leads get ideas automatically (top by score first); the rest on demand from the lead card. */
export const AUTO_ARENA_LEADS = 10;

function lead(id: number) {
  const l = getDb().select().from(schema.leads).where(eq(schema.leads.id, id)).get();
  if (!l) throw new Error(`lead ${id} not found`);
  return l;
}

function setLead(id: number, patch: Partial<typeof schema.leads.$inferInsert>) {
  getDb().update(schema.leads).set(patch).where(eq(schema.leads.id, id)).run();
}

/** Enrich every lead (no tokens); the top N by score, plus any lead with a usable email, go on to the Arena. */
export function queueTopLeads(campaignId: number, n = AUTO_ARENA_LEADS) {
  const rows = getRaw()
    .prepare(`SELECT id FROM leads WHERE campaign_id = ? ORDER BY score DESC, id ASC`)
    .all(campaignId) as { id: number }[];
  rows.forEach((r, rank) =>
    enqueue("enrich", `enrich:${r.id}`, { leadId: r.id, arena: rank < n }, { campaignId, leadId: r.id, priority: 12 }),
  );
}

export async function handleEnrich(leadId: number, _priority = 50, arena = true) {
  const priority = 20 + (getRaw().prepare(`SELECT COUNT(*) n FROM leads WHERE campaign_id = (SELECT campaign_id FROM leads WHERE id = ?) AND score > (SELECT score FROM leads WHERE id = ?)`).get(leadId, leadId) as { n: number }).n;
  const l = lead(leadId);
  const raw = getRaw();
  const hosts = raw.prepare(`SELECT website FROM leads WHERE campaign_id = ? AND website IS NOT NULL`).all(l.campaignId) as { website: string }[];
  const counts = new Map<string, number>();
  for (const h of hosts.map((x) => hostOf(x.website)).filter((h): h is string => !!h)) counts.set(h, (counts.get(h) ?? 0) + 1);
  const shared = new Set([...counts].filter(([, n]) => n > 1).map(([h]) => h));
  const kind = websiteKind(l.website, shared);

  let site: SiteFacts | null = null;
  if (l.website && (kind === "own" || kind === "chain" || kind === "linktree")) site = await readWebsite(l.website);
  const emailFromSite = site?.emails ?? [];
  const { email, status } = classifyEmails(emailFromSite, { url: l.website, kind });

  const ev = JSON.parse(l.evidenceJson ?? "{}");
  ev.website_kind = kind;
  ev.site = site ? { ok: site.ok, error: site.error, booking: site.booking, whatsapp: site.whatsapp, instagram: site.instagram, facebook: site.facebook, menu: site.menu, text: site.text?.slice(0, 600) } : null;
  const s = opportunityScore(
    { phone: l.phone, website: l.website, websiteKind: kind, email: status === "usable" ? email : null, rating: l.rating, reviewCount: l.reviewCount },
    rivalStats([]),
  );
  setLead(leadId, {
    websiteKind: kind,
    email,
    emailStatus: status,
    channel: channelFor({ email, emailStatus: status, phone: l.phone }),
    evidenceJson: JSON.stringify(ev),
    score: Math.max(l.score ?? 0, s.score),
  });

  const bits = [
    !l.website ? "no website (that's evidence)" : `website: ${kind}${site && !site.ok ? ` (couldn't load: ${site.error})` : ""}`,
    site?.booking ? "has a booking link" : site?.ok ? "no booking link" : null,
    site?.whatsapp ? "WhatsApp link" : null,
    site?.instagram || kind === "instagram" ? "Instagram" : null,
    status === "usable" ? `usable email ${email}` : status === "other_branch" ? "email belongs to another branch: not used" : status === "corporate" ? "corporate email: not used" : "no email",
  ].filter(Boolean);
  writeEvent({ campaignId: l.campaignId, leadId, agent: "enrich", type: "enriched", summary: `Enrich: ${bits.join(" · ")}` });
  // Leads we can actually email always get ideas, ahead of the rest.
  if (arena || status === "usable")
    enqueue("arena", `arena:${leadId}`, { leadId }, { campaignId: l.campaignId, leadId, priority: status === "usable" ? 15 : priority, maxAttempts: 2 });
}

function leadFacts(r: typeof schema.leads.$inferSelect): LeadFacts {
  const ev = JSON.parse(r.evidenceJson ?? "{}");
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    rating: r.rating,
    reviewCount: r.reviewCount,
    phone: r.phone,
    website: r.website,
    websiteKind: r.websiteKind,
    email: r.email,
    emailStatus: r.emailStatus,
    lat: r.lat,
    lon: r.lon,
    site: ev.site ?? null,
  };
}

export async function handleArena(leadId: number) {
  const l = lead(leadId);
  const c = campaign(l.campaignId);
  const db = getDb();
  const all = db.select().from(schema.leads).where(eq(schema.leads.campaignId, l.campaignId)).all();
  const evidence = buildEvidence(leadFacts(l), all.map(leadFacts));
  const env = getEnv();
  const optOut = getSetting("opt_out_text") ?? "Reply STOP and I won't write again.";
  const ctx: ArenaCtx = { llm, leadId, campaignId: l.campaignId, service: c.service, language: c.language, senderName: env.SENDER_NAME, optOut, evidence };
  const E = (agent: Parameters<typeof writeEvent>[0]["agent"], type: string, summary: string, data?: unknown) =>
    writeEvent({ campaignId: l.campaignId, leadId, agent, type, summary, data });

  // Idempotent rerun: clear this lead's previous arena output.
  getRaw().prepare(`DELETE FROM ideas WHERE lead_id = ?`).run(leadId);
  getRaw().prepare(`DELETE FROM messages WHERE lead_id = ? AND status = 'draft'`).run(leadId);
  // The per-lead budget applies to each Arena run; the campaign's cost meter keeps the running total.
  setLead(leadId, { stage: "found", needsReview: false, tokensIn: 0, tokensOut: 0, costUsd: 0 });

  // 1. Strategist (+ at most one retry if every idea is rejected as generic).
  let s = await strategist(ctx);
  E("strategist", "ideas", `Strategist: ${s.output.ideas.length} ideas (${s.model})`, { ideas: s.output.ideas.map((i) => i.title) });
  let cr = await critic(ctx, s.output.ideas);
  let judged = applyCriticRules(s.output.ideas, expandScores(cr.output));
  if (!judged.some((j) => j.keep)) {
    E("critic", "retry", "Critic: every idea was generic; asking the Strategist again");
    s = await strategist(ctx, judged.map((j) => j.idea.title));
    cr = await critic(ctx, s.output.ideas);
    judged = applyCriticRules(s.output.ideas, expandScores(cr.output));
  }
  const rejected = judged.filter((j) => !j.keep);
  const kept = judged.filter((j) => j.keep);
  E("critic", "verdicts", `Critic: kept ${kept.length}, rejected ${rejected.length}${rejected[0] ? ` (e.g. "${rejected[0].idea.title}": ${rejected[0].reason})` : ""}`);
  getRaw().prepare(`UPDATE campaigns SET ideas_rejected = ideas_rejected + ? WHERE id = ?`).run(rejected.length, l.campaignId);

  const ideaIds = new Map<number, number>();
  for (const j of judged) {
    const row = db
      .insert(schema.ideas)
      .values({
        leadId,
        idx: j.idx,
        title: j.idea.title,
        pitchLine: j.idea.customer_gets,
        howServiceDelivers: j.idea.how_service_delivers,
        evidenceKey: j.idea.builds_on,
        scoresJson: j.score ? JSON.stringify({ ...j.score, total: j.total }) : null,
        verdict: j.keep ? "kept" : "rejected",
        rejectReason: j.keep ? null : j.reason,
        model: s.model,
      })
      .returning({ id: schema.ideas.id })
      .get();
    ideaIds.set(j.idx, row.id);
  }
  if (!kept.length) {
    setLead(leadId, { needsReview: true, stage: "ready" });
    E("critic", "no_ideas", "No idea passed the Critic: needs your review");
    return;
  }

  // 2. Best two → Owner Twin reads both pitches.
  const bestIdx = cr.output.best.filter((i) => kept.some((k) => k.idx === i));
  const best = (bestIdx.length ? bestIdx.map((i) => kept.find((k) => k.idx === i)!) : [...kept].sort((a, b) => b.total - a.total)).slice(0, 2);
  const tw = await ownerTwin(ctx, best.map((b) => ({ idx: b.idx, pitch: `${b.idea.title}: ${b.idea.customer_gets}` })));
  for (const v of tw.output.verdicts) {
    const id = ideaIds.get(v.idx);
    if (id) db.update(schema.ideas).set({ twinVerdictJson: JSON.stringify({ first: v }) }).where(eq(schema.ideas.id, id)).run();
  }
  const verdictFor = (idx: number): TwinVerdict | null => tw.output.verdicts.find((v) => v.idx === idx) ?? null;
  const chosen = best.find((b) => verdictFor(b.idx)?.would_reply === "yes") ?? best[0];
  const firstVerdict = verdictFor(chosen.idx);
  E("twin", "verdict", `Simulated owner: ${firstVerdict?.would_reply === "yes" ? "would reply" : "wouldn't reply"} · "${firstVerdict?.objection ?? "no objection"}"`, tw.output);

  // 3. Composer writes the message, answering the objection (the rewrite).
  const cp = await composer(ctx, chosen.idea, firstVerdict);
  const allowed = allowedNumbers(evidence);
  const trimmed = trimWords(cp.output.body.replace(new RegExp(optOut.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), ""), 90);
  const clean = sanitizeBody(trimmed);
  const checked = claimCheck(clean.body, allowed, optOut);
  checked.cut.push(...clean.cut);
  let body = ensureOptOut(checked.body, optOut);
  try {
    const mc = await modelClaimCheck(ctx, body);
    // Cut whole sentences only (the model may quote a fragment), never the opt-out line.
    const flagged = mc.output.cut_sentences.map((c) => c.trim().toLowerCase()).filter((c) => c.length > 8 && !/stop/.test(c));
    const sentences = splitSentences(body.replace(optOut, ""));
    const cuts = sentences.filter((sen) => flagged.some((f) => sen.toLowerCase().includes(f) || f.includes(sen.toLowerCase())));
    if (cuts.length) {
      body = ensureOptOut(sentences.filter((sen) => !cuts.includes(sen)).join(" "), optOut);
      checked.cut.push(...cuts);
    }
  } catch (e) {
    E("claimcheck", "skipped", `Model claim check skipped: ${e instanceof Error ? e.message.slice(0, 80) : "error"} (code check still applied)`);
  }
  const voice = stripVoiceScript(cp.output.voice_script, l.name);
  E("composer", "draft", `Composer: ${wordCount(body)} words · ${cp.output.principles.length} principles${checked.cut.length ? ` · claim check cut ${checked.cut.length} sentence(s)` : " · claim check passed"}`, { cut: checked.cut });
  if (voice.stripped.length) E("composer", "voice_strip", `Voice script: stripped ${voice.stripped.length} sentence(s) with Maps data`, voice.stripped);

  // 4. Twin reads the final message once more.
  const tw2 = await ownerTwin(ctx, [{ idx: chosen.idx, pitch: body }]);
  const finalVerdict = tw2.output.verdicts[0] ?? null;
  const chosenId = ideaIds.get(chosen.idx)!;
  db.update(schema.ideas)
    .set({ verdict: "chosen", twinVerdictJson: JSON.stringify({ first: firstVerdict, final: finalVerdict }) })
    .where(eq(schema.ideas.id, chosenId))
    .run();
  // Too little left after the guards (the idea itself was cut): a human should look first.
  const tooThin = wordCount(body.replace(optOut, "")) < 30;
  const needsReview = finalVerdict?.would_reply !== "yes" || tooThin;
  if (tooThin) E("claimcheck", "thin", "Guards cut too much of the message: needs your review");
  E("twin", "final", `Simulated owner after rewrite: ${needsReview ? `still no ("${finalVerdict?.objection ?? ""}"): needs your review` : "would reply"}`, finalVerdict);

  const fresh = lead(leadId);
  db.insert(schema.messages)
    .values({
      leadId,
      direction: "out",
      kind: "initial",
      channel: fresh.channel === "email" ? "email" : "whatsapp",
      toAddr: fresh.channel === "email" ? fresh.email : fresh.phone,
      subject: genericPhrase(cp.output.subject) || /\b(boost|grow|increase)\b/i.test(cp.output.subject) ? `An idea for ${l.name}` : cp.output.subject,
      body,
      bodyBefore: `${chosen.idea.title}: ${chosen.idea.customer_gets}`,
      whyNeeded: cp.output.why_needed,
      principlesJson: JSON.stringify(cp.output.principles),
      voiceScript: voice.script,
      status: "draft",
    })
    .run();
  setLead(leadId, { stage: "ready", needsReview });
  const t = lead(leadId);
  E("system", "ready", `Pitch ready · ${t.tokensIn + t.tokensOut} tokens · $${t.costUsd.toFixed(4)}`);
  if (t.channel === "email" && !needsReview && getSetting("auto_send") === "on") requestSend(leadId, { auto: true });
}
// ---------------- Demo website per lead ----------------

export async function handleBuildPage(leadId: number) {
  const l = lead(leadId);
  const c = campaign(l.campaignId);
  const db = getDb();
  const idea = db.select().from(schema.ideas).where(eq(schema.ideas.leadId, leadId)).all().find((i) => i.verdict === "chosen");
  if (!idea) throw new Error("no chosen idea yet");
  const all = db.select().from(schema.leads).where(eq(schema.leads.campaignId, l.campaignId)).all();
  const evidence = buildEvidence(leadFacts(l), all.map(leadFacts));
  const r = await writePage(llm, { evidence, ideaTitle: idea.title, idea: idea.pitchLine, how: idea.howServiceDelivers ?? "", service: c.service, campaignId: c.id });
  setLead(leadId, { pageJson: JSON.stringify({ ...r.output, builtAt: Date.now(), model: r.model }) });
  writeEvent({ campaignId: l.campaignId, leadId, agent: "composer", type: "page", summary: `Built a demo website for ${l.name}: "${r.output.headline}"` });
}
