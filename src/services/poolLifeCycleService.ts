import prisma from "../db/prismaClient.js";
import { assertValidTransition } from "./stateTransitionService.js";

async function transitionPool(driverId: number, poolId: number, nextStatus: "DRIVER_ARRIVED" | "STARTED" | "COMPLETED") {
  return prisma.$transaction(async (tx) => {
    const pool = await tx.pool.findUnique({
      where: { id: poolId },
      include: { vehicle: true, members: { include: { ride_request: true } } },
    });

    if (!pool) throw new Error("POOL_NOT_FOUND");
    if (pool.vehicle.driver_id !== driverId) throw new Error("FORBIDDEN");

    assertValidTransition(pool.status, nextStatus);

    const updatedPool = await tx.pool.update({
      where: { id: poolId },
      data: { status: nextStatus },
    });

    // Cascade the same stage to every ride request in this pool,
    // so each passenger's individual ride status reflects the pool's progress.
    const rideStatusMap: Record<string, string> = {
      DRIVER_ARRIVED: "DRIVER_ARRIVED",
      STARTED: "STARTED",
      COMPLETED: "COMPLETED",
    };

    await tx.rideRequest.updateMany({
      where: { id: { in: pool.members.map((m) => m.ride_request_id) } },
      data: { status: rideStatusMap[nextStatus] as any },
    });

    return updatedPool;
  });
}

export function markDriverArrived(driverId: number, poolId: number) {
  return transitionPool(driverId, poolId, "DRIVER_ARRIVED");
}

export function startTrip(driverId: number, poolId: number) {
  return transitionPool(driverId, poolId, "STARTED");
}

export function completeTrip(driverId: number, poolId: number) {
  return transitionPool(driverId, poolId, "COMPLETED");
}

export async function getPoolDetails(driverId: number, poolId: number) {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      vehicle: true,
      members: {
        include: {
          ride_request: {
            include: {
              passenger: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
          },
        },
      },
    },
  });

  if (!pool) throw new Error("POOL_NOT_FOUND");
  if (pool.vehicle.driver_id !== driverId) throw new Error("FORBIDDEN");

  return pool;
}
export async function getActivePoolForDriver(driverId: number) {
  const vehicle = await prisma.vehicle.findUnique({ where: { driver_id: driverId } });
  if (!vehicle) return null;

  const pool = await prisma.pool.findFirst({
    where: { vehicle_id: vehicle.id, status: { notIn: ["COMPLETED", "CANCELLED"] } },
    include: {
      vehicle: true,
      members: {
        include: {
          ride_request: {
            include: { passenger: { select: { id: true, name: true, email: true, role: true } } },
          },
        },
      },
    },
  });

  return pool;
}