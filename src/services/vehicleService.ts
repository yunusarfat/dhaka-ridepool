import prisma from "../db/prismaClient.js";

export async function createVehicle(driverId: number, name: string, capacity: number) {
  const existing = await prisma.vehicle.findUnique({ where: { driver_id: driverId } });
  if (existing) {
    throw new Error("VEHICLE_ALREADY_EXISTS");
  }

  return prisma.vehicle.create({
    data: {
      driver_id: driverId,
      name,
      capacity,
      status: "OFFLINE",
    },
  });
}

export async function setVehicleStatus(driverId: number, status: "ONLINE" | "OFFLINE") {
  const vehicle = await prisma.vehicle.findUnique({ where: { driver_id: driverId } });
  if (!vehicle) {
    throw new Error("VEHICLE_NOT_FOUND");
  }

  return prisma.vehicle.update({
    where: { driver_id: driverId },
    data: { status },
  });
}

export async function getVehicleByDriver(driverId: number) {
  return prisma.vehicle.findUnique({ where: { driver_id: driverId } });
}