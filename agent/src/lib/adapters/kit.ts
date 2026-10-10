import { getEnv } from "../env";
import { log } from "../log";
import type { DiscoveryProvider, HealthResult, Place } from "../ports";

// DiscoveryProvider backed by the kit's engine (gosom/google-maps-scraper, localhost only).
// Fast mode first: in our tests detail mode returned blank rows; fast mode returned real names in < 40 s.

const base = () => getEnv().SCRAPER_BASE_URL.replace(/\/$/, "") + "/api/v1/jobs";

/** Minimal RFC 4180 CSV parser (quoted fields, "" escapes, newlines inside quotes). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  if (!header) return [];
  return body
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

const clean = (v: string | undefined) => {
  const s = (v ?? "").trim();
  return !s || s === "null" ? null : s;
};
const num = (v: string | undefined) => {
  const n = Number(clean(v));
  return Number.isFinite(n) && clean(v) !== null ? n : null;
};

export function rowToPlace(r: Record<string, string>, fallbackCategory: string | null): Place | null {
  const name = clean(r.title);
  if (!name) return null;
  const key = clean(r.data_id) ?? clean(r.place_id) ?? clean(r.cid) ?? `${name}|${clean(r.address) ?? ""}`.toLowerCase();
  return {
    placeKey: key,
    name,
    category: clean(r.category) ?? fallbackCategory,
    rating: num(r.review_rating),
    reviewCount: num(r.review_count),
    address: clean(r.address),
    lat: num(r.latitude),
    lon: num(r.longitude),
    phone: clean(r.phone),
    website: clean(r.website),
    status: clean(r.status),
    raw: { emails: clean(r.emails), open_hours: clean(r.open_hours), price_range: clean(r.price_range) },
  };
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export const kit: DiscoveryProvider = {
  name: "kit",
  async search({ keywords, lat, lon, radiusM, depth = 1, maxTimeS = 180 }) {
    const body = {
      name: `pitchwala-${Date.now()}`,
      keywords,
      lang: "en",
      zoom: 15,
      lat: String(lat),
      lon: String(lon),
      fast_mode: true,
      radius: radiusM,
      depth,
      email: false,
      max_time: maxTimeS,
    };
    const created = await fetch(base(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    if (!created.ok) throw new Error(`kit engine: create job HTTP ${created.status}`);
    const { id } = (await created.json()) as { id: string };
    log.info({ kitJob: id, keywords }, "kit job created");

    const deadline = Date.now() + (maxTimeS + 60) * 1000;
    let status = "";
    while (Date.now() < deadline) {
      await sleep(3000);
      const r = await fetch(`${base()}/${id}`, { signal: AbortSignal.timeout(15_000) });
      status = ((await r.json()) as { Status?: string }).Status ?? "";
      if (status === "ok" || status === "failed") break;
    }
    if (status !== "ok") throw new Error(`kit engine: job ${id} ended with status "${status || "timeout"}"`);

    const dl = await fetch(`${base()}/${id}/download`, { signal: AbortSignal.timeout(60_000) });
    if (!dl.ok) throw new Error(`kit engine: download HTTP ${dl.status}`);
    const rows = parseCsv(await dl.text());
    const fallbackCategory = keywords[0]?.split(/\s+in\s+/i)[0] ?? null;
    return rows.map((r) => rowToPlace(r, fallbackCategory)).filter((p): p is Place => p !== null);
  },
  async health(): Promise<HealthResult> {
    try {
      const r = await fetch(base(), { signal: AbortSignal.timeout(5000) });
      return r.ok ? { ok: true, detail: "engine up · fast mode" } : { ok: false, detail: `HTTP ${r.status}` };
    } catch {
      return { ok: false, detail: "engine not reachable (docker compose up -d)" };
    }
  },
};
