import { useEffect, useState } from "react";
import { apiJson } from "../api/client";
import { useSocket } from "../context/SocketContext";
import { Notification } from "../types";

export function Notifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { socket } = useSocket();

  useEffect(() => {
    apiJson<{ count: number }>("/api/notifications/unread-count").then((d) => setUnreadCount(d.count));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onNew = (n: Notification) => setItems((prev) => [n, ...prev]);
    const onCount = ({ count }: { count: number }) => setUnreadCount(count);
    socket.on("notification:new", onNew);
    socket.on("notification:unreadCount", onCount);
    return () => {
      socket.off("notification:new", onNew);
      socket.off("notification:unreadCount", onCount);
    };
  }, [socket]);

  async function openDropdown() {
    setOpen((o) => !o);
    if (!open) {
      const data = await apiJson<Notification[]>("/api/notifications");
      setItems(data);
    }
  }

  async function markOne(id: string) {
    await apiJson(`/api/notifications/${id}/read`, { method: "PATCH" });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  async function markAll() {
    await apiJson("/api/notifications/read-all", { method: "PATCH" });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  return (
    <div className="notifications">
      <button onClick={openDropdown}>
        Notifications {unreadCount > 0 && <span className="badge unread">{unreadCount}</span>}
      </button>
      {open && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <strong>Notifications</strong>
            <button onClick={markAll}>Mark all read</button>
          </div>
          {items.length === 0 && <p className="empty">No notifications.</p>}
          <ul>
            {items.map((n) => (
              <li key={n.id} className={n.isRead ? "read" : "unread"} onClick={() => markOne(n.id)}>
                {n.message}
                <span className="activity-time">{new Date(n.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
