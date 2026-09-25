import { Router } from "express";
import { authenticateUser, requireProjectManager, requireDeveloper } from "../middleware/auth";
import * as taskController from "../controllers/task.controller";

const router = Router();

router.use(authenticateUser);
router.get(
  "/developers",
  taskController.listDevelopers
);

router.get(
  "/",
  taskController.listTasks
);

router.get(
  "/:id",
  taskController.getTask
);
router.post("/", requireProjectManager, taskController.createTask);
router.patch("/:id/assign", requireProjectManager, taskController.assignTask);
// Any authenticated developer+ may attempt a status change; the controller
// itself enforces "only your own task" for developers.
router.patch("/:id/status", requireDeveloper, taskController.updateTaskStatus);

export default router;
