export type Role = "ADMIN" | "PM" | "DEVELOPER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "OVERDUE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  projectId: string;
  assigneeId?: string | null;
  assignee?: { id: string; name: string } | null;
  project?: { id: string; name: string };
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  creatorId: string;
  tasks?: Task[];
  _count?: { tasks: number };
}

export interface ActivityEntry {
  id: string;
  taskId: string;
  projectId: string;
  actorId: string;
  previousStatus: TaskStatus | null;
  newStatus: TaskStatus;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: "TASK_ASSIGNED" | "TASK_IN_REVIEW";
  message: string;
  isRead: boolean;
  createdAt: string;
}
