import { Router } from "express";
import { authenticateUser } from "../middleware/auth";
import * as notificationController from "../controllers/notification.controller";

const router = Router();

router.use(authenticateUser);
router.get("/", notificationController.listNotifications);
router.get("/unread-count", notificationController.unreadCount);
router.patch("/:id/read", notificationController.markRead);
router.patch("/read-all", notificationController.markAllRead);

export default router;
