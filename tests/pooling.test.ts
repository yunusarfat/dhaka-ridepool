import prisma from "../src/db/prismaClient.js";
import { assignRideToPool } from "../src/services/poolService.js";
import { assertValidTransition } from "../src/services/stateTransitionService.js";

const TEST_EMAIL_PREFIX = "jest_test_";

async function createTestUser(name: string, role: "DRIVER" | "PASSENGER") {
  return prisma.user.create({
    data: {
      name,
      email: `${TEST_EMAIL_PREFIX}${name.toLowerCase()}@example.com`,
      password_hash: "irrelevant_for_this_test",
      role,
    },
  });
}

async function cleanupTestData() {
  await prisma.poolMember.deleteMany({});
  await prisma.pool.deleteMany({});
  await prisma.rideRequest.deleteMany({
    where: { passenger: { email: { startsWith: TEST_EMAIL_PREFIX } } },
  });
  await prisma.vehicle.deleteMany({
    where: { driver: { email: { startsWith: TEST_EMAIL_PREFIX } } },
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: TEST_EMAIL_PREFIX } },
  });
}

beforeEach(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("Pool capacity enforcement", () => {
  it("never allows this vehicles occupied seats to exceed its capacity", async () => {
    const previouslyOnline = await prisma.vehicle.findMany({
      where: { status: "ONLINE" },
      select: { id: true },
    });
    await prisma.vehicle.updateMany({
      where: { id: { in: previouslyOnline.map((v) => v.id) } },
      data: { status: "OFFLINE" },
    });

    try {
      const driver = await createTestUser("Jashim", "DRIVER");
      const vehicle = await prisma.vehicle.create({
        data: {
          driver_id: driver.id,
          name: "Bullet",
          capacity: 3,
          status: "ONLINE",
        },
      });

      const nusrat = await createTestUser("Nusrat", "PASSENGER");
      const rafiq = await createTestUser("Rafiq", "PASSENGER");
      const shirin = await createTestUser("Shirin", "PASSENGER");

      const ride1 = await prisma.rideRequest.create({
        data: {
          passenger_id: nusrat.id,
          pickup: "Banani",
          destination: "Mohakhali",
          seats_requested: 1,
          estimated_fare: 10000,
        },
      });
      const ride2 = await prisma.rideRequest.create({
        data: {
          passenger_id: rafiq.id,
          pickup: "Banani",
          destination: "Mohakhali",
          seats_requested: 1,
          estimated_fare: 10000,
        },
      });
      const ride3 = await prisma.rideRequest.create({
        data: {
          passenger_id: shirin.id,
          pickup: "Banani",
          destination: "Mohakhali",
          seats_requested: 2,
          estimated_fare: 10000,
        },
      });

      await assignRideToPool(ride1.id);
      await assignRideToPool(ride2.id);

      await assignRideToPool(ride3.id).catch(() => {});

      const finalMembers = await prisma.poolMember.findMany({
        where: { pool: { vehicle_id: vehicle.id } },
        include: { ride_request: true },
      });
      const totalOccupied = finalMembers.reduce(
        (sum, m) => sum + m.ride_request.seats_requested,
        0,
      );

      expect(totalOccupied).toBeLessThanOrEqual(vehicle.capacity);
    } finally {
      await prisma.vehicle.updateMany({
        where: { id: { in: previouslyOnline.map((v) => v.id) } },
        data: { status: "ONLINE" },
      });
    }
  });
});

describe("State transitions", () => {
  it("allows valid transitions in order", () => {
    expect(() =>
      assertValidTransition("MATCHED", "DRIVER_ARRIVED"),
    ).not.toThrow();
    expect(() =>
      assertValidTransition("DRIVER_ARRIVED", "STARTED"),
    ).not.toThrow();
    expect(() => assertValidTransition("STARTED", "COMPLETED")).not.toThrow();
  });

  it("rejects invalid transitions", () => {
    expect(() => assertValidTransition("COMPLETED", "STARTED")).toThrow(
      "INVALID_TRANSITION",
    );
    expect(() => assertValidTransition("MATCHED", "COMPLETED")).toThrow(
      "INVALID_TRANSITION",
    );
    expect(() =>
      assertValidTransition("REQUESTED" as any, "MATCHED"),
    ).toThrow();
  });
});