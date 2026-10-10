# Pitchwala · Two sentences in. Clients out.

**An AI sales partner for student freelancers.** You type two sentences (what you sell, who you sell to).
Pitchwala finds real local businesses with the Google Maps Scraper Kit, studies each one against its nearby
rivals, invents one specific idea that business would actually want, tests the pitch on a simulated owner,
builds a demo website of the idea, reaches out by email or a voice note in desi Hindi, Telugu or English,
answers replies, and pings your phone the moment someone is interested.

Built in 6 hours at Build in Café (10 Oct 2026) for Problem 2, *The Marketing Agent*.

## Why

Student freelancers can do the work but can't land a first paying client. Local shops are the obvious clients, and
they ignore generic pitches. We measured it near the venue: of 39 cafés and salons within 2.2 km, **34 list a phone
but only 3 have an email you can actually use**. So an email-only agent can't reach most of them; Pitchwala also
makes WhatsApp voice notes in the owner's language, which the freelancer forwards from their own phone.

## What it does (the whole loop, all real data)

| Step | What happens |
|---|---|
| 1. Two inputs | A **Planner** agent turns your sentences into Maps searches + an area (understands Hindi/Telugu input, ignores prompt injection, flags a weak fit and sends nothing). |
| 2. Find | The kit's engine (fast mode, one search per business type) → leads saved, de-duplicated, closed places skipped, an **opportunity score** with a one-line reason. |
| 3. Understand | Reads each website (10 s timeout): booking / WhatsApp / Instagram links, menus, emails with a **branch check** (never a chain's corporate desk). Computes the **top 3 nearby rivals and why they win**, the **gaps** and the **issues**. |
| 4. Idea Arena | **Strategist** proposes 8 ideas, each tied to a real gap. **Critic** scores them and rejects anything generic ("build you a website", "SEO", "online presence"…). **Simulated owner** objects. **Writer** answers the objection. Fact check: every number must exist in the evidence; money talk, insults and generic phrases are cut in code. |
| 5. Demo website | "We built it before we asked": a one-page site for that business (real name, rating, location, the idea working, why it matters), with a **Talk to Pitchwala** voice button. |
| 6. Outreach | Email through an outbox with a send gate; phone-only leads get a **voice note** (ElevenLabs, desi Hindi / Telugu / English) + a one-tap WhatsApp draft sent to your Telegram. Never auto-sends WhatsApp. |
| 7. Replies | IMAP IDLE watcher (only replies to our messages) → **Triage** agent → answers in the thread (never invents prices or dates), suppresses STOP forever, apologises once to angry replies, ignores out-of-office, marks bounces. |
| 8. Notify | Telegram ping with the reply **read aloud** and a suggested next step; confetti in the app. Email fallback if Telegram fails. A follow-up is scheduled and cancelled the moment they reply. |

## Architecture

```
 Browser (Next.js UI, polls every 2 s)
   │
   ▼
 WEB · Next.js 16 :3000 ── writes jobs ──►  SQLite (Drizzle, WAL)  ◄── claims jobs ── WORKER · Node (tsx)
   passcode login, API routes                campaigns · leads · ideas         plan → discover → enrich → Arena
   demo websites /p/:id                      messages · jobs · events          → compose → gate → send
                                             suppression · settings            IMAP IDLE → triage → reply/notify
                                                                                 │
           ports & adapters ─────────────────────────────────────────────────────┤
           Discovery: kit engine (→ Places API later) · LLM: Gemini / Groq / OpenRouter / Ollama
           Mailer: Gmail SMTP + IMAP · Notifier: Telegram · Voice: ElevenLabs TTS + Agents widget
```

- **Two processes, one codebase.** The web stays fast; slow work (scraping, model calls, inbox) runs in the worker.
- **Durable job queue in SQLite** with idempotency keys, retries, `run_after`; jobs left running by a crash are re-queued on start.
- **Outbox pattern.** A message is written first, then a `send` job delivers it; the gate (opt-out line, daily cap, never-contact-again list, once per lead, branch-checked email, human review) runs **inside the transaction that claims the send**. A crash mid-send is never retried, so nothing is sent twice.
- **Ports and adapters.** `src/lib/core/` (arena, gate, guards, triage, evidence) never imports a vendor SDK; each outside service is one adapter in `src/lib/adapters/`.
- **Model independence.** One router (`src/lib/llm.ts`) over OpenAI-compatible endpoints: Zod-validated structured output, one retry on broken JSON, then the fallback chain. Switch the provider live in Settings; the next agent call uses it.
- **Token budget enforced in code**: 6,000 input + 2,000 output tokens per lead across the Arena's calls; prompts are truncated to fit, and a lead over budget stops instead of overspending. No images are ever sent to a model.
- **Observable.** Every job writes events; each lead shows its agent trace, tokens and cost.

## Run it

```bash
cp .env.example .env.local      # fill in the keys (the app refuses to start and names any missing one)
npm install
npm run dev                     # web on http://localhost:3000 + the worker
```
The kit engine must be running: `cd .. && docker compose up -d` (it listens on 127.0.0.1:8080 only).

### One command with Docker
```bash
docker compose up --build       # scraper (internal only) + web (:3000) + worker, DB on a volume
```

### Deploy
Single-tenant by design: each freelancer runs their own instance with their own Gmail and data. The same compose file
runs on any VPS or Azure Container Apps / App Service for Containers (one image, two commands). Put HTTPS in front,
set `COOKIE_SECURE=1`, keep the scraper on the internal network. Drizzle keeps the schema portable: SQLite today,
Postgres by swapping the driver.

## Settings (`.env.example`)
`SCRAPER_BASE_URL` · `GEMINI_API_KEY` · `GROQ_API_KEY` · `OPENROUTER_API_KEY` · `OLLAMA_BASE_URL` · `GMAIL_ADDRESS` ·
`GMAIL_APP_PASSWORD` · `SENDER_NAME` · `TELEGRAM_BOT_TOKEN` · `TELEGRAM_CHAT_ID` (optional: found from the "hi" you send
your bot) · `ELEVENLABS_API_KEY` · `ELEVENLABS_VOICE_ID` · `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` · `DAILY_CAP` · `FOLLOW_UP_DAYS`
· `APP_PASSCODE` · `DATABASE_PATH`. Provider, fallback, cap, opt-out text, voice and voice-agent IDs are also editable live in Settings.

## Safety rules (enforced in code, tested)
- Opt-out line in every message; **STOP = never contacted again**, in any campaign.
- Daily cap (default 10), once per lead, previews never counted; over the cap waits for tomorrow.
- Only a business's **own** email (branch / corporate check); bounces marked invalid, no retry.
- Pitches the simulated owner still rejects are **held for your review**.
- No WhatsApp automation: voice note + draft go to you; you send from your phone.
- Voice notes and the voice agent never get the business name, ratings or other Maps data, and say they're AI.
- Replies are treated as data: instructions inside them are never followed.
- Scraping Maps is against Google's Terms of Service (the kit's README says so). The kit sits behind a
  `DiscoveryProvider` interface so the official Places API can replace it in production.

## Tests
```bash
npx vitest run      # generic filter, critic rules, claim check, sanitizer, voice stripping, send gate,
                    # email branch check, website kinds, scoring, idempotent queue, crash recovery, follow-up cancel
```

## Demo (3 minutes)
1. Type two sentences (e.g. "I build websites for local businesses: menus, pre-orders and booking" → "Cafés and restaurants in Vanasthalipuram, Hyderabad"). Leads drop onto the map.
2. Open a lead: the **AI team chat** (Strategist, Critic, simulated owner, Writer), the rival analysis, the "why they need it" line.
3. **Open their website**: the demo site built for that business.
4. Make a **desi Hindi voice note**; it arrives on Telegram with the WhatsApp draft.
5. Switch the model in Settings (Gemini → Groq) and rerun one lead.
6. "Send a preview to…" a judge's inbox; they reply from their phone → the agent answers in the thread → the phone pings and reads the reply aloud.
