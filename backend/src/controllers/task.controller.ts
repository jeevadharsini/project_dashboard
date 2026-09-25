import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { Role, TaskStatus, TaskPriority } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "../utils/errors";
import { assertProjectAccess } from "./project.controller";
import { changeTaskStatus } from "../services/activity.service";
import { notifyDeveloperAssigned } from "../services/notification.service";

export async function listDevelopers(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const developers = await prisma.user.findMany({
      where: {
        role: Role.DEVELOPER,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json(developers);
  } catch (err) {
    next(err);
  }
}

const createTaskSchema = z.object({
  projectId: z.string().uuid(),

  title: z.string().min(1),

  description: z.string().optional(),

  assigneeId: z.string().uuid().optional(),

  status: z
    .nativeEnum(TaskStatus)
    .optional(),

  priority: z
    .nativeEnum(TaskPriority)
    .optional(),

  dueDate: z
    .coerce.date()
    .optional(),
});

const assignTaskSchema = z.object({ assigneeId: z.string().uuid() });
const statusSchema = z.object({ status: z.nativeEnum(TaskStatus) });

const filterSchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  projectId: z.string().uuid().optional(),
});

// Backend-enforced task visibility, mirroring project scoping:
// admin -> all, PM -> tasks in projects they own, developer -> only tasks
// assigned to them. A developer requesting another developer's task id
// gets a 404, not the task's data.
function taskScopeFilter(user: { id: string; role: Role }) {
  if (user.role === Role.ADMIN) return {};
  if (user.role === Role.PM) return { project: { creatorId: user.id } };
  return { assigneeId: user.id };
}

export async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const q = filterSchema.parse(req.query);
    const where: any = { ...taskScopeFilter(req.user!) };
    if (q.status) where.status = q.status;
    if (q.priority) where.priority = q.priority;
    if (q.projectId) where.projectId = q.projectId;
    if (q.from || q.to) {
      where.dueDate = {};
      if (q.from) where.dueDate.gte = q.from;
      if (q.to) where.dueDate.lte = q.to;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: { assignee: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
}

export async function getTask(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, ...taskScopeFilter(req.user!) },
      include: { assignee: true, project: true, activityLogs: { orderBy: { createdAt: "desc" } } },
    });
    if (!task) throw new NotFoundError("Task not found or not accessible");
    res.json(task);
  } catch (err) {
    next(err);
  }
}

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createTaskSchema.parse(req.body);
    await assertProjectAccess(data.projectId, req.user!);
    const task = await prisma.task.create({ data });
    if (task.assigneeId) await notifyDeveloperAssigned(task.id);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

export async function assignTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { assigneeId } = assignTaskSchema.parse(req.body);
    const task = await prisma.task.findUniqueOrThrow({ where: { id: req.params.id } });
    await assertProjectAccess(task.projectId, req.user!);
    const updated = await prisma.task.update({ where: { id: task.id }, data: { assigneeId } });
    await notifyDeveloperAssigned(updated.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function updateTaskStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = statusSchema.parse(req.body);
    const task = await prisma.task.findFirst({ where: { id: req.params.id, ...taskScopeFilter(req.user!) } });
    if (!task) throw new NotFoundError("Task not found or not accessible");

    // A developer may only move their own task; PM/Admin may move any task
    // within their scope. (Scope already narrowed the query above.)
    if (req.user!.role === Role.DEVELOPER && task.assigneeId !== req.user!.id) {
      throw new ForbiddenError("Not your task");
    }

    const updated = await changeTaskStatus(task.id, status, req.user!.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}
