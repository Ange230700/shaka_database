// tests\surfspot.spec.ts

import prisma from "shakadb/lib/client";
import { faker } from "@faker-js/faker";
import { deleteSafely } from "shakadb/helpers";
import { describe, expect, test, beforeAll, afterAll } from "@jest/globals";

function makeGeocodeRaw() {
  const value = {
    i: faker.location.city() + ", " + faker.location.country(),
    o: {
      status: "OK",
      formattedAddress:
        faker.location.streetAddress() +
        ", " +
        faker.location.city() +
        ", " +
        faker.location.country(),
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    e: Date.now(),
  };
  return Buffer.from(JSON.stringify(value)).toString("base64");
}

describe("SurfSpot CRUD operations", () => {
  let createdSpotId: number;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await deleteSafely(() => prisma.surfSpot.deleteMany(), "surfspot (tests)");
    await prisma.$disconnect();
  });

  test("should create a SurfSpot", async () => {
    const surfSpot = await prisma.surfSpot.create({
      data: {
        destination: faker.location.city(),
        address: faker.location.streetAddress(),
        state_country: faker.location.country(),
        difficulty_level: faker.number.int({ min: 1, max: 5 }),
        peak_season_begin: faker.date.past(),
        peak_season_end: faker.date.future(),
        magic_seaweed_link: faker.internet.url(),
        created_time: new Date(),
        geocode_raw: makeGeocodeRaw(),
      },
    });

    expect(surfSpot).toHaveProperty("surf_spot_id");
    createdSpotId = surfSpot.surf_spot_id;
  });

  test("should retrieve a SurfSpot by id", async () => {
    const surfSpot = await prisma.surfSpot.findUnique({
      where: { surf_spot_id: createdSpotId },
    });

    expect(surfSpot).not.toBeNull();
    expect(surfSpot?.surf_spot_id).toEqual(createdSpotId);
  });

  test("should update a SurfSpot", async () => {
    const newDestination = faker.location.city();

    const updatedSpot = await prisma.surfSpot.update({
      where: { surf_spot_id: createdSpotId },
      data: { destination: newDestination },
    });

    expect(updatedSpot.destination).toEqual(newDestination);
  });

  test("should delete a SurfSpot", async () => {
    const deletedSpot = await prisma.surfSpot.delete({
      where: { surf_spot_id: createdSpotId },
    });

    expect(deletedSpot.surf_spot_id).toEqual(createdSpotId);

    const surfSpot = await prisma.surfSpot.findUnique({
      where: { surf_spot_id: createdSpotId },
    });

    expect(surfSpot).toBeNull();
  });
});
