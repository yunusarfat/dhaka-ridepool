import type { Request, Response } from "express";
import { z } from "zod";
import { requestRide, getRideHistory, cancelRide } from "../services/rideService.js";

const createRideSchema = z.object({
  pickup: z.string().min(1),
  destination: z.string().min(1),
  seats: z.number().int().positive(),
});

export async function create(req: Request, res: Response) {
  const parsed = createRideSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_INPUT", details: parsed.error.flatten() });
  }

  const ride = await requestRide({
    passengerId: req.user!.userId,
    pickup: parsed.data.pickup,
    destination: parsed.data.destination,
    seats: parsed.data.seats,
  });

  return res.status(201).json(ride);
}

export async function history(req: Request, res: Response) {
  const rides = await getRideHistory(req.user!.userId);
  return res.status(200).json(rides);
}

export async function cancel(req: Request, res: Response) {
  const rideId = Number(req.params.id);
  if (Number.isNaN(rideId)) {
    return res.status(400).json({ error: "INVALID_RIDE_ID" });
  }

  try {
    const ride = await cancelRide(req.user!.userId, rideId);
    return res.status(200).json(ride);
  } catch (err) {
    if (err instanceof Error && err.message === "RIDE_NOT_FOUND") {
      return res.status(404).json({ error: "RIDE_NOT_FOUND" });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    if (err instanceof Error && err.message === "CANNOT_CANCEL") {
      return res.status(400).json({ error: "CANNOT_CANCEL" });
    }
    console.error(err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}