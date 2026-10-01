import { prisma } from "./db";

/** One open (planned/going) visit per user+place. Re-Go updates origin; extras are removed. */
export async function upsertOpenVisit(input: {
  userId: string;
  placeId: string;
  originLabel: string;
  originLat: number;
  originLng: number;
}): Promise<{ id: string; created: boolean }> {
  const opens = await prisma.visit.findMany({
    where: { userId: input.userId, placeId: input.placeId, status: "planned" },
    orderBy: { createdAt: "asc" },
  });
  const keep = opens[0];
  if (keep) {
    await prisma.visit.update({
      where: { id: keep.id },
      data: {
        originLabel: input.originLabel,
        originLat: input.originLat,
        originLng: input.originLng,
      },
    });
    const extras = opens.slice(1).map((v) => v.id);
    if (extras.length) {
      await prisma.visit.deleteMany({ where: { id: { in: extras } } });
    }
    return { id: keep.id, created: false };
  }
  try {
    const row = await prisma.visit.create({
      data: {
        userId: input.userId,
        placeId: input.placeId,
        status: "planned",
        originLabel: input.originLabel,
        originLat: input.originLat,
        originLng: input.originLng,
      },
    });
    return { id: row.id, created: true };
  } catch {
    // Unique race: fetch the planned row
    const again = await prisma.visit.findFirst({
      where: { userId: input.userId, placeId: input.placeId, status: "planned" },
    });
    if (again) return { id: again.id, created: false };
    throw new Error("Could not save Going visit");
  }
}

/**
 * Idempotent Been: one been row per user+place.
 * Prefer promote planned → been; else upsert been; never create a second been.
 */
export async function upsertBeenVisit(input: {
  userId: string;
  placeId: string;
  originLabel: string;
  originLat: number;
  originLng: number;
}): Promise<{ id: string; created: boolean }> {
  const beenRows = await prisma.visit.findMany({
    where: { userId: input.userId, placeId: input.placeId, status: "been" },
    orderBy: { createdAt: "asc" },
  });
  const plannedRows = await prisma.visit.findMany({
    where: { userId: input.userId, placeId: input.placeId, status: "planned" },
    orderBy: { createdAt: "asc" },
  });

  if (beenRows[0]) {
    await prisma.visit.update({
      where: { id: beenRows[0].id },
      data: { beenAt: new Date(), originLabel: input.originLabel, originLat: input.originLat, originLng: input.originLng },
    });
    const extraBeen = beenRows.slice(1).map((v) => v.id);
    const plannedIds = plannedRows.map((v) => v.id);
    const kill = [...extraBeen, ...plannedIds];
    if (kill.length) await prisma.visit.deleteMany({ where: { id: { in: kill } } });
    return { id: beenRows[0].id, created: false };
  }

  if (plannedRows[0]) {
    await prisma.visit.update({
      where: { id: plannedRows[0].id },
      data: { status: "been", beenAt: new Date() },
    });
    const extras = plannedRows.slice(1).map((v) => v.id);
    if (extras.length) await prisma.visit.deleteMany({ where: { id: { in: extras } } });
    return { id: plannedRows[0].id, created: false };
  }

  const row = await prisma.visit.create({
    data: {
      userId: input.userId,
      placeId: input.placeId,
      status: "been",
      beenAt: new Date(),
      originLabel: input.originLabel,
      originLat: input.originLat,
      originLng: input.originLng,
    },
  });
  return { id: row.id, created: true };
}

export function visitStatusLabel(status: string): "Planning" | "Going" | "Been" {
  if (status === "been") return "Been";
  // Open visits from Go land as planned → shown as Going (you're going).
  // "Planning" is the pre-confirm Go sheet only.
  if (status === "planned") return "Going";
  return "Going";
}
