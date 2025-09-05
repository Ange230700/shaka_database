// prisma/seed.ts
import prisma from "shakadb/lib/client";
import {
  quickOrPurgeById,
  quickOrPurgeByCompositeKey,
  asBasicDelegate,
  deleteSafely,
} from "shakadb/helpers";

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
  console.time("seed");
  if (!skipCleanup) {
    await deleteSurfData();
  } else {
    console.log("⚠️ Skipping cleanup (SKIP_CLEANUP=true)");
  }

  await deleteSafely(() => prisma.thumbnail.deleteMany(), "thumbnails");
  await deleteSafely(() => prisma.photo.deleteMany(), "photos");
  await deleteSafely(
    () => prisma.surfSpot_Influencer.deleteMany(),
    "surfspot_influencer",
  );
  await deleteSafely(
    () => prisma.surfSpot_SurfBreakType.deleteMany(),
    "surfspot_surfbreaktype",
  );
  await deleteSafely(
    () => prisma.surfSpot_Traveller.deleteMany(),
    "surfspot_traveller",
  );
  await deleteSafely(() => prisma.surfSpot.deleteMany(), "surfspot");
  await deleteSafely(() => prisma.influencer.deleteMany(), "influencer");
  await deleteSafely(() => prisma.traveller.deleteMany(), "traveller");
  await deleteSafely(() => prisma.surfBreakType.deleteMany(), "surfbreaktype");
  console.timeEnd("seed");
}
