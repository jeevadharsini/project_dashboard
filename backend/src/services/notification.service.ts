import { prisma } from "../lib/prisma";
import { NotificationType } from "@prisma/client";
import { emitToUser } from "../sockets/socketHandlers";

async function create(userId: string, type: NotificationType, message: string, taskId?: string, projectId?: string) {
  const notification = await prisma.notification.create({
    data: { userId, type, message, taskId, projectId },
  });

  const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });

  emitToUser(userId, "notification:new", notification);
  emitToUser(userId, "notification:unreadCount", { count: unreadCount });

  return notification;
}

export async function notifyDeveloperAssigned(taskId: string) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  if (!task.assigneeId) return;
  await create(
    task.assigneeId,
    NotificationType.TASK_ASSIGNED,
    `You were assigned to "${task.title}"`,
    task.id,
    task.projectId
  );
}

export async function notifyPmTaskInReview(taskId: string) {
  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: { project: true },
  });
  await create(
    task.project.creatorId,
    NotificationType.TASK_IN_REVIEW,
    `"${task.title}" moved to In Review`,
    task.id,
    task.projectId
  );
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markRead(userId: string, notificationId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
  const count = await getUnreadCount(userId);
  emitToUser(userId, "notification:unreadCount", { count });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  emitToUser(userId, "notification:unreadCount", { count: 0 });
}
