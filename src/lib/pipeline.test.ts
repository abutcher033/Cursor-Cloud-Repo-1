import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { geocodeQuery } from "./geocode";
import { haversineMi } from "./geo";
import { filterAndRank, selectCandidates } from "./pipeline";
import type { Item } from "./types";

function load(): Item[] {
  const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/fixtures/finksburg-21048.json"), "utf8")) as { items: Item[] };
  return raw.items.map((item) => ({
    ...item,
    communityRating: null,
    communityReviewCount: 0,
    friendsWent: 0,
  }));
}

const now = new Date("2026-09-29T16:00:00.000Z");

async function origin(input: string) {
  const hit = await geocodeQuery(input, { fetchImpl: async () => { throw new Error("offline"); } });
  if (!hit.ok) throw new Error(hit.message);
  return hit;
}

describe("geocode → filter → rank", () => {
  const items = load();

  it("10 miles around 21048 is a strict subset of 40 miles", async () => {
    const from = await origin("21048");
    const near = filterAndRank(items, from, { radiusMiles: 10, categories: [], familyLens: true, weatherPoor: false, now });
    const wide = filterAndRank(items, from, { radiusMiles: 40, categories: [], familyLens: true, weatherPoor: false, now });
    const nearIds = new Set(near.map((i) => i.id));
    expect(wide.length).toBeGreaterThan(near.length + 5);
    expect(near.every((i) => i.distanceMi <= 10)).toBe(true);
    expect(wide.every((i) => i.distanceMi <= 40)).toBe(true);
    expect(nearIds.has("renfest")).toBe(false);
    expect(nearIds.has("timonium-pumpkin-fest")).toBe(false);
    expect(nearIds.has("webers")).toBe(false);
    expect(wide.some((i) => i.id === "renfest")).toBe(true);
    expect(wide.some((i) => i.id === "timonium-pumpkin-fest")).toBe(true);
    expect(wide.some((i) => i.id === "oregon-ridge")).toBe(true);
    expect(wide.some((i) => i.id === "webers")).toBe(true);
    expect(near.some((i) => i.id === "maggies")).toBe(true);
    expect(near.some((i) => i.id === "northwest-regional" || i.id === "bcpl-owings-mills")).toBe(true);
    expect(near.some((i) => i.id === "bcpl-reisterstown")).toBe(true);
    expect(near.some((i) => i.id === "westminster-fallfest")).toBe(false);
  });

  it("moving the origin to Timonium changes who is close", async () => {
    const finks = await origin("21048");
    const tim = await origin("21093");
    const a = filterAndRank(items, finks, { radiusMiles: 15, categories: [], familyLens: false, weatherPoor: false, now });
    const b = filterAndRank(items, tim, { radiusMiles: 10, categories: [], familyLens: false, weatherPoor: false, now });
    const pumpkinFromFinks = a.find((i) => i.id === "timonium-pumpkin-fest")!;
    const pumpkinFromTim = b.find((i) => i.id === "timonium-pumpkin-fest")!;
    expect(pumpkinFromTim.distanceMi).toBeLessThan(pumpkinFromFinks.distanceMi);
    expect(b.some((i) => i.id === "ccpl-finksburg")).toBe(false);
  });

  it("New York is outside the catalog", async () => {
    const nyc = await origin("10001");
    const ranked = filterAndRank(items, nyc, { radiusMiles: 60, categories: [], familyLens: false, weatherPoor: false, now });
    expect(ranked).toHaveLength(0);
    expect(haversineMi(nyc, { lat: 39.4959, lng: -76.8946 })).toBeGreaterThan(60);
  });

  it("is sorted by score and uses the selected radius in the distance term", async () => {
    const from = await origin("21048");
    const mid = filterAndRank(items, from, { radiusMiles: 15, categories: [], familyLens: false, weatherPoor: false, now });
    const wide = filterAndRank(items, from, { radiusMiles: 40, categories: [], familyLens: false, weatherPoor: false, now });
    for (let i = 1; i < mid.length; i += 1) expect(mid[i - 1]!.score).toBeGreaterThanOrEqual(mid[i]!.score);
    const oregonMid = mid.find((i) => i.id === "oregon-ridge");
    const oregonWide = wide.find((i) => i.id === "oregon-ridge");
    expect(oregonMid && oregonWide).toBeTruthy();
    expect(oregonWide!.parts.distance).toBeGreaterThan(oregonMid!.parts.distance);
  });

  it("hoists must-try inside the family-lens 25 mile list", async () => {
    const from = await origin("21048 · Finksburg, MD");
    const ranked = filterAndRank(items, from, { radiusMiles: 25, categories: [], familyLens: true, weatherPoor: false, now });
    expect(ranked.some((i) => i.editorialRole === "must_try")).toBe(true);
    expect(ranked.some((i) => i.editorialRole === "niche")).toBe(true);
  });
});

import { parseAmenities } from "./amenities";

describe("P2 duration and amenity filters", () => {
  const origin = { lat: 39.4959, lng: -76.8946 };
  const base = {
    id: "t1",
    name: "Quick park",
    kind: "place" as const,
    categories: ["family_kids"],
    why: "x",
    ageFit: null,
    stroller: true,
    driveMin: 10,
    costVibe: "Free",
    priceLevel: 0,
    whenHours: "Daily",
    startsAt: null,
    endsAt: null,
    address: "Finksburg",
    lat: 39.5,
    lng: -76.9,
    link: "",
    status: "active" as const,
    publicRating: 4.5,
    publicReviewCount: 10,
    communityRating: null,
    communityReviewCount: 0,
    editorialRole: null,
    weatherNote: null,
    source: "seed",
    indoorBackup: false,
    patio: false,
    sample: false,
    friendsWent: 0,
    visitMinutes: 45,
    amenities: parseAmenities({ parking: true, playground: true, bathrooms: true, dogPolicy: "leashed" }),
  };
  const long = { ...base, id: "t2", name: "Long fest", visitMinutes: 180, amenities: parseAmenities({ parking: true }) };

  it("under90 keeps short visits only", () => {
    const out = selectCandidates([base, long], origin, {
      radiusMiles: 25,
      categories: [],
      now: new Date("2026-09-29T12:00:00Z"),
      under90: true,
    });
    expect(out.map((i) => i.id)).toEqual(["t1"]);
  });

  it("amenity chip filters", () => {
    const out = selectCandidates([base, long], origin, {
      radiusMiles: 25,
      categories: [],
      now: new Date("2026-09-29T12:00:00Z"),
      amenities: ["playground"],
    });
    expect(out.map((i) => i.id)).toEqual(["t1"]);
  });
});
