/**
 * Presentation-only image resolution for the demo.
 * Prefer local brochure photos; fall back to category Unsplash URLs; keep SVG thumbs last.
 * Does not change ranking, Prisma, or provider contracts.
 */

const PLACE_PHOTOS: Record<string, string> = {
  "baughers-restaurant": "/photos/baughers.jpg",
  "baughers-farm": "/photos/baughers-farm.jpg",
  "oregon-ridge": "/photos/oregon-ridge.jpg",
  hashawha: "/photos/hashawha.jpg",
  "piney-run": "/photos/piney-run.jpg",
  "irvine-nature": "/photos/irvine.jpg",
  "farmacy-brewing": "/photos/farmacy.jpg",
  "brewery-fire": "/photos/brewery-fire.jpg",
  "pub-dog": "/photos/pubdog.jpg",
  "bc-brewery": "/photos/bc-brewery.jpg",
  "brewing-1623": "/photos/1623.jpg",
  maggies: "/photos/maggies.jpg",
  "westminster-market": "/photos/westminster-market.jpg",
  "ag-celebrating-fall": "/photos/westminster-market.jpg",
  "sykesville-market": "/photos/sykesville.jpg",
  "sykesville-fall-fest": "/photos/sykesville.jpg",
};

/** Warm local/lifestyle Unsplash photos keyed by existing thumb paths */
const THUMB_FALLBACKS: Record<string, string> = {
  "/thumbs/park.svg":
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=960&q=80",
  "/thumbs/farm.svg":
    "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=960&q=80",
  "/thumbs/food.svg":
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=960&q=80",
  "/thumbs/brewery.svg":
    "https://images.unsplash.com/photo-1559526324-593bc073d938?auto=format&fit=crop&w=960&q=80",
  "/thumbs/festival.svg":
    "https://images.unsplash.com/photo-1488459716781-31db5254d4b3?auto=format&fit=crop&w=960&q=80",
  "/thumbs/seasonal.svg":
    "https://images.unsplash.com/photo-1506917728037-b6af01a7d403?auto=format&fit=crop&w=960&q=80",
  "/thumbs/indoor.svg":
    "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=960&q=80",
  "/thumbs/museum.svg":
    "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=960&q=80",
  "/thumbs/music.svg":
    "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=960&q=80",
  "/thumbs/sport.svg":
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=960&q=80",
  "/thumbs/night.svg":
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=960&q=80",
  "/thumbs/default.svg":
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=960&q=80",
};

export const HOME_HERO_IMAGE = "/brand/ll-cover-hero.jpg";

export const HOME_MOOD_STRIP: { src: string; alt: string; label: string }[] = [
  { src: "/brand/ll-banner-trails.jpg", alt: "Wooded trail in autumn light", label: "Trails" },
  { src: "/brand/ll-banner-farms.jpg", alt: "Farm fields near Carroll County", label: "Farms" },
  { src: "/brand/ll-banner-food.jpg", alt: "Local plate and warm dining vibe", label: "Food" },
  { src: "/brand/ll-banner-events.jpg", alt: "Community festival crowd", label: "Events" },
  { src: "/brand/ll-banner-breweries.jpg", alt: "Local taproom pour", label: "Brews" },
];

export function resolvePlaceImage(id: string, imageUrl?: string | null, name?: string): string {
  if (PLACE_PHOTOS[id]) return PLACE_PHOTOS[id];
  const raw = imageUrl || "/thumbs/default.svg";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/photos/") || raw.startsWith("/brand/")) return raw;
  if (THUMB_FALLBACKS[raw]) return THUMB_FALLBACKS[raw];
  return THUMB_FALLBACKS["/thumbs/default.svg"];
}

export function placeImageAlt(name: string, sample?: boolean): string {
  const base = name ? `Photo vibe for ${name}` : "Local place photo";
  return sample ? `${base} (sample listing)` : base;
}
