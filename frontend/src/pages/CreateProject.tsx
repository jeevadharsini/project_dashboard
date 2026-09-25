import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiJson } from "../api/client";

export function CreateProject() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const project = await apiJson<{ id: string }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          clientId: clientId.trim() || undefined,
        }),
      });

      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create project."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="create-project-page">

      <div className="create-project-header">
        <div>
          <p className="eyebrow">PROJECTS</p>

          <h1>Create New Project</h1>

          <p className="subtitle">
            Create a new client project and start managing its tasks.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate("/")}
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="create-project-card">

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label htmlFor="project-name">
              Project Name
            </label>

            <input
              id="project-name"
              type="text"
              placeholder="e.g. E-commerce Website"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="project-description">
              Description
            </label>

            <textarea
              id="project-description"
              placeholder="Describe the project..."
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="client-id">
              Client ID
            </label>

            <input
              id="client-id"
              type="text"
              placeholder="Optional client UUID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />

            <small>
              Leave this empty if the project does not need a client yet.
            </small>
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <div className="form-actions">

            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate("/")}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Project"}
            </button>

          </div>

        </form>

      </div>
    </div>
  );
}