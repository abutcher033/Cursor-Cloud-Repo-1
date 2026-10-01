import { readFixtureFile } from "./catalog";
import { knownCategories } from "./categories";
import { prisma } from "./db";
import { getProvider } from "./providers";
import { normalizeRadius, scoreAndSort } from "./pipeline";
import type { GeocodeHit, Item, Ranked } from "./types";
import { fetchWeather, type WeatherSnapshot } from "./weather";
import { parseAmenities, type Amenities } from "./amenities";
import { isThisWeekendEvent } from "./weekend";

export type RankedView = Ranked & {
  friendNames: string[];
  saved: boolean;
  imageUrl: string;
  campusId: string | null;
  gotchas: string[];
  phone: string | null;
  openLabel: string | null;
  visitMinutes: number | null;
  amenities: Amenities;
};

export type SearchOk = {
  ok: true;
  origin: GeocodeHit;
  radiusMiles: number;
  familyLens: boolean;
  weatherPoor: boolean;
  weather: WeatherSnapshot;
  weatherNote: string;
  disclaimer: string;
  categories: string[];
  count: number;
  pins: { mustTry: RankedView | null; niche: RankedView | null };
  weekend: RankedView[];
  results: RankedView[];
  categoryCounts: Record<string, number>;
};

export type SearchResult = SearchOk | { ok: false; message: string };

export async function executeSearch(input: {
  near: string;
  radiusMiles: number;
  categories: string[];
  familyLens: boolean;
  weatherPoor: boolean;
  under90?: boolean;
  amenities?: string[];
  userId?: string;
  now?: Date;
}): Promise<SearchResult> {
  const provider = getProvider();
  let origin: GeocodeHit;
  try {
    origin = await provider.geocode(input.near);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not geocode that place." };
  }
  const radiusMiles = normalizeRadius(input.radiusMiles);
  const categories = knownCategories(input.categories);
  const now = input.now ?? new Date();

  const weather = await fetchWeather(origin.lat, origin.lng, { manualPoor: input.weatherPoor });
  const weatherPoor = weather.poorOutdoor;

  const q = {
    origin,
    radiusMiles,
    categories,
    familyLens: input.familyLens,
    weatherPoor,
    under90: !!input.under90,
    amenities: input.amenities || [],
    userId: input.userId,
    now,
  };
  const [places, events] = await Promise.all([provider.searchPlaces(q), provider.searchEvents(q)]);
  const merged = dedupe([...places, ...events]);
  const { items: social, names } = await overlaySocial(merged, input.userId);
  const ranked = scoreAndSort(social, {
    radiusMiles,
    categories,
    familyLens: input.familyLens,
    weatherPoor,
    now,
  });
  const saved = input.userId ? await savedSet(input.userId) : new Set<string>();
  const views = ranked.map((item) => toView(item, names.get(item.id) ?? [], saved.has(item.id)));
  const mustTry = views.find((v) => v.editorialRole === "must_try") ?? null;
  const niche = views.find((v) => v.editorialRole === "niche") ?? null;
  const pinIds = new Set([mustTry?.id, niche?.id].filter(Boolean) as string[]);
  const weekend = views
    .filter((v) => isThisWeekendEvent(v, now).weekend)
    .filter((v) => !pinIds.has(v.id) || true)
    .slice(0, 8);
  const meta = readFixtureFile().meta;

  // Category inventory for empty-trap UX (from full radius-unfiltered catalog near origin would be heavy;
  // use ranked+filtered result set + full DB counts for chip availability).
  const categoryCounts = await categoryInventory();

  return {
    ok: true,
    origin,
    radiusMiles,
    familyLens: input.familyLens,
    weatherPoor,
    weather,
    weatherNote: weather.note,
    disclaimer: meta.disclaimer,
    categories,
    count: views.length,
    pins: { mustTry, niche },
    weekend,
    results: views.filter((v) => !pinIds.has(v.id)),
    categoryCounts,
  };
}

async function categoryInventory(): Promise<Record<string, number>> {
  const { CATEGORY_IDS } = await import("./categories");
  const rows = await prisma.place.findMany({ select: { categories: true, status: true, endsAt: true, kind: true } });
  const now = Date.now();
  const counts: Record<string, number> = {};
  for (const id of CATEGORY_IDS) counts[id] = 0;
  for (const row of rows) {
    if (row.status === "retired") continue;
    if (row.kind === "event" && row.endsAt && row.endsAt.getTime() < now) continue;
    let cats: string[] = [];
    try {
      const parsed = JSON.parse(row.categories);
      if (Array.isArray(parsed)) cats = parsed.map(String);
    } catch {
      cats = [];
    }
    for (const c of cats) counts[c] = (counts[c] || 0) + 1;
  }
  return counts;
}

function dedupe(items: Item[]): Item[] {
  const map = new Map<string, Item>();
  for (const item of items) map.set(item.id, item);
  return [...map.values()];
}

async function overlaySocial(items: Item[], userId?: string): Promise<{ items: (Item & { distanceMi: number })[]; names: Map<string, string[]> }> {
  const names = new Map<string, string[]>();
  const ids = items.map((i) => i.id);
  const reviews = ids.length
    ? await prisma.review.findMany({ where: { placeId: { in: ids } }, select: { placeId: true, stars: true } })
    : [];
  const buckets = new Map<string, number[]>();
  for (const r of reviews) {
    const arr = buckets.get(r.placeId) ?? [];
    arr.push(r.stars);
    buckets.set(r.placeId, arr);
  }
  let friendIds: string[] = [];
  const nameById = new Map<string, string>();
  if (userId) {
    const rels = await prisma.friendship.findMany({
      where: { status: "accepted", OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: {
        requester: { select: { id: true, displayName: true } },
        addressee: { select: { id: true, displayName: true } },
      },
    });
    for (const rel of rels) {
      const friend = rel.requesterId === userId ? rel.addressee : rel.requester;
      friendIds.push(friend.id);
      nameById.set(friend.id, friend.displayName);
    }
  }
  const visits = friendIds.length
    ? await prisma.visit.findMany({
        where: { userId: { in: friendIds }, placeId: { in: ids } },
        select: { placeId: true, userId: true },
      })
    : [];
  const went = new Map<string, Set<string>>();
  for (const v of visits) {
    const set = went.get(v.placeId) ?? new Set<string>();
    set.add(v.userId);
    went.set(v.placeId, set);
  }
  const decorated = items.map((item) => {
    const stars = buckets.get(item.id) ?? [];
    const friendLabels = [...(went.get(item.id) ?? [])].map((id) => nameById.get(id) || "Friend");
    names.set(item.id, friendLabels);
    const withDist = item as Item & { distanceMi: number };
    return {
      ...withDist,
      communityReviewCount: stars.length,
      communityRating: stars.length ? stars.reduce((a, b) => a + b, 0) / stars.length : null,
      friendsWent: friendLabels.length,
    };
  });
  return { items: decorated, names };
}

async function savedSet(userId: string): Promise<Set<string>> {
  const rows = await prisma.save.findMany({ where: { userId }, select: { placeId: true } });
  return new Set(rows.map((r) => r.placeId));
}

function toView(item: Ranked, friendNames: string[], saved: boolean): RankedView {
  return {
    ...item,
    friendNames,
    saved,
    imageUrl: item.imageUrl || "/thumbs/default.svg",
    campusId: item.campusId ?? null,
    gotchas: item.gotchas ?? [],
    phone: item.phone ?? null,
    openLabel: item.openLabel ?? null,
    visitMinutes: item.visitMinutes ?? null,
    amenities: item.amenities ?? parseAmenities({}),
  };
}

export async function placeDetail(id: string, userId?: string) {
  const provider = getProvider();
  const item = await provider.getPlace(id);
  if (!item) return null;
  const reviews = await prisma.review.findMany({
    where: { placeId: id },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, displayName: true } } },
  });
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : null;
  item.communityReviewCount = reviews.length;
  item.communityRating = avg;
  let friendNames: string[] = [];
  if (userId) {
    const rels = await prisma.friendship.findMany({
      where: { status: "accepted", OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: {
        requester: { select: { id: true, displayName: true } },
        addressee: { select: { id: true, displayName: true } },
      },
    });
    const friends = rels.map((rel) => (rel.requesterId === userId ? rel.addressee : rel.requester));
    if (friends.length) {
      const visits = await prisma.visit.findMany({
        where: { placeId: id, userId: { in: friends.map((f) => f.id) } },
        select: { userId: true },
      });
      const ids = new Set(visits.map((v) => v.userId));
      friendNames = friends.filter((f) => ids.has(f.id)).map((f) => f.displayName);
    }
  }
  item.friendsWent = friendNames.length;
  const mine = userId ? reviews.find((r) => r.userId === userId) ?? null : null;
  const visit = userId
    ? await prisma.visit.findFirst({ where: { userId, placeId: id }, orderBy: { createdAt: "desc" } })
    : null;
  const saved = userId ? !!(await prisma.save.findUnique({ where: { userId_placeId: { userId, placeId: id } } })) : false;
  return { item, reviews, friendNames, mine, visit, saved };
}

export async function resolveDetailOrigin(input: {
  olat?: number;
  olng?: number;
  near?: string;
  olabel?: string;
  user?: { homeLat: number; homeLng: number; homeLabel: string } | null;
}): Promise<{ lat: number; lng: number; label: string; fromSearch: boolean }> {
  const hasCoords = Number.isFinite(input.olat) && Number.isFinite(input.olng) && !(input.olat === 0 && input.olng === 0);
  if (hasCoords) {
    return {
      lat: input.olat!,
      lng: input.olng!,
      label: input.olabel || input.near || input.user?.homeLabel || "21048",
      fromSearch: true,
    };
  }
  if (input.near) {
    try {
      const hit = await getProvider().geocode(input.near);
      return { lat: hit.lat, lng: hit.lng, label: input.olabel || hit.label, fromSearch: true };
    } catch {
      /* fall through */
    }
  }
  return {
    lat: input.user?.homeLat ?? 39.4959,
    lng: input.user?.homeLng ?? -76.8946,
    label: input.user?.homeLabel || "21048",
    fromSearch: false,
  };
}
