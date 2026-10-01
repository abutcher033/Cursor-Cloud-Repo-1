/** Earth radius in miles. Haversine is the filter and the `d` in distance decay. */
const EARTH_MI = 3958.7613;

export type LatLng = { lat: number; lng: number };

export function haversineMi(a: LatLng, b: LatLng): number {
  const p1 = (a.lat * Math.PI) / 180;
  const p2 = (b.lat * Math.PI) / 180;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MI * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Cheap prefilter. Padded so it never drops a true haversine hit. */
export function boundingBox(origin: LatLng, radiusMi: number) {
  const pad = radiusMi * 1.02;
  const dLat = pad / 69;
  const cos = Math.cos((origin.lat * Math.PI) / 180);
  const dLng = pad / (69 * Math.max(0.2, Math.abs(cos)));
  return {
    minLat: origin.lat - dLat,
    maxLat: origin.lat + dLat,
    minLng: origin.lng - dLng,
    maxLng: origin.lng + dLng,
  };
}

const BASE = "0123456789bcdefghjkmnpqrstuvwxyz";

/** Standard geohash. Phase 2 result cache key uses precision 5 (~5 km). */
export function geohash(lat: number, lng: number, precision = 5): string {
  let latR: [number, number] = [-90, 90];
  let lngR: [number, number] = [-180, 180];
  let bits = 0;
  let bit = 0;
  let even = true;
  let out = "";
  while (out.length < precision) {
    if (even) {
      const mid = (lngR[0] + lngR[1]) / 2;
      if (lng >= mid) {
        bits = bits * 2 + 1;
        lngR = [mid, lngR[1]];
      } else {
        bits = bits * 2;
        lngR = [lngR[0], mid];
      }
    } else {
      const mid = (latR[0] + latR[1]) / 2;
      if (lat >= mid) {
        bits = bits * 2 + 1;
        latR = [mid, latR[1]];
      } else {
        bits = bits * 2;
        latR = [latR[0], mid];
      }
    }
    even = !even;
    bit += 1;
    if (bit === 5) {
      out += BASE[bits];
      bits = 0;
      bit = 0;
    }
  }
  return out;
}

export function discoveryCacheKey(q: {
  origin: LatLng;
  radiusMiles: number;
  categories: string[];
  familyLens: boolean;
}): string {
  const cats = [...q.categories].sort().join(",");
  return `${geohash(q.origin.lat, q.origin.lng, 5)}|r${q.radiusMiles}|c${cats}|f${q.familyLens ? 1 : 0}`;
}
