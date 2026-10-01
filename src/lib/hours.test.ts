import { describe, expect, it } from "vitest";
import { extractWindow, openState, parseClock, isEveningOnly } from "./hours";

describe("hours heuristics", () => {
  it("parses clocks", () => {
    expect(parseClock("8 AM")).toBe(8 * 60);
    expect(parseClock("12 PM")).toBe(12 * 60);
    expect(parseClock("6:30 PM")).toBe(18 * 60 + 30);
  });

  it("extracts windows including 6–10 PM", () => {
    expect(extractWindow("Fri 6–10 PM; Sat 2–10 PM")).toEqual({ open: 18 * 60, close: 22 * 60 });
    expect(extractWindow("Sat Oct 3, 2026 · 8 AM–2 PM")).toEqual({ open: 8 * 60, close: 14 * 60 });
  });

  it("marks evening-only", () => {
    expect(isEveningOnly("Fri 6–10 PM")).toBe(true);
    expect(isEveningOnly("8 AM–2 PM")).toBe(false);
  });

  it("open now for in-progress event", () => {
    const now = new Date("2026-10-03T14:00:00.000Z"); // 10 AM ET
    const s = openState({
      whenHours: "Sat Oct 3, 2026 · 8 AM–2 PM",
      startsAt: "2026-10-03T12:00:00.000Z",
      endsAt: "2026-10-03T18:00:00.000Z",
      kind: "event",
      now,
    });
    expect(s.state).toBe("open_now");
    expect(s.label).toBe("Open now");
  });
});
