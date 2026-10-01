import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { limitOrNull, rejectOrigin } from "@/lib/http";
import { cleanText, validEmail } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const origin = rejectOrigin(req);
  if (origin) return origin;
  const limited = limitOrNull(req, "register", 8, 60 * 60 * 1000);
  if (limited) return limited;
  let body: { email?: string; password?: string; displayName?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid signup." }, { status: 400 });
  }
  if (body.website) return NextResponse.json({ ok: true });
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const displayName = cleanText(String(body.displayName || ""), 40);
  if (!validEmail(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (displayName.length < 2) return NextResponse.json({ error: "Display name must be at least 2 characters." }, { status: 400 });
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "That email already has an account. Log in instead." }, { status: 409 });
  const passwordHash = await hash(password, 10);
  await prisma.user.create({ data: { email, passwordHash, displayName } });
  return NextResponse.json({ ok: true });
}
