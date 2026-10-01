import { NextResponse } from "next/server";
import { placeDetail } from "@/lib/service";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  const detail = await placeDetail(params.id, session?.user?.id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ...detail.item,
    friendNames: detail.friendNames,
    saved: detail.saved,
    visitStatus: detail.visit?.status ?? null,
    reviews: detail.reviews.map((r) => ({
      id: r.id,
      stars: r.stars,
      body: r.body,
      createdAt: r.createdAt,
      author: r.user.displayName,
      authorId: r.user.id,
      mine: r.userId === session?.user?.id,
    })),
  });
}
