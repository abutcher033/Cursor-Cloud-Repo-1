"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { placeImageAlt, resolvePlaceImage } from "@/lib/photos";
import { isThisWeekendEvent } from "@/lib/weekend";

type DayFilter = "all" | "sat" | "sun";

/** Serializable weekend-card fields only — do not import @/lib/service here (client boundary). */
type WeekendItem = {
  id: string;
  name: string;
  kind: string;
  whenHours: string;
  startsAt: string | null;
  endsAt: string | null;
  imageUrl?: string | null;
  sample?: boolean;
};

export function WeekendStrip({
  items,
  /** Query string after `/places/:id?` — must be serializable (no function props). */
  detailQuery,
  defaultDay,
}: {
  items: WeekendItem[];
  detailQuery: string;
  defaultDay?: DayFilter;
}) {
  const [day, setDay] = useState<DayFilter>(defaultDay || "all");
  const now = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    if (day === "all") return items;
    return items.filter((item) => {
      const info = isThisWeekendEvent(item, now);
      if (!info.day || info.day === "both") return true;
      return info.day === day;
    });
  }, [items, day, now]);

  if (!items.length) return null;

  const hrefFor = (id: string) => {
    const q = detailQuery.replace(/^\?/, "");
    return q ? `/places/${id}?${q}` : `/places/${id}`;
  };

  return (
    <section className="weekend" data-testid="weekend-strip">
      <div className="weekend-head">
        <h2>This weekend</h2>
        <div className="row" role="group" aria-label="Weekend day filter">
          {(
            [
              ["all", "All"],
              ["sat", "Sat"],
              ["sun", "Sun"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`chip chip-press${day === id ? " on" : ""}`}
              aria-pressed={day === id}
              data-testid={`weekend-day-${id}`}
              onClick={() => setDay(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="weekend-scroller">
        {filtered.map((item) => {
          const src = resolvePlaceImage(item.id, item.imageUrl, item.name);
          return (
            <Link key={item.id} className="weekend-card card-press" href={hrefFor(item.id)} data-testid="weekend-chip">
              <div className="weekend-card-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={placeImageAlt(item.name, item.sample)} width={160} height={96} loading="lazy" />
                {item.sample ? <span className="weekend-sample">SAMPLE</span> : null}
              </div>
              <strong>{item.name}</strong>
              <span className="small">{item.whenHours}</span>
            </Link>
          );
        })}
        {!filtered.length ? (
          <p className="small" style={{ padding: "8px 4px" }}>
            Nothing tagged for that day — try All.
          </p>
        ) : null}
      </div>
    </section>
  );
}
