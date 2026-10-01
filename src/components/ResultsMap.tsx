"use client";

import { useEffect, useRef, useState } from "react";

export type MapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  editorialRole?: string | null;
};

/**
 * Lightweight Leaflet map via OSM tiles (CDN). No API key.
 * Tap pin → scroll to `[data-place-id=…]` card.
 */
export function ResultsMap({ pins, origin }: { pins: MapPin[]; origin: { lat: number; lng: number } }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!pins.length) return;
    let cancelled = false;
    let map: { remove: () => void } | null = null;

    async function boot() {
      try {
        // Load CSS once
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }
        if (!(window as unknown as { L?: unknown }).L) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Leaflet failed to load"));
            document.body.appendChild(s);
          });
        }
        if (cancelled || !ref.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const L = (window as any).L;
        const m = L.map(ref.current, { scrollWheelZoom: false }).setView([origin.lat, origin.lng], 10);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
          maxZoom: 18,
        }).addTo(m);
        const bounds: [number, number][] = [[origin.lat, origin.lng]];
        L.circleMarker([origin.lat, origin.lng], {
          radius: 6,
          color: "#1F3D2B",
          fillColor: "#B87333",
          fillOpacity: 1,
        })
          .addTo(m)
          .bindTooltip("Search origin");
        for (const pin of pins) {
          bounds.push([pin.lat, pin.lng]);
          const marker = L.circleMarker([pin.lat, pin.lng], {
            radius: pin.editorialRole ? 9 : 7,
            color: "#1F3D2B",
            fillColor: pin.editorialRole === "must_try" ? "#B87333" : "#2E5A40",
            fillOpacity: 0.9,
            weight: 2,
          }).addTo(m);
          marker.bindTooltip(pin.name);
          marker.on("click", () => {
            const el = document.querySelector(`[data-place-id="${CSS.escape(pin.id)}"]`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("map-flash");
              setTimeout(() => el.classList.remove("map-flash"), 1200);
            }
          });
        }
        if (bounds.length > 1) m.fitBounds(bounds, { padding: [28, 28], maxZoom: 12 });
        map = m;
        setReady(true);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Map unavailable");
      }
    }
    boot();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [pins, origin.lat, origin.lng]);

  if (!pins.length) return null;
  return (
    <div className="card" data-testid="results-map" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px 0" }}>
        <strong style={{ color: "var(--forest)" }}>Map of this result set</strong>
        <p className="small" style={{ margin: "4px 0 8px" }}>
          OSM tiles · tap a pin to jump to its card{ready ? "" : err ? ` · ${err}` : " · loading…"}
        </p>
      </div>
      <div ref={ref} style={{ height: 220, width: "100%", background: "#e8e0d0" }} data-testid="results-map-canvas" />
    </div>
  );
}
