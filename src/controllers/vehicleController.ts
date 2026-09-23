import type { Request, Response } from "express";
import { z } from "zod";
import { createVehicle, setVehicleStatus, getVehicleByDriver } from "../services/vehicleService.js";

const createVehicleSchema = z.object({
  name: z.string().min(1),
  capacity: z.number().int().positive(),
});

const statusSchema = z.object({
  status: z.enum(["ONLINE", "OFFLINE"]),
});

export async function create(req: Request, res: Response) {
  const parsed = createVehicleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_INPUT", details: parsed.error.flatten() });
  }

  try {
    const vehicle = await createVehicle(req.user!.userId, parsed.data.name, parsed.data.capacity);
    return res.status(201).json(vehicle);
  } catch (err) {
    if (err instanceof Error && err.message === "VEHICLE_ALREADY_EXISTS") {
      return res.status(409).json({ error: "VEHICLE_ALREADY_EXISTS" });
    }
    console.error(err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}

export async function updateStatus(req: Request, res: Response) {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_INPUT", details: parsed.error.flatten() });
  }

  try {
    const vehicle = await setVehicleStatus(req.user!.userId, parsed.data.status);
    return res.status(200).json(vehicle);
  } catch (err) {
    if (err instanceof Error && err.message === "VEHICLE_NOT_FOUND") {
      return res.status(404).json({ error: "VEHICLE_NOT_FOUND" });
    }
    console.error(err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}

export async function getMine(req: Request, res: Response) {
  const vehicle = await getVehicleByDriver(req.user!.userId);
  if (!vehicle) {
    return res.status(404).json({ error: "VEHICLE_NOT_FOUND" });
  }
  return res.status(200).json(vehicle);
}