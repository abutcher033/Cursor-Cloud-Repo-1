import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { finish, limitOrNull, readFields, rejectOrigin } from "@/lib/http";
import { getSession } from "@/lib/session";
import { safeNext } from "@/lib/text";

export const dynamic = "force-dynamic";

async function ensureDefaultCollections(userId: string) {
  for (const [slug, name] of [
    ["weekend", "Weekend shortlist"],
    ["indoor", "Indoor rainy-day"],
  ] as const) {
    await prisma.collection.upsert({
      where: { userId_slug: { userId, slug } },
      update: {},
      create: { userId, slug, name },
    });
  }
}

export async function POST(req: Request) {
  const blocked = rejectOrigin(req);
  if (blocked) return blocked;
  const limited = limitOrNull(req, "save", 60, 60 * 60 * 1000);
  if (limited) return limited;
  const session = await getSession();
  const fields = await readFields(req);
  const placeId = fields.placeId || "";
  const list = fields.list || ""; // weekend | indoor | (empty = toggle default Save)
  const wantSaved = fields.returnTo?.includes("/saved") || fields.goSaved === "1";
  const backDefault = wantSaved ? "/saved" : `/places/${placeId}`;
  const back = safeNext(fields.returnTo || (wantSaved ? "/saved" : backDefault), wantSaved ? "/saved" : backDefault);
  if (!session?.user?.id) return finish(req, `/auth?next=${encodeURIComponent(back)}`, { error: "Sign in required" }, 401);
  const place = await prisma.place.findUnique({ where: { id: placeId } });
  if (!place) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await ensureDefaultCollections(session.user.id);

  if (list === "weekend" || list === "indoor") {
    const col = await prisma.collection.findUnique({
      where: { userId_slug: { userId: session.user.id, slug: list } },
    });
    if (!col) return NextResponse.json({ error: "Collection missing" }, { status: 404 });
    const existing = await prisma.collectionItem.findUnique({
      where: { collectionId_placeId: { collectionId: col.id, placeId } },
    });
    if (existing) await prisma.collectionItem.delete({ where: { id: existing.id } });
    else {
      await prisma.collectionItem.create({ data: { collectionId: col.id, placeId } });
      // Also ensure it's in the main Save list
      await prisma.save.upsert({
        where: { userId_placeId: { userId: session.user.id, placeId } },
        create: { userId: session.user.id, placeId },
        update: {},
      });
    }
    return finish(req, back, { ok: true, list, saved: !existing });
  }

  const key = { userId_placeId: { userId: session.user.id, placeId } };
  const existing = await prisma.save.findUnique({ where: key });
  if (existing) {
    await prisma.save.delete({ where: key });
    // Remove from curated lists too
    const cols = await prisma.collection.findMany({ where: { userId: session.user.id } });
    if (cols.length) {
      await prisma.collectionItem.deleteMany({
        where: { placeId, collectionId: { in: cols.map((c) => c.id) } },
      });
    }
  } else {
    await prisma.save.create({ data: { userId: session.user.id, placeId } });
  }
  // After save from a card, land on /saved so the round-trip is obvious when asked
  const dest = fields.after === "saved" ? "/saved" : back;
  return finish(req, dest, { ok: true, saved: !existing });
}
