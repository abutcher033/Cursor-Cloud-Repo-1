"use client";

import { useEffect } from "react";

const KEY = "lf_last_results";

/** Cache last ranked results for offline park/car use. SW still skips /api auth. */
export function OfflineCache(props: {
  near: string;
  radius: number;
  items: { id: string; name: string; whenHours: string; address: string; why: string; score: number }[];
}) {
  useEffect(() => {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          at: Date.now(),
          near: props.near,
          radius: props.radius,
          items: props.items.slice(0, 40),
        }),
      );
    } catch {
      /* quota / private */
    }
  }, [props.near, props.radius, props.items]);
  return null;
}

export function readOfflineCache(): {
  at: number;
  near: string;
  radius: number;
  items: { id: string; name: string; whenHours: string; address: string; why: string; score: number }[];
} | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
