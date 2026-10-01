import { describe, expect, it } from "vitest";
import { __clearWeatherCache, fetchWeather } from "./weather";

describe("weather", () => {
  it("falls back to SAMPLE when NWS blocked", async () => {
    __clearWeatherCache();
    const snap = await fetchWeather(39.4959, -76.8946, {
      fetchImpl: async () => {
        throw new Error("blocked");
      },
    });
    expect(snap.ok).toBe(false);
    expect(snap.source).toBe("sample");
    expect(snap.note.toLowerCase()).toContain("sample");
  });

  it("honors manual rainy-day when NWS fails", async () => {
    __clearWeatherCache();
    const snap = await fetchWeather(39.4959, -76.8946, {
      manualPoor: true,
      fetchImpl: async () => {
        throw new Error("blocked");
      },
    });
    expect(snap.poorOutdoor).toBe(true);
    expect(snap.source).toBe("manual");
  });

  it("parses NWS-shaped forecast and auto-boosts", async () => {
    __clearWeatherCache();
    const snap = await fetchWeather(39.5, -76.9, {
      fetchImpl: async (url) => {
        const u = String(url);
        if (u.includes("/points/")) {
          return new Response(JSON.stringify({ properties: { forecast: "https://api.weather.gov/gridpoints/LWX/1,1/forecast" } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({
            properties: {
              periods: [{ name: "This Afternoon", shortForecast: "Rain Showers", probabilityOfPrecipitation: { value: 70 } }],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });
    expect(snap.ok).toBe(true);
    expect(snap.source).toBe("nws");
    expect(snap.poorOutdoor).toBe(true);
    expect(snap.note).toContain("NWS");
  });
});
