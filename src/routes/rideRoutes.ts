import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { create, history, cancel } from "../controllers/rideController.js";

const router = Router();

router.post("/", requireAuth, requireRole("PASSENGER"), create);
router.get("/history", requireAuth, requireRole("PASSENGER"), history);
router.patch("/:id/cancel", requireAuth, requireRole("PASSENGER"), cancel);

export default router;