import Link from "next/link";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { CampusClusterCard } from "@/components/CampusCluster";
import { PersistSearch } from "@/components/PersistSearch";
import { PlaceCard } from "@/components/PlaceCard";
import { SearchForm } from "@/components/SearchForm";
import { WeekendStrip } from "@/components/WeekendStrip";
import { ResultsMap } from "@/components/ResultsMap";
import { OfflineCache } from "@/components/OfflineCache";
import { WeekDigest } from "@/components/WeekDigest";
import { knownAmenities } from "@/lib/amenities";
import { weekDigestText } from "@/lib/ics";
import { clusterByCampus } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { lastSearchToQs, nearQuery, readLastSearch, type LastSearch } from "@/lib/near";
import { readGuest } from "@/lib/prefs";
import { normalizeRadius } from "@/lib/pipeline";
import { many, one } from "@/lib/query";
import { executeSearch, type RankedView } from "@/lib/service";
import { getSession } from "@/lib/session";
import { knownCategories } from "@/lib/categories";
import { HOME_MOOD_STRIP } from "@/lib/photos";

function detailPath(
  id: string,
  opts: {
    near: string;
    radius: number;
    familyLens: boolean;
    weatherPoor: boolean;
    categories: string[];
    origin: { lat: number; lng: number; label: string };
    returnTo: string;
  },
) {
  const qs = new URLSearchParams();
  qs.set("near", opts.near);
  qs.set("radius", String(opts.radius));
  qs.set("olat", String(opts.origin.lat));
  qs.set("olng", String(opts.origin.lng));
  qs.set("olabel", opts.origin.label);
  if (opts.familyLens) qs.set("lens", "1");
  if (opts.weatherPoor) qs.set("weather", "poor");
  for (const c of opts.categories) qs.append("categories", c);
  qs.set("returnTo", opts.returnTo);
  return `/places/${id}?${qs.toString()}`;
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getSession();
  const jar = cookies();
  const guest = readGuest(jar.get("lf_guest")?.value);
  const last = readLastSearch(jar.get("lf_last")?.value);
  const user = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;
  const explicit = "near" in searchParams || "radius" in searchParams || "lens" in searchParams || "categories" in searchParams || "under90" in searchParams || "amenity" in searchParams;

  let near: string;
  let radius: number;
  let categories: string[];
  let familyLens: boolean;
  let weatherPoor: boolean;
  let under90: boolean;
  let amenities: string[];

  if (explicit) {
    near = nearQuery(one(searchParams.near)) || nearQuery(user?.homeLabel) || "21048";
    radius = normalizeRadius(Number(one(searchParams.radius) || last?.radius || user?.defaultRadius || guest.radius || 25));
    categories = knownCategories(many(searchParams.categories));
    familyLens = one(searchParams.lens) === "1";
    weatherPoor = one(searchParams.weather) === "poor";
    under90 = one(searchParams.under90) === "1";
    amenities = knownAmenities(many(searchParams.amenity));
  } else if (last) {
    near = last.near;
    radius = last.radius;
    categories = last.categories;
    familyLens = last.familyLens;
    weatherPoor = last.weatherPoor;
    under90 = !!last.under90;
    amenities = last.amenities || [];
  } else {
    near = nearQuery(user?.homeLabel) || "21048";
    radius = user?.defaultRadius || guest.radius || 25;
    categories = knownCategories(user ? (JSON.parse(user.categories || "[]") as string[]) : guest.categories);
    familyLens = user ? user.familyLens : guest.familyLens;
    weatherPoor = guest.weatherPoor;
    under90 = false;
    amenities = [];
  }

  const persist: LastSearch = { near, radius, categories, familyLens, weatherPoor, under90, amenities };
  const result = await executeSearch({
    near,
    radiusMiles: radius,
    categories,
    familyLens,
    weatherPoor,
    under90,
    amenities,
    userId: session?.user?.id,
  });
  const qs = lastSearchToQs(persist);
  const returnTo = `/results?${qs}`;

  const weatherSource =
    result.ok
      ? result.weather.source === "nws"
        ? "NWS forecast"
        : result.weather.source === "manual"
          ? "Manual rainy-day"
          : "SAMPLE weather"
      : "";

  return (
    <>
      <PersistSearch {...persist} />
      <h1 className="results-title">{result.ok ? `Near ${result.origin.label}` : "Search"}</h1>
      {!result.ok ? (
        <div className="card empty" role="alert">
          <h2>We couldn’t place that</h2>
          <p>{result.message}</p>
        </div>
      ) : (
        <>
          <p className="sub" data-testid="result-summary">
            <span data-testid="result-count">{result.count}</span> within {result.radiusMiles} mi
            {result.familyLens ? " · Family lens on" : ""}
            {result.weatherPoor ? " · Rainy-day boost" : ""}{under90 ? " · Under 90 min" : ""}{amenities.length ? ` · Amenities ${amenities.length}` : ""}
            {" · "}
            <span data-testid="origin-source">
              {result.origin.source === "nominatim" ? "Nominatim" : result.origin.source === "cache" ? "Cached geocode" : "Offline zip table"}
            </span>
            {" · "}
            <span data-testid="search-near">{near}</span>
          </p>
          <div className="note" data-testid="weather-note">
            <strong>{weatherSource}:</strong> {result.weatherNote}
          </div>
          <div className="results-hero-strip" aria-hidden="true">
            {HOME_MOOD_STRIP.slice(0, 4).map((m) => (
              <img key={m.label} src={m.src} alt="" width={120} height={72} loading="lazy" />
            ))}
          </div>
          {(result.familyLens || result.weekend.length > 0) && result.weekend.length > 0 ? (
            <WeekendStrip
              items={result.weekend}
              detailQuery={detailPath("PLACE", { near, radius, familyLens, weatherPoor: result.weatherPoor, categories, origin: result.origin, returnTo }).replace("/places/PLACE?", "")}
            />
          ) : null}
          {result.pins.mustTry || result.pins.niche ? (
            <div className="note">
              {result.pins.mustTry ? <><strong>This week · Must-try:</strong> {result.pins.mustTry.name}{" "}
                <Link className="small" href="/share/week" data-testid="share-week-link">Share card</Link></> : null}
              {result.pins.niche ? <>{result.pins.mustTry ? " · " : ""}<strong>Niche:</strong> {result.pins.niche.name}</> : null}
            </div>
          ) : null}
          <ResultsMap
            origin={{ lat: result.origin.lat, lng: result.origin.lng }}
            pins={[result.pins.mustTry, result.pins.niche, ...result.results]
              .filter(Boolean)
              .map((i) => ({ id: i!.id, name: i!.name, lat: i!.lat, lng: i!.lng, editorialRole: i!.editorialRole }))}
          />
          <OfflineCache
            near={near}
            radius={radius}
            items={[result.pins.mustTry, result.pins.niche, ...result.results]
              .filter(Boolean)
              .map((i) => ({ id: i!.id, name: i!.name, whenHours: i!.whenHours, address: i!.address, why: i!.why, score: i!.score }))}
          />
          <WeekDigest
            text={weekDigestText(
              result.weekend.map((w) => ({ name: w.name, whenHours: w.whenHours, address: w.address })),
              result.origin.label,
            )}
          />
          {result.count === 0 ? (
            <div className="card empty" data-testid="empty-state">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="empty-art" src="/illustrations/empty-range.svg" alt="" width={440} height={220} />
              <h2>Nothing in that range</h2>
              <p>
                No active listings within {result.radiusMiles} miles of {result.origin.label}. The starter catalog is thickest around Carroll County and north Baltimore. Widen the radius, or try the seed zip.
              </p>
              <div className="row">
                {near !== "21048" ? (
                  <Link
                    className="chip"
                    data-testid="empty-chip-21048"
                    href={`/results?near=21048&radius=${result.radiusMiles}${familyLens ? "&lens=1" : ""}`}
                  >
                    Search 21048
                  </Link>
                ) : null}
                {[10, 15, 25, 40, 60]
                  .filter((r) => r > result.radiusMiles)
                  .map((r) => {
                    const next = new URLSearchParams(qs);
                    next.set("radius", String(r));
                    return (
                      <Link key={r} className="chip" href={`/results?${next.toString()}`}>
                        Try {r} mi
                      </Link>
                    );
                  })}
              </div>
            </div>
          ) : (
            <ResultsBody
              results={result.results}
              pins={[result.pins.mustTry, result.pins.niche].filter(Boolean) as RankedView[]}
              origin={result.origin}
              returnTo={returnTo}
              signedIn={!!session}
              near={near}
              radius={radius}
              familyLens={familyLens}
              weatherPoor={result.weatherPoor}
              categories={categories}
            />
          )}
        </>
      )}
      <h2 style={{ marginTop: 8 }}>Change the search</h2>
      <SearchForm
        near={near}
        nearDisplay={result.ok ? result.origin.label : undefined}
        radius={radius}
        categories={categories}
        familyLens={familyLens}
        weatherPoor={weatherPoor}
        under90={under90}
        amenities={amenities}
        weatherSource={result.ok ? result.weather.source : "sample"}
        categoryCounts={result.ok ? result.categoryCounts : {}}
        submitLabel="Update results"
      />
    </>
  );
}

function ResultsBody({
  results,
  pins,
  origin,
  returnTo,
  signedIn,
  near,
  radius,
  familyLens,
  weatherPoor,
  categories,
}: {
  results: RankedView[];
  pins: RankedView[];
  origin: { lat: number; lng: number; label: string };
  returnTo: string;
  signedIn: boolean;
  near: string;
  radius: number;
  familyLens: boolean;
  weatherPoor: boolean;
  categories: string[];
}) {
  const pinIds = new Set(pins.map((p) => p.id));
  const merged = [...pins, ...results.filter((r) => !pinIds.has(r.id))];
  const { clusters, singles } = clusterByCampus(merged);
  const clusteredIds = new Set(clusters.flatMap((c) => c.items.map((i) => i.id)));
  const emitted = new Set<string>();
  const nodes: ReactNode[] = [];
  const dh = (id: string) =>
    detailPath(id, { near, radius, familyLens, weatherPoor, categories, origin, returnTo });

  // Featured pins that are NOT absorbed into a campus cluster
  for (const item of pins) {
    if (clusteredIds.has(item.id)) continue;
    emitted.add(item.id);
    nodes.push(
      <PlaceCard
        key={`pin-${item.id}`}
        item={item}
        origin={origin}
        returnTo={returnTo}
        signedIn={signedIn}
        featured
        detailHref={dh(item.id)}
      />,
    );
  }

  for (const item of merged) {
    if (emitted.has(item.id)) continue;
    const cluster = clusters.find((c) => c.items.some((i) => i.id === item.id));
    if (cluster && !emitted.has(cluster.campusId)) {
      for (const i of cluster.items) emitted.add(i.id);
      emitted.add(cluster.campusId);
      nodes.push(
        <CampusClusterCard
          key={cluster.campusId}
          campusId={cluster.campusId}
          label={`Same stop · ${cluster.label}`}
          items={cluster.items}
          origin={origin}
          returnTo={returnTo}
          signedIn={signedIn}
          detailHref={dh}
        />,
      );
      continue;
    }
    if (clusteredIds.has(item.id)) continue;
    emitted.add(item.id);
    nodes.push(
      <PlaceCard
        key={item.id}
        item={item}
        origin={origin}
        returnTo={returnTo}
        signedIn={signedIn}
        detailHref={dh(item.id)}
      />,
    );
  }
  for (const item of singles) {
    if (emitted.has(item.id)) continue;
    nodes.push(
      <PlaceCard
        key={item.id}
        item={item}
        origin={origin}
        returnTo={returnTo}
        signedIn={signedIn}
        detailHref={dh(item.id)}
      />,
    );
  }
  return <>{nodes}</>;
}
