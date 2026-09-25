import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { Role } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "../utils/errors";

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  clientId: z.string().uuid().optional(),
});

// Scopes the project list/detail query by the caller's role. This is the
// backend-enforced boundary; the frontend never decides what's visible.
function projectScopeFilter(user: { id: string; role: Role }) {
  if (user.role === Role.ADMIN) return {};
  if (user.role === Role.PM) return { creatorId: user.id };
  // Developer: only projects containing a task assigned to them.
  return { tasks: { some: { assigneeId: user.id } } };
}

export async function listProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const projects = await prisma.project.findMany({
      where: projectScopeFilter(req.user!),
      include: { _count: { select: { tasks: true } }, client: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(projects);
  } catch (err) {
    next(err);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, ...projectScopeFilter(req.user!) },
      include: { tasks: true, client: true },
    });
    if (!project) throw new NotFoundError("Project not found or not accessible");
    res.json(project);
  } catch (err) {
    next(err);
  }
}

export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createProjectSchema.parse(req.body);
    // Only PM/Admin reach this handler (route-gated); the project is always
    // owned by whoever creates it.
    const project = await prisma.project.create({
      data: { ...data, creatorId: req.user!.id },
    });
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

// Defense in depth: even though listProjects/getProject already scope by
// role, any handler that mutates a specific project re-checks ownership
// here before writing, so a PM can never touch another PM's project by
// guessing its id.
export async function assertProjectAccess(projectId: string, user: { id: string; role: Role }) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundError("Project not found");
  if (user.role === Role.ADMIN) return project;
  if (user.role === Role.PM && project.creatorId === user.id) return project;
  throw new ForbiddenError("Not your project");
}
