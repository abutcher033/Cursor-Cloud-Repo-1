import Link from "next/link";
import { cookies } from "next/headers";
import { CATEGORIES } from "@/lib/categories";
import { SignOut } from "@/components/SignOut";
import { prisma } from "@/lib/db";
import { readGuest } from "@/lib/prefs";
import { RADII } from "@/lib/pipeline";
import { one } from "@/lib/query";
import { getSession } from "@/lib/session";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getSession();
  const guest = readGuest(cookies().get("lf_guest")?.value);
  const user = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;
  const saved = searchParams.saved === "1";
  const error = one(searchParams.error);
  const message = one(searchParams.message);
  const categories = new Set<string>(user ? (JSON.parse(user.categories || "[]") as string[]) : guest.categories);
  const pendingFriends = user
    ? await prisma.friendship.count({ where: { addresseeId: user.id, status: "pending" } })
    : 0;
  const radius = user?.defaultRadius ?? guest.radius;
  const lens = user ? user.familyLens : guest.familyLens;

  return (
    <>
      <h1>You</h1>
      <p className="sub">Home location, default radius, categories, and the Family lens. Your street address is never on your public profile.</p>
      {saved ? <div className="oknote">Saved.</div> : null}
      {error === "name" ? <div className="alert" role="alert">Display name must be at least 2 characters.</div> : null}
      {error === "geo" ? <div className="alert" role="alert">{message || "Could not geocode that home location."}</div> : null}

      <div className="card">
        <h2>Lists</h2>
        <div className="btn-row">
          <Link className="secondary" href="/friends" data-testid="settings-friends">Friends{pendingFriends ? ` (${pendingFriends})` : ""}</Link>
          <Link className="secondary" href="/saved">Saved</Link>
        </div>
      </div>

      {user ? (
        <form action="/api/me/settings" method="post">
          <div className="card">
            <label htmlFor="displayName">Display name</label>
            <input id="displayName" name="displayName" required minLength={2} maxLength={40} defaultValue={user.displayName} />
            <p className="small" style={{ marginTop: 6 }}>{user.email}</p>
          </div>
          <div className="card">
            <label htmlFor="home">Home location</label>
            <input id="home" name="home" required minLength={3} maxLength={120} defaultValue={user.homeLabel} />
            <p className="small" style={{ marginTop: 6 }}>Geocoded when you save. Used as the default origin for directions.</p>
          </div>
          <PrefsFields radius={radius} lens={lens} categories={categories} />
          <button className="primary" type="submit">Save settings</button>
        </form>
      ) : (
        <>
          <div className="note">
            You’re browsing as a guest. Family lens and radius here last for this browser only.{" "}
            <Link href="/auth?next=/settings">Sign in</Link> to keep a home location.
          </div>
          <form action="/api/guest-prefs" method="post">
            <PrefsFields radius={radius} lens={lens} categories={categories} />
            <button className="primary" type="submit">Save on this device</button>
          </form>
        </>
      )}
      {user ? (
        <div style={{ marginTop: 12 }}>
          <SignOut />
        </div>
      ) : null}
    </>
  );
}

function PrefsFields({
  radius,
  lens,
  categories,
}: {
  radius: number;
  lens: boolean;
  categories: Set<string>;
}) {
  return (
    <>
      <div className="card">
        <label>Default radius</label>
        <div className="row">
          {RADII.map((r) => (
            <label key={r} className="chip">
              <input type="radio" name="radius" value={r} defaultChecked={r === radius} />
              {r} mi
            </label>
          ))}
        </div>
      </div>
      <div className="card">
        <label>Default categories</label>
        <div className="row">
          {CATEGORIES.map((c) => (
            <label key={c.id} className="chip">
              <input type="checkbox" name="categories" value={c.id} defaultChecked={categories.has(c.id)} />
              {c.label}
            </label>
          ))}
        </div>
      </div>
      <div className="card">
        <label className="toggle">
          <input type="checkbox" name="lens" value="1" defaultChecked={lens} />
          <div>
            <strong>Family lens</strong>
            <div className="small">Persists when you’re signed in. Session-only for guests.</div>
          </div>
          <div className="switch" aria-hidden="true" />
        </label>
      </div>
    </>
  );
}
