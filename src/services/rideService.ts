import prisma from "../db/prismaclient.js";
import { calculateEstimatedFare } from "./fareService.js";


import { assignRideToPool } from "./poolService.js";

interface CreateRideInput {
  passengerId: number;
  pickup: string;
  destination: string;
  seats: number;
}

interface CreateRideInput {
  passengerId: number;
  pickup: string;
  destination: string;
  seats: number;
}

export async function requestRide(input: CreateRideInput) {
  const ride = await prisma.rideRequest.create({
    data: {
      passenger_id: input.passengerId,
      pickup: input.pickup,
      destination: input.destination,
      seats_requested: input.seats,
      estimated_fare: calculateEstimatedFare(false),
      status: "REQUESTED",
    },
  });

  try {
    const result = await assignRideToPool(ride.id);
    return result.ride;
  } catch (err) {
    // No vehicle available right now — ride stays REQUESTED, can be matched later
    return ride;
  }
}

export async function getRideHistory(passengerId: number) {
  return prisma.rideRequest.findMany({
    where: { passenger_id: passengerId },
    orderBy: { created_at: "desc" },
  });
}

export async function cancelRide(passengerId: number, rideId: number) {
  const ride = await prisma.rideRequest.findUnique({ where: { id: rideId } });

  if (!ride) {
    throw new Error("RIDE_NOT_FOUND");
  }
  if (ride.passenger_id !== passengerId) {
    throw new Error("FORBIDDEN");
  }
  if (ride.status === "STARTED" || ride.status === "COMPLETED") {
    throw new Error("CANNOT_CANCEL");
  }

  return prisma.rideRequest.update({
    where: { id: rideId },
    data: { status: "CANCELLED" },
  });
}