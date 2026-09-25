import { FormEvent, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { apiJson } from "../api/client";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import {
  Task,
  ActivityEntry,
  TaskPriority,
  TaskStatus,
  User,
  Project,
} from "../types";
import { TaskList } from "../components/TaskList";
import { ActivityFeed } from "../components/ActivityFeed";
import { Filters } from "../components/Filters";

export async function changeTaskStatusRequest(
  taskId: string,
  status: Task["status"]
) {
  return apiJson(`/api/tasks/${taskId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function ProjectPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [params] = useSearchParams();

  const { socket } = useSocket();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [developers, setDevelopers] = useState<User[]>([]);

  const [showCreateTask, setShowCreateTask] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] =
    useState<TaskPriority>("MEDIUM");
  const [status, setStatus] =
    useState<TaskStatus>("TODO");
  const [dueDate, setDueDate] = useState("");

  async function loadTasks() {
    if (!projectId) return;

    try {
      const query = new URLSearchParams(params);
      query.set("projectId", projectId);

      const data = await apiJson<Task[]>(
        `/api/tasks?${query.toString()}`
      );

      setTasks(data);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  }

  async function loadProject() {
    if (!projectId) return;

    try {
      const data = await apiJson<Project>(
        `/api/projects/${projectId}`
      );

      setProject(data);
    } catch (err) {
      console.error("Failed to load project:", err);
    }
  }

  async function loadDevelopers() {
    if (!user) return;

    if (user.role !== "ADMIN" && user.role !== "PM") {
      return;
    }

    try {
      const data = await apiJson<User[]>(
        "/api/tasks/developers"
      );

      setDevelopers(data);
    } catch (err) {
      console.error("Failed to load developers:", err);
    }
  }

  useEffect(() => {
    loadProject();
    loadTasks();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, params.toString()]);

  useEffect(() => {
    loadDevelopers();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!socket || !projectId) return;

    socket.emit("project:join", projectId);

    const onActivity = (entry: ActivityEntry) => {
      if (entry.projectId !== projectId) return;

      setActivity((prev) =>
        [entry, ...prev].slice(0, 50)
      );

      loadTasks();
    };

    const onMissed = (entries: ActivityEntry[]) => {
      setActivity((prev) =>
        [
          ...entries.filter(
            (e) => e.projectId === projectId
          ),
          ...prev,
        ].slice(0, 50)
      );
    };

    socket.on("activity:new", onActivity);
    socket.on("activity:missed", onMissed);

    return () => {
      socket.emit("project:leave", projectId);

      socket.off("activity:new", onActivity);
      socket.off("activity:missed", onMissed);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, projectId]);

  async function onStatusChange(
    taskId: string,
    newStatus: Task["status"]
  ) {
    try {
      await changeTaskStatusRequest(
        taskId,
        newStatus
      );

      await loadTasks();
    } catch (err) {
      console.error(err);
    }
  }

  function canEditStatus(task: Task) {
    if (!user) return false;

    if (
      user.role === "ADMIN" ||
      user.role === "PM"
    ) {
      return true;
    }

    return task.assigneeId === user.id;
  }

  function resetTaskForm() {
    setTitle("");
    setDescription("");
    setAssigneeId("");
    setPriority("MEDIUM");
    setStatus("TODO");
    setDueDate("");
    setError("");
  }

  function openCreateTask() {
    resetTaskForm();
    setSuccess("");
    setShowCreateTask(true);
  }

  function closeCreateTask() {
    if (creating) return;

    setShowCreateTask(false);
    resetTaskForm();
  }

  async function handleCreateTask(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!projectId) return;

    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setSuccess("");

      await apiJson<Task>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          title: title.trim(),
          description:
            description.trim() || undefined,
          assigneeId:
            assigneeId || undefined,
          status,
          priority,
          dueDate:
            dueDate
              ? new Date(
                  `${dueDate}T23:59:59`
                ).toISOString()
              : undefined,
        }),
      });

      setShowCreateTask(false);
      resetTaskForm();

      await loadTasks();

      setSuccess("Task created successfully.");

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create task."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="project-page">

      {/* Header */}
      <div className="project-page-header">
        <div>
          <p className="eyebrow">
            PROJECT
          </p>

          <h2>
            {project?.name || "Project"}
          </h2>

          {project?.description && (
            <p className="subtitle">
              {project.description}
            </p>
          )}
        </div>

        {(user?.role === "ADMIN" ||
          user?.role === "PM") && (
          <button
            className="primary-button"
            onClick={openCreateTask}
          >
            + New Task
          </button>
        )}
      </div>

      {/* Success message */}
      {success && (
        <div className="success-message">
          ✓ {success}
        </div>
      )}

      {/* Filters */}
      <Filters />

      {/* Clear filters */}
      {params.toString() && (
        <button
          className="clear-filters-button"
          onClick={() => {
            window.history.pushState(
              {},
              "",
              `/projects/${projectId}`
            );

            window.location.reload();
          }}
        >
          Clear Filters
        </button>
      )}

      {/* Main content */}
      <div className="project-columns">

        <div className="project-tasks-section">

          <div className="section-heading">
            <div>
              <h3>Tasks</h3>
              <p>
                {tasks.length} task
                {tasks.length !== 1 ? "s" : ""}
              </p>
            </div>

            {(user?.role === "ADMIN" ||
              user?.role === "PM") && (
              <button
                className="secondary-button"
                onClick={openCreateTask}
              >
                + Add Task
              </button>
            )}
          </div>

          <TaskList
            tasks={tasks}
            onStatusChange={onStatusChange}
            canEditStatus={canEditStatus}
          />

        </div>

        <div className="activity-section">

          <h3>Live activity</h3>

          <ActivityFeed entries={activity} />

        </div>

      </div>

      {/* Create Task Modal */}
      {showCreateTask && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeCreateTask();
            }
          }}
        >
          <div className="task-modal">

            <div className="modal-header">
              <div>
                <p className="eyebrow">
                  TASK MANAGEMENT
                </p>

                <h2>Create New Task</h2>

                <p>
                  Add a task to this project and
                  assign it to a developer.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeCreateTask}
                type="button"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleCreateTask}
              className="task-form"
            >

              <div className="form-group">
                <label>
                  Task Title *
                </label>

                <input
                  type="text"
                  placeholder="e.g. Build checkout page"
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>
                  Description
                </label>

                <textarea
                  rows={4}
                  placeholder="Describe what needs to be done..."
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="form-two-columns">

                <div className="form-group">
                  <label>
                    Assign Developer
                  </label>

                  <select
                    value={assigneeId}
                    onChange={(e) =>
                      setAssigneeId(
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Unassigned
                    </option>

                    {developers.map(
                      (developer) => (
                        <option
                          key={developer.id}
                          value={developer.id}
                        >
                          {developer.name} (
                          {developer.email})
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Priority
                  </label>

                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(
                        e.target.value as TaskPriority
                      )
                    }
                  >
                    <option value="LOW">
                      Low
                    </option>

                    <option value="MEDIUM">
                      Medium
                    </option>

                    <option value="HIGH">
                      High
                    </option>

                    <option value="CRITICAL">
                      Critical
                    </option>
                  </select>
                </div>

              </div>

              <div className="form-two-columns">

                <div className="form-group">
                  <label>
                    Status
                  </label>

                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(
                        e.target.value as TaskStatus
                      )
                    }
                  >
                    <option value="TODO">
                      To Do
                    </option>

                    <option value="IN_PROGRESS">
                      In Progress
                    </option>

                    <option value="IN_REVIEW">
                      In Review
                    </option>

                    <option value="DONE">
                      Done
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Due Date
                  </label>

                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) =>
                      setDueDate(
                        e.target.value
                      )
                    }
                  />
                </div>

              </div>

              {error && (
                <div className="form-error">
                  {error}
                </div>
              )}

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeCreateTask}
                  disabled={creating}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={creating}
                >
                  {creating
                    ? "Creating..."
                    : "Create Task"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}