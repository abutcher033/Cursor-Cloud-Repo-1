import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { haversineMi } from "./geo";
import { geocodeQuery } from "./geocode";
import { nearQuery } from "./near";
import { scoreItem } from "./ranking";
import type { Item } from "./types";

function loadOregon(): Item {
  const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/fixtures/finksburg-21048.json"), "utf8")) as { items: Item[] };
  const item = raw.items.find((i) => i.id === "oregon-ridge");
  if (!item) throw new Error("missing oregon-ridge");
  return { ...item, communityRating: null, communityReviewCount: 0, friendsWent: 0 };
}

describe("detail score uses search radius (P0)", () => {
  it("40 mi search radius raises distance term vs saved-home 25 mi", async () => {
    const item = loadOregon();
    const origin = await geocodeQuery("21048", { fetchImpl: async () => { throw new Error("offline"); } });
    if (!origin.ok) throw new Error(origin.message);
    const distance = haversineMi(origin, item);
    const at25 = scoreItem(item, distance, {
      radiusMiles: 25,
      categories: [],
      familyLens: false,
      weatherPoor: false,
      now: new Date("2026-09-29T16:00:00.000Z"),
    });
    const at40 = scoreItem(item, distance, {
      radiusMiles: 40,
      categories: [],
      familyLens: false,
      weatherPoor: false,
      now: new Date("2026-09-29T16:00:00.000Z"),
    });
    expect(at40.distance).toBeGreaterThan(at25.distance);
    expect(at40.total).toBeGreaterThan(at25.total);
  });

  it("near query stays bare when building detail return links", () => {
    expect(nearQuery("21048 · Finksburg, MD")).toBe("21048");
    const returnTo = `/results?near=${nearQuery("21048 · Finksburg, MD")}&radius=40&lens=1`;
    expect(returnTo).toBe("/results?near=21048&radius=40&lens=1");
    expect(returnTo).not.toContain("Finksburg");
  });
});
