import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rejectOrigin } from "@/lib/http";
import { nearQuery } from "@/lib/near";
import { getSession } from "@/lib/session";
import { cleanText, redirectTo } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = rejectOrigin(req);
  if (blocked) return blocked;
  const fd = await req.formData();
  const near = nearQuery(cleanText(String(fd.get("near") || ""), 120)) || "21048";
  const kidsRaw = cleanText(String(fd.get("kidsAges") || ""), 80);
  const kids = kidsRaw
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
  const familyLens = fd.get("lens") !== "0";
  const session = await getSession();
  if (session?.user?.id) {
    const label = /^\d{5}$/.test(near) ? `${near}` : near;
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        homeLabel: label,
        familyLens,
        kidsAges: JSON.stringify(kids),
        onboardedAt: new Date(),
        categories: "[]",
      },
    });
  }
  const guest = {
    radius: 25,
    familyLens,
    categories: [] as string[],
    weatherPoor: false,
    kidsAges: kids,
    onboarded: true,
  };
  const res = redirectTo(req, `/results?near=${encodeURIComponent(near)}&radius=25&lens=1`);
  res.headers.append("Set-Cookie", `lf_onboarded=1; Path=/; Max-Age=31536000; SameSite=Lax`);
  res.headers.append(
    "Set-Cookie",
    `lf_guest=${encodeURIComponent(JSON.stringify(guest))}; Path=/; Max-Age=2592000; SameSite=Lax`,
  );
  return res;
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST home zip + optional kids ages" });
}
