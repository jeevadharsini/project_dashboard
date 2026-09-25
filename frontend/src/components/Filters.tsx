import { useSearchParams } from "react-router-dom";

const STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "OVERDUE"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

// Filters live entirely in the URL (?status=&priority=&from=&to=) so a
// filtered view is shareable/bookmarkable and survives a refresh.
export function Filters() {
  const [params, setParams] = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  return (
    <div className="filters">
      <select value={params.get("status") || ""} onChange={(e) => update("status", e.target.value)}>
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <select value={params.get("priority") || ""} onChange={(e) => update("priority", e.target.value)}>
        <option value="">All priorities</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
      <label>
        From
        <input type="date" value={params.get("from") || ""} onChange={(e) => update("from", e.target.value)} />
      </label>
      <label>
        To
        <input type="date" value={params.get("to") || ""} onChange={(e) => update("to", e.target.value)} />
      </label>
    </div>
  );
}
