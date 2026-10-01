import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { finish, limitOrNull, readFields, rejectOrigin } from "@/lib/http";
import { getSession } from "@/lib/session";
import { safeNext } from "@/lib/text";
import { upsertBeenVisit } from "@/lib/visits";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = rejectOrigin(req);
  if (blocked) return blocked;
  const limited = limitOrNull(req, "been", 40, 86_400_000);
  if (limited) return limited;
  const session = await getSession();
  const fields = await readFields(req);
  const placeId = fields.placeId || "";
  const prompt = fields.prompt !== "0";
  const base = `/places/${placeId}`;
  const withPrompt = prompt ? `${base}${base.includes("?") ? "&" : "?"}reviewPrompt=1` : base;
  const back = safeNext(fields.returnTo || withPrompt, withPrompt);
  // Prefer returning to place with review prompt when returnTo is the place itself
  const dest =
    !fields.returnTo || fields.returnTo === base || fields.returnTo.startsWith(`${base}?`)
      ? `${base}?reviewPrompt=1`
      : back.includes("reviewPrompt")
        ? back
        : back === "/recent"
          ? "/recent?reviewPrompt=1"
          : back;

  if (!session?.user?.id) return finish(req, `/auth?next=${encodeURIComponent(dest)}`, { error: "Sign in required" }, 401);
  const place = await prisma.place.findUnique({ where: { id: placeId } });
  if (!place) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  await upsertBeenVisit({
    userId: session.user.id,
    placeId,
    originLabel: user?.homeLabel ?? "Home",
    originLat: user?.homeLat ?? 39.4959,
    originLng: user?.homeLng ?? -76.8946,
  });
  return finish(req, dest, { ok: true });
}
