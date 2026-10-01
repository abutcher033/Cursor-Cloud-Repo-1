import { AMENITY_KEYS, AMENITY_LABELS, knownAmenities } from "@/lib/amenities";
import { CATEGORIES } from "@/lib/categories";
import { nearQuery } from "@/lib/near";
import { RADII } from "@/lib/pipeline";

export function SearchForm(props: {
  near: string;
  /** Pretty label shown under the input; never submitted. */
  nearDisplay?: string;
  radius: number;
  categories: string[];
  familyLens: boolean;
  weatherPoor: boolean;
  under90?: boolean;
  amenities?: string[];
  weatherSource?: "nws" | "sample" | "manual";
  categoryCounts?: Record<string, number>;
  action?: string;
  submitLabel?: string;
  /** Compact first-run: hide category wall */
  hideCategories?: boolean;
}) {
  const selected = new Set(props.categories);
  const amenitySel = new Set(knownAmenities(props.amenities || []));
  const bare = nearQuery(props.near) || props.near;
  const hint = props.nearDisplay && props.nearDisplay !== bare ? props.nearDisplay : null;
  const counts = props.categoryCounts || {};
  const weatherHint =
    props.weatherSource === "nws"
      ? "NWS forecast available — rainy-day may auto-enable when precip is high."
      : props.weatherSource === "manual"
        ? "Using your rainy-day checkbox (NWS unavailable)."
        : "SAMPLE weather fallback — checkbox still works; sources marked honestly above.";

  return (
    <form action={props.action || "/results"} method="get" className="search-form">
      <div className="card">
        <label htmlFor="near">Home / search location</label>
        <input id="near" name="near" type="text" required minLength={3} maxLength={120} defaultValue={bare} data-testid="near-input" />
        <p className="small" style={{ marginTop: 6 }}>
          Zip or address only — this search does not change your saved home.
          {hint ? <> Current place: {hint}.</> : null}
        </p>
      </div>
      {!props.hideCategories ? (
        <div className="card">
          <label>Categories <span className="small">(none = mix of all)</span></label>
          <div className="row">
            {CATEGORIES.map((c) => {
              const n = counts[c.id];
              const empty = typeof n === "number" && n === 0;
              if (empty) {
                return (
                  <span key={c.id} className="chip muted" data-testid={`cat-soon-${c.id}`} title="No listings in the seed catalog yet">
                    {c.label} · soon
                  </span>
                );
              }
              return (
                <label key={c.id} className="chip chip-press">
                  <input type="checkbox" name="categories" value={c.id} defaultChecked={selected.has(c.id)} />
                  {c.label}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="card">
        <label>Search range</label>
        <div className="row">
          {RADII.map((r) => (
            <label key={r} className="chip chip-press">
              <input type="radio" name="radius" value={r} defaultChecked={r === props.radius} />
              {r} mi
            </label>
          ))}
        </div>
        <p className="small">Radius filters the list and sets distance decay. 10 mi and 40 mi are different maps.</p>
      </div>
      <div className="card">
        <label>Nap / duration & amenities</label>
        <div className="row">
          <label className="chip chip-press" data-testid="filter-under90">
            <input type="checkbox" name="under90" value="1" defaultChecked={!!props.under90} />
            Under 90 min
          </label>
          {AMENITY_KEYS.map((k) => (
            <label key={k} className="chip chip-press" data-testid={`amenity-${k}`}>
              <input type="checkbox" name="amenity" value={k} defaultChecked={amenitySel.has(k)} />
              {AMENITY_LABELS[k]}
            </label>
          ))}
        </div>
        <p className="small">Visit length is editorial estimate · amenity tags only where known.</p>
      </div>
      <div className="card">
        <label className="toggle">
          <input type="checkbox" name="lens" value="1" defaultChecked={props.familyLens} />
          <div>
            <strong>Family lens</strong>
            <div className="small">Age-fit, stroller notes, free/cheap, indoor backups</div>
          </div>
          <div className="switch" aria-hidden="true" />
        </label>
        <label className="chip chip-press" style={{ marginTop: 10 }} data-testid="weather-checkbox">
          <input type="checkbox" name="weather" value="poor" defaultChecked={props.weatherPoor} />
          Rainy-day boost
        </label>
        <p className="small" style={{ marginTop: 8 }} data-testid="weather-source-hint">{weatherHint}</p>
      </div>
      <button className="primary cta-pop" type="submit" data-testid="search-submit">{props.submitLabel || "Search ranked results"}</button>
    </form>
  );
}
