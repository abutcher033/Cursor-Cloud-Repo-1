import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { finish, rejectOrigin } from "@/lib/http";
import { withinDailyLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { cleanText, safeNext } from "@/lib/text";

export const dynamic = "force-dynamic";

async function own(id: string, userId: string) {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review || review.userId !== userId) return null;
  return review;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const blocked = rejectOrigin(req);
  if (blocked) return blocked;
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const review = await own(params.id, session.user.id);
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const bodyJson = (await req.json().catch(() => ({}))) as { stars?: number; body?: string };
  const stars = Number(bodyJson.stars ?? review.stars);
  const text = cleanText(String(bodyJson.body ?? review.body), 500);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "Pick 1 to 5 stars." }, { status: 400 });
  }
  const writes = await prisma.reviewWrite.findMany({ where: { userId: session.user.id }, select: { createdAt: true }, take: 10 });
  if (!withinDailyLimit(writes.map((w) => w.createdAt.getTime()), Date.now(), 5)) {
    return NextResponse.json({ error: "Review limit is 5 a day." }, { status: 429 });
  }
  const updated = await prisma.review.update({ where: { id: review.id }, data: { stars, body: text } });
  await prisma.reviewWrite.create({ data: { userId: session.user.id } });
  return NextResponse.json({ ok: true, review: updated });
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  return DELETE(req, ctx);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const blocked = rejectOrigin(req);
  if (blocked) return blocked;
  const session = await getSession();
  const url = new URL(req.url);
  const back = safeNext(url.searchParams.get("returnTo"), "/recent");
  if (!session?.user?.id) return finish(req, `/auth?next=${encodeURIComponent(back)}`, { error: "Sign in required" }, 401);
  const review = await own(params.id, session.user.id);
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.review.delete({ where: { id: review.id } });
  return finish(req, back, { ok: true });
}
