/**
 * NWS point forecast when reachable; otherwise honest SAMPLE fallback.
 * Cache in-memory for a few minutes so browse stays snappy.
 */

export type WeatherSnapshot = {
  ok: boolean;
  source: "nws" | "sample" | "manual";
  poorOutdoor: boolean;
  note: string;
  precipChance: number | null;
  shortForecast: string | null;
};

type CacheEntry = { at: number; value: WeatherSnapshot };

const cache = new Map<string, CacheEntry>();
const TTL_MS = 15 * 60 * 1000;

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function sampleFallback(manualPoor: boolean): WeatherSnapshot {
  return {
    ok: false,
    source: manualPoor ? "manual" : "sample",
    poorOutdoor: manualPoor,
    note: manualPoor
      ? "Rainy-day boost is on (manual). NWS forecast unavailable — indoor picks ranked higher."
      : "SAMPLE weather (NWS unreachable). Mild early-fall placeholder. Check the Rainy-day box to boost indoor backups.",
    precipChance: null,
    shortForecast: null,
  };
}

function precipLooksPoor(chance: number | null, short: string | null): boolean {
  if (chance != null && chance >= 50) return true;
  if (short && /(rain|shower|storm|thunder|snow|sleet)/i.test(short)) return true;
  return false;
}

export async function fetchWeather(
  lat: number,
  lng: number,
  opts?: { manualPoor?: boolean; fetchImpl?: typeof fetch; now?: number },
): Promise<WeatherSnapshot> {
  const manualPoor = !!opts?.manualPoor;
  const key = cacheKey(lat, lng);
  const now = opts?.now ?? Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS && !manualPoor) {
    return hit.value;
  }

  const fetchImpl = opts?.fetchImpl ?? fetch;
  try {
    const pointsUrl = `https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`;
    const pointsRes = await fetchImpl(pointsUrl, {
      headers: {
        "User-Agent": "LocalLife/0.1 (demo; contact casey@locallife.app)",
        Accept: "application/geo+json",
      },
      signal: AbortSignal.timeout(4500),
    });
    if (!pointsRes.ok) throw new Error(`points ${pointsRes.status}`);
    const points = (await pointsRes.json()) as { properties?: { forecast?: string } };
    const forecastUrl = points.properties?.forecast;
    if (!forecastUrl) throw new Error("no forecast url");
    const fcRes = await fetchImpl(forecastUrl, {
      headers: {
        "User-Agent": "LocalLife/0.1 (demo; contact casey@locallife.app)",
        Accept: "application/geo+json",
      },
      signal: AbortSignal.timeout(4500),
    });
    if (!fcRes.ok) throw new Error(`forecast ${fcRes.status}`);
    const fc = (await fcRes.json()) as {
      properties?: { periods?: Array<{ name?: string; shortForecast?: string; probabilityOfPrecipitation?: { value: number | null } }> };
    };
    const period = fc.properties?.periods?.[0];
    const precip = period?.probabilityOfPrecipitation?.value ?? null;
    const short = period?.shortForecast ?? null;
    const autoPoor = precipLooksPoor(precip, short);
    const poorOutdoor = manualPoor || autoPoor;
    const note = period
      ? `NWS: ${period.name || "Now"} — ${short || "see forecast"}${precip != null ? ` · ${precip}% precip` : ""}${autoPoor && !manualPoor ? " · auto indoor boost" : ""}${manualPoor ? " · rainy-day box on" : ""}`
      : sampleFallback(manualPoor).note;
    const value: WeatherSnapshot = {
      ok: true,
      source: "nws",
      poorOutdoor,
      note,
      precipChance: precip,
      shortForecast: short,
    };
    cache.set(key, { at: now, value });
    return value;
  } catch {
    const value = sampleFallback(manualPoor);
    cache.set(key, { at: now, value });
    return value;
  }
}

export function __clearWeatherCache() {
  cache.clear();
}
