import { FixtureProvider } from "./fixture";
import { LiveDiscoveryProvider } from "./live";
import type { DiscoveryProvider } from "./types";

export function getProvider(): DiscoveryProvider {
  const mode = process.env.DISCOVERY_MODE ?? "fixture";
  if (mode === "live") {
    const hasGoogle = !!process.env.GOOGLE_PLACES_API_KEY;
    const hasTm = !!process.env.TICKETMASTER_API_KEY;
    if (!hasGoogle && !hasTm) {
      console.warn("DISCOVERY_MODE=live but API keys are missing; staying on fixtures.");
      return new FixtureProvider();
    }
    return new LiveDiscoveryProvider();
  }
  return new FixtureProvider();
}

export function discoveryModeLabel(): "fixture" | "live" | "live-partial" {
  const mode = process.env.DISCOVERY_MODE ?? "fixture";
  if (mode !== "live") return "fixture";
  const g = !!process.env.GOOGLE_PLACES_API_KEY;
  const t = !!process.env.TICKETMASTER_API_KEY;
  if (g && t) return "live";
  if (g || t) return "live-partial";
  return "fixture";
}
