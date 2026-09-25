import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { TaskStatus } from "@prisma/client";
import { broadcastToProjectViewers } from "../sockets/socketHandlers";

// Runs every 5 minutes. Overdue is a persisted status transition, written
// through the same activity-log path as a manual status change, so a task's
// "Overdue" state is never computed on the fly at dashboard-load time -
// it's a fact stored in the database the moment the due date passes.
export async function runOverdueSweep() {
  const now = new Date();

  const overdueTasks = await prisma.task.findMany({
    where: {
      dueDate: { lt: now },
      status: { notIn: [TaskStatus.DONE, TaskStatus.OVERDUE] },
    },
  });

  for (const task of overdueTasks) {
    // System-driven transition: attribute it to the assignee if there is
    // one, otherwise to the project's owning PM (never a fabricated id -
    // actorId is a real FK to User).
    let actorId = task.assigneeId;
    if (!actorId) {
      const project = await prisma.project.findUniqueOrThrow({ where: { id: task.projectId } });
      actorId = project.creatorId;
    }

    await prisma.$transaction([
      prisma.activityLog.create({
        data: {
          taskId: task.id,
          projectId: task.projectId,
          actorId,
          previousStatus: task.status,
          newStatus: TaskStatus.OVERDUE,
        },
      }),
      prisma.task.update({ where: { id: task.id }, data: { status: TaskStatus.OVERDUE } }),
    ]);

    broadcastToProjectViewers(task.projectId, "activity:new", {
      taskId: task.id,
      projectId: task.projectId,
      previousStatus: task.status,
      newStatus: TaskStatus.OVERDUE,
      createdAt: new Date(),
    });
  }

  if (overdueTasks.length > 0) {
    console.log(`[overdueJob] marked ${overdueTasks.length} task(s) overdue`);
  }
}

export function startOverdueJob() {
  // */5 * * * * = every 5 minutes. Adjust cadence to taste.
  cron.schedule("*/5 * * * *", () => {
    runOverdueSweep().catch((err) => console.error("[overdueJob] failed:", err));
  });
}
