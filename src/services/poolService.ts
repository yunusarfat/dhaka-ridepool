import prisma from "../db/prismaclient.js";
import { isRouteCompatible } from "../config/zones.js";
import { calculateEstimatedFare } from "./fareService.js";

export async function assignRideToPool(rideRequestId: number) {
  return prisma.$transaction(async (tx) => {
    const ride = await tx.rideRequest.findUnique({ where: { id: rideRequestId } });
    if (!ride) throw new Error("RIDE_NOT_FOUND");
    if (ride.status !== "REQUESTED") throw new Error("RIDE_ALREADY_PROCESSED");

    // 1. Look for an existing open pool with a compatible, online vehicle and room
    const openPools = await tx.pool.findMany({
      where: { status: "MATCHED" },
      include: { members: { include: { ride_request: true } }, vehicle: true },
    });

    for (const pool of openPools) {
      if (pool.vehicle.status !== "ONLINE") continue;

      const firstMemberRide = pool.members[0]?.ride_request;
      if (!firstMemberRide) continue;

      const sameZone = firstMemberRide.pickup === ride.pickup;
      const compatible = isRouteCompatible(ride.pickup, ride.destination);
      if (!sameZone || !compatible) continue;

      // Lock FIRST, before reading occupied seats — so any concurrent
      // transaction is forced to wait, then re-reads fresh data after us.
      await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${pool.vehicle_id} FOR UPDATE`;

      // Re-fetch pool members AFTER acquiring the lock, so this reflects
      // any seats claimed by a transaction that just committed while we waited.
      const freshMembers = await tx.poolMember.findMany({
        where: { pool_id: pool.id },
        include: { ride_request: true },
      });

      const occupiedSeats = freshMembers.reduce(
        (sum, m) => sum + m.ride_request.seats_requested,
        0
      );

      if (occupiedSeats + ride.seats_requested <= pool.vehicle.capacity) {
        const fare = calculateEstimatedFare(true);

        await tx.poolMember.create({
          data: { pool_id: pool.id, ride_request_id: ride.id, fare },
        });

        const updatedRide = await tx.rideRequest.update({
          where: { id: ride.id },
          data: { status: "MATCHED", estimated_fare: fare },
        });

        return { pool, ride: updatedRide };
      }
      // Not enough room after re-check — try the next pool
    }

    // 2. No compatible open pool with room — assign a fresh online vehicle
        // 2. No compatible open pool with room — assign a vehicle with NO existing active pool
    const activePools = await tx.pool.findMany({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
      select: { vehicle_id: true },
    });
    const busyVehicleIds = activePools.map((p) => p.vehicle_id);
    
    const availableVehicle = await tx.vehicle.findFirst({
      where: {
        status: "ONLINE",
        capacity: { gte: ride.seats_requested },
        id: { notIn: busyVehicleIds },
      },
    });

    if (!availableVehicle) {
      throw new Error("NO_VEHICLE_AVAILABLE");
    }

    await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${availableVehicle.id} FOR UPDATE`;

    const newPool = await tx.pool.create({
      data: { vehicle_id: availableVehicle.id, status: "MATCHED" },
    });

    const fare = calculateEstimatedFare(false);

    await tx.poolMember.create({
      data: { pool_id: newPool.id, ride_request_id: ride.id, fare },
    });

    const updatedRide = await tx.rideRequest.update({
      where: { id: ride.id },
      data: { status: "MATCHED", estimated_fare: fare },
    });

    return { pool: newPool, ride: updatedRide };
  });
}