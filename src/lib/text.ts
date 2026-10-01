import { NextResponse } from "next/server";

export function cleanText(s: string, max: number): string {
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function safeNext(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || raw.includes("://") || raw.includes("\n")) {
    return fallback;
  }
  return raw;
}

export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim().slice(0, 64);
  return "local";
}

export function isForm(req: Request): boolean {
  const ct = req.headers.get("content-type") || "";
  return ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data");
}

export function appOrigin(req: Request): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

/** Mutable NextResponse so callers can append Set-Cookie (Response.redirect is immutable). */
export function redirectTo(req: Request, path: string, status = 303): NextResponse {
  return NextResponse.redirect(new URL(path, appOrigin(req)), status);
}

export function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 120;
}

export function starGlyphs(rating: number | null): string {
  if (rating == null || Number.isNaN(rating)) return "☆☆☆☆☆";
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
}

export function formatMiles(d: number): string {
  if (d < 10) return `${d.toFixed(1)} mi`;
  return `${Math.round(d)} mi`;
}

export function formatWhen(iso: string | null, fallback: string): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
