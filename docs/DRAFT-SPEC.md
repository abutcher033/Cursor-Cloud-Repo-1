# Local Fun — DRAFT Product + Technical Spec

**Status:** Phase 0 draft (not built, not deployed)  
**Working name:** Local Fun (Austin can rename)  
**Home region (seed):** Finksburg MD 21048 / Carroll County / north Baltimore orbit  
**Authoring date:** 2026-09-29 (ET)  
**Audience:** Product sections are readable by a non-engineer; architecture and API sections are for implementers.

---

## 1. One-sentence pitch

Local Fun finds events, food, and things to do near a zip or address, ranks them intelligently, and lets signed-in people tap **Go**, get directions, and leave ratings/reviews that other users can see.

---

## 2. Product vision

Local Fun sits between a map search (Google/Yelp) and a personal curator (the **Local Life** bot pattern already used around Finksburg). Map search is noisy and star-heavy. Local Life is warm, verified, and family-aware — but manual. Local Fun aims to be:

- **Browseable** on first visit (guest can look; accounts unlock Go / reviews).
- **Ranked with intent**, not just distance or Google stars.
- **Social lightly**: “I’m going,” Recently Went, public community ratings — friends/chat later.
- **Honest about data**: live APIs where they help, plus a curated “Local Life–style” seed list for the home region that an editor can update.

Inspiration (read-only; do **not** copy private household details into product defaults beyond the region):

- `/home/box/agent-data/agents/537d27bb-d7a8-4e39-9fe8-5fea5da8a06b/local-life-log.md`
- `/home/box/agent-data/agents/537d27bb-d7a8-4e39-9fe8-5fea5da8a06b/local-life-events.md`
- `/workspace/local-life-brochure/` (`build_brochure.py`, Fall 2026 guide)

---

## 3. User flows

### 3.1 First visit (guest)

1. Land on Home. Soft prompt: “Where should we look?” (zip or address). Pre-fill suggestion for demo: **21048**.
2. Optional category chips (multi-select). Default = light mix of all categories (“smatter of all”).
3. Radius slider/chips: 5 / 10 / 15 / 25 / 40 / 60 miles. **Default ~25** (Finksburg → Westminster / Owings Mills / Timonium comfortably).
4. Tap Search → Results list, ranked.
5. Open a place/event → Detail (description, pricing, hours/datetime, link, map pin, public + community stars).
6. Guest can browse detail and open the official link. **Go**, **Save**, and **Rate** ask them to sign in.

### 3.2 Sign up / login

- Email signup/login only for write actions.
- **No anonymous reviews.** Reviews require a verified session.
- Auth options (decision for Austin): magic link vs email+password (see §14).
- After auth, return to the screen they came from (e.g. pending Go).

### 3.3 Set home location

- Settings / first-run: zip **or** street address → geocode → store lat/lng + display label.
- Used as default search origin and as the **origin** for directions deep-links.
- User can override location per search without changing Home.

### 3.4 Browse ranked results

- Filters: categories (AND of selected types), radius, optional price band, optional Free & cheap toggle, optional **Family lens** (see §5.2).
- Sort is the ranking score (not raw distance). Secondary sort: distance, then name.
- Empty state: widen radius or clear a category; show curated seed hits even if APIs are empty (fixture mode).

### 3.5 Place / event detail

- Full card content (see §6) plus map thumbnail, community reviews list, Report link.
- Actions: **Go** · **Save** · **Been** (if already past) · Official site.

### 3.6 Go → directions + Recently Went

1. Signed-in user taps **Go**.
2. Confirmation sheet: “Opening directions from [Home / current search location] to [Place].”
3. Hand off via deep-link to Apple Maps or Google Maps (`origin` + `destination` query params). No paid Directions API in v1.
4. App records a **Recently Went** entry (status: planned → after time window or user mark, “been”).
5. Reminder nudge (in-app, later): “How was Cornfusion?” → rate/review from Recently Went.

### 3.7 Rate / review

- From Recently Went (preferred) or detail page after Been.
- Star rating (1–5) + optional short text.
- Visible to other signed-in users (and optionally guests — decision §14).
- Edit/delete own review; report others’.

### 3.8 Profile / settings

- Display name, home location, default radius, default categories, Family lens on/off.
- Minimal public profile: display name + review count (no home street address public).
- Phase 2: follow friends.

### 3.9 Flow diagram (text)

```
Guest home → set zip/radius/categories → results → detail
                                              ↓
                                    [Sign in to Go / Review]
                                              ↓
Signed-in → Go → maps deep-link + Recently Went → later Rate
         → Save → Saved list
         → Settings (home, categories, radius, Family lens)
```

---

## 4. Categories of entertainment

Multi-select. Default = smatter of all (no filter = show mixed ranked feed).

| ID | Label | Notes / Local Life overlap |
|----|-------|----------------------------|
| `food_drink` | Food & drink | Kid-friendly eats + general restaurants; Local Life “Food” evergreen |
| `live_music` | Live music / concerts | Ticketmaster-heavy; bars with live acts |
| `family_kids` | Family & kids | Libraries, storytimes, playgrounds, festivals with kid focus |
| `outdoor` | Outdoor / parks / trails | Local Life “Parks & trails” |
| `movies_theater` | Movies / theater | Cinema, stage |
| `sports_games` | Sports / games | Pro/college/local leagues, bowling, etc. |
| `festivals_markets` | Festivals / markets | Farmers markets, fall fests, craft markets |
| `nightlife` | Nightlife / bars | Adult-leaning; still listable |
| `museums_culture` | Museums / culture | Nature centers, history, art |
| `seasonal` | Seasonal / one-off events | Corn mazes, PYO, holiday events — time-bounded |
| `free_cheap` | Free & cheap | Filter/badge more than exclusive type; boosts free admission |
| `farms_pyo` | Farms / PYO / markets | Local Life evergreen; can sit under festivals_markets + seasonal |
| `breweries` | Breweries / cideries / taprooms | Local Life patio-friendly family mode |
| `indoor_backup` | Indoor backups & libraries | Rainy-day lens; CCPL / nature centers |

**Local Life category patterns (cite):** Events · Parks & trails · Farms/PYO/markets · Food (kid-friendly) · Breweries/cideries/taprooms/wine (patio) · Indoor backups & libraries. Out of scope for that curator (and not default Local Fun product pillars): groceries, errands, house logistics.

UI can map Local Life–style seeds into the table above (e.g. Ag Center Corn Maze → `seasonal` + `family_kids` + `farms_pyo`).

---

## 5. Intelligent ranking

### 5.1 Dual mode

**(A) General Local Fun (default)** — public ratings + community reviews + distance, as Austin asked.

**(B) Optional Family lens** — inspired by Local Life’s human rubric (not Google stars alone):

| Local Life priority | How it maps into score |
|---------------------|------------------------|
| Age-fit / stroller friendliness > novelty | `age_fit` and `stroller` tags on seed + derived place attributes; boost when Family lens on |
| Drive time | Stronger distance decay under Family lens |
| Free / cheap | Extra boost for free admission / `$` |
| Weather + indoor backup | Soft boost for `indoor_backup` when weather flag is “poor outdoor” (v1: manual/fixture flag; later NWS) |
| Patio for breweries | Tag `patio` / outdoor seating |
| Weekly shape: 1 Must-try + 1 Niche | Editorial pins on curated seed (`pin: must_try \| niche`) shown as chips above the algorithmic list |
| Flag `verify` | Badge on card; slight rank penalty until confirmed |

### 5.2 Concrete scoring formula (v1 proposal)

Each candidate gets `score ∈ [0, 100]` approx.:

```
score =
  28 * distance_decay
+ 18 * public_rating_norm          # Google/Yelp stars → 0–1 (missing = 0.55 neutral)
+ 10 * review_confidence           # log1p(review_count) / log1p(cap)
+ 16 * community_rating_norm       # Local Fun stars; cold-start → 0.5
+ 10 * category_match              # overlap with user-selected categories
+  8 * time_freshness              # events: sooner upcoming > far future; closed/ended → 0
+  6 * price_fit                   # if user set price preference; else 0.5
+  4 * editorial_boost             # curated seed pin / Local Life must-try
+ (Family lens only)
  + 12 * age_fit_score
  +  6 * free_cheap_boost
  +  4 * indoor_when_needed
+ (Phase 2)
  + friends_went_boost
```

**Distance decay** (miles `d`, radius `R`):

```
distance_decay = max(0, 1 - (d / R)^0.85)
```

At default R=25, a place at 5 mi ≈ 0.85; at 20 mi ≈ 0.25; at 25 mi ≈ 0.

**Review confidence:** prefer a 4.2★ with 200 reviews over a 5.0★ with 2 reviews.

**Time freshness (events):** peak for events in the next 7 days; taper to 30–45 days; past events excluded or “Recently ended” archive.

**Price fit:** if user prefers Free & cheap, free/`$` → 1.0, `$$$$` → 0.1.

Weights are tunable in config; expose as constants in code, not magic numbers buried in UI.

### 5.3 Editorial overlay (Local Life pattern)

Above or interleaved with ranked results when Family lens or “This week” is on:

- **Must-try** (1) — strongest dated outing this week.
- **Niche** (1) — quieter counterpoint.

These come from the curated seed list (`editorial_role`), not from paid Local Life API (there isn’t one). Refresh cadence for seed: ~2×/week (same rhythm Local Life uses).

---

## 6. Result cards & detail pages

### 6.1 Result card shows

| Element | Source |
|---------|--------|
| Name | Place/event title |
| Type badges | Categories + Free / Verify / Must-try |
| Distance | Miles from search origin |
| Stars | Public (Google/Yelp) · Community (Local Fun) — show both when present |
| Short intelligent description | See §6.3 |
| Price cue | `$`–`$$$$` or ticket range (“~$23 armband”, “Free admission”) |
| Hours or event datetime | Next open window / event start–end |
| Actions | Go · Save · Been (icons) |

### 6.2 Detail page adds

- Longer description / “Why go”
- Age-fit / stroller notes (especially Family lens / seed items)
- Full address + map (static OSM or Google Static later; v1: embed link / open maps)
- Official link (primary CTA to venue)
- Status: `active` \| `verify` \| `retired`
- Community reviews list
- Weather note (optional strip when Family lens / outdoor)
- Report abuse

### 6.3 Short intelligent description — how generated

Priority order:

1. **Curated blurb** from seed (`why` field) — Local Life tone: practical, drive vibe, cost vibe.
2. Else **template from structured fields**:  
   `{Category} · {distance} mi · {price} · {next_hours_or_event}` + one line from public types (“Farmers market · Sat mornings”).
3. Else truncated public editorial summary from Places API (if licensed/allowed).
4. Never invent hours or prices. If unsure, say “Verify hours” and set status `verify`.

### 6.4 Proposed item schema (shared by fixtures, seed, and API adapters)

Aligned with Local Life’s useful fields, generalized for the app:

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Stable app id |
| `name` | string | |
| `kind` | `place` \| `event` | |
| `categories` | string[] | From §4 |
| `why` | string | Short intelligent / curated blurb |
| `age_fit` | string \| null | Family lens |
| `stroller` | bool \| null | |
| `drive_min` | number \| null | Typical minutes from home region centroid |
| `distance_mi` | number | Computed at query time |
| `cost_vibe` | string | Free / `$`–`$$$$` / ticket text |
| `price_level` | 0–4 \| null | Normalized |
| `when_hours` | string \| structured | Hours or event datetime range |
| `starts_at` / `ends_at` | ISO \| null | Events |
| `address` | string | |
| `lat` / `lng` | number | |
| `link` | url | Official preferred |
| `status` | `active` \| `verify` \| `retired` | |
| `public_rating` / `public_review_count` | number | Google/Yelp |
| `community_rating` / `community_review_count` | number | Local Fun |
| `editorial_role` | `must_try` \| `niche` \| null | |
| `weather_note` | string \| null | |
| `source` | `seed` \| `google` \| `ticketmaster` \| `findlocal` \| … | |
| `external_ids` | object | Provider ids for dedupe |

---

## 7. Social features

### 7.1 v1

- Accounts (email auth)
- Go / Recently Went
- Save (wishlist)
- Ratings + text reviews (signed-in only)
- Minimal public profile (display name, review count)
- Report / abuse flag on reviews and listings
- Rate limits on review create/update

### 7.2 Later (v2+) unless cheap

- Follow friends / “friends who went” boost
- Chat / DMs
- Activity feed
- Group plans (“who’s in?”)
- Push notifications beyond simple email magic links

---

## 8. Guest vs signed-in

| Capability | Guest | Signed-in |
|------------|-------|-----------|
| Set temporary search location | Yes | Yes |
| Browse results & detail | Yes (proposed; confirm §14) | Yes |
| Change categories / radius | Yes | Yes (+ save defaults) |
| Open official link / maps preview | Yes | Yes |
| Tap Go (directions + Recently Went) | No → prompt signup | Yes |
| Save place | No → prompt | Yes |
| Leave rating/review | **No** | Yes |
| Edit own review | — | Yes |
| Report abuse | Yes (lightweight) or prompt signup | Yes |
| Public profile | — | Minimal |
| Family lens toggle | Session-only | Persisted |

**Decision pending:** whether guests may browse at all, or home is auth-gated. Spec assumes **guest browse yes** for growth; Austin decides (§14).

---

## 9. Data sources (research-backed)

Prefer free tiers. Fit check for Carroll County / Finksburg / Westminster / Reisterstown / Owings Mills / Timonium.

### 9.1 Places

| Source | Free / trial | Fit | Notes |
|--------|--------------|-----|-------|
| **Google Places API (New)** | Per-SKU monthly free caps (post–Mar 2025): Essentials ~10k/mo, Pro (Nearby/Text Search) ~5k/mo; then paid | Excellent coverage & ratings for MD | Best quality; keys server-side only. Nearby/Text Search Pro is the SKU that hurts free tier fastest. |
| **OpenStreetMap + Overpass + Nominatim** | Free; Nominatim public API ≤ **1 req/s**, no bulk, identify User-Agent | Good for parks/amenities; weaker for restaurant ratings | Great offline-friendly / cost-control path; pair with curated seed for quality blurbs |
| **Yelp Places API** (ex-Fusion) | **30-day trial · 5,000 calls**; then ~$229+/mo | Strong food/nightlife ratings | Trial-only for eval; not a free production path |

**Local Life finding (no paid Local Life API):** prefer **manual/official pages** over aggregators for curated seed — e.g. carrollcountytourism.org, county parks, Ag Center, carrollgrown.org, ccpl.librarymarket.com, farm sites (Baugher’s, Weber’s TicketSpice, Cornfusion). Food/brewery: venue site + Google/Yelp for **hours only**. Refresh ~2×/week.

### 9.2 Events

| Source | Free tier | Fit | Notes |
|--------|-----------|-----|-------|
| **Ticketmaster Discovery** | **5,000 calls/day** (docs also cite ~2–5 rps) | Strong for concerts/sports/theater; weak for free library storytimes | Generous; deep page limit ~1000 items |
| **FindLocal** | **1,000 calls/mo**, no card; paid from $9/mo | Hyper-local trivia/storytimes/open mics in covered metros | Check whether Baltimore/Carroll metro is in their 83 metros before relying |
| **OpenWeb Ninja Real-Time Events** | **~50 req/mo** free | Google-Events-style scrape-as-API | Fine for spikes; too small for primary |
| **Scraping venue sites in production** | — | **No** for production scrapers | Fragile (403s), ToS risk; seed curation is human/editor + official links |

Aggregator pitfall (Local Life): AllEvents / Eventbrite OK for **discovery**, then **verify** on the venue/tourism page. Stale dates are common.

### 9.3 Geocoding

| Source | Limits | Use |
|--------|--------|-----|
| **Nominatim** (OSM) | 1 req/s, cache aggressively, custom User-Agent | Fine for v1 low traffic + fixture demos |
| **Google Geocoding** | ~10k free/mo Essentials | Better UX when Places is already adopted |

### 9.4 Directions

**v1:** Deep-link only — Apple Maps / Google Maps with `origin` + `destination`. No paid Directions/Routes API required.

### 9.5 Weather (Family lens / outdoor)

- **NWS** point forecast (Local Life pattern) — free; use later for indoor-backup boost. Fixture mode can hardcode a sample “weather note.”

### 9.6 Recommended v1 data stack

| Layer | Choice | Why |
|-------|--------|-----|
| Demo / Phase 1 | **Rich fixtures + curated seed JSON** for 21048 orbit | Click around with **zero API keys** |
| Geocode | Nominatim (cached) → upgrade path Google | Free enough early |
| Places (Phase 2) | Google Places (New) behind adapter | Quality; stay under free caps with caching |
| Events (Phase 2) | Ticketmaster Discovery + curated seed; optionally FindLocal if metro covered | Ticketed + hyperlocal gap filled by seed |
| Ratings public | Google (and/or Yelp trial only for eval) | Yelp not sustainable free |
| Directions | Maps deep-links | $0 |
| Editorial | Editable seed list (Local Life–style schema) | Official sources; 2×/week refresh by human/editor |
| Keys | **Env vars on server only** — never in frontend | Security |

**Adapter interface** (same for fixtures and live):

```ts
interface DiscoveryProvider {
  searchPlaces(q: SearchQuery): Promise<Place[]>;
  searchEvents(q: SearchQuery): Promise<Event[]>;
  getPlace(id: string): Promise<PlaceDetail>;
  geocode(input: string): Promise<LatLngLabel>;
}
```

`FixtureProvider` implements this with `/data/fixtures/finksburg-21048.json`. Live providers swap in when env keys exist.

### 9.7 Seed list sources (home region)

Blend live API results with curated items from patterns like:

- Carroll County Tourism, Ag Center calendar, Carroll Grown
- CCPL LibraryMarket (Finksburg Read & Play, storytimes)
- Farms: Baugher’s, Weber’s, Cornfusion / Showvaker’s, Carolyn Farm
- Parks: Northwest Regional, Oregon Ridge, Piney Run, Hashawha / Bear Branch
- Markets: Westminster & Sykesville farmers markets
- Seasonal festivals on **venue sites first**

Do **not** bake private household address or toddler-specific defaults into the product beyond “region = Finksburg / Carroll / north Baltimore orbit (~40 min).” Age-fit text on seed items can stay generic (“toddlers / strollers welcome”) without naming a family.

### 9.8 Pitfalls (from Local Life — bake into QA)

- Hours change day-of → UI must say verify; status `verify`
- Cash-only / advance-ticket-only venues → call out in `cost_vibe`
- Stroller bans in PYO fields → `stroller: false` + note
- Aggregator stale dates → prefer official link as canonical
- 403s if anyone scrapes → don’t scrape for production
- Prefer **north Baltimore orbit**; downtown tourist traps only if exceptional
- Retire ended events (`status: retired`) or the UI lies

---

## 10. Architecture (develop first, deploy later)

### 10.1 Shape

- **Progressive Web App** — iPhone/iPad Safari + desktop.
- **Backend required** — shared reviews/accounts cannot be static HTML.
- **Proposal:** **Next.js** (App Router) + TypeScript.
- **DB:** SQLite via Prisma (or Drizzle) for local dev → Postgres on deploy (Neon/Supabase/Railway).
- **Auth:** Auth.js (NextAuth) **or** Lucia **or** Clerk — email magic-link **or** email+password (Austin decides). Session cookies (httpOnly).
- **No API keys in client.** Server routes only.

### 10.2 API routes (sketch)

| Route | Purpose |
|-------|---------|
| `POST /api/auth/*` | Sign in / callback / sign out |
| `GET /api/search` | `?near=&radius=&categories=&lens=` → ranked results |
| `GET /api/places/:id` | Detail + reviews summary |
| `POST /api/go` | Record Go / Recently Went; returns maps deep-links |
| `POST /api/been` | Mark been |
| `GET/POST /api/reviews` | List / create (auth) |
| `PATCH/DELETE /api/reviews/:id` | Own review only |
| `POST /api/report` | Abuse report |
| `GET/PATCH /api/me/settings` | Home location, categories, radius, Family lens |
| `GET /api/me/recent` | Recently Went |
| `GET /api/me/saved` | Saved list |

### 10.3 Fixture mode

- `DISCOVERY_MODE=fixture` (default in dev).
- Load rich demo data for **Finksburg 21048** (places + events across categories, with Must-try/Niche pins, verify flags, community reviews sample).
- Geocode stub returns Finksburg centroid for zip 21048.
- Austin can click through every screen with no keys.

### 10.4 Security

- No anonymous reviews
- Rate-limit review writes (e.g. 5/day/user) and search (IP + user)
- Moderate via report queue (admin table; UI later)
- CSRF on mutations; session cookies Secure/SameSite
- PII minimal: email, display name, home lat/lng — **never** show street address on public profile
- Validate/sanitize review text; length caps
- Env-only secrets: `GOOGLE_PLACES_API_KEY`, `TICKETMASTER_API_KEY`, `AUTH_SECRET`, DB URL

### 10.5 Hosting candidates (later — do not set up now)

| Option | Pros | Cons |
|--------|------|------|
| **Vercel + Neon/Supabase** | Great Next.js fit; easy previews; managed Postgres | Cold starts; usage pricing watch |
| **Railway** | Simple full-stack + Postgres; good DX | Less “edge” than Vercel |
| **Cloudflare Pages + D1** | Cheap edge; fast | SQLite semantics; Next.js adapter constraints |

---

## 11. Screens / wireframes

HTML mockups (mobile-first) live in `/workspace/local-fun/mockups/`. Screenshots: `/workspace/local-fun/mockups/screens/`.

| Mockup | File | Coverage |
|--------|------|----------|
| Home / search | `index.html` | Location, categories, radius, Family lens, Search |
| Results | `results.html` | Ranked cards, Must-try chip, filters |
| Detail | `detail.html` | Full place/event, reviews, Go/Save |
| Go confirmation | `go.html` | Directions handoff sheet |
| Recently Went + rate | `recent.html` | List + rate modal |
| Auth | `auth.html` | Sign up / login |
| Profile / settings | `settings.html` | Home, radius, categories, lens |

---

## 12. Build phases

| Phase | Scope |
|-------|--------|
| **0 — Now** | This draft + HTML mockups + screenshots. No app build. No deploy. |
| **1** | Fixture-backed Next.js app: auth, search UI, ranking, Go + Recently Went, reviews, settings, Family lens toggle — **local DB only**. |
| **2** | Plug Google Places + Ticketmaster (and optional FindLocal) behind same `DiscoveryProvider`; keep fixtures as fallback. |
| **3** | Polish, PWA install manifest/service worker, caching, deploy to chosen host. |

---

## 13. Non-goals (v1)

- In-app turn-by-turn navigation
- Payments / ticket checkout
- Chat or friend graph
- Production web scraping
- Replacing Local Life’s human editorial judgment (seed complements it)
- Meal planning / groceries / errands

---

## 14. Decisions Austin must make

1. **Product name** — keep “Local Fun” or rename?
2. **Guest browse** — yes (recommended) or auth-wall first?
3. **Auth method** — email magic link vs email+password (or Clerk hosted)?
4. **Default radius** — confirm **25 miles** for Finksburg-area default?
5. **Which paid/API keys are you willing to obtain for Phase 2?** Google Places (likely yes) · Ticketmaster Discovery (free key) · FindLocal · Yelp (paid after trial — probably skip) · Google Geocoding vs Nominatim-only for longer?
6. **Review visibility** — public to all users (and guests?) vs friends-only (friends imply v2)?
7. **Family lens** — ship toggle in Phase 1, or General ranking only until later?
8. **Deploy target preference (later)** — Vercel+Neon/Supabase vs Railway vs Cloudflare — any strong preference?
9. **Home region expansion** — stay Carroll / north Baltimore orbit for v1 seed, or multi-region from day one?
10. **Official seed editor** — who updates the Local Life–style seed (~2×/week): Austin manually, an agent, or both?

---

## 15. Open risks

- Free-tier Places caps if caching is weak.
- FindLocal metro coverage may miss deep Carroll County hyperlocal — seed remains essential.
- Deduping Ticketmaster events vs seed festivals.
- App Store / PWA expectations if later wrapped; v1 is web PWA only.
- Abuse on public reviews → need report + rate limits from day one.

---

## 16. Deliverables checklist (Phase 0)

- [x] This `DRAFT-SPEC.md`
- [x] Mockups under `/workspace/local-fun/mockups/`
- [x] Screenshots under `/workspace/local-fun/mockups/screens/`
- [x] Root `README.md` pointing here

---

*End of draft. Nothing in this document authorizes deploy, paid spend, or API signup — those wait on Austin’s decisions above.*
