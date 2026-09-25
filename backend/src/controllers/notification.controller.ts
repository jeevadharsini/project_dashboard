import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import * as notificationService from "../services/notification.service";

export async function listNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
}

export async function unreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await notificationService.getUnreadCount(req.user!.id);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    await notificationService.markRead(req.user!.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    await notificationService.markAllRead(req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
