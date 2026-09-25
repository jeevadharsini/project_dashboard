import { prisma } from "../lib/prisma";
import { TaskStatus } from "@prisma/client";
import { getIO, broadcastToProjectViewers } from "../sockets/socketHandlers";

// The single place a Task's status is allowed to change. Every call writes
// an immutable ActivityLog row FIRST, then updates the Task, then broadcasts.
// History is always read from ActivityLog, never reconstructed from Task.
export async function changeTaskStatus(taskId: string, newStatus: TaskStatus, actorId: string) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });

  const [activity, updatedTask] = await prisma.$transaction([
    prisma.activityLog.create({
      data: {
        taskId: task.id,
        projectId: task.projectId,
        actorId,
        previousStatus: task.status,
        newStatus,
      },
    }),
    prisma.task.update({ where: { id: taskId }, data: { status: newStatus } }),
  ]);

  broadcastToProjectViewers(task.projectId, "activity:new", {
    id: activity.id,
    taskId: task.id,
    projectId: task.projectId,
    actorId,
    previousStatus: activity.previousStatus,
    newStatus: activity.newStatus,
    createdAt: activity.createdAt,
  });

  if (newStatus === TaskStatus.IN_REVIEW) {
    const { notifyPmTaskInReview } = await import("./notification.service");
    await notifyPmTaskInReview(updatedTask.id);
  }

  return updatedTask;
}

export async function getLastActivityForUser(userId: string, role: string, limit = 20) {
  // Role-scoped: admins see everything, PMs see their own projects,
  // developers see activity tied to tasks assigned to them.
  if (role === "ADMIN") {
    return prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
  if (role === "PM") {
    return prisma.activityLog.findMany({
      where: { project: { creatorId: userId } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
  return prisma.activityLog.findMany({
    where: { task: { assigneeId: userId } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
