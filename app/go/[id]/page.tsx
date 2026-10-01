import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { one } from "@/lib/query";
import { safeNext } from "@/lib/text";

export default async function GoPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getSession();
  const here = `/go/${params.id}`;
  if (!session?.user?.id) redirect(`/auth?next=${encodeURIComponent(here)}`);
  const place = await prisma.place.findUnique({ where: { id: params.id } });
  if (!place) redirect("/results");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const olat = Number(one(searchParams.olat));
  const olng = Number(one(searchParams.olng));
  const lat = Number.isFinite(olat) ? olat : user?.homeLat ?? 39.4959;
  const lng = Number.isFinite(olng) ? olng : user?.homeLng ?? -76.8946;
  const label = one(searchParams.olabel) || user?.homeLabel || "Home";
  const ready = one(searchParams.ready) === "1";
  const google = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${place.lat},${place.lng}&travelmode=driving`;
  const apple = `https://maps.apple.com/?saddr=${lat},${lng}&daddr=${place.lat},${place.lng}&dirflg=d`;
  const returnTo = safeNext(one(searchParams.returnTo), `/places/${place.id}`);

  return (
    <>
      <h1>{ready ? "Going" : "Planning"}</h1>
      <div className="sheet" data-testid="go-sheet">
        <h2>{ready ? "Directions to" : "Plan a trip to"} {place.name}</h2>
        <p className="desc">
          Opening directions from <strong>{label}</strong> to <strong>{place.address}</strong>. No paid routing — this hands off to Apple Maps or Google Maps.
        </p>
        {place.sample ? <div className="alert">SAMPLE listing. Don’t treat the pin as a real event.</div> : null}
        {place.status === "verify" ? <div className="note">Status is verify. Check hours on the official page before you leave.</div> : null}
        {!ready ? (
          <form action="/api/go" method="post">
            <input type="hidden" name="placeId" value={place.id} />
            <input type="hidden" name="originLat" value={lat} />
            <input type="hidden" name="originLng" value={lng} />
            <input type="hidden" name="originLabel" value={label} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <button className="primary" type="submit" data-testid="confirm-go">Confirm Going</button>
          </form>
        ) : (
          <>
            <div className="oknote" data-testid="go-saved">
              Saved as Going. Open maps below, then mark Been from the Went tab when you’re back.
            </div>
            <div className="btn-row">
              <a className="primary" data-testid="google-maps" href={google} target="_blank" rel="noreferrer">Google Maps</a>
              <a className="secondary" data-testid="apple-maps" href={apple} target="_blank" rel="noreferrer">Apple Maps</a>
            </div>
          </>
        )}
        <p style={{ marginTop: 12 }}>
          <Link className="small" href={`/places/${place.id}`}>Back to the listing</Link>
          {" · "}
          <Link className="small" href="/recent">Went</Link>
        </p>
      </div>
    </>
  );
}
