import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { SwRegister } from "@/components/SwRegister";
import { prisma } from "@/lib/db";
import { discoveryModeLabel } from "@/lib/providers";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Local Life", template: "%s · Local Life" },
  description: "Ranked events, food, and things to do near a zip or address. Carroll County and north Baltimore seed, any origin.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Local Life", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1F3D2B",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const discovery = discoveryModeLabel();
  let pendingFriends = 0;
  if (session?.user?.id) {
    pendingFriends = await prisma.friendship.count({
      where: { addresseeId: session.user.id, status: "pending" },
    });
  }
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <div className="app">
          <header className="topbar">
            <div className="brand">
              <Link href="/">Local <span>Life</span></Link>
            </div>
            <div className="header-actions">
              {session?.user ? (
                <Link href="/settings">{session.user.name || "You"}</Link>
              ) : (
                <Link href="/auth">Sign in</Link>
              )}
            </div>
          </header>
          <main id="main" className="content">
            <details className="demo-banner demo-banner-fold" data-testid="discovery-banner">
              <summary>
                {discovery === "fixture"
                  ? "Demo catalog — SAMPLE rows are fictional"
                  : discovery === "live"
                    ? "Live discovery on"
                    : "Live discovery partial"}
              </summary>
              <p>
                {discovery === "fixture"
                  ? "Not live Google or Ticketmaster. Star counts are demo figures. Rows marked SAMPLE are fictional. Weather may be NWS or SAMPLE — see the note on results."
                  : discovery === "live"
                    ? "Google Places + Ticketmaster. Seed/SAMPLE public stars are hidden so they are never shown as live ratings."
                    : "Missing a key falls back to fixtures for that source. Seed/SAMPLE public stars are stripped in live mode."}
              </p>
            </details>
            {children}
          </main>
          <Nav pendingFriends={pendingFriends} />
        </div>
        <SwRegister />
      </body>
    </html>
  );
}
