import { describe, expect, it } from "vitest";
import { buildIcs, icsUtc, resolveWindow } from "./ics";

describe("ics", () => {
  it("builds a VEVENT with UID and DTSTART", () => {
    const blob = buildIcs({
      id: "ag-celebrating-fall",
      title: "Celebrating Fall",
      address: "Westminster, MD",
      startsAt: "2026-10-03T12:00:00.000Z",
      endsAt: "2026-10-03T18:00:00.000Z",
      whenHours: "Sat Oct 3 · 8 AM–2 PM",
      url: "https://example.com",
    });
    expect(blob).toContain("BEGIN:VCALENDAR");
    expect(blob).toContain("SUMMARY:Celebrating Fall");
    expect(blob).toContain("UID:ag-celebrating-fall@locallife.local");
    expect(blob).toContain("DTSTART:20261003T120000Z");
  });

  it("falls back to next Saturday when no startsAt", () => {
    const now = new Date("2026-09-29T15:00:00-04:00");
    const { start } = resolveWindow({ id: "x", title: "Park" }, now);
    expect(start.getDay()).toBe(6);
    expect(icsUtc(start)).toMatch(/T/);
  });
});
