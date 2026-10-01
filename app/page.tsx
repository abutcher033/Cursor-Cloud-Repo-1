import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HomeHero } from "@/components/HomeHero";
import { SearchForm } from "@/components/SearchForm";
import { WeekendStrip } from "@/components/WeekendStrip";
import { prisma } from "@/lib/db";
import { nearQuery, readLastSearch } from "@/lib/near";
import { readGuest } from "@/lib/prefs";
import { executeSearch } from "@/lib/service";
import { getSession } from "@/lib/session";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const jar = cookies();
  const onboarded = jar.get("lf_onboarded")?.value === "1";
  const skipOnboard = searchParams.skip === "1" || searchParams.onboarded === "1";
  const session = await getSession();
  const user = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;
  if (!onboarded && !skipOnboard && !user?.onboardedAt && !readLastSearch(jar.get("lf_last")?.value)) {
    redirect("/onboarding");
  }

  const guest = readGuest(jar.get("lf_guest")?.value);
  const last = readLastSearch(jar.get("lf_last")?.value);
  const categories = user ? (JSON.parse(user.categories || "[]") as string[]) : guest.categories;
  const near = nearQuery(last?.near || user?.homeLabel || "21048") || "21048";
  const familyLens = user ? user.familyLens : guest.familyLens;
  const radius = user?.defaultRadius || last?.radius || guest.radius || 25;
  const weatherPoor = guest.weatherPoor;

  const weekend = await executeSearch({
    near,
    radiusMiles: radius,
    categories: [],
    familyLens: true,
    weatherPoor,
    userId: session?.user?.id,
  });

  const counts: Record<string, number> = weekend.ok ? { ...weekend.categoryCounts } : {};

  return (
    <>
      <HomeHero near={near} radius={radius} familyLens={familyLens} />
      {weekend.ok && weekend.weekend.length ? (
        <>
          <WeekendStrip
            items={weekend.weekend}
            detailQuery={`near=${encodeURIComponent(near)}&radius=${radius}${familyLens ? "&lens=1" : ""}`}
          />
          <p className="small" style={{ marginBottom: 12 }}>
            <Link href={`/results?near=${encodeURIComponent(near)}&radius=${radius}&lens=1`}>
              Open Family lens ranking →
            </Link>
            {" · "}
            <Link href="/share/week">Must-try share card</Link>
          </p>
        </>
      ) : null}
      <div id="search" className="search-anchor">
        <SearchForm
          near={near}
          nearDisplay={user?.homeLabel}
          radius={radius}
          categories={categories}
          familyLens={familyLens}
          weatherPoor={weatherPoor}
          under90={!!last?.under90}
          amenities={last?.amenities || []}
          weatherSource={weekend.ok ? weekend.weather.source : "sample"}
          categoryCounts={counts}
        />
      </div>
      <p className="small" style={{ textAlign: "center", marginTop: 10 }}>
        Guests can browse and read reviews. Sign in to Go, Save, rate, or add friends.
        {!onboarded ? (
          <>
            {" "}
            · <Link href="/onboarding">First-run setup</Link>
          </>
        ) : null}
      </p>
    </>
  );
}
