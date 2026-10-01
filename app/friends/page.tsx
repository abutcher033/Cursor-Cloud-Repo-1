import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/auth?next=/friends");
  const id = session.user.id;
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: id }, { addresseeId: id }] },
    include: {
      requester: { select: { id: true, displayName: true } },
      addressee: { select: { id: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const incoming = rows.filter((r) => r.addresseeId === id && r.status === "pending");
  const outgoing = rows.filter((r) => r.requesterId === id && r.status === "pending");
  const friends = rows.filter((r) => r.status === "accepted");
  const friendIds = friends.map((r) => (r.requesterId === id ? r.addresseeId : r.requesterId));
  const visits = friendIds.length
    ? await prisma.visit.findMany({
        where: { userId: { in: friendIds } },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { user: { select: { displayName: true } }, place: { select: { id: true, name: true } } },
      })
    : [];
  const error = typeof searchParams.error === "string" ? searchParams.error : "";
  const messages: Record<string, string> = {
    email: "Enter a valid email.",
    missing: "No account with that email yet.",
    self: "You can’t friend yourself.",
    already: "You’re already friends.",
  };

  return (
    <>
      <h1>Friends</h1>
      <p className="sub">Accepted friends boost a place when they’ve tapped Go or Been. Home addresses stay private.</p>
      {searchParams.sent ? <div className="oknote">Request sent.</div> : null}
      {searchParams.updated ? <div className="oknote">Updated.</div> : null}
      {error && messages[error] ? <div className="alert" role="alert">{messages[error]}</div> : null}

      <form className="card" action="/api/friends" method="post">
        <label htmlFor="email">Add by email</label>
        <input id="email" name="email" type="email" required placeholder="jamie@locallife.app" />
        <button className="primary" type="submit" style={{ marginTop: 8 }}>Send request</button>
      </form>

      <h2>Requests</h2>
      {incoming.length === 0 ? <p className="small">No incoming requests.</p> : null}
      {incoming.map((r) => (
        <article className="card" key={r.id} data-testid="incoming-request">
          <p><strong>{r.requester.displayName}</strong> wants to connect.</p>
          <div className="btn-row">
            <form action="/api/friends/respond" method="post">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="action" value="accept" />
              <button className="primary" type="submit" data-testid="accept-friend">Accept</button>
            </form>
            <form action="/api/friends/respond" method="post">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="action" value="decline" />
              <button className="secondary" type="submit">Decline</button>
            </form>
          </div>
        </article>
      ))}
      {outgoing.map((r) => (
        <p className="small" key={r.id}>Waiting on {r.addressee.displayName}.</p>
      ))}

      <h2>Your friends</h2>
      <ul data-testid="friend-list">
        {friends.length === 0 ? <li className="small">None yet.</li> : null}
        {friends.map((r) => {
          const person = r.requesterId === id ? r.addressee : r.requester;
          return (
            <li key={r.id}>
              <Link href={`/u/${person.id}`}>{person.displayName}</Link>
            </li>
          );
        })}
      </ul>

      <h2>Where friends went</h2>
      {visits.length === 0 ? <p className="small">When a friend taps Go, it shows up here and in ranking.</p> : null}
      {visits.map((v) => (
        <p key={v.id} className="desc">
          <strong>{v.user.displayName}</strong> went to <Link href={`/places/${v.place.id}`}>{v.place.name}</Link>
        </p>
      ))}
    </>
  );
}
