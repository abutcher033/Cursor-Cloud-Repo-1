import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { discoveryModeLabel } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  const places = await prisma.place.count();
  const mode = discoveryModeLabel();
  return NextResponse.json({
    ok: true,
    mode: process.env.DISCOVERY_MODE ?? "fixture",
    discovery: mode,
    places,
    keys: {
      googlePlaces: !!process.env.GOOGLE_PLACES_API_KEY,
      ticketmaster: !!process.env.TICKETMASTER_API_KEY,
    },
  });
}
