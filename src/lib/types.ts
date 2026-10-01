import type { EditorialRole, Rankable, ScoreParts } from "./ranking";

export type Item = Rankable & {
  why: string;
  driveMin: number | null;
  whenHours: string;
  address: string;
  lat: number;
  lng: number;
  link: string;
  weatherNote: string | null;
  patio: boolean;
  sample: boolean;
  imageUrl?: string;
  campusId?: string | null;
  gotchas?: string[];
  phone?: string | null;
  visitMinutes?: number | null;
  amenities?: import("./amenities").Amenities;
};

export type Candidate = Item & { distanceMi: number };

export type Ranked = Candidate & { score: number; parts: ScoreParts; openState?: string; openLabel?: string | null };

export type GeocodeHit = {
  ok: true;
  lat: number;
  lng: number;
  label: string;
  source: "cache" | "nominatim" | "fixture";
};

export type GeocodeMiss = { ok: false; message: string };

export type SearchQuery = {
  origin: { lat: number; lng: number; label: string };
  radiusMiles: number;
  categories: string[];
  familyLens: boolean;
  weatherPoor?: boolean;
  under90?: boolean;
  amenities?: string[];
  userId?: string;
  now?: Date;
};

export type EditorialRoleName = EditorialRole;
