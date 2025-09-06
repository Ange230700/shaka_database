// prisma/seed.ts
import prisma from "shakadb/lib/client";
import {
  quickOrPurgeById,
  quickOrPurgeByCompositeKey,
  asBasicDelegate,
} from "shakadb/helpers";
import { faker } from "@faker-js/faker";
import type { Traveller, Influencer } from "shakadb/generated/prisma-client";

faker.seed(12345);

/** Build a realistic geocode payload and encode as base64 */
function makeGeocodeRaw() {
  const value = {
    i: `${faker.location.city()}, ${faker.location.country()}`,
    o: {
      status: "OK",
      formattedAddress: `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.country()}`,
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    e: Date.now(),
  };
  return Buffer.from(JSON.stringify(value)).toString("base64");
}

async function deleteSurfData() {
  // children first
  await quickOrPurgeByCompositeKey(
    "thumbnails",
    asBasicDelegate<{ photo_id: number; kind: string }>(prisma.thumbnail),
    ["photo_id", "kind"] as const,
    { smallThreshold: 10_000, deleteChunkSize: 300 },
  );

  await quickOrPurgeById<number>(
    "photos",
    asBasicDelegate(prisma.photo),
    "photo_id",
    { smallThreshold: 10_000, deleteChunkSize: 1_000 },
  );

  // pivots
  await quickOrPurgeByCompositeKey(
    "surfspot_influencer",
    asBasicDelegate<{ surf_spot_id: number; influencer_id: number }>(
      prisma.surfSpot_Influencer,
    ),
    ["surf_spot_id", "influencer_id"] as const,
    { smallThreshold: 20_000, deleteChunkSize: 800 },
  );

  await quickOrPurgeByCompositeKey(
    "surfspot_surfbreaktype",
    asBasicDelegate<{ surf_spot_id: number; surf_break_type_id: number }>(
      prisma.surfSpot_SurfBreakType,
    ),
    ["surf_spot_id", "surf_break_type_id"] as const,
    { smallThreshold: 20_000, deleteChunkSize: 800 },
  );

  await quickOrPurgeByCompositeKey(
    "surfspot_traveller",
    asBasicDelegate<{ surf_spot_id: number; traveller_id: number }>(
      prisma.surfSpot_Traveller,
    ),
    ["surf_spot_id", "traveller_id"] as const,
    { smallThreshold: 20_000, deleteChunkSize: 800 },
  );

  // parents last
  await quickOrPurgeById<number>(
    "surfspot",
    asBasicDelegate(prisma.surfSpot),
    "surf_spot_id",
  );
  await quickOrPurgeById<number>(
    "influencer",
    asBasicDelegate(prisma.influencer),
    "influencer_id",
  );
  await quickOrPurgeById<number>(
    "traveller",
    asBasicDelegate(prisma.traveller),
    "traveller_id",
  );
  await quickOrPurgeById<number>(
    "surfbreaktype",
    asBasicDelegate(prisma.surfBreakType),
    "surf_break_type_id",
  );
}

/** Top-up helper: ensure we have at least `target` rows */
async function ensureMinimum(
  label: "traveller",
  target: number,
): Promise<Traveller[]>;
async function ensureMinimum(
  label: "influencer",
  target: number,
): Promise<Influencer[]>;
async function ensureMinimum(
  label: "traveller" | "influencer",
  target: number,
) {
  if (label === "traveller") {
    const count = await prisma.traveller.count();
    if (count < target) {
      const toCreate = target - count;
      await prisma.traveller.createMany({
        data: Array.from({ length: toCreate }, () => ({
          traveller_name: faker.person.fullName(),
        })),
      });
    }
    return prisma.traveller.findMany();
  }

  // influencer
  const count = await prisma.influencer.count();
  if (count < target) {
    const toCreate = target - count;
    await prisma.influencer.createMany({
      data: Array.from({ length: toCreate }, () => ({
        influencer_name: faker.internet.username(),
      })),
    });
  }
  return prisma.influencer.findMany();
}

export async function seed(skipCleanup = false) {
  const TIMER = "🌱 Seeding database with fake data…";
  console.time(TIMER);

  if (!skipCleanup) {
    await deleteSurfData();
  } else {
    console.log("⚠️ Skipping cleanup (SKIP_CLEANUP=true)");
  }

  // --- Idempotent reference data ---

  // SurfBreakTypes (unique by name)
  const breakTypesSeed = [
    "Point break",
    "Beach break",
    "Reef break",
    "River mouth",
  ];
  await prisma.surfBreakType.createMany({
    data: breakTypesSeed.map((name) => ({ surf_break_type_name: name })),
    skipDuplicates: true,
  });
  const breakTypes = await prisma.surfBreakType.findMany();

  // Travellers & Influencers (top up to targets; then read)
  const travellers = await ensureMinimum("traveller", 10);
  const influencers = await ensureMinimum("influencer", 5);

  // --- Heavy data (guard when skipCleanup is true) ---
  let shouldCreateSpots = true;
  if (skipCleanup) {
    const spotCount = await prisma.surfSpot.count();
    if (spotCount > 0) {
      console.log(
        "↪ Data already present; skipping heavy reseed of spots/photos/pivots.",
      );
      shouldCreateSpots = false;
    }
  }

  if (shouldCreateSpots) {
    const spots = [];
    for (let i = 0; i < 15; i++) {
      const start = faker.date.soon({ days: 30 });
      const end = faker.date.soon({ days: 180, refDate: start });

      const spot = await prisma.surfSpot.create({
        data: {
          destination: faker.location.city(),
          address: faker.location.streetAddress(),
          state_country: faker.location.country(),
          difficulty_level: faker.number.int({ min: 1, max: 5 }),
          peak_season_begin: start,
          peak_season_end: end,
          magic_seaweed_link: faker.internet.url(),
          created_time: new Date(),
          geocode_raw: makeGeocodeRaw(),
        },
      });
      spots.push(spot);

      const photo = await prisma.photo.create({
        data: {
          surf_spot_id: spot.surf_spot_id,
          width: 1920,
          height: 1080,
          url: faker.image.url(),
          filename: faker.system.fileName(),
          size_bytes: faker.number.int({ min: 50_000, max: 5_000_000 }),
          mime_type: "image/jpeg",
        },
      });

      await prisma.thumbnail.createMany({
        data: [
          {
            photo_id: photo.photo_id,
            kind: "small",
            url: faker.image.url(),
            width: 320,
            height: 180,
          },
          {
            photo_id: photo.photo_id,
            kind: "large",
            url: faker.image.url(),
            width: 1280,
            height: 720,
          },
          {
            photo_id: photo.photo_id,
            kind: "full",
            url: faker.image.url(),
            width: 1920,
            height: 1080,
          },
        ],
        skipDuplicates: true,
      });
    }

    // Randomize pivots with createMany + skipDuplicates
    for (const spot of spots) {
      const infl = faker.helpers.arrayElements(influencers, {
        min: 1,
        max: Math.min(3, influencers.length),
      });
      await prisma.surfSpot_Influencer.createMany({
        data: infl.map((i) => ({
          surf_spot_id: spot.surf_spot_id,
          influencer_id: i.influencer_id,
        })),
        skipDuplicates: true,
      });

      const travs = faker.helpers.arrayElements(travellers, {
        min: 1,
        max: Math.min(3, travellers.length),
      });
      await prisma.surfSpot_Traveller.createMany({
        data: travs.map((t) => ({
          surf_spot_id: spot.surf_spot_id,
          traveller_id: t.traveller_id,
        })),
        skipDuplicates: true,
      });

      const breaks = faker.helpers.arrayElements(breakTypes, {
        min: 1,
        max: Math.min(2, breakTypes.length),
      });
      await prisma.surfSpot_SurfBreakType.createMany({
        data: breaks.map((b) => ({
          surf_spot_id: spot.surf_spot_id,
          surf_break_type_id: b.surf_break_type_id,
        })),
        skipDuplicates: true,
      });
    }
  }

  console.timeEnd(TIMER);
}
