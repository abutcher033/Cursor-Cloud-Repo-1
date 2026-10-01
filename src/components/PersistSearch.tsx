"use client";

import { useEffect } from "react";
import {
  LAST_SEARCH_COOKIE,
  LAST_SEARCH_STORAGE_KEY,
  serializeLastSearch,
  type LastSearch,
} from "@/lib/near";

/** Writes last search to sessionStorage + cookie so Explore can restore. */
export function PersistSearch(props: LastSearch) {
  useEffect(() => {
    const payload = serializeLastSearch(props);
    try {
      sessionStorage.setItem(LAST_SEARCH_STORAGE_KEY, payload);
    } catch {
      /* private mode */
    }
    document.cookie = `${LAST_SEARCH_COOKIE}=${encodeURIComponent(payload)}; Path=/; Max-Age=2592000; SameSite=Lax`;
  }, [props.near, props.radius, props.familyLens, props.weatherPoor, props.under90, (props.amenities||[]).join(","), props.categories.join(",")]);
  return null;
}
