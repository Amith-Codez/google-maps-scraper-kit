// OpenStreetMap Nominatim geocoding: free, 1 request per second, needs a User-Agent.
let last = 0;

export async function geocode(q: string): Promise<{ lat: number; lon: number; label: string } | null> {
  const wait = last + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Pitchwala/1.0 (local lead finder; contact via repo)" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const rows = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  if (!rows.length) return null;
  return { lat: Number(rows[0].lat), lon: Number(rows[0].lon), label: rows[0].display_name };
}

/** Haversine distance in metres. */
export function distanceM(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
