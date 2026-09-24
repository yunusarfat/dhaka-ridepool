import type { Request, Response } from "express";
import { markDriverArrived, startTrip, completeTrip, getPoolDetails } from "../services/poolLifeCycleService.js";
import { getActivePoolForDriver } from "../services/poolLifeCycleService.js";

function handlePoolError(err: unknown, res: Response) {
  if (err instanceof Error) {
    if (err.message === "POOL_NOT_FOUND") return res.status(404).json({ error: "POOL_NOT_FOUND" });
    if (err.message === "FORBIDDEN") return res.status(403).json({ error: "FORBIDDEN" });
    if (err.message.startsWith("INVALID_TRANSITION")) {
      return res.status(400).json({ error: "INVALID_TRANSITION", message: err.message });
    }
  }
  console.error(err);
  return res.status(500).json({ error: "INTERNAL_ERROR" });
}

export async function arrived(req: Request, res: Response) {
  try {
    const pool = await markDriverArrived(req.user!.userId, Number(req.params.id));
    return res.status(200).json(pool);
  } catch (err) {
    return handlePoolError(err, res);
  }
}

export async function start(req: Request, res: Response) {
  try {
    const pool = await startTrip(req.user!.userId, Number(req.params.id));
    return res.status(200).json(pool);
  } catch (err) {
    return handlePoolError(err, res);
  }
}

export async function complete(req: Request, res: Response) {
  try {
    const pool = await completeTrip(req.user!.userId, Number(req.params.id));
    return res.status(200).json(pool);
  } catch (err) {
    return handlePoolError(err, res);
  }
}

export async function details(req: Request, res: Response) {
  try {
    const pool = await getPoolDetails(req.user!.userId, Number(req.params.id));
    return res.status(200).json(pool);
  } catch (err) {
    return handlePoolError(err, res);
  }
}

export async function myActivePool(req: Request, res: Response) {
  try {
    const pool = await getActivePoolForDriver(req.user!.userId);
    return res.status(200).json(pool);
  } catch (err) {
    return handlePoolError(err, res);
  }
}
