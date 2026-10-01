import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { finish, limitOrNull, readFields, rejectOrigin } from "@/lib/http";
import { getSession } from "@/lib/session";
import { validEmail } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const id = session.user.id;
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: id }, { addresseeId: id }] },
    include: {
      requester: { select: { id: true, displayName: true } },
      addressee: { select: { id: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    friends: rows.map((r) => ({
      id: r.id,
      status: r.status,
      direction: r.requesterId === id ? "out" : "in",
      person: r.requesterId === id ? r.addressee : r.requester,
    })),
  });
}

export async function POST(req: Request) {
  const blocked = rejectOrigin(req);
  if (blocked) return blocked;
  const limited = limitOrNull(req, "friend", 20, 86_400_000);
  if (limited) return limited;
  const session = await getSession();
  if (!session?.user?.id) return finish(req, "/auth?next=/friends", { error: "Sign in required" }, 401);
  const fields = await readFields(req);
  const email = String(fields.email || "").trim().toLowerCase();
  if (!validEmail(email)) return finish(req, "/friends?error=email", { error: "Enter a valid email." }, 400);
  const other = await prisma.user.findUnique({ where: { email } });
  if (!other) return finish(req, "/friends?error=missing", { error: "No account with that email yet." }, 404);
  if (other.id === session.user.id) return finish(req, "/friends?error=self", { error: "That’s you." }, 400);
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: session.user.id, addresseeId: other.id },
        { requesterId: other.id, addresseeId: session.user.id },
      ],
    },
  });
  if (existing?.status === "accepted") return finish(req, "/friends?error=already", { error: "Already friends." }, 409);
  if (existing) {
    await prisma.friendship.update({
      where: { id: existing.id },
      data: { requesterId: session.user.id, addresseeId: other.id, status: "pending" },
    });
  } else {
    await prisma.friendship.create({
      data: { requesterId: session.user.id, addresseeId: other.id, status: "pending" },
    });
  }
  return finish(req, "/friends?sent=1", { ok: true });
}
