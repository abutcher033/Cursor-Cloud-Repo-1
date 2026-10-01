"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LAST_SEARCH_STORAGE_KEY, lastSearchToQs, readLastSearch } from "@/lib/near";

const LINKS = [
  { href: "/", label: "Home", icon: "⌂", match: (p: string) => p === "/" },
  { href: "/results", label: "Explore", icon: "◎", match: (p: string) => p.startsWith("/results") || p.startsWith("/places") },
  { href: "/recent", label: "Went", icon: "✓", match: (p: string) => p.startsWith("/recent") || p.startsWith("/go") },
  { href: "/settings", label: "You", icon: "⚙", match: (p: string) => p.startsWith("/settings") || p.startsWith("/friends") || p.startsWith("/saved") || p.startsWith("/auth") || p.startsWith("/plan") },
];

export function Nav({ pendingFriends = 0 }: { pendingFriends?: number }) {
  const path = usePathname() || "/";
  const [exploreHref, setExploreHref] = useState("/results");

  useEffect(() => {
    try {
      const last = readLastSearch(sessionStorage.getItem(LAST_SEARCH_STORAGE_KEY));
      if (last) setExploreHref(`/results?${lastSearchToQs(last)}`);
    } catch {
      /* ignore */
    }
  }, [path]);

  return (
    <nav className="nav">
      {LINKS.map((l) => {
        const href = l.label === "Explore" ? exploreHref : l.href;
        const showBadge = l.label === "You" && pendingFriends > 0;
        return (
          <Link key={l.href} href={href} className={l.match(path) ? "active" : undefined} data-testid={l.label === "You" ? "nav-you" : undefined}>
            <strong style={{ position: "relative" }}>
              {l.icon}
              {showBadge ? <span className="nav-dot" data-testid="friends-badge">{pendingFriends > 9 ? "9+" : pendingFriends}</span> : null}
            </strong>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
