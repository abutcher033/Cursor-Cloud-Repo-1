import Link from "next/link";
import { PlaceCard } from "./PlaceCard";
import type { RankedView } from "@/lib/service";

export function CampusClusterCard({
  label,
  campusId,
  items,
  origin,
  returnTo,
  signedIn,
  detailHref,
}: {
  label: string;
  campusId: string;
  items: RankedView[];
  origin: { lat: number; lng: number; label: string };
  returnTo: string;
  signedIn: boolean;
  detailHref: (id: string) => string;
}) {
  const ids = items.map((i) => i.id).join(",");
  return (
    <section className="campus" data-testid="campus-cluster" data-campus={campusId}>
      <div className="campus-head">
        <div>
          <span className="badge pin">Same stop</span>
          <h2 className="campus-title" data-testid="campus-title">{label.replace(/^Same stop · /, "")}</h2>
          <p className="small">{items.length} stops · {label.startsWith("Same stop") ? label : `Same stop · ${label}`}</p>
        </div>
        {signedIn ? (
          <form action="/api/share" method="post">
            <input type="hidden" name="placeIds" value={ids} />
            <input type="hidden" name="title" value={`Ag Center day · ${label}`} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <button className="secondary" type="submit" data-testid="campus-plan">Plan this campus</button>
          </form>
        ) : (
          <Link className="secondary" href={`/auth?next=${encodeURIComponent(returnTo)}`}>Plan this campus</Link>
        )}
      </div>
      <ol className="campus-stops">
        {items.map((item, idx) => (
          <li key={item.id}>
            <span className="stop-num">{idx + 1}</span>
            <PlaceCard
              item={item}
              origin={origin}
              returnTo={returnTo}
              signedIn={signedIn}
              detailHref={detailHref(item.id)}
              compact
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
