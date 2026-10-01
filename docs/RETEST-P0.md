# Local Life — P0 re-test brief

**For:** Local Life QA agent (`537d27bb-d7a8-4e39-9fe8-5fea5da8a06b`)  
**App:** `/workspace/local-fun` (Next.js, branded Local Life)  
**Dev:** http://localhost:3000 (health OK; fixture mode, 46 places). Do **not** reseed unless broken. Do **not** deploy/push.  
**Screenshots:** `/workspace/local-fun/screens/p0/`

Punch list items **1–8 are implemented**. Re-verify each flow below. File bugs only if a check fails.

---

## What changed (summary)

| # | Issue | Fix |
| --- | --- | --- |
| 1 | `near` encoded `21048 · Finksburg, MD` | `nearQuery()` strips pretty labels; forms submit bare zip/address. `src/lib/near.ts`, `SearchForm`, home/results. |
| 2 | Cards said “min from Finksburg” | Cards show haversine miles only. Detail may mention seed drive **only** when origin is seed home. |
| 3 | Detail rank used saved home 25 mi after 40 mi search | Place links carry `near`/`radius`/`lens`/origin; breakdown: “Why this match (from this search, N mi)”. |
| 4 | Go/Went vocabulary | Planning (confirm sheet) → Going (open visit) → Been. Went tab has badge legend. Softened “Recently Went as planned”. |
| 5 | Duplicate Planned visits | `upsertOpenVisit()` — one open `planned` per user+place; extras deleted. |
| 6 | “Rank 100” | UI shows **Match N**; formula under `<details>` only. |
| 7 | Explore `/results` lost search | `lf_last` cookie + `sessionStorage`; bare `/results` restores; Explore nav uses last qs. |
| 8 | Empty CTA | Empty state chip **Search 21048** when origin ≠ 21048. |

**Tests:** `npm test` (32) · `node scripts/smoke.mjs` (P0 checks included). README has a P0 section.

---

## Repro / verify (exact)

Base: `http://localhost:3000`  
Demo: `casey@locallife.app` / `localfun-demo`

### 1 — Clean `near` param
1. Open `/`.
2. Confirm `#near` / `[data-testid=near-input]` value is `21048` (not `21048 · Finksburg, MD`).
3. Submit search. URL must be like `/results?near=21048&radius=…` — **no** `·` / `Finksburg` in `near=`.
4. Fail if the query string contains the pretty label.

### 2 — No hard-coded Finksburg drive on arbitrary origins
1. Open `/results?near=21093&radius=10`.
2. Body must **not** contain `from Finksburg` or `min from Finksburg`.
3. Cards should show `X mi away` and **Match N**, not drive-from-Finksburg.
4. Optional: `/results?near=21048&radius=10` — miles OK; still no “Rank”.

### 3 — Detail score uses search radius
1. Open `/results?near=21048&radius=40`.
2. Open **Oregon Ridge** (Open / title link).
3. URL should include `radius=40` (and origin params).
4. Summary `[data-testid=rank-breakdown]` → **Why this match (from this search, 40 mi)** — not “saved home, 25 mi”.
5. Expand details → parts include `radius 40 mi`.
6. Fail if breakdown says saved home 25 after a 40 mi search.

### 4 — Planning / Going / Been
1. Sign in as Casey. Go to any place → Go.
2. Confirm sheet heading **Planning**; button **Confirm Going**.
3. After confirm: note **Saved as Going** (not “Recently Went as planned”).
4. Open `/recent` (Went tab): title **Going & Been**; `[data-testid=status-legend]` present; open visits badge **Going**, done **Been**.

### 5 — Idempotent Go (no duplicate rows)
1. Signed in, open `/go/hashawha?olat=39.4959&olng=-76.8946&olabel=21048`.
2. Confirm Going twice (reload confirm sheet and confirm again).
3. `/recent`: exactly **one** Hashawha row with badge **Going** (not two Planned/Going).
4. Fail on Maggie’s-style double Planned.

### 6 — Match not Rank
1. Any results list: text has `Match ` and **no** `Rank `.
2. Detail meta also `Match N`.

### 7 — Explore restores last search
1. Visit `/results?near=21093&radius=10` (wait for paint so cookie/sessionStorage write).
2. Navigate to bare `/results` (or tap **Explore** in nav).
3. Expect restored origin **21093** (`[data-testid=search-near]` or URL `near=21093`), not a silent snap to empty/default-only with wrong zip.
4. Fail if Explore drops you on a blank/default search with no last near.

### 8 — Empty CTA Search 21048
1. Open `/results?near=10001&radius=10`.
2. Empty state `[data-testid=empty-state]` visible.
3. Chip `[data-testid=empty-chip-21048]` **Search 21048** present (plus wider-radius chips).
4. Click chip → results for 21048.

---

## Automated gate (optional)

```bash
cd /workspace/local-fun
npm test
node scripts/smoke.mjs   # expects a production build on :3456; or use npm run test:e2e
```

---

## Out of scope for this re-test

- P1 / P2 punch items  
- Deploy, git push, DB wipe  
- Live Google / Ticketmaster providers  

Report pass/fail per item 1–8 with URL + short note. Screens under `screens/p0/` if useful.

---

## Ops note (executor)

- After `next build` / smoke on :3456, `.next` can break a concurrent `next dev`. Dev was restarted on **:3000** without reseeding (`places: 46` still). Prefer QA against http://localhost:3000.
- Do not run `npm run setup` unless health shows 0 places.
- Automated confirmation: `npm test` → 32 pass; `node scripts/smoke.mjs` → pass (needs prior `next build`); live Playwright against :3000 → items 1–8 pass.
