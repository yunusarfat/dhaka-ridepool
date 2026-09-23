import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { create, updateStatus, getMine } from "../controllers/vehicleController.js";

const router = Router();

router.post("/", requireAuth, requireRole("DRIVER"), create);
router.patch("/status", requireAuth, requireRole("DRIVER"), updateStatus);
router.get("/me", requireAuth, requireRole("DRIVER"), getMine);

export default router;