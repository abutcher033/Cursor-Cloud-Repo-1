import Link from "next/link";
import { HOME_HERO_IMAGE } from "@/lib/photos";

export default function OnboardingPage() {
  return (
    <div data-testid="onboarding" className="onboard">
      <div className="onboard-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HOME_HERO_IMAGE}
          alt="Local autumn countryside for first-run setup"
          width={1200}
          height={480}
        />
        <div className="onboard-hero-veil" aria-hidden="true" />
        <p className="onboard-kicker">First Saturday</p>
      </div>
      <h1>Here’s Saturday.</h1>
      <p className="sub">
        One zip, optional kid ages, Family lens on. We skip the category wall — you can filter later.
      </p>
      <form className="card onboard-card" action="/api/onboarding" method="post">
        <label htmlFor="near">Home zip</label>
        <input
          id="near"
          name="near"
          type="text"
          required
          minLength={3}
          maxLength={40}
          defaultValue="21048"
          data-testid="onboard-near"
        />
        <label htmlFor="kidsAges" style={{ marginTop: 12 }}>
          Kids’ ages (optional)
        </label>
        <input
          id="kidsAges"
          name="kidsAges"
          type="text"
          placeholder="e.g. 1.5, 4"
          maxLength={40}
          data-testid="onboard-kids"
        />
        <p className="small" style={{ marginTop: 6 }}>
          Comma-separated. Used for soft age-fit ranking later.
        </p>
        <input type="hidden" name="lens" value="1" />
        <label className="toggle" style={{ marginTop: 12 }}>
          <input type="checkbox" name="lensCheck" value="1" defaultChecked disabled />
          <div>
            <strong>Family lens</strong>
            <div className="small">On by default for first run</div>
          </div>
          <div className="switch" aria-hidden="true" />
        </label>
        <button className="primary cta-pop" type="submit" style={{ marginTop: 14 }} data-testid="onboard-submit">
          Show me Saturday
        </button>
      </form>
      <p className="small" style={{ textAlign: "center" }}>
        <Link href="/results?near=21048&radius=25&lens=1">Skip — browse now</Link>
      </p>
    </div>
  );
}
