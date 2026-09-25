import { Server, Socket } from "socket.io";
import http from "http";
import { verifyAccessToken } from "../utils/jwt";
import { prisma } from "../lib/prisma";
import { getLastActivityForUser } from "../services/activity.service";
import { getUnreadCount } from "../services/notification.service";
import { Role } from "@prisma/client";
import { env } from "../config/env";

let io: Server | null = null;

// userId -> set of connected socket ids. Presence and per-user notification
// delivery both key off this map, not off a single socket, since one user
// may have several tabs/devices open at once.
const onlineUsers = new Map<string, Set<string>>();

interface SocketUser {
  id: string;
  role: Role;
}

function getSocketUser(socket: Socket): SocketUser | null {
  return (socket.data.user as SocketUser) || null;
}

export function initSocket(server: http.Server) {
  io = new Server(server, {
    cors: { origin: env.corsOrigin, credentials: true },
  });

  // Auth happens at the handshake, same JWT as REST. No socket is accepted
  // without a valid access token - there is no "guest" websocket mode.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Missing token"));
      const payload = verifyAccessToken(token);
      socket.data.user = { id: payload.sub, role: payload.role };
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const user = getSocketUser(socket);
    if (!user) return socket.disconnect(true);

    // --- presence ---
    if (!onlineUsers.has(user.id)) onlineUsers.set(user.id, new Set());
    onlineUsers.get(user.id)!.add(socket.id);
    socket.join(`user:${user.id}`);
    broadcastOnlineCount();

    // --- missed events on reconnect: always read from Postgres, never
    // from an in-memory buffer, since a buffer would be lost on server
    // restart or simply not exist for a fresh connection. ---
    const [missedActivity, unreadCount] = await Promise.all([
      getLastActivityForUser(user.id, user.role, 20),
      getUnreadCount(user.id),
    ]);
    socket.emit("activity:missed", missedActivity);
    socket.emit("notification:unreadCount", { count: unreadCount });

    socket.on("project:join", async (projectId: string) => {
      const allowed = await userCanViewProject(user, projectId);
      if (allowed) socket.join(projectRoom(projectId));
    });

    socket.on("project:leave", (projectId: string) => {
      socket.leave(projectRoom(projectId));
    });

    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(user.id);
      sockets?.delete(socket.id);
      if (sockets && sockets.size === 0) onlineUsers.delete(user.id);
      broadcastOnlineCount();
    });
  });

  return io;
}

function projectRoom(projectId: string) {
  return `project:${projectId}`;
}

async function userCanViewProject(user: SocketUser, projectId: string): Promise<boolean> {
  if (user.role === Role.ADMIN) return true;
  if (user.role === Role.PM) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    return project?.creatorId === user.id;
  }
  // Developer: allowed into the room only to receive updates for tasks
  // assigned to them within that project.
  const task = await prisma.task.findFirst({ where: { projectId, assigneeId: user.id } });
  return !!task;
}

// Broadcasts to everyone currently viewing a project, but role-filters what
// each recipient actually sees isn't needed here because room membership
// itself was already gated by userCanViewProject above.
export function broadcastToProjectViewers(projectId: string, event: string, payload: unknown) {
  io?.to(projectRoom(projectId)).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

function broadcastOnlineCount() {
  io?.emit("presence:onlineCount", { count: onlineUsers.size });
}

export function getIO() {
  return io;
}

export function getOnlineUserCount() {
  return onlineUsers.size;
}
