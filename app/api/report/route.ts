import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { finish, limitOrNull, readFields, rejectOrigin } from "@/lib/http";
import { getSession } from "@/lib/session";
import { cleanText, safeNext } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = rejectOrigin(req);
  if (blocked) return blocked;
  const limited = limitOrNull(req, "report", 10, 86_400_000);
  if (limited) return limited;
  const fields = await readFields(req);
  if (fields.website) return finish(req, "/", { ok: true });
  const targetType = fields.targetType === "review" ? "review" : "place";
  const targetId = cleanText(fields.targetId || "", 80);
  const reason = cleanText(fields.reason || "", 500);
  const back = safeNext(fields.returnTo, "/");
  if (reason.length < 8) {
    return finish(req, `${back}${back.includes("?") ? "&" : "?"}error=report`, { error: "Add a short reason (at least 8 characters)." }, 400);
  }
  if (targetType === "place") {
    const place = await prisma.place.findUnique({ where: { id: targetId } });
    if (!place) return NextResponse.json({ error: "Not found" }, { status: 404 });
  } else {
    const review = await prisma.review.findUnique({ where: { id: targetId } });
    if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const session = await getSession();
  await prisma.report.create({
    data: { userId: session?.user?.id || null, targetType, targetId, reason },
  });
  return finish(req, `${back}${back.includes("?") ? "&" : "?"}reported=1`, { ok: true });
}
