import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { finish, limitOrNull, readFields, rejectOrigin } from "@/lib/http";
import { getSession } from "@/lib/session";
import { cleanText, safeNext } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = rejectOrigin(req);
  if (blocked) return blocked;
  const limited = limitOrNull(req, "share", 20, 60 * 60 * 1000);
  if (limited) return limited;
  const session = await getSession();
  const fields = await readFields(req);
  if (!session?.user?.id) {
    return finish(req, `/auth?next=${encodeURIComponent(fields.returnTo || "/saved")}`, { error: "Sign in required" }, 401);
  }
  const title = cleanText(fields.title || "Our shortlist", 80) || "Our shortlist";
  let placeIds: string[] = [];
  if (fields.placeIds) {
    placeIds = fields.placeIds.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12);
  } else if (fields.placeId) {
    placeIds = [fields.placeId];
  }
  if (!placeIds.length) {
    return finish(req, safeNext(fields.returnTo, "/saved"), { error: "Pick at least one place" }, 400);
  }
  const token = randomBytes(9).toString("base64url");
  const expiresAt = new Date(Date.now() + 14 * 86_400_000);
  const row = await prisma.shareLink.create({
    data: {
      token,
      creatorId: session.user.id,
      title,
      placeIds: JSON.stringify(placeIds),
      expiresAt,
    },
  });
  const path = `/plan/${row.token}`;
  return finish(req, path, { ok: true, token: row.token, path });
}
