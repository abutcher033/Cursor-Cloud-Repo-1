import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryLabel, knownCategories } from "@/lib/categories";
import { readFixtureFile } from "@/lib/catalog";
import { campusLabel } from "@/lib/campus";
import { gotchaLabel, parseGotchas } from "@/lib/gotchas";
import { openState } from "@/lib/hours";
import { scoreItem } from "@/lib/ranking";
import { haversineMi } from "@/lib/geo";
import { nearQuery } from "@/lib/near";
import { normalizeRadius } from "@/lib/pipeline";
import { one, many } from "@/lib/query";
import { placeDetail, resolveDetailOrigin } from "@/lib/service";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatMiles, formatWhen, safeNext, starGlyphs } from "@/lib/text";
import { amenityChips } from "@/lib/amenities";
import { fetchWeather } from "@/lib/weather";

const REVIEW_TAGS = [
  { id: "stroller", label: "Stroller OK" },
  { id: "nap-friendly", label: "Nap-friendly" },
  { id: "loud", label: "Loud?" },
  { id: "parking", label: "Easy parking" },
];

export default async function PlacePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getSession();
  const detail = await placeDetail(params.id, session?.user?.id);
  if (!detail) notFound();
  const { item, reviews, friendNames, mine, visit, saved } = detail;
  const user = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;

  const olat = Number(one(searchParams.olat));
  const olng = Number(one(searchParams.olng));
  const nearParam = nearQuery(one(searchParams.near));
  const radiusParam = one(searchParams.radius);
  const hasSearchRadius = radiusParam !== "" && Number.isFinite(Number(radiusParam));
  const radiusMiles = hasSearchRadius
    ? normalizeRadius(Number(radiusParam))
    : user?.defaultRadius ?? 25;
  const weatherPoorParam = one(searchParams.weather) === "poor";
  const categories = knownCategories(many(searchParams.categories));

  const originResolved = await resolveDetailOrigin({
    olat: Number.isFinite(olat) ? olat : undefined,
    olng: Number.isFinite(olng) ? olng : undefined,
    near: nearParam || undefined,
    olabel: one(searchParams.olabel) || undefined,
    user,
  });
  const origin = { lat: originResolved.lat, lng: originResolved.lng, label: originResolved.label };
  const scoreFromSearch = originResolved.fromSearch || hasSearchRadius || "lens" in searchParams || "near" in searchParams;
  const familyLens = scoreFromSearch
    ? one(searchParams.lens) === "1"
    : (user?.familyLens ?? false);

  const weather = await fetchWeather(origin.lat, origin.lng, { manualPoor: weatherPoorParam });
  const weatherPoor = weather.poorOutdoor;

  const distance = haversineMi(origin, item);
  const parts = scoreItem(item, distance, {
    radiusMiles,
    categories,
    familyLens,
    weatherPoor,
    now: new Date(),
  });
  const open = openState({
    whenHours: item.whenHours,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    kind: item.kind,
  });
  const gotchas = item.gotchas?.length ? item.gotchas : parseGotchas((item as { gotchas?: string[] }).gotchas);
  const backRaw = one(searchParams.returnTo);
  const back = safeNext(backRaw, scoreFromSearch
    ? `/results?near=${encodeURIComponent(nearParam || nearQuery(origin.label) || "21048")}&radius=${radiusMiles}${familyLens ? "&lens=1" : ""}`
    : "/results");
  const go = `/go/${item.id}?olat=${origin.lat}&olng=${origin.lng}&olabel=${encodeURIComponent(origin.label)}&returnTo=${encodeURIComponent(back)}`;
  const error = typeof searchParams.error === "string" ? searchParams.error : "";
  const reported = searchParams.reported === "1";
  const reviewPrompt = searchParams.reviewPrompt === "1";
  const map = `https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lng}#map=14/${item.lat}/${item.lng}`;
  const rankSummary = scoreFromSearch
    ? `Why this match (from this search, ${radiusMiles} mi)`
    : `Why this match (from your saved home, ${radiusMiles} mi)`;
  const heroImg = item.imageUrl || "/thumbs/default.svg";
  const campus = campusLabel(item.campusId);
  const mineTags: string[] = (() => {
    if (!mine) return [];
    try {
      const t = JSON.parse((mine as { tags?: string }).tags || "[]");
      return Array.isArray(t) ? t.map(String) : [];
    } catch {
      return [];
    }
  })();

  return (
    <>
      <p className="small"><Link href={back}>← Results</Link></p>
      <div className="hero" data-testid="detail-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImg} alt="" width={800} height={280} />
        <div className="hero-caption">
          <span>{item.address}</span>
          {campus ? <span className="badge pin">Same stop · {campus}</span> : null}
        </div>
      </div>
      <div className="pill-row">
        {item.editorialRole === "must_try" ? <span className="badge pin">Must-try</span> : null}
        {item.editorialRole === "niche" ? <span className="badge pin">Niche</span> : null}
        {open.label ? <span className="badge open" data-testid="open-badge">{open.label}</span> : null}
        {item.sample ? <span className="badge warn">SAMPLE</span> : null}
        {item.status === "verify" ? <span className="badge warn" data-testid="verify-badge">Hours need a check</span> : null}
        {item.status === "retired" ? <span className="badge warn">Retired</span> : null}
        {item.categories.map((c) => (
          <span className="badge" key={c}>{categoryLabel(c)}</span>
        ))}
      </div>
      <h1>{item.name}</h1>
      <div className="stars">
        {starGlyphs(item.communityRating)}{" "}
        <span className="small">
          Community {item.communityRating ? item.communityRating.toFixed(1) : "—"} ({item.communityReviewCount}) · Public {item.publicRating?.toFixed(1) ?? "—"}
        </span>
      </div>
      <p className="desc">{item.why}</p>
      {gotchas.length ? (
        <div className="pill-row" data-testid="gotcha-row">
          {gotchas.map((g) => (
            <span className="badge gotcha" key={g}>{gotchaLabel(g)}</span>
          ))}
        </div>
      ) : null}
      {item.status === "verify" ? (
        <div className="note" data-testid="verify-line">
          <strong>Hours need a check.</strong>{" "}
          {item.phone ? (
            <a href={`tel:${item.phone.replace(/[^\d+]/g, "")}`}>Call {item.phone}</a>
          ) : item.link ? (
            <a href={item.link} target="_blank" rel="noreferrer">Confirm on the official site</a>
          ) : (
            "Confirm before you leave."
          )}
        </div>
      ) : null}
      <div className="meta">
        <span className="price">{item.costVibe}</span>
        {" · "}
        {formatMiles(distance)} from {origin.label}
        {" · "}
        <span data-testid="match-score">Match {Math.round(parts.total)}</span>
      </div>
      {item.status === "retired" ? <div className="alert">This listing is retired. It stays out of search so the app doesn’t advertise a finished event.</div> : null}
      {reported ? <div className="oknote">Report received. Thanks — it’s queued, not public.</div> : null}
      {error === "limit" ? <div className="alert" role="alert">Review limit is 5 creates or edits a day.</div> : null}
      {error === "stars" ? <div className="alert" role="alert">Pick a star rating from 1 to 5.</div> : null}
      {error === "report" ? <div className="alert" role="alert">Add a short reason so the report is useful.</div> : null}

      {reviewPrompt && session && visit?.status === "been" && !mine ? (
        <div className="card" data-testid="review-prompt">
          <h2>30-sec review?</h2>
          <p className="small">You marked Been. A few tags help the next family.</p>
          <form action="/api/reviews" method="post">
            <input type="hidden" name="placeId" value={item.id} />
            <input type="hidden" name="returnTo" value={`/places/${item.id}`} />
            <label htmlFor="stars-prompt">Stars</label>
            <select id="stars-prompt" name="stars" defaultValue={5} required>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n} stars</option>
              ))}
            </select>
            <label style={{ marginTop: 8 }}>Quick tags</label>
            <div className="row">
              {REVIEW_TAGS.map((t) => (
                <label key={t.id} className="chip">
                  <input type="checkbox" name="tags" value={t.id} />
                  {t.label}
                </label>
              ))}
            </div>
            <label htmlFor="body-prompt" style={{ marginTop: 8 }}>Note (optional)</label>
            <textarea id="body-prompt" name="body" maxLength={500} rows={2} style={{ width: "100%", borderRadius: 12, border: "1px solid var(--line)", padding: 10, font: "inherit" }} />
            <button className="primary" type="submit" style={{ marginTop: 8 }}>Save 30-sec review</button>
          </form>
        </div>
      ) : null}

      <div className="card">
        <h2>Practical</h2>
        <p className="desc"><strong>When:</strong> {item.whenHours}</p>
        {item.startsAt ? <p className="meta">Starts {formatWhen(item.startsAt, item.whenHours)} ET</p> : null}
        {item.visitMinutes ? <p className="desc" data-testid="visit-mins"><strong>Typical visit:</strong> ~{item.visitMinutes} min</p> : null}
        {amenityChips(item.amenities || {}).length ? (
          <div className="pill-row" data-testid="amenity-row" style={{ marginBottom: 8 }}>
            {amenityChips(item.amenities || {}).map((a) => (
              <span className="badge" key={a.key}>{a.label}</span>
            ))}
          </div>
        ) : null}
        <p className="desc"><strong>Age-fit:</strong> {item.ageFit || "Not listed"}</p>
        <p className="desc">
          <strong>Stroller:</strong>{" "}
          {item.stroller === true ? "Yes" : item.stroller === false ? "No — see the note above" : "Not listed"}
        </p>
        <p className="desc"><strong>Address:</strong> {item.address}</p>
        {item.phone ? <p className="desc"><strong>Phone:</strong> <a href={`tel:${item.phone.replace(/[^\d+]/g, "")}`}>{item.phone}</a></p> : null}
        {friendNames.length ? <p className="desc"><strong>Friends went:</strong> {friendNames.join(", ")}</p> : null}
        <div className="note" data-testid="weather-note">{weather.note}</div>
        <details data-testid="rank-breakdown">
          <summary className="small">{rankSummary}</summary>
          <p className="parts" data-testid="rank-parts">
            Distance {parts.distance.toFixed(1)} · public {parts.publicRating.toFixed(1)} · confidence {parts.reviewConfidence.toFixed(1)} · community {parts.community.toFixed(1)} · category {parts.category.toFixed(1)} · freshness {parts.freshness.toFixed(1)} · price {parts.price.toFixed(1)} · editorial {parts.editorial.toFixed(1)}
            {familyLens ? ` · age-fit ${parts.ageFit.toFixed(1)} · free ${parts.freeCheap.toFixed(1)} · indoor ${parts.indoor.toFixed(1)}` : ""}
            {parts.friendsWent ? ` · friends ${parts.friendsWent.toFixed(1)}` : ""}
            {parts.verifyPenalty ? ` · verify −${parts.verifyPenalty}` : ""}
            {" · "}total {parts.total.toFixed(1)}
            {" · "}radius {radiusMiles} mi
          </p>
        </details>
      </div>

      <div className="btn-row-3">
        {item.status === "retired" ? null : session ? (
          <Link className="primary" href={go}>Go</Link>
        ) : (
          <Link className="primary" href={`/auth?next=${encodeURIComponent(go)}`}>Go</Link>
        )}
        {session ? (
          <form action="/api/save" method="post">
            <input type="hidden" name="placeId" value={item.id} />
            <input type="hidden" name="returnTo" value={`/places/${item.id}`} />
            <button className="secondary" type="submit">{saved ? "Unsave" : "Save"}</button>
          </form>
        ) : (
          <Link className="secondary" href={`/auth?next=${encodeURIComponent(`/places/${item.id}`)}`}>Save</Link>
        )}
        {session ? (
          <form action="/api/been" method="post">
            <input type="hidden" name="placeId" value={item.id} />
            <input type="hidden" name="returnTo" value={`/places/${item.id}`} />
            <button className="secondary" type="submit">{visit?.status === "been" ? "Been" : "Mark been"}</button>
          </form>
        ) : (
          <Link className="secondary" href={`/auth?next=${encodeURIComponent(`/places/${item.id}`)}`}>Been</Link>
        )}
      </div>
      {session ? (
        <div className="btn-row" style={{ marginTop: 8 }}>
          <form action="/api/save" method="post">
            <input type="hidden" name="placeId" value={item.id} />
            <input type="hidden" name="list" value="weekend" />
            <input type="hidden" name="returnTo" value="/saved?list=weekend" />
            <button className="secondary" type="submit">+ Weekend shortlist</button>
          </form>
          <form action="/api/share" method="post">
            <input type="hidden" name="placeId" value={item.id} />
            <input type="hidden" name="title" value={`Plan · ${item.name}`} />
            <input type="hidden" name="returnTo" value={`/places/${item.id}`} />
            <button className="secondary" type="submit" data-testid="plan-with-someone">Plan with someone</button>
          </form>
        </div>
      ) : null}
      <div className="btn-row" style={{ marginTop: 10 }}>
        <a className="secondary" href={`/api/calendar/${item.id}`} data-testid="add-to-calendar">Add to calendar</a>
        {item.link ? (
          <a className="secondary" href={item.link} target="_blank" rel="noreferrer">Official site</a>
        ) : (
          <a className="secondary" href={map} target="_blank" rel="noreferrer">Open map</a>
        )}
      </div>
      <p style={{ marginTop: 8 }}>
        <a className="small" href={map} target="_blank" rel="noreferrer">Open map pin</a>
      </p>

      <h2 style={{ marginTop: 16 }}>Reviews</h2>
      <p className="small">Readable by guests. Writing one requires a sign-in, and a Go or Been first is the intended path.</p>
      {session && visit ? (
        <form className="card" action="/api/reviews" method="post">
          <input type="hidden" name="placeId" value={item.id} />
          <input type="hidden" name="returnTo" value={`/places/${item.id}`} />
          <label htmlFor="stars">{mine ? "Update your review" : "Your review"}</label>
          <select id="stars" name="stars" defaultValue={mine?.stars ?? 5} required>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n} stars</option>
            ))}
          </select>
          <label style={{ marginTop: 8 }}>Tags</label>
          <div className="row">
            {REVIEW_TAGS.map((t) => (
              <label key={t.id} className="chip">
                <input type="checkbox" name="tags" value={t.id} defaultChecked={mineTags.includes(t.id)} />
                {t.label}
              </label>
            ))}
          </div>
          <label htmlFor="body" style={{ marginTop: 8 }}>Note (optional)</label>
          <textarea id="body" name="body" maxLength={500} rows={3} defaultValue={mine?.body ?? ""} style={{ width: "100%", borderRadius: 12, border: "1px solid var(--line)", padding: 10, font: "inherit" }} />
          <button className="primary" type="submit" style={{ marginTop: 8 }}>Save review</button>
        </form>
      ) : session ? (
        <div className="note">Go or mark Been before rating. Reviews are tied to a visit so they aren’t anonymous drive-bys.</div>
      ) : (
        <div className="note">
          <Link href={`/auth?next=${encodeURIComponent(`/places/${item.id}`)}`}>Sign in</Link> to rate after you’ve been.
        </div>
      )}
      {mine ? (
        <form action={`/api/reviews/${mine.id}?returnTo=${encodeURIComponent(`/places/${item.id}`)}`} method="post">
          <input type="hidden" name="_method" value="delete" />
          <button className="danger" type="submit">Delete my review</button>
        </form>
      ) : null}
      {reviews.length === 0 ? <p className="small">No community reviews yet.</p> : null}
      {reviews.map((r) => {
        let tags: string[] = [];
        try {
          const parsed = JSON.parse((r as { tags?: string }).tags || "[]");
          if (Array.isArray(parsed)) tags = parsed.map(String);
        } catch {
          tags = [];
        }
        return (
          <div className="review" key={r.id}>
            <div className="who">
              <Link href={`/u/${r.user.id}`}>{r.user.displayName}</Link>
              {r.userId === session?.user?.id ? " · you" : ""}
            </div>
            <div className="stars">{starGlyphs(r.stars)}</div>
            {tags.length ? (
              <div className="pill-row">
                {tags.map((t) => (
                  <span className="badge" key={t}>{REVIEW_TAGS.find((x) => x.id === t)?.label || t}</span>
                ))}
              </div>
            ) : null}
            {r.body ? <p className="desc">{r.body}</p> : null}
            <form action="/api/report" method="post">
              <input type="hidden" name="targetType" value="review" />
              <input type="hidden" name="targetId" value={r.id} />
              <input type="hidden" name="returnTo" value={`/places/${item.id}`} />
              <details className="report">
                <summary>Report</summary>
                <input name="reason" type="text" required minLength={8} maxLength={500} placeholder="What’s wrong?" style={{ width: "100%", margin: "8px 0", padding: 8 }} />
                <button className="secondary" type="submit">Send report</button>
              </details>
            </form>
          </div>
        );
      })}
      <form action="/api/report" method="post" style={{ marginTop: 16 }}>
        <input type="hidden" name="targetType" value="place" />
        <input type="hidden" name="targetId" value={item.id} />
        <input type="hidden" name="returnTo" value={`/places/${item.id}`} />
        <details className="report">
          <summary>Report this listing</summary>
          <input name="reason" required minLength={8} maxLength={500} placeholder="Hours wrong, closed, inappropriate…" style={{ width: "100%", margin: "8px 0", padding: 8 }} />
          <input name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px" }} aria-hidden="true" />
          <button className="secondary" type="submit">Send report</button>
        </details>
      </form>
    </>
  );
}
