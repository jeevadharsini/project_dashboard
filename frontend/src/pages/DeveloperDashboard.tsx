import { useEffect, useState } from "react";
import { apiJson } from "../api/client";
import { Task } from "../types";
import { TaskList } from "../components/TaskList";
import { changeTaskStatusRequest } from "../pages/ProjectPage";

export function DeveloperDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);

  async function load() {
    const data = await apiJson<{ tasks: Task[] }>("/api/dashboard/developer");
    setTasks(data.tasks);
  }

  useEffect(() => {
    load();
  }, []);

  async function onStatusChange(taskId: string, status: Task["status"]) {
    await changeTaskStatusRequest(taskId, status);
    load();
  }

  return (
    <div>
      <h2>Your tasks (priority, then due date)</h2>
      <TaskList tasks={tasks} onStatusChange={onStatusChange} />
    </div>
  );
}
