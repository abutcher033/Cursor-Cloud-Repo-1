import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const PASSWORD = "localfun-demo";

type Raw = {
  id: string;
  name: string;
  kind: string;
  categories: string[];
  why: string;
  ageFit: string | null;
  stroller: boolean | null;
  driveMin: number | null;
  costVibe: string;
  priceLevel: number | null;
  whenHours: string;
  startsAt: string | null;
  endsAt: string | null;
  address: string;
  lat: number;
  lng: number;
  link: string;
  status: string;
  publicRating: number | null;
  publicReviewCount: number | null;
  editorialRole: string | null;
  weatherNote: string | null;
  source: string;
  externalIds: object;
  patio: boolean;
  indoorBackup: boolean;
  sample: boolean;
  imageUrl?: string;
  campusId?: string | null;
  gotchas?: string[];
  phone?: string | null;
  visitMinutes?: number | null;
  amenities?: object;
};

async function main() {
  const file = path.join(process.cwd(), "data/fixtures/finksburg-21048.json");
  const doc = JSON.parse(fs.readFileSync(file, "utf8")) as { items: Raw[] };
  for (const item of doc.items) {
    const data = {
      name: item.name,
      kind: item.kind,
      categories: JSON.stringify(item.categories),
      why: item.why,
      ageFit: item.ageFit,
      stroller: item.stroller,
      driveMin: item.driveMin,
      costVibe: item.costVibe,
      priceLevel: item.priceLevel,
      whenHours: item.whenHours,
      startsAt: item.startsAt ? new Date(item.startsAt) : null,
      endsAt: item.endsAt ? new Date(item.endsAt) : null,
      address: item.address,
      lat: item.lat,
      lng: item.lng,
      link: item.link || "",
      status: item.status,
      publicRating: item.publicRating,
      publicReviewCount: item.publicReviewCount,
      editorialRole: item.editorialRole,
      weatherNote: item.weatherNote,
      source: item.source || "seed",
      externalIds: JSON.stringify(item.externalIds || {}),
      patio: !!item.patio,
      indoorBackup: !!item.indoorBackup,
      sample: !!item.sample,
      imageUrl: item.imageUrl || "/thumbs/default.svg",
      campusId: item.campusId || null,
      gotchas: JSON.stringify(item.gotchas || []),
      phone: item.phone || null,
      visitMinutes: item.visitMinutes ?? null,
      amenities: JSON.stringify(item.amenities || {}),
    };
    await prisma.place.upsert({ where: { id: item.id }, create: { id: item.id, ...data }, update: data });
  }

  const passwordHash = hashSync(PASSWORD, 10);
  const users = [
    ["casey@locallife.app", "Casey"],
    ["jamie@locallife.app", "Jamie"],
    ["riley@locallife.app", "Riley"],
    ["avery.sample@locallife.app", "Avery"],
  ] as const;
  const ids: Record<string, string> = {};
  for (const [email, displayName] of users) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { displayName, ...(email === "casey@locallife.app" ? { familyLens: true } : {}) },
      create: {
        email,
        displayName,
        passwordHash,
        homeLabel: "21048 · Finksburg, MD",
        homeLat: 39.4959,
        homeLng: -76.8946,
        defaultRadius: 25,
        categories: "[]",
        familyLens: email === "casey@locallife.app",
      },
    });
    ids[email] = user.id;
  }

  async function review(email: string, placeId: string, stars: number, body: string) {
    await prisma.review.upsert({
      where: { userId_placeId: { userId: ids[email], placeId } },
      update: {},
      create: { userId: ids[email], placeId, stars, body },
    });
  }
  await review("jamie@locallife.app", "oregon-ridge", 5, "Sample review: indoor exhibits saved a drizzly morning.");
  await review("jamie@locallife.app", "maggies", 4, "Sample review: kids menu and a quick table.");
  await review("riley@locallife.app", "baughers-farm", 5, "Sample review: left the stroller at the market and picked with a wagon.");
  await review("riley@locallife.app", "cornfusion", 3, "Sample review: fun afternoon, armband adds up.");
  await review("avery.sample@locallife.app", "ag-celebrating-fall", 4, "Sample review: go early, aisles stay stroller-friendly.");
  await review("avery.sample@locallife.app", "ccpl-finksburg", 5, "Sample review: calm weekday backup near home.");

  const casey = ids["casey@locallife.app"];
  const jamie = ids["jamie@locallife.app"];
  const riley = ids["riley@locallife.app"];

  const jamieCasey = await prisma.friendship.findFirst({
    where: { OR: [{ requesterId: jamie, addresseeId: casey }, { requesterId: casey, addresseeId: jamie }] },
  });
  if (!jamieCasey) {
    await prisma.friendship.create({ data: { requesterId: jamie, addresseeId: casey, status: "accepted" } });
  } else if (jamieCasey.status !== "accepted") {
    await prisma.friendship.update({ where: { id: jamieCasey.id }, data: { status: "accepted" } });
  }

  const rileyCasey = await prisma.friendship.findFirst({
    where: { OR: [{ requesterId: riley, addresseeId: casey }, { requesterId: casey, addresseeId: riley }] },
  });
  if (!rileyCasey) {
    await prisma.friendship.create({ data: { requesterId: riley, addresseeId: casey, status: "pending" } });
  } else {
    await prisma.friendship.update({
      where: { id: rileyCasey.id },
      data: { requesterId: riley, addresseeId: casey, status: "pending" },
    });
  }

  const jamieVisits = await prisma.visit.count({ where: { userId: jamie } });
  if (jamieVisits === 0) {
    for (const placeId of ["oregon-ridge", "maggies", "northwest-regional"]) {
      await prisma.visit.create({
        data: {
          userId: jamie,
          placeId,
          status: "been",
          beenAt: new Date("2026-09-20T15:00:00.000Z"),
          originLabel: "21048 · Finksburg, MD",
          originLat: 39.4959,
          originLng: -76.8946,
        },
      });
    }
  }

  // Default collections for Casey
  for (const [slug, name] of [
    ["weekend", "Weekend shortlist"],
    ["indoor", "Indoor rainy-day"],
  ] as const) {
    await prisma.collection.upsert({
      where: { userId_slug: { userId: casey, slug } },
      update: { name },
      create: { userId: casey, slug, name },
    });
  }
  const weekend = await prisma.collection.findUnique({ where: { userId_slug: { userId: casey, slug: "weekend" } } });
  const indoor = await prisma.collection.findUnique({ where: { userId_slug: { userId: casey, slug: "indoor" } } });
  if (weekend) {
    for (const placeId of ["ag-celebrating-fall", "fall-marketplace", "ag-corn-maze"]) {
      await prisma.collectionItem.upsert({
        where: { collectionId_placeId: { collectionId: weekend.id, placeId } },
        update: {},
        create: { collectionId: weekend.id, placeId },
      });
    }
  }
  if (indoor) {
    for (const placeId of ["ccpl-finksburg", "oregon-ridge", "fall-marketplace"]) {
      await prisma.collectionItem.upsert({
        where: { collectionId_placeId: { collectionId: indoor.id, placeId } },
        update: {},
        create: { collectionId: indoor.id, placeId },
      });
    }
  }

  console.log(`Seeded ${doc.items.length} listings. Demo login casey@locallife.app / ${PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
