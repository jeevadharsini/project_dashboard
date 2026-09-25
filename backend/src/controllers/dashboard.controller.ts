import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { TaskStatus } from "@prisma/client";
import { getOnlineUserCount } from "../sockets/socketHandlers";

export async function adminDashboard(_req: Request, res: Response, next: NextFunction) {
  try {
    const [totalProjects, tasksByStatus, overdueCount] = await Promise.all([
      prisma.project.count(),
      prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.task.count({ where: { status: TaskStatus.OVERDUE } }),
    ]);
    res.json({
      totalProjects,
      tasksByStatus: tasksByStatus.map((t: { status: string; _count: { _all: number } }) => ({
        status: t.status,
        count: t._count._all,
      })),
      overdueCount,
      onlineUsers: getOnlineUserCount(),
    });
  } catch (err) {
    next(err);
  }
}

export async function pmDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const pmId = req.user!.id;
    const [projects, tasksByPriority, upcoming] = await Promise.all([
      prisma.project.findMany({ where: { creatorId: pmId }, include: { _count: { select: { tasks: true } } } }),
      prisma.task.groupBy({ by: ["priority"], where: { project: { creatorId: pmId } }, _count: { _all: true } }),
      prisma.task.findMany({
        where: { project: { creatorId: pmId }, dueDate: { gte: new Date() } },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
    ]);
    res.json({
      projects,
      tasksByPriority: tasksByPriority.map((t: { priority: string; _count: { _all: number } }) => ({
        priority: t.priority,
        count: t._count._all,
      })),
      upcomingDueDates: upcoming,
    });
  } catch (err) {
    next(err);
  }
}

export async function developerDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const devId = req.user!.id;
    const tasks = await prisma.task.findMany({
      where: { assigneeId: devId },
      include: { project: { select: { id: true, name: true } } },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    });
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
}
