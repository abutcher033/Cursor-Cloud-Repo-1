import { describe, expect, it } from "vitest";
import { isThisWeekendEvent, upcomingWeekendWindow } from "./weekend";

describe("this weekend", () => {
  it("flags Sat Oct 3 event from Tue Sep 29", () => {
    const now = new Date("2026-09-29T16:00:00.000Z");
    const hit = isThisWeekendEvent(
      {
        kind: "event",
        startsAt: "2026-10-03T12:00:00.000Z",
        endsAt: "2026-10-03T18:00:00.000Z",
      },
      now,
    );
    expect(hit.weekend).toBe(true);
    const w = upcomingWeekendWindow(now);
    expect(w.start.getTime()).toBeLessThan(Date.parse("2026-10-03T12:00:00.000Z"));
    expect(w.end.getTime()).toBeGreaterThan(Date.parse("2026-10-03T12:00:00.000Z"));
  });
});
