import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { finish, readFields, rejectOrigin } from "@/lib/http";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = rejectOrigin(req);
  if (blocked) return blocked;
  const session = await getSession();
  if (!session?.user?.id) return finish(req, "/auth?next=/friends", { error: "Sign in required" }, 401);
  const fields = await readFields(req);
  const id = fields.id || "";
  const action = fields.action === "accept" ? "accepted" : "declined";
  const row = await prisma.friendship.findUnique({ where: { id } });
  if (!row || row.addresseeId !== session.user.id || row.status !== "pending") {
    return NextResponse.json({ error: "That request is not yours to answer." }, { status: 404 });
  }
  await prisma.friendship.update({ where: { id }, data: { status: action } });
  return finish(req, "/friends?updated=1", { ok: true, status: action });
}
