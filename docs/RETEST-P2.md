# Local Life — P2 re-test brief

**For:** Local Life QA agent (`537d27bb-d7a8-4e39-9fe8-5fea5da8a06b`)  
**App:** `/workspace/local-fun` (Next.js, branded Local Life)  
**Dev:** http://localhost:3000 (health OK; fixture mode). Do **not** reseed unless broken. Do **not** deploy/push.  
**Screenshots:** `/workspace/local-fun/screens/p2/`

Punch list items **21–30**. Re-verify each flow below. File bugs only if a check fails.

---

## What changed (summary)

| # | Issue | Fix |
| --- | --- | --- |
| P1 note | Oregon Ridge miles | RETEST-P1 crow-flies band set to **~10–15 mi** (not drive-time). |
| 21 | Local Life editor sync | `npm run sync:editorial` imports Must-try/Niche from local-life-log.md, retires ended events; docs/EDITORIAL-SYNC.md (~2×/week). |
| 22 | Calendar + reminders | `GET /api/calendar/[id]` → `.ics` download; in-app **This week** share text; email digest documented as Phase-later (`DIGEST_WEBHOOK_URL`). |
| 23 | Map results | Leaflet/OSM map of current result set (`[data-testid=results-map]`); tap pin → scroll/flash card. No API key. |
| 24 | Duration / nap fit | `visitMinutes` on fixtures + **Under 90 min** filter chip. |
| 25 | Amenity tags | parking / highchair / changing table / playground / bathrooms / dog OK — seeded where known + filter chips. |
| 26 | Live providers | `LiveDiscoveryProvider` calls Google Places + Ticketmaster when env keys exist; else fixtures. Live mode strips SAMPLE/seed public stars. `.env.example` documents vars. |
| 27 | Offline PWA | SW v3 caches last `/results` + `/places/*`; never caches auth APIs; `/offline` shows `localStorage` last results. |
| 28 | Report → triage | `/admin/reports` — `ADMIN_EMAIL` match or demo Casey; guests redirected to sign-in. |
| 29 | Onboarding | First-run `/onboarding`: home zip → optional kids ages → Family lens → Saturday results. Skips category wall. Cookie `lf_onboarded`. **Fix (re-test FAIL):** `redirectTo` now uses `NextResponse.redirect` (mutable) so POST `/api/onboarding` can set `lf_onboarded` + `lf_guest` without immutable-header 500. |
| 30 | Share card | `/share/week` printable card + `/share/week/opengraph-image` (forest/cream/copper). |

**Tests:** `npm test` (48). Prefer QA against http://localhost:3000.

---

## Repro / verify (exact)

Base: `http://localhost:3000`  
Demo: `casey@locallife.app` / `localfun-demo`

### 21 — Editorial sync
1. `cd /workspace/local-fun && npm run sync:editorial -- --dry` — prints Must-try `ag-celebrating-fall`, Niche `baughers-farm`.
2. Without `--dry`, pins update; results note shows Must-try Celebrating Fall + Niche Baugher’s.
3. Read `docs/EDITORIAL-SYNC.md` for 2×/week cadence.

### 22 — ICS + digest stub
1. `/places/ag-celebrating-fall?near=21048&radius=25` → **Add to calendar** (`[data-testid=add-to-calendar]`).
2. Download is `text/calendar` with `BEGIN:VCALENDAR` / `SUMMARY:`.
3. Results show `[data-testid=week-digest]` + copy button. Email digest is documented only (no mailer).

### 23 — Map
1. `/results?near=21048&radius=25&lens=1` → `[data-testid=results-map]` OSM map.
2. Tap a pin → page scrolls to that `[data-place-id]` card (flash outline).

### 24 — Under 90 min
1. `/results?near=21048&radius=25&lens=1` note count (e.g. ~44).
2. Check **Under 90 min** → count drops (e.g. ~42); Renfest/Zoo-length visits excluded.
3. Detail shows `[data-testid=visit-mins]` ~N min.

### 25 — Amenity filters
1. Results form chips: Parking, Highchair, Changing table, Playground, Bathrooms, Dog OK.
2. `/results?near=21048&radius=25&lens=1&amenity=playground` → fewer results; cards show amenity badges where seeded.

### 26 — Live providers (keys optional)
1. Default: health `discovery: "fixture"`; banner says sample catalog.
2. Without keys, `DISCOVERY_MODE=live` still falls back to fixtures (tests pass).
3. With keys set, live mode banner warns SAMPLE/seed public stars are stripped. Required: `GOOGLE_PLACES_API_KEY`, `TICKETMASTER_API_KEY` (see `.env.example`).

### 27 — Offline PWA
1. Open a results page online (caches last results in `localStorage` + SW results cache).
2. `/offline` shows `[data-testid=offline-results]` when cache exists.
3. SW must **not** cache `/api/auth`, `/api/me`, `/api/save`, etc. (inspect `public/sw.js` PRIVATE / isAuthApi).

### 28 — Admin reports
1. Signed out → `/admin/reports` redirects to `/auth?next=/admin/reports`.
2. Sign in as Casey → `/admin/reports` lists reports (`[data-testid=admin-reports]`).
3. From a place detail, submit a report → it appears in the triage list.

### 29 — Onboarding
1. Clear `lf_onboarded` cookie (or private window) → `/` redirects to `/onboarding`.
2. Enter zip `21048`, optional ages, submit → lands on Family lens results (no category wall required).
3. `[data-testid=onboarding]` / `onboard-submit` present.

**Fix note (P2 re-test FAIL → fixed):** POST `/api/onboarding` was returning HTTP 500 because `redirectTo()` used `Response.redirect()`, whose headers are immutable, then the route called `headers.append("Set-Cookie", …)` for `lf_onboarded` / `lf_guest` and threw `TypeError: immutable`. `redirectTo` now returns `NextResponse.redirect` from `next/server` so cookies can be set; curl smoke expects 302/303 with `Set-Cookie` and `Location` toward `/results?near=21048…&lens=1`. Covered by `src/lib/text.test.ts` and the onboarding POST check in `scripts/smoke.mjs`.

### 30 — Share card
1. `/share/week` → `[data-testid=share-card]` Must-try card (brochure colors).
2. `/share/week/opengraph-image` returns PNG 1200×630.
3. Results Must-try note links **Share card**.

---

## Automated gate

```bash
cd /workspace/local-fun
npm test
# optional: npm run sync:editorial -- --dry
```

---

## Out of scope for this re-test

- Public deploy / git push  
- Real Google/Ticketmaster calls without keys  
- Production email digest delivery  

Report pass/fail per item 21–30 with URL + short note. Screens under `screens/p2/` if useful.

---

## Ops note (executor)

- Dev on **:3000**; fixture mode default.  
- After schema changes, restart `next dev` so Prisma client picks up `visitMinutes` / `amenities`.  
- Do not run `npm run setup` unless health shows 0 places.  
- Automated: `npm test` → pass (includes redirectTo cookie mutability).
