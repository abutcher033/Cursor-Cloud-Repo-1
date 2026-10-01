import { boundingBox, haversineMi, type LatLng } from "./geo";
import { eveningMorningPenalty, openState } from "./hours";
import {
  isExcluded,
  passesCategory,
  scoreItem,
  type RankQuery,
} from "./ranking";
import { matchesAmenityFilters, parseAmenities } from "./amenities";
import type { Candidate, Item, Ranked } from "./types";

export const RADII = [5, 10, 15, 25, 40, 60] as const;
export type Radius = (typeof RADII)[number];

export function normalizeRadius(n: number): Radius {
  return (RADII as readonly number[]).includes(n) ? (n as Radius) : 25;
}

export type FilterQuery = {
  radiusMiles: number;
  categories: string[];
  now: Date;
  under90?: boolean;
  amenities?: string[];
};

export function selectCandidates(items: Item[], origin: LatLng, q: FilterQuery): Candidate[] {
  const box = boundingBox(origin, q.radiusMiles);
  const now = q.now.getTime();
  const out: Candidate[] = [];
  for (const item of items) {
    if (isExcluded(item, now)) continue;
    if (!passesCategory(item, q.categories)) continue;
    if (item.lat < box.minLat || item.lat > box.maxLat || item.lng < box.minLng || item.lng > box.maxLng) continue;
    const distanceMi = haversineMi(origin, { lat: item.lat, lng: item.lng });
    if (distanceMi > q.radiusMiles + 1e-6) continue;
    if (q.under90) {
      const mins = item.visitMinutes;
      if (mins == null || mins > 90) continue;
    }
    if (q.amenities?.length) {
      const am = item.amenities ?? parseAmenities({});
      if (!matchesAmenityFilters(am, q.amenities)) continue;
    }
    out.push({ ...item, distanceMi });
  }
  return out;
}

export function scoreAndSort(items: Candidate[], q: RankQuery): Ranked[] {
  const ranked = items.map((item) => {
    const parts = scoreItem(item, item.distanceMi, q);
    const open = openState({
      whenHours: item.whenHours,
      startsAt: item.startsAt,
      endsAt: item.endsAt,
      kind: item.kind,
      now: q.now,
    });
    const demote = eveningMorningPenalty(open.state, q.now);
    const score = Math.max(0, parts.total - demote);
    return { ...item, score, parts, openState: open.state, openLabel: open.label };
  });
  ranked.sort((a, b) => b.score - a.score || a.distanceMi - b.distanceMi || a.name.localeCompare(b.name));
  return ranked;
}

export function filterAndRank(
  items: Item[],
  origin: LatLng,
  q: RankQuery,
): Ranked[] {
  const selected = selectCandidates(items, origin, q);
  return scoreAndSort(selected, q);
}
