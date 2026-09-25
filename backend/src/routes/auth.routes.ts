import { Router } from "express";
import { authenticateUser } from "../middleware/auth";
import * as authController from "../controllers/auth.controller";

const router = Router();

router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authenticateUser, authController.me);

export default router;
