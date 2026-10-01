# Front-end pass notes (Home + Results polish)

Date: 2026-09-30 (America/New_York)

## What changed

Warm Local Life brochure polish on **Home**, **Onboarding**, and **Results** — real photos, motion, micro-interactions — without touching ranking, Prisma schema, DiscoveryProvider contracts, or Go/Save/Rate auth rules. SAMPLE badges remain.

**No Tailwind added.** All styling extends `app/globals.css` forest / cream / copper tokens.

## Files touched

| Path | Change |
| --- | --- |
| `app/globals.css` | Hero, mood strip, photo cards, match/distance pills, press/hover motion, CTA glow, skeletons, collapsed demo banner, empty-art |
| `app/page.tsx` | HomeHero + weekend strip; search form anchored under `#search` |
| `app/layout.tsx` | Demo banner folded into `<details>` (still `data-testid="discovery-banner"`) |
| `app/onboarding/page.tsx` | Hero photo + CTA motion |
| `app/results/page.tsx` | Mood photo strip; empty-state illustration |
| `app/loading.tsx` | Hero + strip + card shimmer skeletons |
| `src/components/HomeHero.tsx` | **New** — cover hero, CTAs, mood strip |
| `src/components/PlaceCard.tsx` | Photo frame, overlay badges, Match vs distance hierarchy, press feedback |
| `src/components/WeekendStrip.tsx` | Client day chips (All/Sat/Sun), photo thumbs, SAMPLE corner tag |
| `src/components/SearchForm.tsx` | Chip press classes + CTA pop on submit |
| `src/lib/photos.ts` | **New** — place ID → local brochure photos; thumb path → Unsplash lifestyle fallbacks |
| `public/photos/*` | Resized local place JPEGs from brochure cache |
| `public/brand/*` | Cover hero, mood banners, logo |
| `public/illustrations/empty-range.svg` | Empty results illustration |

## How to preview

```bash
cd /workspace/local-fun
npm run dev
```

Open http://localhost:3000

### Click path

1. **Onboarding** (clear `lf_onboarded` cookie or use a fresh browser) — hero image + “Show me Saturday”.
2. **Home** — cover hero (“Tune my search” / “Open ranked list”), mood strip, weekend scroller with real photos, Sat/Sun chips, search CTA glow.
3. **Results** (`near=21048&radius=25`) — mood strip under weather note; place cards with full-bleed photos, copper **Match** pill vs cream distance pill; Go/Save/Open press scale.
4. Empty state: `near=10001&radius=10` — SVG “Widen the map” art + radius chips.
5. Guest vs signed-in: Go/Save still route guests to `/auth` — unchanged.

Demo login: `casey@locallife.app` / `localfun-demo`

## Residual risks

- Unsplash URLs need network; offline falls back only for mapped local `/photos` and `/brand` assets. SVG thumbs are resolved away by `resolvePlaceImage`.
- `WeekendStrip` is now a client component (day filter); SSR still ships the full list HTML for first paint of cards after hydration filters.
- Match score `data-testid="match-score"` moved onto the photo overlay pill (still present).
- Large PNGs from brochure were recompressed to JPEG under `public/`; logo capped at 256px wide.
- Did **not** deploy, push, or commit secrets.

## Follow-ups / fixes during pass

- `WeekendStrip` is a client component; callers pass serializable `detailQuery` (not a function) so RSC does not explode.
- Removed a stale `@ts-expect-error` in `ResultsMap.tsx` that blocked `npm run build`.
- Dev server on :3000 was restarted after production build invalidated `.next` chunks.
