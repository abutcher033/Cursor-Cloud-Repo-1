import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { geocodeQuery, type CacheRow } from "../geocode";
import { selectCandidates } from "../pipeline";
import type { GeocodeHit, Item, SearchQuery } from "../types";
import { parseAmenities } from "../amenities";
import type { DiscoveryProvider } from "./types";

type PlaceRow = Prisma.PlaceGetPayload<Record<string, never>>;

export function rowToItem(row: PlaceRow): Item {
  let categories: string[] = [];
  try {
    const parsed = JSON.parse(row.categories);
    if (Array.isArray(parsed)) categories = parsed.map(String);
  } catch {
    categories = [];
  }
  return {
    id: row.id,
    name: row.name,
    kind: row.kind === "event" ? "event" : "place",
    categories,
    why: row.why,
    ageFit: row.ageFit,
    stroller: row.stroller,
    driveMin: row.driveMin,
    costVibe: row.costVibe,
    priceLevel: row.priceLevel,
    whenHours: row.whenHours,
    startsAt: row.startsAt ? row.startsAt.toISOString() : null,
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    link: row.link,
    status: row.status === "verify" || row.status === "retired" ? row.status : "active",
    publicRating: row.publicRating,
    publicReviewCount: row.publicReviewCount,
    communityRating: null,
    communityReviewCount: 0,
    editorialRole: row.editorialRole === "must_try" || row.editorialRole === "niche" ? row.editorialRole : null,
    weatherNote: row.weatherNote,
    source: row.source,
    indoorBackup: row.indoorBackup,
    patio: row.patio,
    sample: row.sample,
    imageUrl: row.imageUrl || "/thumbs/default.svg",
    campusId: row.campusId || null,
    gotchas: (() => {
      try {
        const g = JSON.parse(row.gotchas || "[]");
        return Array.isArray(g) ? g.map(String) : [];
      } catch {
        return [];
      }
    })(),
    phone: row.phone || null,
    visitMinutes: row.visitMinutes ?? null,
    amenities: parseAmenities(row.amenities),
    friendsWent: 0,
  };
}

export class FixtureProvider implements DiscoveryProvider {
  private async all(): Promise<Item[]> {
    const rows = await prisma.place.findMany();
    return rows.map(rowToItem);
  }

  async searchPlaces(q: SearchQuery): Promise<Item[]> {
    const items = (await this.all()).filter((i) => i.kind === "place");
    return selectCandidates(items, q.origin, {
      radiusMiles: q.radiusMiles,
      categories: q.categories,
      now: q.now ?? new Date(),
      under90: q.under90,
      amenities: q.amenities,
    });
  }

  async searchEvents(q: SearchQuery): Promise<Item[]> {
    const items = (await this.all()).filter((i) => i.kind === "event");
    return selectCandidates(items, q.origin, {
      radiusMiles: q.radiusMiles,
      categories: q.categories,
      now: q.now ?? new Date(),
      under90: q.under90,
      amenities: q.amenities,
    });
  }

  async getPlace(id: string): Promise<Item | null> {
    const row = await prisma.place.findUnique({ where: { id } });
    return row ? rowToItem(row) : null;
  }

  async geocode(input: string): Promise<GeocodeHit> {
    const hit = await geocodeQuery(input, {
      readCache: async (key) => {
        const row = await prisma.geocodeCache.findUnique({ where: { key } });
        if (!row) return null;
        const cached: CacheRow = {
          lat: row.lat,
          lng: row.lng,
          label: row.label,
          source: row.source,
          createdAt: row.createdAt.getTime(),
        };
        return cached;
      },
      writeCache: async (key, row) => {
        await prisma.geocodeCache.upsert({
          where: { key },
          create: {
            key,
            lat: row.lat,
            lng: row.lng,
            label: row.label,
            source: row.source,
            createdAt: new Date(row.createdAt),
          },
          update: {
            lat: row.lat,
            lng: row.lng,
            label: row.label,
            source: row.source,
            createdAt: new Date(row.createdAt),
          },
        });
      },
    });
    if (!hit.ok) {
      const err = new Error(hit.message);
      err.name = "GeocodeError";
      throw err;
    }
    return hit;
  }
}

