"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CacheShape = {
  at: number;
  near: string;
  radius: number;
  items: { id: string; name: string; whenHours: string; address: string; why: string; score: number }[];
};

export default function OfflinePage() {
  const [cache, setCache] = useState<CacheShape | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("lf_last_results");
      if (raw) setCache(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);
  return (
    <>
      <h1>You’re offline</h1>
      <p className="sub">
        Account pages and APIs are never cached. Last search results may still be on this device for the car or park lot with no signal.
      </p>
      {cache?.items?.length ? (
        <div className="card" data-testid="offline-results">
          <h2>Last results · {cache.near} · {cache.radius} mi</h2>
          <p className="small">Saved {new Date(cache.at).toLocaleString()}</p>
          <ul style={{ paddingLeft: 18 }}>
            {cache.items.slice(0, 12).map((i) => (
              <li key={i.id} style={{ marginBottom: 8 }}>
                <strong>{i.name}</strong>
                <div className="small">{i.whenHours} · {i.address}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="card empty">No cached results yet — open a search while online first.</div>
      )}
      <Link className="primary" href="/">Try home</Link>
    </>
  );
}
