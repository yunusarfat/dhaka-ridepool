import prisma from "../src/db/prismaClient.js";
import { cancelRide } from "../src/services/rideService.js";

const TEST_EMAIL_PREFIX = "jest_access_";

async function createTestUser(name: string) {
  return prisma.user.create({
    data: {
      name,
      email: `${TEST_EMAIL_PREFIX}${name.toLowerCase()}@example.com`,
      password_hash: "irrelevant_for_this_test",
      role: "PASSENGER",
    },
  });
}

async function cleanup() {
  await prisma.rideRequest.deleteMany({
    where: { passenger: { email: { startsWith: TEST_EMAIL_PREFIX } } },
  });
  await prisma.user.deleteMany({ where: { email: { startsWith: TEST_EMAIL_PREFIX } } });
}

beforeEach(cleanup);
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("Ride access control", () => {
  it("prevents a user from cancelling another user's ride", async () => {
    const nusrat = await createTestUser("Nusrat");
    const rafiq = await createTestUser("Rafiq");

    const ride = await prisma.rideRequest.create({
      data: { passenger_id: nusrat.id, pickup: "Banani", destination: "Mohakhali", seats_requested: 1, estimated_fare: 8000 },
    });

    await expect(cancelRide(rafiq.id, ride.id)).rejects.toThrow("FORBIDDEN");
  });

  it("allows the owning passenger to cancel their own ride while REQUESTED", async () => {
    const nusrat = await createTestUser("Nusrat");
    const ride = await prisma.rideRequest.create({
      data: { passenger_id: nusrat.id, pickup: "Banani", destination: "Mohakhali", seats_requested: 1, estimated_fare: 8000 },
    });

    const cancelled = await cancelRide(nusrat.id, ride.id);
    expect(cancelled.status).toBe("CANCELLED");
  });

  it("prevents cancelling a ride that has already started", async () => {
    const nusrat = await createTestUser("Nusrat");
    const ride = await prisma.rideRequest.create({
      data: {
        passenger_id: nusrat.id,
        pickup: "Banani",
        destination: "Mohakhali",
        seats_requested: 1,
        estimated_fare: 8000,
        status: "STARTED",
      },
    });

    await expect(cancelRide(nusrat.id, ride.id)).rejects.toThrow("CANNOT_CANCEL");
  });
});