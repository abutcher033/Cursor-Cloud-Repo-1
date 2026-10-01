import { describe, expect, it } from "vitest";
import {
  WEIGHTS,
  communityRatingNorm,
  distanceDecay,
  friendsWentNorm,
  publicRatingNorm,
  reviewConfidence,
  scoreItem,
  timeFreshness,
  type Rankable,
} from "./ranking";

const now = new Date("2026-09-29T16:00:00.000Z");

function item(partial: Partial<Rankable> = {}): Rankable {
  return {
    id: "x",
    name: "X",
    kind: "place",
    categories: ["outdoor"],
    status: "active",
    publicRating: 4,
    publicReviewCount: 100,
    communityRating: 4,
    communityReviewCount: 4,
    priceLevel: 2,
    costVibe: "$$",
    editorialRole: null,
    source: "seed",
    startsAt: null,
    endsAt: null,
    ageFit: null,
    stroller: null,
    indoorBackup: false,
    friendsWent: 0,
    ...partial,
  };
}

describe("distance decay uses selected radius", () => {
  it("matches 1 - (d/R)^0.85", () => {
    expect(distanceDecay(0, 25)).toBe(1);
    expect(distanceDecay(25, 25)).toBe(0);
    expect(distanceDecay(30, 25)).toBe(0);
    expect(distanceDecay(5, 25)).toBeCloseTo(1 - Math.pow(5 / 25, 0.85), 8);
    expect(distanceDecay(20, 25)).toBeCloseTo(1 - Math.pow(20 / 25, 0.85), 8);
  });

  it("same mile marker scores a higher decay inside a wider radius", () => {
    expect(distanceDecay(5, 25)).toBeGreaterThan(distanceDecay(5, 10));
    expect(distanceDecay(12, 40)).toBeGreaterThan(distanceDecay(12, 15));
  });
});

describe("rating pieces", () => {
  it("missing public rating is the neutral 0.55", () => {
    expect(publicRatingNorm(null)).toBe(0.55);
    expect(publicRatingNorm(undefined)).toBe(0.55);
  });

  it("cold-start community rating is 0.5", () => {
    expect(communityRatingNorm(null, 0)).toBe(0.5);
    expect(communityRatingNorm(5, 0)).toBe(0.5);
  });

  it("prefers 4.2 with 200 reviews over 5.0 with 2", () => {
    const rich = 18 * publicRatingNorm(4.2) + 10 * reviewConfidence(200);
    const thin = 18 * publicRatingNorm(5) + 10 * reviewConfidence(2);
    expect(rich).toBeGreaterThan(thin);
  });
});

describe("freshness and weights", () => {
  it("peaks inside 7 days and zeroes ended events", () => {
    const soon = item({
      kind: "event",
      startsAt: "2026-10-02T16:00:00.000Z",
      endsAt: "2026-10-02T20:00:00.000Z",
    });
    const ended = item({
      kind: "event",
      startsAt: "2026-09-01T16:00:00.000Z",
      endsAt: "2026-09-02T16:00:00.000Z",
    });
    expect(timeFreshness(soon, now.getTime())).toBe(1);
    expect(timeFreshness(ended, now.getTime())).toBe(0);
    expect(timeFreshness(item(), now.getTime())).toBe(0.7);
  });

  it("base weights sum to 100; friends and family are add-ons", () => {
    const base =
      WEIGHTS.distance +
      WEIGHTS.publicRating +
      WEIGHTS.reviewConfidence +
      WEIGHTS.community +
      WEIGHTS.category +
      WEIGHTS.freshness +
      WEIGHTS.price +
      WEIGHTS.editorial;
    expect(base).toBe(100);
    expect(WEIGHTS.friendsWent).toBe(8);
  });
});

describe("score adjustments", () => {
  const q = { radiusMiles: 25, categories: [] as string[], familyLens: false, weatherPoor: false, now };

  it("charges a verify penalty", () => {
    const a = scoreItem(item(), 5, q).total;
    const b = scoreItem(item({ status: "verify" }), 5, q).total;
    expect(a - b).toBe(4);
  });

  it("family lens and rainy indoor boost raise a fitting place", () => {
    const kid = item({
      categories: ["family_kids", "indoor_backup", "free_cheap"],
      ageFit: "All ages",
      stroller: true,
      indoorBackup: true,
      priceLevel: 0,
      costVibe: "Free",
    });
    const general = scoreItem(kid, 4, q).total;
    const family = scoreItem(kid, 4, { ...q, familyLens: true, weatherPoor: true }).total;
    expect(family).toBeGreaterThan(general);
  });

  it("friends who went add a bounded boost", () => {
    const plain = scoreItem(item({ friendsWent: 0 }), 6, q).total;
    const social = scoreItem(item({ friendsWent: 3 }), 6, q).total;
    expect(social - plain).toBeCloseTo(WEIGHTS.friendsWent * friendsWentNorm(3), 6);
    expect(friendsWentNorm(0)).toBe(0);
    expect(friendsWentNorm(5)).toBe(1);
  });
});
