import Link from "next/link";
import { categoryLabel } from "@/lib/categories";
import { amenityChips } from "@/lib/amenities";
import { gotchaLabel } from "@/lib/gotchas";
import { placeImageAlt, resolvePlaceImage } from "@/lib/photos";
import type { RankedView } from "@/lib/service";
import { formatMiles, starGlyphs } from "@/lib/text";

export function PlaceCard({
  item,
  origin,
  returnTo,
  signedIn,
  featured,
  detailHref,
  compact,
}: {
  item: RankedView;
  origin: { lat: number; lng: number; label: string };
  returnTo: string;
  signedIn: boolean;
  featured?: boolean;
  /** Detail URL that carries search origin/radius/lens for matching score. */
  detailHref: string;
  compact?: boolean;
}) {
  const go = `/go/${item.id}?olat=${origin.lat}&olng=${origin.lng}&olabel=${encodeURIComponent(origin.label)}&returnTo=${encodeURIComponent(returnTo)}`;
  const authGo = `/auth?next=${encodeURIComponent(go)}`;
  const community = item.communityReviewCount
    ? `${item.communityRating?.toFixed(1)} (${item.communityReviewCount})`
    : "—";
  const verifyPhone = item.phone ? `tel:${item.phone.replace(/[^\d+]/g, "")}` : null;
  const src = resolvePlaceImage(item.id, item.imageUrl, item.name);
  const match = Math.round(item.score);

  return (
    <article
      className={`card place-card card-press${compact ? " card-compact" : ""}${featured ? " place-card-featured" : ""}`}
      data-testid="place-card"
      data-place-id={item.id}
    >
      <div className="place-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="card-thumb"
          src={src}
          alt={placeImageAlt(item.name, item.sample)}
          width={640}
          height={compact ? 160 : 220}
          loading="lazy"
          data-testid="place-thumb"
        />
        <div className="place-media-veil" aria-hidden="true" />
        <div className="place-media-badges">
          {item.editorialRole === "must_try" ? <span className="badge pin">Must-try</span> : null}
          {item.editorialRole === "niche" ? <span className="badge pin">Niche</span> : null}
          {item.sample ? <span className="badge warn">SAMPLE</span> : null}
          {item.openLabel ? (
            <span className="badge open" data-testid="open-badge">
              {item.openLabel}
            </span>
          ) : null}
        </div>
        <div className="place-media-stats">
          <span className="match-pill" data-testid="match-score">
            Match {match}
          </span>
          <span className="distance-pill">{formatMiles(item.distanceMi)}</span>
        </div>
      </div>

      <div className="pill-row">
        {item.status === "verify" ? (
          <span className="badge warn" data-testid="verify-badge">
            Hours need a check
          </span>
        ) : null}
        {item.categories.slice(0, 2).map((c) => (
          <span className="badge" key={c}>
            {categoryLabel(c)}
          </span>
        ))}
        {item.friendNames.length ? (
          <span className="badge pin">Friends went · {item.friendNames.join(", ")}</span>
        ) : null}
      </div>

      <h2 className="place-title">
        <Link href={detailHref} data-testid="place-name" style={{ color: "inherit", textDecoration: "none" }}>
          {item.name}
        </Link>
      </h2>
      <div className="stars">
        {starGlyphs(item.publicRating)}{" "}
        <span className="small">
          Public {item.publicRating?.toFixed(1) ?? "—"}
          {item.publicReviewCount ? ` (${item.publicReviewCount})` : ""} · Community {community}
        </span>
      </div>
      {!compact ? <p className="desc">{item.why}</p> : null}
      {(item.gotchas || []).length ? (
        <div className="pill-row" data-testid="gotcha-row">
          {(item.gotchas || []).slice(0, 4).map((g) => (
            <span className="badge gotcha" key={g}>
              {gotchaLabel(g)}
            </span>
          ))}
        </div>
      ) : null}
      {amenityChips(item.amenities || {}).length || item.visitMinutes ? (
        <div className="pill-row" data-testid="amenity-row">
          {item.visitMinutes ? (
            <span className="badge" data-testid="visit-mins">
              ~{item.visitMinutes} min
            </span>
          ) : null}
          {amenityChips(item.amenities || {})
            .slice(0, 4)
            .map((a) => (
              <span className="badge" key={a.key}>
                {a.label}
              </span>
            ))}
        </div>
      ) : null}
      {item.status === "verify" ? (
        <p className="verify-line" data-testid="verify-line">
          Hours need a check
          {item.phone ? (
            <>
              {" · "}
              <a href={verifyPhone!}>call {item.phone}</a>
            </>
          ) : item.link ? (
            <>
              {" · "}
              <a href={item.link} target="_blank" rel="noreferrer">
                confirm on site
              </a>
            </>
          ) : null}
          {" · "}
          <Link href={detailHref}>details</Link>
        </p>
      ) : null}
      <div className="meta place-meta-row">
        <span className="price">{item.costVibe}</span>
        <span className="meta-dot" aria-hidden="true">
          ·
        </span>
        <span>{formatMiles(item.distanceMi)} away</span>
        <span className="meta-dot" aria-hidden="true">
          ·
        </span>
        <span>{item.whenHours}</span>
        {featured ? (
          <>
            <span className="meta-dot" aria-hidden="true">
              ·
            </span>
            <span>editorial pin</span>
          </>
        ) : null}
      </div>
      <div className="btn-row-3 place-actions" style={{ marginTop: 10 }}>
        {signedIn ? (
          <Link className="primary btn-press" href={go} style={{ padding: 10 }}>
            Go
          </Link>
        ) : (
          <Link className="primary btn-press" href={authGo} style={{ padding: 10 }}>
            Go
          </Link>
        )}
        {signedIn ? (
          <form action="/api/save" method="post" className="inline-form">
            <input type="hidden" name="placeId" value={item.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <button className={`secondary btn-press${item.saved ? " saved-on" : ""}`} type="submit" style={{ padding: 10 }}>
              {item.saved ? "Saved" : "Save"}
            </button>
          </form>
        ) : (
          <Link className="secondary btn-press" href={`/auth?next=${encodeURIComponent(returnTo)}`} style={{ padding: 10 }}>
            Save
          </Link>
        )}
        <Link className="secondary btn-press" href={detailHref} style={{ padding: 10 }}>
          Open
        </Link>
      </div>
    </article>
  );
}
