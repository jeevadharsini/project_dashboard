import { Router } from "express";
import { authenticateUser, requireAdmin, requireProjectManager, requireDeveloper } from "../middleware/auth";
import * as dashboardController from "../controllers/dashboard.controller";

const router = Router();

router.use(authenticateUser);
router.get("/admin", requireAdmin, dashboardController.adminDashboard);
router.get("/pm", requireProjectManager, dashboardController.pmDashboard);
router.get("/developer", requireDeveloper, dashboardController.developerDashboard);

export default router;
