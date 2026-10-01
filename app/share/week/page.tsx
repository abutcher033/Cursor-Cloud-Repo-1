import Link from "next/link";
import type { Metadata } from "next";
import { executeSearch } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const result = await executeSearch({
    near: "21048",
    radiusMiles: 25,
    categories: [],
    familyLens: true,
    weatherPoor: false,
  });
  const title = result.ok && result.pins.mustTry
    ? `Must-try · ${result.pins.mustTry.name}`
    : "Must-try of the week · Local Life";
  return {
    title,
    description: result.ok && result.pins.mustTry ? result.pins.mustTry.why.slice(0, 140) : "Local Life weekly must-try",
    openGraph: {
      title,
      description: result.ok && result.pins.mustTry ? result.pins.mustTry.why.slice(0, 140) : "Local Life",
      images: [{ url: "/share/week/opengraph-image", width: 1200, height: 630 }],
    },
  };
}

export default async function ShareWeekPage() {
  const result = await executeSearch({
    near: "21048",
    radiusMiles: 25,
    categories: [],
    familyLens: true,
    weatherPoor: false,
  });
  const pin = result.ok ? result.pins.mustTry : null;
  const niche = result.ok ? result.pins.niche : null;
  return (
    <div data-testid="share-week">
      <p className="small"><Link href="/results?near=21048&radius=25&lens=1">← Results</Link></p>
      <article className="share-card" data-testid="share-card">
        <div className="share-card-brand">Local <span>Life</span></div>
        <p className="share-card-kicker">Must-try of the week</p>
        <h1>{pin?.name || "No pin this week"}</h1>
        <p className="share-card-why">{pin?.why || "Run sync:editorial after the Local Life log refresh."}</p>
        {pin ? (
          <p className="share-card-meta">
            {pin.whenHours}
            <br />
            {pin.address}
            {pin.visitMinutes ? <> · ~{pin.visitMinutes} min</> : null}
          </p>
        ) : null}
        {niche ? <p className="share-card-niche">Also niche: {niche.name}</p> : null}
        <p className="share-card-foot">Carroll / north Baltimore · forest · cream · copper</p>
      </article>
      <p className="small" style={{ marginTop: 12 }}>
        Print or screenshot this card. Open Graph image: <code>/share/week/opengraph-image</code>.
        {" · "}
        <Link href={pin ? `/places/${pin.id}?near=21048&radius=25&lens=1` : "/"}>Open detail</Link>
      </p>
    </div>
  );
}
