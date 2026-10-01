import { describe, expect, it } from "vitest";
import { matchesAmenityFilters, parseAmenities, amenityChips } from "./amenities";

describe("amenities", () => {
  it("parses JSON and matches filters", () => {
    const a = parseAmenities('{"parking":true,"highchair":false,"dogPolicy":"ok","playground":true}');
    expect(a.parking).toBe(true);
    expect(a.dogPolicy).toBe("ok");
    expect(matchesAmenityFilters(a, ["parking", "dogOk"])).toBe(true);
    expect(matchesAmenityFilters(a, ["highchair"])).toBe(false);
    expect(amenityChips(a).map((c) => c.key)).toContain("playground");
  });
});
