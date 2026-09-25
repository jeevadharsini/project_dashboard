import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../api/client";
import { useSocket } from "../context/SocketContext";

interface AdminStats {
  totalProjects: number;
  tasksByStatus: { status: string; count: number }[];
  overdueCount: number;
  onlineUsers: number;
}

interface Project {
  id: string;
  name: string;
  description?: string | null;
  _count?: {
    tasks: number;
  };
}

interface ProjectSummary {
  id: string;
  name: string;
  description?: string | null;
  _count?: {
    tasks: number;
  };
}

const statusLabels: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  OVERDUE: "Overdue",
};

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const { onlineCount } = useSocket();

 useEffect(() => {
  apiJson<AdminStats>("/api/dashboard/admin")
    .then(setStats)
    .catch((error) => {
      console.error("Failed to load dashboard:", error);
    });

  apiJson<ProjectSummary[]>("/api/projects")
    .then(setProjects)
    .catch((error) => {
      console.error("Failed to load projects:", error);
    });
}, []);

  const totalTasks = useMemo(() => {
    if (!stats) return 0;
    return stats.tasksByStatus.reduce((sum, item) => sum + item.count, 0);
  }, [stats]);

  if (!stats) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">

      {/* Page heading */}
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>Admin Dashboard</h1>
          <p className="subtitle">
            Monitor projects, tasks and team activity from one place.
          </p>
        </div>

        <Link to="/projects/new" className="dashboard-action">
          + New Project
        </Link>
      </div>

      {/* Statistics */}
      <div className="stats-grid">

        <div className="modern-stat-card">
          <div className="stat-icon purple">
            📁
          </div>

          <div>
            <p>Total Projects</p>
            <h2>{stats.totalProjects}</h2>
          </div>

          <span className="stat-trend">
            Active
          </span>
        </div>

        <div className="modern-stat-card">
          <div className="stat-icon blue">
            ✓
          </div>

          <div>
            <p>Total Tasks</p>
            <h2>{totalTasks}</h2>
          </div>

          <span className="stat-trend">
            Overall
          </span>
        </div>

        <div className="modern-stat-card">
          <div className="stat-icon red">
            !
          </div>

          <div>
            <p>Overdue Tasks</p>
            <h2>{stats.overdueCount}</h2>
          </div>

          <span className="stat-trend danger">
            Needs attention
          </span>
        </div>

        <div className="modern-stat-card">
          <div className="stat-icon green">
            ●
          </div>

          <div>
            <p>Online Users</p>
            <h2>{onlineCount || stats.onlineUsers}</h2>
          </div>

          <span className="stat-trend success">
            Live
          </span>
        </div>

      </div>

      {/* Main dashboard content */}
      <div className="dashboard-content-grid">

        {/* Task overview */}
        <section className="dashboard-card">
          <div className="card-heading">
            <div>
              <h3>Task Overview</h3>
              <p>Current distribution of tasks</p>
            </div>

            <span className="card-total">
              {totalTasks} total
            </span>
          </div>

          <div className="task-status-list">

            {stats.tasksByStatus.map((item) => {

              const percentage =
                totalTasks > 0
                  ? Math.round((item.count / totalTasks) * 100)
                  : 0;

              return (
                <div className="status-item" key={item.status}>


                   <div className="status-row">
                   <div className="status-name">
                     <span
                       className={`status-dot ${item.status.toLowerCase()}`}
                     />
                     <span>
      {statusLabels[item.status] ?? item.status}
                     </span>
                    </div>

  <div className="status-value">
    <strong>{item.count}</strong>
    <span className="percentage">
      {percentage}%
    </span>
  </div>
</div>



                  <div className="progress-track">
                    <div
                      className={`progress-bar ${item.status.toLowerCase()}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <span className="percentage">
                    {percentage}%
                  </span>

                </div>
              );
            })}

          </div>
        </section>

        {/* Quick actions */}
        <section className="dashboard-card">

          <div className="card-heading">
            <div>
              <h3>Quick Actions</h3>
              <p>Frequently used actions</p>
            </div>
          </div>

          <div className="quick-actions">

            <Link to="/projects/new" className="quick-action">
              <span className="quick-icon purple">＋</span>

              <div>
                <strong>Create Project</strong>
                <small>Start a new client project</small>
              </div>

              <span className="arrow">→</span>
            </Link>

           {projects.length > 0 ? (
  <Link
    to={`/projects/${projects[0].id}`}
    className="quick-action"
  >
    <span className="quick-icon blue">✓</span>

    <div>
      <strong>View Tasks</strong>
      <small>Review project tasks</small>
    </div>

    <span className="arrow">→</span>
  </Link>
) : (
  <div className="quick-action disabled">
    <span className="quick-icon blue">✓</span>

    <div>
      <strong>View Tasks</strong>
      <small>No projects available</small>
    </div>
  </div>
)}

            {projects.length > 0 ? (
  <Link
    to={`/projects/${projects[0].id}`}
    className="quick-action"
  >
    <span className="quick-icon green">●</span>

    <div>
      <strong>Team Activity</strong>
      <small>View recent activity</small>
    </div>

    <span className="arrow">→</span>
  </Link>
) : (
  <div className="quick-action disabled">
    <span className="quick-icon green">●</span>

    <div>
      <strong>Team Activity</strong>
      <small>No projects available</small>
    </div>
  </div>
)}

          </div>

        </section>

      </div>

            {/* Projects */}
      <section className="dashboard-card projects-section">

        <div className="card-heading">
          <div>
            <h3>Projects</h3>
            <p>All projects currently available</p>
          </div>

          <span className="card-total">
            {projects.length} projects
          </span>
        </div>

        <div className="projects-list">

          {projects.map((project) => (
            <div className="project-item" key={project.id}>

              <div className="project-info">

                <div className="project-icon">
                  📁
                </div>

                <div>
                  <strong>{project.name}</strong>

                  <p>
                    {project.description || "No description available"}
                  </p>

                  <small>
                    {project._count?.tasks ?? 0}{" "}
                    {(project._count?.tasks ?? 0) === 1
                      ? "task"
                      : "tasks"}
                  </small>
                </div>

              </div>

              <Link
                to={`/projects/${project.id}`}
                className="project-view-button"
              >
                View →
              </Link>

            </div>
          ))}

        </div>

      </section>

      {/* Bottom information */}
      <section className="dashboard-card activity-placeholder">

        <div className="card-heading">
          <div>
            <h3>System Status</h3>
            <p>Current application services</p>
          </div>

          <span className="system-status">
            <span />
            All systems operational
          </span>
        </div>

        <div className="system-grid">

          <div className="system-item">
            <span className="system-icon">DB</span>
            <div>
              <strong>PostgreSQL</strong>
              <small>Database connected</small>
            </div>
            <span className="online-check">✓</span>
          </div>

          <div className="system-item">
            <span className="system-icon">WS</span>
            <div>
              <strong>WebSocket</strong>
              <small>Real-time connection active</small>
            </div>
            <span className="online-check">✓</span>
          </div>

          <div className="system-item">
            <span className="system-icon">API</span>
            <div>
              <strong>API Server</strong>
              <small>Backend responding</small>
            </div>
            <span className="online-check">✓</span>
          </div>

        </div>

      </section>

    </div>
  );
}