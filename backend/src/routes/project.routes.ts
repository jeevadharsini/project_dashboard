import { Router } from "express";
import { authenticateUser, requireProjectManager } from "../middleware/auth";
import * as projectController from "../controllers/project.controller";

const router = Router();

router.use(authenticateUser);
router.get("/", projectController.listProjects);
router.get("/:id", projectController.getProject);
router.post("/", requireProjectManager, projectController.createProject);

export default router;
