import Link from "next/link";
import { HOME_HERO_IMAGE, HOME_MOOD_STRIP } from "@/lib/photos";

export function HomeHero({
  near,
  radius,
  familyLens,
}: {
  near: string;
  radius: number;
  familyLens: boolean;
}) {
  const explore = `/results?near=${encodeURIComponent(near)}&radius=${radius}${familyLens ? "&lens=1" : ""}`;
  return (
    <section className="home-hero" data-testid="home-hero">
      <div className="home-hero-frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="home-hero-img"
          src={HOME_HERO_IMAGE}
          alt="Autumn hills and local Maryland countryside — Local Life cover"
          width={1200}
          height={640}
        />
        <div className="home-hero-veil" aria-hidden="true" />
        <div className="home-hero-copy">
          <p className="home-hero-kicker">Carroll · north Baltimore · your zip</p>
          <h1 className="home-hero-title">What’s fun near you?</h1>
          <p className="home-hero-sub">
            Ranked parks, farms, food, and weekend picks — warm local brochure energy, not another purple AI feed.
          </p>
          <div className="home-hero-actions">
            <a className="primary cta-pop" href="#search">
              Tune my search
            </a>
            <Link className="secondary cta-pop" href={explore}>
              Open ranked list
            </Link>
          </div>
        </div>
      </div>
      <div className="mood-strip" aria-label="Local moods">
        {HOME_MOOD_STRIP.map((m) => (
          <div key={m.label} className="mood-chip">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.src} alt={m.alt} width={160} height={100} loading="lazy" />
            <span>{m.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
