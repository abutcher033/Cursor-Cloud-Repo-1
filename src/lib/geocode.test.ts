import { describe, expect, it } from "vitest";
import { discoveryCacheKey, geohash } from "./geo";
import { geocodeQuery } from "./geocode";

describe("geocode", () => {
  it("resolves known Maryland zips offline without calling Nominatim", async () => {
    let called = 0;
    const hit = await geocodeQuery("21048", {
      fetchImpl: async () => {
        called += 1;
        throw new Error("offline");
      },
    });
    expect(called).toBe(0);
    expect(hit.ok).toBe(true);
    if (hit.ok) {
      expect(hit.source).toBe("fixture");
      expect(hit.label).toContain("Finksburg");
      expect(hit.lat).toBeCloseTo(39.4959, 3);
    }
  });

  it("covers the orbit zips used in the demo", async () => {
    for (const zip of ["21157", "21117", "21093", "21136"]) {
      const hit = await geocodeQuery(zip, { fetchImpl: async () => { throw new Error("offline"); } });
      expect(hit.ok, zip).toBe(true);
    }
  });

  it("uses Nominatim for a street it does not know", async () => {
    const hit = await geocodeQuery("456 York Rd, Lutherville, MD", {
      fetchImpl: async () =>
        new Response(JSON.stringify([{ lat: "39.44", lon: "-76.63", display_name: "York Rd, Timonium, Maryland" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    });
    expect(hit.ok).toBe(true);
    if (hit.ok) {
      expect(hit.source).toBe("nominatim");
      expect(hit.lat).toBeCloseTo(39.44, 2);
    }
  });

  it("falls back to a city alias when the network fails", async () => {
    const hit = await geocodeQuery("somewhere around timonium tonight", {
      fetchImpl: async () => {
        throw new Error("offline");
      },
    });
    expect(hit.ok).toBe(true);
    if (hit.ok) expect(hit.label).toContain("Timonium");
  });

  it("errors when nothing matches", async () => {
    const hit = await geocodeQuery("zzzz-not-a-place", {
      fetchImpl: async () => new Response("[]", { status: 200 }),
    });
    expect(hit.ok).toBe(false);
  });

  it("reads a fresh cache and skips the network", async () => {
    let called = 0;
    const hit = await geocodeQuery("123 Mystery Ave, Austin, TX", {
      now: 1_000_000,
      fetchImpl: async () => {
        called += 1;
        throw new Error("nope");
      },
      readCache: async () => ({ lat: 30.27, lng: -97.74, label: "Austin, TX", source: "nominatim", createdAt: 900_000 }),
    });
    expect(called).toBe(0);
    expect(hit.ok).toBe(true);
    if (hit.ok) expect(hit.source).toBe("cache");
  });
});

describe("phase 2 cache key", () => {
  it("geohashes Finksburg and changes when the radius changes", () => {
    expect(geohash(39.4959, -76.8946, 5)).toBe("dr12d");
    const a = discoveryCacheKey({ origin: { lat: 39.4959, lng: -76.8946 }, radiusMiles: 10, categories: ["outdoor"], familyLens: false });
    const b = discoveryCacheKey({ origin: { lat: 39.4959, lng: -76.8946 }, radiusMiles: 40, categories: ["outdoor"], familyLens: false });
    expect(a).not.toBe(b);
    expect(a.startsWith("dr12d")).toBe(true);
  });
});
