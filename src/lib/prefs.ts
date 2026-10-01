import { knownCategories } from "./categories";
import { normalizeRadius } from "./pipeline";

export type GuestPrefs = {
  radius: number;
  familyLens: boolean;
  categories: string[];
  weatherPoor: boolean;
};

export function readGuest(raw: string | undefined): GuestPrefs {
  try {
    const j = JSON.parse(raw || "{}") as Partial<GuestPrefs> & { categories?: string[] };
    return {
      radius: normalizeRadius(Number(j.radius ?? 25)),
      familyLens: j.familyLens == null ? true : !!j.familyLens,
      categories: knownCategories(Array.isArray(j.categories) ? j.categories : []),
      weatherPoor: !!j.weatherPoor,
    };
  } catch {
    return { radius: 25, familyLens: true, categories: [], weatherPoor: false };
  }
}
