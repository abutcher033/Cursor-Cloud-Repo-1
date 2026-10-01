import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { gotchaLabel, parseGotchas } from "@/lib/gotchas";

export default async function PlanPage({ params }: { params: { token: string } }) {
  const link = await prisma.shareLink.findUnique({
    where: { token: params.token },
    include: { creator: { select: { displayName: true } } },
  });
  if (!link) notFound();
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
    return (
      <>
        <h1>Link expired</h1>
        <p className="sub">This plan link is no longer active. Ask your partner for a fresh one.</p>
        <Link className="primary" href="/">Home</Link>
      </>
    );
  }
  let ids: string[] = [];
  try {
    const parsed = JSON.parse(link.placeIds);
    if (Array.isArray(parsed)) ids = parsed.map(String);
  } catch {
    ids = [];
  }
  const places = ids.length
    ? await prisma.place.findMany({ where: { id: { in: ids } } })
    : [];
  const order = new Map(ids.map((id, i) => [id, i]));
  places.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return (
    <>
      <p className="small"><Link href="/">← Local Life</Link></p>
      <h1 data-testid="plan-title">{link.title}</h1>
      <p className="sub">
        Shared by {link.creator.displayName} · 2-person plan link (no friend graph required). Opens expire after two weeks.
      </p>
      {places.length === 0 ? <div className="card">Nothing on this shortlist.</div> : null}
      {places.map((p) => {
        const gotchas = parseGotchas(p.gotchas);
        return (
          <article className="card" key={p.id} data-testid="plan-place">
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="card-thumb" src={p.imageUrl} alt="" width={640} height={200} />
            ) : null}
            <h2 className="place-title"><Link href={`/places/${p.id}`}>{p.name}</Link></h2>
            <p className="meta">{p.costVibe} · {p.whenHours}</p>
            <p className="desc">{p.why}</p>
            {gotchas.length ? (
              <div className="pill-row">
                {gotchas.map((g) => (
                  <span className="badge gotcha" key={g}>{gotchaLabel(g)}</span>
                ))}
              </div>
            ) : null}
            <Link className="secondary" href={`/places/${p.id}`} style={{ marginTop: 8, display: "inline-flex" }}>Open</Link>
          </article>
        );
      })}
    </>
  );
}
