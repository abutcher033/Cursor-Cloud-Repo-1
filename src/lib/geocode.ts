import { extractZip, lookupAlias, lookupZip } from "./geocode-table";
import type { GeocodeHit, GeocodeMiss } from "./types";

export type CacheRow = {
  lat: number;
  lng: number;
  label: string;
  source: string;
  createdAt: number;
};

export type GeocodeDeps = {
  fetchImpl?: typeof fetch;
  readCache?: (key: string) => Promise<CacheRow | null>;
  writeCache?: (key: string, row: CacheRow) => Promise<void>;
  now?: number;
  timeoutMs?: number;
};

const CACHE_MS = 30 * 86_400_000;
let lastNominatim = 0;

export function normalizeQuery(input: string): string {
  return input.trim().replace(/\s+/g, " ").slice(0, 120);
}

function cacheKey(q: string): string {
  return q.toLowerCase();
}

/**
 * 1. Fresh server cache
 * 2. Known ZIP → fixture table (no network; works offline)
 * 3. Exact city alias
 * 4. Nominatim (cached)
 * 5. City word inside a longer address if the network failed
 */
export async function geocodeQuery(input: string, deps: GeocodeDeps = {}): Promise<GeocodeHit | GeocodeMiss> {
  const q = normalizeQuery(input);
  if (q.length < 3) {
    return { ok: false, message: "Enter a zip or address (at least 3 characters)." };
  }
  const key = cacheKey(q);
  const now = deps.now ?? Date.now();
  if (deps.readCache) {
    const hit = await deps.readCache(key);
    if (hit && now - hit.createdAt < CACHE_MS) {
      const source = hit.source === "nominatim" || hit.source === "fixture" ? hit.source : "cache";
      return { ok: true, lat: hit.lat, lng: hit.lng, label: hit.label, source: source === "nominatim" ? "cache" : "fixture" };
    }
  }

  const zip = extractZip(q);
  if (zip) {
    const row = lookupZip(zip);
    if (row) return { ok: true, ...row, source: "fixture" };
  }

  const exact = lookupAlias(q);
  if (exact && q.length <= exact.label.length + 8) {
    return { ok: true, ...exact, source: "fixture" };
  }

  const net = await nominatim(q, deps);
  if (net) {
    if (deps.writeCache) {
      await deps.writeCache(key, { ...net, source: "nominatim", createdAt: now });
    }
    return { ok: true, lat: net.lat, lng: net.lng, label: net.label, source: "nominatim" };
  }

  const loose = lookupAlias(q);
  if (loose) return { ok: true, ...loose, source: "fixture" };

  if (zip) {
    return {
      ok: false,
      message: `No offline match for ${zip}, and the geocoder didn’t answer. Try 21048, 21157, 21117, or 21093.`,
    };
  }
  return {
    ok: false,
    message: "We couldn’t place that. Try a zip like 21048 (Finksburg) or a city such as Westminster or Timonium.",
  };
}

async function nominatim(q: string, deps: GeocodeDeps): Promise<{ lat: number; lng: number; label: string } | null> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const wait = 1100 - (Date.now() - lastNominatim);
  if (wait > 0 && lastNominatim > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastNominatim = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "LocalLife/0.1 (local demo; educational Carroll County discovery)",
      },
      signal: AbortSignal.timeout(deps.timeoutMs ?? 2500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
    const row = data?.[0];
    if (!row?.lat || !row?.lon) return null;
    const lat = Number(row.lat);
    const lng = Number(row.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const label = (row.display_name || q).split(",").slice(0, 3).join(",").trim();
    return { lat, lng, label };
  } catch {
    return null;
  }
}
