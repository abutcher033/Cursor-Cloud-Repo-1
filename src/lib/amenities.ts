export const AMENITY_KEYS = [
  "parking",
  "highchair",
  "changingTable",
  "playground",
  "bathrooms",
  "dogOk",
] as const;

export type AmenityKey = (typeof AMENITY_KEYS)[number];

export type Amenities = {
  parking?: boolean;
  highchair?: boolean;
  changingTable?: boolean;
  playground?: boolean;
  bathrooms?: boolean;
  dogPolicy?: "ok" | "leashed" | "no" | "unknown";
};

export const AMENITY_LABELS: Record<AmenityKey, string> = {
  parking: "Parking",
  highchair: "Highchair",
  changingTable: "Changing table",
  playground: "Playground",
  bathrooms: "Bathrooms",
  dogOk: "Dog OK",
};

export function parseAmenities(raw: unknown): Amenities {
  if (!raw) return {};
  let obj: Record<string, unknown> = {};
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      if (p && typeof p === "object") obj = p as Record<string, unknown>;
    } catch {
      return {};
    }
  } else if (typeof raw === "object") {
    obj = raw as Record<string, unknown>;
  }
  const dog = obj.dogPolicy;
  return {
    parking: !!obj.parking,
    highchair: !!obj.highchair,
    changingTable: !!obj.changingTable,
    playground: !!obj.playground,
    bathrooms: !!obj.bathrooms,
    dogPolicy:
      dog === "ok" || dog === "leashed" || dog === "no" || dog === "unknown"
        ? dog
        : "unknown",
  };
}

export function amenityChips(a: Amenities): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  if (a.parking) out.push({ key: "parking", label: "Parking" });
  if (a.highchair) out.push({ key: "highchair", label: "Highchair" });
  if (a.changingTable) out.push({ key: "changingTable", label: "Changing table" });
  if (a.playground) out.push({ key: "playground", label: "Playground" });
  if (a.bathrooms) out.push({ key: "bathrooms", label: "Bathrooms" });
  if (a.dogPolicy === "ok") out.push({ key: "dogOk", label: "Dogs OK" });
  else if (a.dogPolicy === "leashed") out.push({ key: "dogOk", label: "Dogs leashed" });
  else if (a.dogPolicy === "no") out.push({ key: "dogNo", label: "No dogs" });
  return out;
}

export function matchesAmenityFilters(a: Amenities, keys: string[]): boolean {
  if (!keys.length) return true;
  for (const k of keys) {
    if (k === "parking" && !a.parking) return false;
    if (k === "highchair" && !a.highchair) return false;
    if (k === "changingTable" && !a.changingTable) return false;
    if (k === "playground" && !a.playground) return false;
    if (k === "bathrooms" && !a.bathrooms) return false;
    if (k === "dogOk" && a.dogPolicy !== "ok" && a.dogPolicy !== "leashed") return false;
  }
  return true;
}

export function knownAmenities(raw: string[]): AmenityKey[] {
  const set = new Set<string>(AMENITY_KEYS);
  return raw.filter((k): k is AmenityKey => set.has(k));
}
