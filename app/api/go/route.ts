import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { finish, limitOrNull, readFields, rejectOrigin } from "@/lib/http";
import { getSession } from "@/lib/session";
import { cleanText, safeNext } from "@/lib/text";
import { upsertOpenVisit } from "@/lib/visits";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = rejectOrigin(req);
  if (blocked) return blocked;
  const limited = limitOrNull(req, "go", 40, 86_400_000);
  if (limited) return limited;
  const session = await getSession();
  const fields = await readFields(req);
  if (fields.website) return finish(req, "/", { ok: true });
  const placeId = fields.placeId || "";
  const next = safeNext(fields.returnTo, `/go/${placeId}`);
  if (!session?.user?.id) {
    return finish(req, `/auth?next=${encodeURIComponent(`/go/${placeId}`)}`, { error: "Sign in required" }, 401);
  }
  const place = await prisma.place.findUnique({ where: { id: placeId } });
  if (!place || place.status === "retired") {
    return NextResponse.json({ error: "That listing is not available." }, { status: 404 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const originLat = Number(fields.originLat);
  const originLng = Number(fields.originLng);
  const lat = Number.isFinite(originLat) ? originLat : user?.homeLat ?? 39.4959;
  const lng = Number.isFinite(originLng) ? originLng : user?.homeLng ?? -76.8946;
  const label = cleanText(fields.originLabel || user?.homeLabel || "Home", 120) || "Home";
  await upsertOpenVisit({
    userId: session.user.id,
    placeId,
    originLabel: label,
    originLat: lat,
    originLng: lng,
  });
  const google = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${place.lat},${place.lng}&travelmode=driving`;
  const apple = `https://maps.apple.com/?saddr=${lat},${lng}&daddr=${place.lat},${place.lng}&dirflg=d`;
  const dest = `/go/${placeId}?ready=1&olat=${lat}&olng=${lng}&olabel=${encodeURIComponent(label)}`;
  return finish(req, dest, { ok: true, google, apple, returnTo: next });
}
