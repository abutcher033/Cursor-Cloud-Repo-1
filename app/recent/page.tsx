import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { visitStatusLabel } from "@/lib/visits";
import { formatWhen, starGlyphs } from "@/lib/text";

export default async function RecentPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/auth?next=/recent");
  const visits = await prisma.visit.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { place: true },
  });
  const reviews = await prisma.review.findMany({ where: { userId: session.user.id } });
  const byPlace = new Map(reviews.map((r) => [r.placeId, r]));
  const error = searchParams.error === "limit" ? "Review limit is 5 a day." : searchParams.error === "stars" ? "Pick 1 to 5 stars." : "";

  return (
    <>
      <h1>Going &amp; Been</h1>
      <p className="sub">
        Go saves a trip as Going. Mark Been when you’re back, then leave a rating other people can read.
      </p>
      <div className="note" data-testid="status-legend">
        <strong>Badge legend:</strong> Planning = confirm sheet before you commit · Going = trip saved from Go · Been = you marked it done.
        The Went tab lists Going and Been together.
      </div>
      {error ? <div className="alert" role="alert">{error}</div> : null}
      {visits.length === 0 ? (
        <div className="card empty">
          <h2>No trips yet</h2>
          <p>Search and tap Go. Guests can’t build this list.</p>
          <Link className="primary" href="/results">Find something</Link>
        </div>
      ) : null}
      {visits.map((v) => {
        const review = byPlace.get(v.placeId);
        const label = visitStatusLabel(v.status);
        return (
          <article className="card" key={v.id} data-testid="visit">
            <div className="pill-row">
              <span className="badge" data-testid="visit-status">{label}</span>
            </div>
            <h2 className="place-title">
              <Link href={`/places/${v.place.id}`}>{v.place.name}</Link>
            </h2>
            <p className="meta">
              From {v.originLabel} · {formatWhen(v.createdAt.toISOString(), "")} ET
            </p>
            {v.status !== "been" ? (
              <form action="/api/been" method="post" style={{ marginTop: 8 }}>
                <input type="hidden" name="placeId" value={v.placeId} />
                <input type="hidden" name="returnTo" value="/recent" />
                <button className="secondary" type="submit">Mark been</button>
              </form>
            ) : null}
            {review ? (
              <p className="desc">Your rating {starGlyphs(review.stars)} {review.body}</p>
            ) : (
              <form action="/api/reviews" method="post" style={{ marginTop: 8 }} data-testid="review-form">
                <input type="hidden" name="placeId" value={v.placeId} />
                <input type="hidden" name="returnTo" value="/recent" />
                <label htmlFor={`stars-${v.id}`}>Rate</label>
                <select id={`stars-${v.id}`} name="stars" defaultValue="5" required>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n} stars</option>
                  ))}
                </select>
                <label htmlFor={`body-${v.id}`}>Note</label>
                <textarea id={`body-${v.id}`} name="body" maxLength={500} rows={2} placeholder="Short and useful" style={{ width: "100%", borderRadius: 12, border: "1px solid var(--line)", padding: 8, font: "inherit" }} />
                <button className="primary" type="submit" style={{ marginTop: 8 }}>Save review</button>
              </form>
            )}
          </article>
        );
      })}
    </>
  );
}
