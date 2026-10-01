/**
 * Live discovery: Google Places (New) + Ticketmaster Discovery when keys exist.
 * Always merges fixture seed for Local Life editorial coverage.
 * SAMPLE fixture ratings are NEVER presented as live public stars when live mode is on.
 */
import { FixtureProvider, rowToItem } from "./fixture";
import { prisma } from "../db";
import { selectCandidates } from "../pipeline";
import type { Item, SearchQuery } from "../types";
import type { DiscoveryProvider } from "./types";

type CacheEntry = { at: number; items: Item[] };
const memCache = new Map<string, CacheEntry>();
const TTL_MS = 30 * 60_000;

function hasGoogle() {
  return !!process.env.GOOGLE_PLACES_API_KEY;
}
function hasTm() {
  return !!process.env.TICKETMASTER_API_KEY;
}

function geohash5(lat: number, lng: number): string {
  // coarse bucket (~5km) — not a full geohash impl, enough for cache keying
  return `${lat.toFixed(1)}_${lng.toFixed(1)}`;
}

export function discoveryCacheKey(q: SearchQuery, kind: "places" | "events"): string {
  return [
    kind,
    geohash5(q.origin.lat, q.origin.lng),
    q.radiusMiles,
    [...q.categories].sort().join(","),
    q.familyLens ? "1" : "0",
  ].join("|");
}

function stripSampleAsLive(item: Item): Item {
  // Honesty: SAMPLE / seed demo stars must not look like live Google/TM ratings.
  if (item.sample || item.source === "seed" || item.source === "fixture") {
    return {
      ...item,
      publicRating: null,
      publicReviewCount: null,
      sample: item.sample,
      source: item.source === "seed" ? "seed" : item.source,
    };
  }
  return item;
}

async function fetchGooglePlaces(q: SearchQuery): Promise<Item[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return [];
  const cacheKey = discoveryCacheKey(q, "places") + "|g";
  const hit = memCache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.items;

  const body = {
    locationRestriction: {
      circle: {
        center: { latitude: q.origin.lat, longitude: q.origin.lng },
        radius: Math.min(q.radiusMiles, 30) * 1609.34,
      },
    },
    maxResultCount: 12,
    includedTypes: ["park", "museum", "library", "restaurant", "cafe"],
  };
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.websiteUri",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn("Google Places error", res.status);
      return [];
    }
    const data = (await res.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
        rating?: number;
        userRatingCount?: number;
        types?: string[];
        websiteUri?: string;
      }>;
    };
    const items: Item[] = (data.places || []).map((p, idx) => {
      const id = `gplace-${(p.id || String(idx)).replace(/\W+/g, "").slice(0, 40)}`;
      return {
        id,
        name: p.displayName?.text || "Place",
        kind: "place" as const,
        categories: ["food_drink"],
        why: "Live Google Places result — verify hours before you go.",
        ageFit: null,
        stroller: null,
        driveMin: null,
        costVibe: "Verify",
        priceLevel: null,
        whenHours: "Hours from Google — verify",
        startsAt: null,
        endsAt: null,
        address: p.formattedAddress || "",
        lat: p.location?.latitude ?? q.origin.lat,
        lng: p.location?.longitude ?? q.origin.lng,
        link: p.websiteUri || "",
        status: "verify" as const,
        publicRating: p.rating ?? null,
        publicReviewCount: p.userRatingCount ?? null,
        communityRating: null,
        communityReviewCount: 0,
        editorialRole: null,
        weatherNote: null,
        source: "google_places",
        indoorBackup: false,
        patio: false,
        sample: false,
        imageUrl: "/thumbs/default.svg",
        campusId: null,
        gotchas: [],
        phone: null,
        visitMinutes: 75,
        amenities: {},
        friendsWent: 0,
      };
    });
    memCache.set(cacheKey, { at: Date.now(), items });
    return items;
  } catch (err) {
    console.warn("Google Places fetch failed", err);
    return [];
  }
}

async function fetchTicketmaster(q: SearchQuery): Promise<Item[]> {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) return [];
  const cacheKey = discoveryCacheKey(q, "events") + "|tm";
  const hit = memCache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.items;

  const params = new URLSearchParams({
    apikey: key,
    latlong: `${q.origin.lat},${q.origin.lng}`,
    radius: String(Math.min(q.radiusMiles, 60)),
    unit: "miles",
    size: "15",
    sort: "date,asc",
  });
  try {
    const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn("Ticketmaster error", res.status);
      return [];
    }
    const data = (await res.json()) as {
      _embedded?: {
        events?: Array<{
          id?: string;
          name?: string;
          url?: string;
          dates?: { start?: { dateTime?: string; localDate?: string }; end?: { dateTime?: string } };
          _embedded?: {
            venues?: Array<{
              name?: string;
              address?: { line1?: string };
              city?: { name?: string };
              state?: { stateCode?: string };
              location?: { latitude?: string; longitude?: string };
            }>;
          };
        }>;
      };
    };
    const items: Item[] = (data._embedded?.events || []).map((ev) => {
      const venue = ev._embedded?.venues?.[0];
      const lat = Number(venue?.location?.latitude);
      const lng = Number(venue?.location?.longitude);
      const addr = [venue?.address?.line1, venue?.city?.name, venue?.state?.stateCode].filter(Boolean).join(", ");
      const start = ev.dates?.start?.dateTime || (ev.dates?.start?.localDate ? `${ev.dates.start.localDate}T16:00:00Z` : null);
      const end = ev.dates?.end?.dateTime || null;
      return {
        id: `tm-${(ev.id || ev.name || "ev").replace(/\W+/g, "").slice(0, 40)}`,
        name: ev.name || "Event",
        kind: "event" as const,
        categories: ["live_music"],
        why: "Live Ticketmaster listing — tickets and ages vary; confirm before buying.",
        ageFit: null,
        stroller: null,
        driveMin: null,
        costVibe: "Ticketed",
        priceLevel: 3,
        whenHours: start ? new Date(start).toLocaleString("en-US", { timeZone: "America/New_York" }) : "See Ticketmaster",
        startsAt: start,
        endsAt: end,
        address: addr || venue?.name || "",
        lat: Number.isFinite(lat) ? lat : q.origin.lat,
        lng: Number.isFinite(lng) ? lng : q.origin.lng,
        link: ev.url || "",
        status: "active" as const,
        publicRating: null,
        publicReviewCount: null,
        communityRating: null,
        communityReviewCount: 0,
        editorialRole: null,
        weatherNote: null,
        source: "ticketmaster",
        indoorBackup: false,
        patio: false,
        sample: false,
        imageUrl: "/thumbs/default.svg",
        campusId: null,
        gotchas: ["ticketed-online-only"],
        phone: null,
        visitMinutes: 150,
        amenities: { parking: true, bathrooms: true },
        friendsWent: 0,
      };
    });
    memCache.set(cacheKey, { at: Date.now(), items });
    return items;
  } catch (err) {
    console.warn("Ticketmaster fetch failed", err);
    return [];
  }
}

export class LiveDiscoveryProvider extends FixtureProvider implements DiscoveryProvider {
  private async fixtureItems(): Promise<Item[]> {
    const rows = await prisma.place.findMany();
    // Live mode: strip SAMPLE/demo public stars so they never look like live ratings.
    return rows.map((r) => stripSampleAsLive(rowToItem(r)));
  }

  async searchPlaces(q: SearchQuery): Promise<Item[]> {
    const [fixtures, live] = await Promise.all([this.fixtureItems(), hasGoogle() ? fetchGooglePlaces(q) : Promise.resolve([])]);
    const places = fixtures.filter((i) => i.kind === "place");
    const merged = dedupe([...places, ...live]);
    return selectCandidates(merged, q.origin, {
      radiusMiles: q.radiusMiles,
      categories: q.categories,
      now: q.now ?? new Date(),
      under90: q.under90,
      amenities: q.amenities,
    });
  }

  async searchEvents(q: SearchQuery): Promise<Item[]> {
    const [fixtures, live] = await Promise.all([this.fixtureItems(), hasTm() ? fetchTicketmaster(q) : Promise.resolve([])]);
    const events = fixtures.filter((i) => i.kind === "event");
    const merged = dedupe([...events, ...live]);
    return selectCandidates(merged, q.origin, {
      radiusMiles: q.radiusMiles,
      categories: q.categories,
      now: q.now ?? new Date(),
      under90: q.under90,
      amenities: q.amenities,
    });
  }

  async getPlace(id: string): Promise<Item | null> {
    if (id.startsWith("gplace-") || id.startsWith("tm-")) {
      // Live-only ids are not persisted; return a soft miss so UI 404s honestly.
      return null;
    }
    const item = await super.getPlace(id);
    return item ? stripSampleAsLive(item) : null;
  }
}

function dedupe(items: Item[]): Item[] {
  const map = new Map<string, Item>();
  for (const item of items) map.set(item.id, item);
  return [...map.values()];
}
