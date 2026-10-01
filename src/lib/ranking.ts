/**
 * Local Life ranking (spec §5.2).
 * Base weights sum to 100. Family-lens terms and friends-went are explicit add-ons
 * so a family search can exceed 100 and actually reorder the list.
 * Distance decay uses the user-selected radius as R, not a fixed 25.
 *
 * The spec's prose ("5 mi ≈ 0.85 at R=25") is a rough gloss.
 * The formula `1 - (d/R)^0.85` is what the tests lock (~0.745 at 5/25).
 */

export const WEIGHTS = {
  distance: 28,
  publicRating: 18,
  reviewConfidence: 10,
  community: 16,
  category: 10,
  freshness: 8,
  price: 6,
  editorial: 4,
  ageFit: 12,
  freeCheap: 6,
  indoor: 4,
  friendsWent: 8,
} as const;

export const VERIFY_PENALTY = 4;
export const REVIEW_CONFIDENCE_CAP = 500;

export type EditorialRole = "must_try" | "niche" | null;

export type Rankable = {
  id: string;
  name: string;
  kind: "place" | "event";
  categories: string[];
  status: "active" | "verify" | "retired";
  publicRating: number | null;
  publicReviewCount: number | null;
  communityRating: number | null;
  communityReviewCount: number;
  priceLevel: number | null;
  costVibe: string;
  editorialRole: EditorialRole;
  source: string;
  startsAt: string | null;
  endsAt: string | null;
  ageFit: string | null;
  stroller: boolean | null;
  indoorBackup: boolean;
  friendsWent?: number;
};

export type RankQuery = {
  radiusMiles: number;
  categories: string[];
  familyLens: boolean;
  weatherPoor: boolean;
  now: Date;
};

export type ScoreParts = {
  distance: number;
  publicRating: number;
  reviewConfidence: number;
  community: number;
  category: number;
  freshness: number;
  price: number;
  editorial: number;
  ageFit: number;
  freeCheap: number;
  indoor: number;
  friendsWent: number;
  verifyPenalty: number;
  total: number;
};

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function distanceDecay(dMiles: number, radiusMiles: number): number {
  if (!(radiusMiles > 0)) return 0;
  if (dMiles <= 0) return 1;
  if (dMiles >= radiusMiles) return 0;
  return Math.max(0, 1 - Math.pow(dMiles / radiusMiles, 0.85));
}

export function publicRatingNorm(rating: number | null | undefined): number {
  if (rating == null || Number.isNaN(rating)) return 0.55;
  return clamp(rating / 5, 0, 1);
}

export function reviewConfidence(count: number | null | undefined, cap = REVIEW_CONFIDENCE_CAP): number {
  const c = Math.max(0, count ?? 0);
  return Math.log1p(c) / Math.log1p(cap);
}

export function communityRatingNorm(rating: number | null | undefined, count: number): number {
  if (!count || rating == null || Number.isNaN(rating)) return 0.5;
  return clamp(rating / 5, 0, 1);
}

export function isFreeish(item: { priceLevel: number | null; costVibe: string; categories: string[] }): boolean {
  if (item.priceLevel === 0) return true;
  if (item.categories.includes("free_cheap")) return true;
  return /free/i.test(item.costVibe);
}

export function categoryMatch(itemCats: string[], selected: string[], item?: { priceLevel: number | null; costVibe: string; categories: string[] }): number {
  if (!selected.length) return 1;
  let hits = 0;
  for (const c of selected) {
    if (c === "free_cheap") {
      if (item && isFreeish(item)) hits += 1;
      else if (itemCats.includes("free_cheap")) hits += 1;
    } else if (itemCats.includes(c)) hits += 1;
  }
  return hits / selected.length;
}

export function passesCategory(
  item: { categories: string[]; priceLevel: number | null; costVibe: string },
  selected: string[],
): boolean {
  if (!selected.length) return true;
  const cats = selected.filter((c) => c !== "free_cheap");
  const wantFree = selected.includes("free_cheap");
  const catOk = cats.length === 0 || cats.some((c) => item.categories.includes(c));
  const freeOk = !wantFree || isFreeish(item);
  if (wantFree && cats.length) return catOk && freeOk;
  if (wantFree) return freeOk;
  return catOk;
}

/** Peak inside 7 days, taper through day 45, in-progress stays high, ended is 0. */
export function timeFreshness(item: Pick<Rankable, "kind" | "startsAt" | "endsAt" | "status">, nowMs: number): number {
  if (item.status === "retired") return 0;
  if (item.kind !== "event" || !item.startsAt) return 0.7;
  const start = Date.parse(item.startsAt);
  const end = item.endsAt ? Date.parse(item.endsAt) : start;
  if (Number.isNaN(start)) return 0.5;
  if (end < nowMs) return 0;
  if (start <= nowMs) return 0.92;
  const days = (start - nowMs) / 86_400_000;
  if (days <= 7) return 1;
  if (days >= 45) return 0.12;
  const t = (days - 7) / (45 - 7);
  return 1 - t * 0.8;
}

export function priceFit(item: { priceLevel: number | null; costVibe: string; categories: string[] }, pref: "any" | "free_cheap"): number {
  if (pref !== "free_cheap") return 0.5;
  if (item.priceLevel === 0 || /free admission|free\b/i.test(item.costVibe)) return 1;
  if (item.priceLevel === 1 || isFreeish(item)) return 0.8;
  if (item.priceLevel === 2) return 0.45;
  if (item.priceLevel === 3) return 0.25;
  if (item.priceLevel === 4 || item.costVibe.includes("$$$$")) return 0.1;
  return 0.5;
}

export function editorialBoost(item: Pick<Rankable, "editorialRole" | "source">): number {
  if (item.editorialRole === "must_try") return 1;
  if (item.editorialRole === "niche") return 0.7;
  if (item.source === "seed") return 0.2;
  return 0;
}

export function ageFitScore(item: Pick<Rankable, "ageFit" | "stroller" | "categories">): number {
  let s = 0.25;
  if (item.ageFit) s = 0.72;
  if (item.stroller === true) s = Math.min(1, s + 0.28);
  if (item.stroller === false) s = Math.min(s, 0.4);
  if (item.categories.includes("family_kids")) s = Math.min(1, s + 0.08);
  return s;
}

export function freeCheapBoost(item: { priceLevel: number | null; costVibe: string; categories: string[] }): number {
  if (item.priceLevel === 0 || /free admission|^free$/i.test(item.costVibe.trim())) return 1;
  if (isFreeish(item)) return 0.7;
  if ((item.priceLevel ?? 2) <= 1) return 0.55;
  return (item.priceLevel ?? 2) >= 3 ? 0.12 : 0.25;
}

export function indoorWhenNeeded(item: Pick<Rankable, "indoorBackup" | "categories">, weatherPoor: boolean): number {
  const indoor = item.indoorBackup || item.categories.includes("indoor_backup");
  if (!weatherPoor) return indoor ? 0.45 : 0.3;
  return indoor ? 1 : 0;
}

export function friendsWentNorm(n: number): number {
  if (!(n > 0)) return 0;
  return Math.min(1, Math.log1p(n) / Math.log1p(5));
}

export function isExcluded(item: Rankable, nowMs: number): boolean {
  if (item.status === "retired") return true;
  if (item.kind === "event" && item.endsAt && Date.parse(item.endsAt) < nowMs) return true;
  return false;
}

export function scoreItem(item: Rankable, distanceMi: number, q: RankQuery): ScoreParts {
  const pref = q.categories.includes("free_cheap") ? "free_cheap" : "any";
  const distance = WEIGHTS.distance * distanceDecay(distanceMi, q.radiusMiles);
  const publicRating = WEIGHTS.publicRating * publicRatingNorm(item.publicRating);
  const confidence = WEIGHTS.reviewConfidence * reviewConfidence(item.publicReviewCount);
  const community = WEIGHTS.community * communityRatingNorm(item.communityRating, item.communityReviewCount);
  const category = WEIGHTS.category * categoryMatch(item.categories, q.categories, item);
  const freshness = WEIGHTS.freshness * timeFreshness(item, q.now.getTime());
  const price = WEIGHTS.price * priceFit(item, pref);
  const editorial = WEIGHTS.editorial * editorialBoost(item);
  const ageFit = q.familyLens ? WEIGHTS.ageFit * ageFitScore(item) : 0;
  const freeCheap = q.familyLens ? WEIGHTS.freeCheap * freeCheapBoost(item) : 0;
  const indoor = q.familyLens ? WEIGHTS.indoor * indoorWhenNeeded(item, q.weatherPoor) : 0;
  const friends = WEIGHTS.friendsWent * friendsWentNorm(item.friendsWent ?? 0);
  const verifyPenalty = item.status === "verify" ? VERIFY_PENALTY : 0;
  const total = Math.max(
    0,
    distance + publicRating + confidence + community + category + freshness + price + editorial + ageFit + freeCheap + indoor + friends - verifyPenalty,
  );
  return {
    distance,
    publicRating,
    reviewConfidence: confidence,
    community,
    category,
    freshness,
    price,
    editorial,
    ageFit,
    freeCheap,
    indoor,
    friendsWent: friends,
    verifyPenalty,
    total,
  };
}
