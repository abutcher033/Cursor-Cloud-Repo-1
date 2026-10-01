/** Offline centroids. Used when Nominatim is down, rate-limited, or the query is a known zip. */
export type ZipHit = { lat: number; lng: number; label: string };

export const ZIP_TABLE: Record<string, ZipHit> = {
  "21048": { lat: 39.4959, lng: -76.8946, label: "21048 · Finksburg, MD" },
  "21157": { lat: 39.5754, lng: -76.9958, label: "21157 · Westminster, MD" },
  "21158": { lat: 39.548, lng: -77.02, label: "21158 · Westminster, MD" },
  "21784": { lat: 39.3734, lng: -76.9702, label: "21784 · Sykesville, MD" },
  "21074": { lat: 39.6054, lng: -76.851, label: "21074 · Hampstead, MD" },
  "21136": { lat: 39.4696, lng: -76.828, label: "21136 · Reisterstown, MD" },
  "21117": { lat: 39.4196, lng: -76.7806, label: "21117 · Owings Mills, MD" },
  "21093": { lat: 39.4437, lng: -76.631, label: "21093 · Timonium, MD" },
  "21030": { lat: 39.4815, lng: -76.6345, label: "21030 · Cockeysville, MD" },
  "21031": { lat: 39.478, lng: -76.62, label: "21031 · Cockeysville, MD" },
  "21102": { lat: 39.6612, lng: -76.884, label: "21102 · Manchester, MD" },
  "21234": { lat: 39.389, lng: -76.548, label: "21234 · Parkville, MD" },
  "21111": { lat: 39.578, lng: -76.568, label: "21111 · Monkton, MD" },
  "21208": { lat: 39.372, lng: -76.728, label: "21208 · Pikesville, MD" },
  "21771": { lat: 39.376, lng: -77.164, label: "21771 · Mount Airy, MD" },
  "21155": { lat: 39.568, lng: -76.812, label: "21155 · Upperco, MD" },
  "21286": { lat: 39.401, lng: -76.602, label: "21286 · Towson, MD" },
  "21204": { lat: 39.4015, lng: -76.6015, label: "21204 · Towson, MD" },
  "21042": { lat: 39.267, lng: -76.798, label: "21042 · Ellicott City, MD" },
  "21152": { lat: 39.531, lng: -76.652, label: "21152 · Sparks, MD" },
  "21104": { lat: 39.352, lng: -76.898, label: "21104 · Marriottsville, MD" },
  "21201": { lat: 39.2904, lng: -76.6122, label: "21201 · Baltimore, MD" },
  "21701": { lat: 39.4143, lng: -77.4105, label: "21701 · Frederick, MD" },
  "21015": { lat: 39.536, lng: -76.348, label: "21015 · Bel Air, MD" },
  "10001": { lat: 40.7506, lng: -73.9971, label: "10001 · New York, NY" },
};

/** Longest alias wins. Eldersburg shares 21784 with Sykesville. */
const ALIASES: [string, string][] = [
  ["owings mills", "21117"],
  ["ellicott city", "21042"],
  ["mount airy", "21771"],
  ["reisterstown", "21136"],
  ["cockeysville", "21030"],
  ["westminster", "21157"],
  ["finksburg", "21048"],
  ["sykesville", "21784"],
  ["eldersburg", "21784"],
  ["hampstead", "21074"],
  ["manchester", "21102"],
  ["parkville", "21234"],
  ["timonium", "21093"],
  ["frederick", "21701"],
  ["baltimore", "21201"],
  ["new york", "10001"],
  ["towson", "21286"],
  ["pikesville", "21208"],
  ["upperco", "21155"],
  ["monkton", "21111"],
];

export function lookupZip(zip: string): ZipHit | null {
  return ZIP_TABLE[zip] ?? null;
}

export function lookupAlias(text: string): ZipHit | null {
  const hay = text.toLowerCase();
  for (const [name, zip] of ALIASES) {
    if (hay.includes(name)) return ZIP_TABLE[zip] ?? null;
  }
  return null;
}

export function extractZip(text: string): string | null {
  const m = text.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : null;
}
