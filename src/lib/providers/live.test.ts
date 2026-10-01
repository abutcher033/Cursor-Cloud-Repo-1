import { describe, expect, it } from "vitest";
import { discoveryCacheKey } from "./live";

describe("live provider helpers", () => {
  it("builds stable cache keys", () => {
    const q = {
      origin: { lat: 39.5, lng: -76.9, label: "21048", ok: true as const, source: "fixture" as const },
      radiusMiles: 25,
      categories: ["family_kids", "parks"],
      familyLens: true,
    };
    const a = discoveryCacheKey(q, "places");
    const b = discoveryCacheKey({ ...q, categories: ["parks", "family_kids"] }, "places");
    expect(a).toBe(b);
    expect(a).toContain("25");
  });
});
