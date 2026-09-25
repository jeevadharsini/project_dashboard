import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../api/client";
import { Project, Task } from "../types";

interface PmStats {
  projects: Project[];
  tasksByPriority: { priority: string; count: number }[];
  upcomingDueDates: Task[];
}

export function PMDashboard() {
  const [stats, setStats] = useState<PmStats | null>(null);

  useEffect(() => {
    apiJson<PmStats>("/api/dashboard/pm").then(setStats);
  }, []);

  if (!stats) return <p>Loading...</p>;

  return (
    <div>
      <h2>Your projects</h2>
      <ul className="project-list">
        {stats.projects.map((p) => (
          <li key={p.id}>
            <Link to={`/projects/${p.id}`}>{p.name}</Link> ({p._count?.tasks ?? 0} tasks)
          </li>
        ))}
      </ul>

      <div className="dashboard-grid">
        <div className="stat-card wide">
          <h3>Tasks by priority</h3>
          <ul>
            {stats.tasksByPriority.map((t) => (
              <li key={t.priority}>{t.priority}: {t.count}</li>
            ))}
          </ul>
        </div>
        <div className="stat-card wide">
          <h3>Upcoming due dates</h3>
          <ul>
            {stats.upcomingDueDates.map((t) => (
              <li key={t.id}>{t.title} - {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "-"}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
