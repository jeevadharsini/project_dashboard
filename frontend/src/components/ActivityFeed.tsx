import { ActivityEntry } from "../types";

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) return <p className="empty">No activity yet.</p>;
  return (
    <ul className="activity-feed">
      {entries.map((e) => (
        <li key={e.id ?? `${e.taskId}-${e.createdAt}`}>
          <span className="activity-transition">
            {e.previousStatus ? `${e.previousStatus} -> ${e.newStatus}` : `created as ${e.newStatus}`}
          </span>
          <span className="activity-time">{new Date(e.createdAt).toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}
