import { Task } from "../types";

const STATUS_OPTIONS: Task["status"][] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "OVERDUE"];

export function TaskList({
  tasks,
  onStatusChange,
  canEditStatus,
}: {
  tasks: Task[];
  onStatusChange?: (taskId: string, status: Task["status"]) => void;
  canEditStatus?: (task: Task) => boolean;
}) {
  if (tasks.length === 0) return <p className="empty">No tasks match these filters.</p>;

  return (
    <table className="task-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Project</th>
          <th>Assignee</th>
          <th>Priority</th>
          <th>Due date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => {
          const editable = onStatusChange && (!canEditStatus || canEditStatus(task));
          return (
            <tr key={task.id} className={task.status === "OVERDUE" ? "overdue-row" : ""}>
              <td>{task.title}</td>
              <td>{task.project?.name ?? "-"}</td>
              <td>{task.assignee?.name ?? "Unassigned"}</td>
              <td><span className={`badge priority-${task.priority.toLowerCase()}`}>{task.priority}</span></td>
              <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"}</td>
              <td>
                {editable ? (
                  <select
                    value={task.status}
                    onChange={(e) => onStatusChange!(task.id, e.target.value as Task["status"])}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`badge status-${task.status.toLowerCase()}`}>{task.status}</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
