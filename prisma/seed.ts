// prisma/seed.ts
import prisma from "shakadb/lib/client";
import {
  quickOrPurgeById,
  quickOrPurgeByCompositeKey,
  asBasicDelegate,
} from "shakadb/helpers";
import { faker } from "@faker-js/faker";

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

export async function seed(skipCleanup = false) {
  const TIMER = "🌱 Seeding database with fake data…";
  console.time(TIMER);

  if (!skipCleanup) {
    await deleteSurfData();
  } else {
    console.log("⚠️ Skipping cleanup (SKIP_CLEANUP=true)");
  }

  // Travellers
  const travellers = await Promise.all(
    Array.from({ length: 10 }).map(() =>
      prisma.traveller.create({
        data: { traveller_name: faker.person.fullName() },
      }),
    ),
  );

  // Influencers
  const influencers = await Promise.all(
    Array.from({ length: 5 }).map(() =>
      prisma.influencer.create({
        data: { influencer_name: faker.internet.username() },
      }),
    ),
  );

  // SurfBreakTypes
  const breakTypesSeed = [
    "Point break",
    "Beach break",
    "Reef break",
    "River mouth",
  ];
  const breakTypes = await Promise.all(
    breakTypesSeed.map((name) =>
      prisma.surfBreakType.create({ data: { surf_break_type_name: name } }),
    ),
  );

  // SurfSpots with Photos & Thumbnails
  const spots = [];
  for (let i = 0; i < 15; i++) {
    // Ensure end date is after begin
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

    // One main photo
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

    // Thumbnails (all enum sizes)
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

  // Randomize pivot links
  // - Each spot gets 1–3 influencers, 1–3 travellers, 1–2 break types
  for (const spot of spots) {
    // Influencers
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

    // Travellers
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

    // Break types
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

  console.timeEnd(TIMER);
}
