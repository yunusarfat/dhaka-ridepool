import prisma from "../db/prismaClient.js";
import { calculateEstimatedFare } from "./fareService.js";

interface CreateRideInput {
  passengerId: number;
  pickup: string;
  destination: string;
  seats: number;
}

export async function requestRide(input: CreateRideInput) {
  const estimatedFare = calculateEstimatedFare(false);

  return prisma.rideRequest.create({
    data: {
      passenger_id: input.passengerId,
      pickup: input.pickup,
      destination: input.destination,
      seats_requested: input.seats,
      estimated_fare: estimatedFare,
      status: "REQUESTED",
    },
  });
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