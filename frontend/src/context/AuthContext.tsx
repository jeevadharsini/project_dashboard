import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiJson, setAccessToken } from "../api/client";
import { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On first load, try to silently refresh using the HttpOnly cookie so a
  // page reload doesn't force a re-login.
  useEffect(() => {
    (async () => {
      try {
        const data = await apiJson<{ accessToken: string }>("/api/auth/refresh", { method: "POST" });
        setAccessToken(data.accessToken);
        const me = await apiJson<User>("/api/auth/me");
        setUser(me);
      } catch {
        // no valid session
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const data = await apiJson<{ accessToken: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function logout() {
    await apiJson("/api/auth/logout", { method: "POST" });
    setAccessToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
