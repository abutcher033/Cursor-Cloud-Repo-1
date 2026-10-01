import { NextResponse } from "next/server";
import { buildIcs } from "@/lib/ics";
import { getProvider } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const item = await getProvider().getPlace(params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ics = buildIcs({
    id: item.id,
    title: item.name,
    description: item.why,
    address: item.address,
    url: item.link || undefined,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    whenHours: item.whenHours,
  });
  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${item.id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
