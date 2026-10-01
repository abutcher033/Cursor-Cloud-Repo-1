import { extractZip } from "./geocode-table";
import { knownCategories } from "./categories";
import { normalizeRadius } from "./pipeline";

/** Seed catalog home (Finksburg). driveMin values are typical drive from here. */
export const SEED_HOME = { lat: 39.4959, lng: -76.8946, zip: "21048" } as const;

/**
 * Bare zip/address for the `near` query param.
 * Pretty geocode labels ("21048 · Finksburg, MD") are display-only.
 */
export function nearQuery(labelOrQuery: string | null | undefined): string {
  const s = String(labelOrQuery || "").trim().replace(/\s+/g, " ");
  if (!s) return "";
  const zip = extractZip(s);
  if (zip) return zip;
  const mid = s.indexOf(" · ");
  if (mid > 0) return s.slice(0, mid).trim().slice(0, 120);
  return s.slice(0, 120);
}

export function isSeedOrigin(lat: number, lng: number): boolean {
  return Math.abs(lat - SEED_HOME.lat) < 0.02 && Math.abs(lng - SEED_HOME.lng) < 0.02;
}

export type LastSearch = {
  near: string;
  radius: number;
  categories: string[];
  familyLens: boolean;
  weatherPoor: boolean;
  under90?: boolean;
  amenities?: string[];
};

export const LAST_SEARCH_COOKIE = "lf_last";
export const LAST_SEARCH_STORAGE_KEY = "lf_last_search";

export function serializeLastSearch(s: LastSearch): string {
  return JSON.stringify({
    near: nearQuery(s.near) || "21048",
    radius: normalizeRadius(s.radius),
    categories: knownCategories(s.categories),
    familyLens: !!s.familyLens,
    weatherPoor: !!s.weatherPoor,
    under90: !!s.under90,
    amenities: Array.isArray(s.amenities) ? s.amenities : [],
  });
}

export function readLastSearch(raw: string | undefined | null): LastSearch | null {
  if (!raw) return null;
  try {
    const decoded = raw.includes("%") ? decodeURIComponent(raw) : raw;
    const j = JSON.parse(decoded) as Partial<LastSearch>;
    const near = nearQuery(j.near || "");
    if (!near) return null;
    return {
      near,
      radius: normalizeRadius(Number(j.radius ?? 25)),
      categories: knownCategories(Array.isArray(j.categories) ? j.categories : []),
      familyLens: !!j.familyLens,
      weatherPoor: !!j.weatherPoor,
      under90: !!j.under90,
      amenities: Array.isArray(j.amenities) ? j.amenities.map(String) : [],
    };
  } catch {
    return null;
  }
}

export function lastSearchToQs(s: LastSearch): string {
  const qs = new URLSearchParams();
  qs.set("near", nearQuery(s.near) || s.near);
  qs.set("radius", String(normalizeRadius(s.radius)));
  if (s.familyLens) qs.set("lens", "1");
  if (s.weatherPoor) qs.set("weather", "poor");
  if (s.under90) qs.set("under90", "1");
  for (const c of knownCategories(s.categories)) qs.append("categories", c);
  for (const a of s.amenities || []) qs.append("amenity", a);
  return qs.toString();
}

export function cookieHeaderForLastSearch(s: LastSearch): string {
  return `${LAST_SEARCH_COOKIE}=${encodeURIComponent(serializeLastSearch(s))}; Path=/; Max-Age=2592000; SameSite=Lax`;
}
