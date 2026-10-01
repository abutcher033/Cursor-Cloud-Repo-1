import { NextResponse } from "next/server";
import { knownCategories } from "@/lib/categories";
import { limitOrNull } from "@/lib/http";
import { normalizeRadius } from "@/lib/pipeline";
import { executeSearch } from "@/lib/service";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function parse(input: {
  near?: string;
  radiusMiles?: number | string;
  categories?: string[] | string;
  familyLens?: boolean | string;
  weatherPoor?: boolean | string;
}) {
  const cats = Array.isArray(input.categories)
    ? input.categories
    : String(input.categories || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  const lens = input.familyLens === true || input.familyLens === "1" || input.familyLens === "true";
  const weather = input.weatherPoor === true || input.weatherPoor === "poor" || input.weatherPoor === "1";
  return {
    near: String(input.near || ""),
    radiusMiles: normalizeRadius(Number(input.radiusMiles ?? 25)),
    categories: knownCategories(cats),
    familyLens: lens,
    weatherPoor: weather,
  };
}

export async function GET(req: Request) {
  const limited = limitOrNull(req, "search", 60, 60_000);
  if (limited) return limited;
  const url = new URL(req.url);
  const session = await getSession();
  const result = await executeSearch({
    ...parse({
      near: url.searchParams.get("near") || url.searchParams.get("origin") || "21048",
      radiusMiles: url.searchParams.get("radius") || url.searchParams.get("radiusMiles") || "25",
      categories: url.searchParams.getAll("categories").length
        ? url.searchParams.getAll("categories")
        : url.searchParams.get("categories") || "",
      familyLens: url.searchParams.get("lens") || "",
      weatherPoor: url.searchParams.get("weather") || "",
    }),
    userId: session?.user?.id,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function POST(req: Request) {
  const limited = limitOrNull(req, "search", 60, 60_000);
  if (limited) return limited;
  const body = (await req.json().catch(() => ({}))) as {
    near?: string;
    origin?: { label?: string };
    radiusMiles?: number;
    categories?: string[];
    familyLens?: boolean;
    weatherPoor?: boolean;
  };
  const session = await getSession();
  const result = await executeSearch({
    ...parse({
      near: body.near || body.origin?.label || "",
      radiusMiles: body.radiusMiles,
      categories: body.categories,
      familyLens: body.familyLens,
      weatherPoor: body.weatherPoor,
    }),
    userId: session?.user?.id,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
