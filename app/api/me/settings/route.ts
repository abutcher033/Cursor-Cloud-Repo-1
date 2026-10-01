import { NextResponse } from "next/server";
import { knownCategories } from "@/lib/categories";
import { prisma } from "@/lib/db";
import { finish, readForm, rejectOrigin } from "@/lib/http";
import { normalizeRadius } from "@/lib/pipeline";
import { getProvider } from "@/lib/providers";
import { getSession } from "@/lib/session";
import { cleanText } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { passwordHash: _pw, ...safe } = user;
  return NextResponse.json({
    ...safe,
    categories: JSON.parse(user.categories || "[]"),
  });
}

export async function POST(req: Request) {
  return update(req);
}
export async function PATCH(req: Request) {
  return update(req);
}

async function update(req: Request) {
  const blocked = rejectOrigin(req);
  if (blocked) return blocked;
  const session = await getSession();
  if (!session?.user?.id) return finish(req, "/auth?next=/settings", { error: "Sign in required" }, 401);
  const ct = req.headers.get("content-type") || "";
  let displayName = "";
  let home = "";
  let radius = 25;
  let familyLens = false;
  let categories: string[] = [];
  if (ct.includes("application/json")) {
    const body = (await req.json()) as Record<string, unknown>;
    displayName = String(body.displayName || "");
    home = String(body.home || body.homeLabel || "");
    radius = Number(body.radius ?? body.defaultRadius ?? 25);
    familyLens = body.familyLens === true || body.familyLens === "1";
    categories = Array.isArray(body.categories) ? body.categories.map(String) : [];
  } else {
    const fd = await readForm(req);
    displayName = String(fd.get("displayName") || "");
    home = String(fd.get("home") || "");
    radius = Number(fd.get("radius") || 25);
    familyLens = fd.get("lens") === "1";
    categories = fd.getAll("categories").map(String);
  }
  const name = cleanText(displayName, 40);
  if (name.length < 2) return finish(req, "/settings?error=name", { error: "Display name must be at least 2 characters." }, 400);
  const provider = getProvider();
  let geo: { lat: number; lng: number; label: string };
  try {
    geo = await provider.geocode(home);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not geocode home.";
    return finish(req, `/settings?error=geo&message=${encodeURIComponent(message)}`, { error: message }, 400);
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      displayName: name,
      homeLabel: geo.label,
      homeLat: geo.lat,
      homeLng: geo.lng,
      defaultRadius: normalizeRadius(radius),
      familyLens,
      categories: JSON.stringify(knownCategories(categories)),
    },
  });
  return finish(req, "/settings?saved=1", { ok: true });
}
