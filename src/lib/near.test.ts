import { describe, expect, it } from "vitest";
import {
  isSeedOrigin,
  lastSearchToQs,
  nearQuery,
  readLastSearch,
  SEED_HOME,
  serializeLastSearch,
} from "./near";

describe("nearQuery", () => {
  it("strips pretty geocode labels to bare zip", () => {
    expect(nearQuery("21048 · Finksburg, MD")).toBe("21048");
    expect(nearQuery("21093 · Timonium, MD")).toBe("21093");
    expect(nearQuery("10001 · New York, NY")).toBe("10001");
  });

  it("passes bare zip and address through", () => {
    expect(nearQuery("21048")).toBe("21048");
    expect(nearQuery("  21157  ")).toBe("21157");
    expect(nearQuery("456 York Rd, Lutherville, MD")).toBe("456 York Rd, Lutherville, MD");
  });

  it("extracts zip from mixed strings", () => {
    expect(nearQuery("near 21048 please")).toBe("21048");
  });
});

describe("last search restore", () => {
  it("round-trips cookie payload with clean near", () => {
    const raw = serializeLastSearch({
      near: "21048 · Finksburg, MD",
      radius: 40,
      categories: ["food_drink"],
      familyLens: true,
      weatherPoor: false,
    });
    const parsed = readLastSearch(encodeURIComponent(raw));
    expect(parsed).toEqual({
      near: "21048",
      radius: 40,
      categories: ["food_drink"],
      familyLens: true,
      weatherPoor: false,
      under90: false,
      amenities: [],
    });
    expect(lastSearchToQs(parsed!)).toContain("near=21048");
    expect(lastSearchToQs(parsed!)).toContain("radius=40");
    expect(lastSearchToQs(parsed!)).toContain("lens=1");
  });

  it("returns null for junk", () => {
    expect(readLastSearch("nope")).toBeNull();
    expect(readLastSearch("")).toBeNull();
  });
});

describe("seed origin", () => {
  it("matches Finksburg seed coords", () => {
    expect(isSeedOrigin(SEED_HOME.lat, SEED_HOME.lng)).toBe(true);
    expect(isSeedOrigin(39.4437, -76.631)).toBe(false);
  });
});
