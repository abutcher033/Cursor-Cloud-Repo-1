import fs from "fs";
import path from "path";
import type { Item } from "./types";

export type FixtureFile = {
  meta: {
    region: string;
    seedCentroid: { lat: number; lng: number; label: string };
    weather: { poorOutdoor: boolean; note: string };
    disclaimer: string;
    campuses?: Record<string, { label: string; address?: string }>;
  };
  items: Item[];
};

let cached: FixtureFile | null = null;

export function fixturePath(): string {
  return path.join(process.cwd(), "data/fixtures/finksburg-21048.json");
}

export function readFixtureFile(): FixtureFile {
  if (cached) return cached;
  const raw = JSON.parse(fs.readFileSync(fixturePath(), "utf8")) as FixtureFile;
  cached = raw;
  return raw;
}

export function fixtureItems(): Item[] {
  return readFixtureFile().items.map((item) => ({
    ...item,
    communityRating: item.communityRating ?? null,
    communityReviewCount: item.communityReviewCount ?? 0,
    friendsWent: item.friendsWent ?? 0,
    categories: item.categories ?? [],
  }));
}
