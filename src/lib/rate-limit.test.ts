import { describe, expect, it } from "vitest";
import { withinDailyLimit } from "./rate-limit";

describe("review daily limit", () => {
  it("allows five writes and blocks the sixth", () => {
    const now = Date.now();
    const stamps = [0, 1, 2, 3, 4].map((n) => now - n * 1000);
    expect(withinDailyLimit(stamps.slice(0, 4), now, 5)).toBe(true);
    expect(withinDailyLimit(stamps, now, 5)).toBe(false);
    expect(withinDailyLimit([now - 90_000_000], now, 5)).toBe(true);
  });
});
