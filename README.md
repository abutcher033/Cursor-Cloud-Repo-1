# Local Life

Phase 1 local app: ranked events, food, and things to do near any zip or address. Guests can browse and read reviews. Sign-in unlocks Go, Save, ratings, and friends.

Phase 0 called the working folder `local-fun`. This checkout is the repository root. The shippable UI is branded **Local Life** — same forest / cream / copper layout as `mockups/`.

Nothing here is deployed. `DISCOVERY_MODE` stays `fixture` unless Phase 2 keys are set on the server.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Then open http://localhost:3000.

`.env` is local only. Copy it from `.env.example` and do not commit it. `npm run dev` creates the SQLite database and loads the fixture catalog. Equivalent pieces: `npm run setup` then `npx next dev`.

## Demo accounts

Password for every seeded account: `localfun-demo`

| Email | Who |
| --- | --- |
| casey@locallife.app | You, for the walkthrough. Home is 21048. Jamie is already a friend. Riley’s request is waiting. |
| jamie@locallife.app | Accepted friend. Already marked Been at Oregon Ridge, Maggie’s, and Northwest Regional Park. |
| riley@locallife.app | Pending friend request to Casey. |
| avery.sample@locallife.app | Extra sample reviewer only. |

Reviews already in the database are labeled sample text. They are not real guest quotes.

## How to demo radius and origin

The catalog is a Carroll / north Baltimore seed with real lat/lng. Search is not hard-coded to Finksburg.

1. Home, location `21048`, radius **10**. You get Finksburg, Westminster, Reisterstown, Hampstead, Sykesville / Eldersburg, and the nearer Owings Mills stops. You do **not** get the Timonium fairgrounds, Weber’s in Parkville, or the Renaissance Festival.
2. Switch the same origin to **40**. Those farther listings appear (Timonium, Oregon Ridge, Hunt Valley, Weber’s, the Zoo, Renfest in Crownsville). The result count jumps.
3. Change the location to `21093` (Timonium) at 10 miles. The fairgrounds and Oregon Ridge move to the front; CCPL Finksburg drops out.
4. Try `10001`. The geocoder (offline zip table) places New York and the catalog is empty, with links to widen the radius. That empty state is the point: coverage is data, not a fixed county wall.

Radius is the `R` in distance decay (`1 - (d/R)^0.85`) and the haversine cutoff. A place 12 miles away scores higher on the distance term at 40 miles than at 15, and it is excluded entirely at 10.

Geocoding order: server cache, then the offline MD zip table (21048, 21157, 21117, 21093, and others), then [Nominatim](https://nominatim.openstreetmap.org/) if the query is a street we don’t know. If Nominatim is down, a city name in the text still falls back to the table. Unknown input is an error, not a silent snap back to Finksburg.

## Tests

```bash
npm test          # ranking, geocode, filter/rank pipeline
npm run test:e2e  # build, Playwright smoke (search, go, review, friends), screenshots
```

Screenshots land in `screens/` at iPhone 390×844 and iPad 768×1024.

## What Phase 2 adds

`DISCOVERY_MODE=fixture` is the default. `src/lib/providers/types.ts` is the one `DiscoveryProvider` (`searchPlaces`, `searchEvents`, `getPlace`, `geocode`). `LiveDiscoveryProvider` is a stub that still serves fixtures.

When you are ready:

- Set `GOOGLE_PLACES_API_KEY` and `TICKETMASTER_API_KEY` on the server only. Never send them to the browser.
- Implement live `searchPlaces` / `searchEvents` behind the same interface and keep fixtures as the fallback when a key is missing or a call fails.
- Cache live results by `discoveryCacheKey()` in `src/lib/geo.ts`: geohash precision 5 + radius + sorted categories + family lens.
- Keep ranking in `src/lib/ranking.ts`. Do not let a provider invent its own sort.
- Optional later: NWS weather instead of the Rainy-day checkbox, Nominatim as the steady geocoder with the zip table as backup, Postgres instead of SQLite.

## Phase 1 boundaries

- No live Google Places or Ticketmaster calls.
- No in-app turn-by-turn, tickets, or payments.
- No admin screen for the report queue (reports are stored).
- No email verification. Password sessions only, so it runs offline of a mail server.
- Category multi-select is inclusive (OR), plus Free & cheap as an extra price filter. A strict AND of every selected chip would empty a mixed feed.
- Friends boost is `8 * log1p(n) / log1p(5)` (spec left the weight unnamed).
- The service worker caches the public shell and pages you already opened. It does not cache `/api`, settings, friends, saved, recent, or go.
- Public star counts in the seed are sample figures for the formula, not live Google data. Rows badged SAMPLE are fictional.
- `driveMin` is seed metadata (typical drive from Finksburg). Cards show haversine miles from the *current* search origin only — they never say “from Finksburg” for arbitrary zips. Detail may mention seed drive only when the origin *is* the seed home.

## P0 ship / trust fixes

Punch-list blockers fixed in this tree (no deploy):

1. **Clean `near` param** — forms submit bare zip/address (`21048`). Pretty labels (`21048 · Finksburg, MD`) are display-only via `nearQuery()` in `src/lib/near.ts`.
2. **No hard-coded Finksburg drive on cards** — result cards omit `driveMin`; miles are from the active origin.
3. **Detail score matches the search** — place links carry `near` / `radius` / `lens` / origin; the breakdown says “from this search, N mi” and scores with that radius.
4. **Vocabulary** — Planning (confirm sheet) → Going (saved open visit) → Been. Went tab has a badge legend. Softened “Recently Went as planned”.
5. **Idempotent Go** — `upsertOpenVisit()` keeps one open (`planned`) visit per user+place.
6. **Match not Rank** — cards/detail show `Match 86`; formula stays under a details disclosure.
7. **Explore restore** — `/results` with no query restores last `near`/`radius`/`lens` from the `lf_last` cookie (also mirrored to `sessionStorage` for the Explore nav link).
8. **Empty CTA** — empty states include a **Search 21048** chip when the origin isn’t already the seed zip.

## P1 polish

Items 9–20 (+ folded P0 Been upsert, detail geocode, SW static fix). See `docs/RETEST-P1.md` and `screens/p1/`.

Highlights: place thumbs + detail hero, Ag Center campus cluster, this-weekend strip, open-now badges, NWS weather with honest SAMPLE fallback, per-card verify lines, gotcha chips, `/plan/[token]` share links, Weekend/Indoor saved lists, post-Been review prompt, You-tab friends badge, empty category “soon” chips.

## Layout

- `app/` Next.js App Router UI and `/api` routes from the spec
- `src/lib/ranking.ts` pure score
- `src/lib/pipeline.ts` haversine filter + sort
- `src/lib/geocode.ts` Nominatim + cache + offline zips
- `data/fixtures/finksburg-21048.json` seed catalog
- `prisma/schema.prisma` SQLite
- `mockups/` Phase 0 wireframes (unchanged)
- `docs/DRAFT-SPEC.md` Phase 0 spec


## P2 extras

| Command / path | What |
| --- | --- |
| `npm run sync:editorial` | Import Must-try/Niche + retire ended events from Local Life markdown (see `docs/EDITORIAL-SYNC.md`) |
| `/api/calendar/[id]` | Download outing as `.ics` |
| `/share/week` | Must-try share / print card + OG image |
| `/onboarding` | First-run zip + kids ages → Family lens Saturday |
| `/admin/reports` | Report triage (`ADMIN_EMAIL` or Casey demo) |
| `/offline` | Last cached results when the network is gone |

### Live discovery env (optional)

```
DISCOVERY_MODE=fixture   # default — tests and localhost stay green
GOOGLE_PLACES_API_KEY=   # Places API (New) Nearby Search
TICKETMASTER_API_KEY=    # Discovery API
ADMIN_EMAIL=             # lock /admin/reports (Casey always allowed in demo)
DIGEST_WEBHOOK_URL=      # documented Phase-later hook only
```

When `DISCOVERY_MODE=live` and keys exist, Google + Ticketmaster results merge with the seed. SAMPLE/seed **public** star counts are cleared so they never look live. Without keys, fixtures remain the source of truth.
