import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const saves = await prisma.save.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { place: true },
  });
  return NextResponse.json({
    saved: saves.map((s) => ({ id: s.placeId, name: s.place.name, savedAt: s.createdAt })),
  });
}
