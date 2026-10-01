import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { one } from "@/lib/query";

async function ensureCollections(userId: string) {
  for (const [slug, name] of [
    ["weekend", "Weekend shortlist"],
    ["indoor", "Indoor rainy-day"],
  ] as const) {
    await prisma.collection.upsert({
      where: { userId_slug: { userId, slug } },
      update: {},
      create: { userId, slug, name },
    });
  }
}

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/auth?next=/saved");
  await ensureCollections(session.user.id);
  const list = one(searchParams.list) || "all";
  const saves = await prisma.save.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { place: true },
  });
  const collections = await prisma.collection.findMany({
    where: { userId: session.user.id },
    include: { items: { include: { place: true }, orderBy: { createdAt: "desc" } } },
  });
  const weekend = collections.find((c) => c.slug === "weekend");
  const indoor = collections.find((c) => c.slug === "indoor");
  const active =
    list === "weekend" ? weekend?.items.map((i) => i.place) ?? []
    : list === "indoor" ? indoor?.items.map((i) => i.place) ?? []
    : saves.map((s) => s.place);

  const shareIds =
    list === "weekend" ? weekend?.items.map((i) => i.placeId).join(",") || ""
    : list === "indoor" ? indoor?.items.map((i) => i.placeId).join(",") || ""
    : saves.map((s) => s.placeId).join(",");

  return (
    <>
      <h1>Saved</h1>
      <p className="sub">Your bookmarks plus curated shortlists. Plan with someone shares a magic link — no friend graph required.</p>
      <div className="row" data-testid="saved-tabs">
        <Link className={`chip${list === "all" ? " on" : ""}`} href="/saved">All saved</Link>
        <Link className={`chip${list === "weekend" ? " on" : ""}`} href="/saved?list=weekend" data-testid="tab-weekend">Weekend shortlist</Link>
        <Link className={`chip${list === "indoor" ? " on" : ""}`} href="/saved?list=indoor" data-testid="tab-indoor">Indoor rainy-day</Link>
      </div>
      {shareIds ? (
        <form action="/api/share" method="post" style={{ margin: "10px 0" }}>
          <input type="hidden" name="placeIds" value={shareIds} />
          <input type="hidden" name="title" value={list === "indoor" ? "Indoor rainy-day plan" : list === "weekend" ? "Weekend shortlist" : "Our shortlist"} />
          <input type="hidden" name="returnTo" value={`/saved?list=${list}`} />
          <button className="secondary" type="submit" data-testid="share-shortlist">Plan with someone</button>
        </form>
      ) : null}
      {active.length === 0 ? (
        <div className="card" data-testid="saved-empty">
          <p>Nothing in this list yet.</p>
          <Link className="primary" href="/results">Explore</Link>
        </div>
      ) : null}
      {active.map((place) => (
        <article className="card" key={place.id} data-testid="saved-item">
          {place.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="card-thumb" src={place.imageUrl} alt="" width={640} height={140} />
          ) : null}
          <h2 className="place-title"><Link href={`/places/${place.id}`}>{place.name}</Link></h2>
          <p className="meta">{place.costVibe} · {place.address}</p>
          <div className="btn-row">
            {list === "all" ? (
              <form action="/api/save" method="post">
                <input type="hidden" name="placeId" value={place.id} />
                <input type="hidden" name="returnTo" value="/saved" />
                <button className="secondary" type="submit">Remove</button>
              </form>
            ) : (
              <form action="/api/save" method="post">
                <input type="hidden" name="placeId" value={place.id} />
                <input type="hidden" name="list" value={list} />
                <input type="hidden" name="returnTo" value={`/saved?list=${list}`} />
                <button className="secondary" type="submit">Remove from list</button>
              </form>
            )}
            <Link className="secondary" href={`/places/${place.id}`}>Open</Link>
          </div>
        </article>
      ))}
    </>
  );
}
