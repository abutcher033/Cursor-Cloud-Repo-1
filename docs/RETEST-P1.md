# Local Life — P1 re-test brief

**For:** Local Life QA agent (`537d27bb-d7a8-4e39-9fe8-5fea5da8a06b`)  
**App:** `/workspace/local-fun` (Next.js, branded Local Life)  
**Dev:** http://localhost:3000 (health OK; fixture mode, 46 places). Do **not** reseed unless broken. Do **not** deploy/push.  
**Screenshots:** `/workspace/local-fun/screens/p1/`

Punch list items **9–20** are implemented, plus folded non-blocking P0 notes (Been upsert, detail origin geocode, SW static MIME). Re-verify each flow below. File bugs only if a check fails.

---

## What changed (summary)

| # | Issue | Fix |
| --- | --- | --- |
| P0+ | Been duplicates | `upsertBeenVisit()` + `@@unique([userId, placeId, status])` — double Mark Been stays one row. |
| P0+ | Detail absurd miles | `resolveDetailOrigin()` geocodes `near` when `olat`/`olng` missing (no 0,0). |
| P0+ | Static CSS/JS noise | SW v2 skips `/_next/*` cache (stale HTML + old chunks). |
| 9 | Photos | SVG category thumbs under `public/thumbs/`; cards + detail hero use `imageUrl`. |
| 10 | Campus clustering | Ag Center market + Fall Marketplace + Corn Maze → **Same stop · Westminster Ag Center** with numbered multi-stop + Plan this campus. |
| 11 | This weekend strip | Sat/Sun chips strip above ranked list; also on home (Family lens default). |
| 12 | Open now / opens soon | Heuristic from `whenHours` + `startsAt`; evening-only soft-demoted in morning. |
| 13 | Weather | NWS point forecast when reachable; auto indoor boost on high precip; SAMPLE/manual labeled honestly. |
| 14 | Verify honesty | Per-card / detail “Hours need a check · call …” + deep link (not only global SAMPLE banner). |
| 15 | Gotcha chips | patio, cash-only, no-stroller-in-fields, ticketed-online-only, etc. |
| 16 | Partner / household | `POST /api/share` → `/plan/[token]` magic link (2-person shortlist, no friend graph). |
| 17 | Saved collections | `/saved` tabs: All · Weekend shortlist · Indoor rainy-day; Save round-trip intact. |
| 18 | Review prompts | After Mark been → soft 30-sec review with tags (stroller, nap-friendly, loud?, parking). |
| 19 | Friends discovery | Badge on **You** nav + `Friends (N)` in settings when pending > 0. |
| 20 | Category empty traps | Empty categories show `· soon` chip (not selectable), e.g. Movies / theater. |

**Tests:** `npm test` (41). Prefer QA against http://localhost:3000.

---

## Repro / verify (exact)

Base: `http://localhost:3000`  
Demo: `casey@locallife.app` / `localfun-demo`

### Folded P0 notes

**Been upsert**
1. Sign in as Casey. Open `/places/hashawha` → Mark been twice (reload between).
2. `/recent`: exactly **one** Hashawha **Been** row.

**Detail origin without olat/olng**
1. Open `/places/oregon-ridge?near=21048&radius=40` (no olat/olng).
2. Distance must be ~10–15 mi crow-flies from 21048 (not a drive-time band) — **not** thousands of miles / (0,0).
3. Breakdown radius 40 mi.

### 9 — Photos
1. `/results?near=21048&radius=25` — cards have `[data-testid=place-thumb]` images.
2. `/places/webers?near=21048&radius=40` — `[data-testid=detail-hero]` is image+address, not address-on-gradient-only.

### 10 — Campus clustering
1. `/results?near=21048&radius=25&lens=1`.
2. Find `[data-testid=campus-cluster]` for Westminster Ag Center.
3. Expect **3** stops: Celebrating Fall, Fall Marketplace, Corn Maze.
4. Heading / copy includes **Same stop**.
5. **Plan this campus** (signed in) creates a `/plan/...` link.

### 11 — This weekend
1. Home or `/results?near=21048&radius=25&lens=1`.
2. `[data-testid=weekend-strip]` with Sat/Sun chips and weekend event cards (e.g. Celebrating Fall Oct 3).

### 12 — Open now / opens soon
1. Results list: some cards show `[data-testid=open-badge]` **Open now** or **Opens soon** when hours/event window matches.
2. Morning browse: evening-only (e.g. Fri 6–10 PM maze) is not forced to the top.

### 13 — Weather
1. Results note `[data-testid=weather-note]` — either **NWS:** … or **SAMPLE weather** / manual.
2. Form hint `[data-testid=weather-source-hint]` matches source honesty.
3. With NWS precip high or rainy-day checked, indoor backups rise under Family lens.

### 14 — Verify honesty
1. Card for Baugher’s / Weber’s / Carolyn Farm: `[data-testid=verify-line]` or verify badge **Hours need a check** with call/site link — not only the global SAMPLE banner.

### 15 — Gotcha chips
1. Corn Maze card: Cash only · No stroller in fields.
2. Weber’s detail: Tickets online only.
3. Patio brewery (Farmacy): Patio chip.

### 16 — Partner plan link
1. Signed in → place detail → **Plan with someone** (or Saved → Plan with someone).
2. Lands on `/plan/[token]` with `[data-testid=plan-title]` and listed places.
3. Guest can open the link without friend graph.

### 17 — Saved collections
1. Save a place from results → open `/saved` — place listed.
2. Tabs `[data-testid=tab-weekend]` / `[data-testid=tab-indoor]` show seeded Casey shortlists.
3. Add via detail **+ Weekend shortlist**.

### 18 — Review prompt
1. Mark been on a place without a review → redirect includes `reviewPrompt=1`.
2. `[data-testid=review-prompt]` 30-sec form with tag chips appears.

### 19 — Friends badge
1. Signed in as Casey (Riley pending).
2. Nav **You** shows `[data-testid=friends-badge]` with `1`.
3. Settings Lists → Friends (1).

### 20 — Category empty traps
1. Results → Change the search → Movies / theater chip is `[data-testid=cat-soon-movies_theater]` / `· soon`, not a dead-end filter.
2. Selecting only populated categories still works.

---

## Automated gate (optional)

```bash
cd /workspace/local-fun
npm test
# optional: npm run test:e2e   # builds + smoke on :3456; restart :3000 after if needed
```

---

## Out of scope for this re-test

- P2 punch items  
- Deploy, git push, DB wipe  
- Live Google / Ticketmaster providers  
- Perfect live photos (SVG category art is intentional for P1)

Report pass/fail per item 9–20 (+ folded P0 notes) with URL + short note. Screens under `screens/p1/` if useful.

---

## Ops note (executor)

- Dev on **:3000**; after `next build` / smoke on :3456, restart `next dev` if assets break.
- Do not run `npm run setup` unless health shows 0 places (seed upserts are OK).
- Automated: `npm test` → 41 pass; live checks against :3000 for campus (3 stops), NWS/SAMPLE weather note, friends badge, review prompt.
