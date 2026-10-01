import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { finish, limitOrNull, readFields, rejectOrigin } from "@/lib/http";
import { withinDailyLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { cleanText, safeNext } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const placeId = url.searchParams.get("placeId") || "";
  const reviews = await prisma.review.findMany({
    where: placeId ? { placeId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { id: true, displayName: true } } },
  });
  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      placeId: r.placeId,
      stars: r.stars,
      body: r.body,
      tags: (() => { try { return JSON.parse(r.tags || "[]"); } catch { return []; } })(),
      author: r.user.displayName,
      authorId: r.user.id,
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const blocked = rejectOrigin(req);
  if (blocked) return blocked;
  const limited = limitOrNull(req, "review", 20, 60 * 60 * 1000);
  if (limited) return limited;
  const session = await getSession();
  const fields = await readFields(req);
  const placeId = fields.placeId || "";
  const back = safeNext(fields.returnTo, `/places/${placeId}`);
  if (!session?.user?.id) return finish(req, `/auth?next=${encodeURIComponent(back)}`, { error: "Sign in required" }, 401);
  const stars = Number(fields.stars);
  const body = cleanText(fields.body || "", 500);
  const allowedTags = new Set(["stroller", "nap-friendly", "loud", "parking"]);
  const tags = (fields.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => allowedTags.has(t));
  const tagsJson = JSON.stringify(tags);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return finish(req, `${back}${back.includes("?") ? "&" : "?"}error=stars`, { error: "Pick 1 to 5 stars." }, 400);
  }
  const place = await prisma.place.findUnique({ where: { id: placeId } });
  if (!place) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const writes = await prisma.reviewWrite.findMany({
    where: { userId: session.user.id },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  if (!withinDailyLimit(writes.map((w) => w.createdAt.getTime()), Date.now(), 5)) {
    return finish(req, `${back}${back.includes("?") ? "&" : "?"}error=limit`, { error: "Review limit is 5 a day." }, 429);
  }
  await prisma.review.upsert({
    where: { userId_placeId: { userId: session.user.id, placeId } },
    create: { userId: session.user.id, placeId, stars, body, tags: tagsJson },
    update: { stars, body, tags: tagsJson },
  });
  await prisma.reviewWrite.create({ data: { userId: session.user.id } });
  return finish(req, back, { ok: true });
}
