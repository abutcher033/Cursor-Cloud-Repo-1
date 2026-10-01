import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { starGlyphs } from "@/lib/text";

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, displayName: true, reviews: { orderBy: { createdAt: "desc" }, take: 20, include: { place: { select: { id: true, name: true } } } } },
  });
  if (!user) notFound();
  return (
    <>
      <h1>{user.displayName}</h1>
      <p className="sub">{user.reviews.length} review{user.reviews.length === 1 ? "" : "s"} shown. No email and no home address on this page.</p>
      {user.reviews.length === 0 ? <p className="small">No reviews yet.</p> : null}
      {user.reviews.map((r) => (
        <article className="card" key={r.id}>
          <div className="stars">{starGlyphs(r.stars)}</div>
          <h2 className="place-title"><Link href={`/places/${r.place.id}`}>{r.place.name}</Link></h2>
          {r.body ? <p className="desc">{r.body}</p> : null}
        </article>
      ))}
    </>
  );
}
