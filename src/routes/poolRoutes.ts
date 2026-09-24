import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { arrived, start, complete, details, myActivePool } from "../controllers/poolController.js";

const router = Router();
router.get("/active", requireAuth, requireRole("DRIVER"), myActivePool);
router.get("/:id", requireAuth, requireRole("DRIVER"), details);
router.patch("/:id/arrived", requireAuth, requireRole("DRIVER"), arrived);
router.patch("/:id/start", requireAuth, requireRole("DRIVER"), start);
router.patch("/:id/complete", requireAuth, requireRole("DRIVER"), complete);

export default router;