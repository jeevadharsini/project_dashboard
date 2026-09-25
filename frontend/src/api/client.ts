// Thin fetch wrapper. Access token is kept in memory only (never
// localStorage, to limit XSS token theft); the refresh token lives in an
// HttpOnly cookie the browser sends automatically to /api/auth/*.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

let accessToken: string | null = null;
let refreshingPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

async function tryRefresh(): Promise<string | null> {
  if (!refreshingPromise) {
    refreshingPromise = fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) return null;
        const data = await r.json();
        setAccessToken(data.accessToken);
        return data.accessToken as string;
      })
      .finally(() => {
        refreshingPromise = null;
      });
  }
  return refreshingPromise;
}

export async function apiFetch(path: string, options: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(options.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: "include" });

  if (res.status === 401 && retry) {
    const newToken = await tryRefresh();
    if (newToken) return apiFetch(path, options, false);
  }
  return res;
}

export async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export { API_URL };
