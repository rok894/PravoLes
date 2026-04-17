import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { fetchJson } from "./api";

export type User = { id: string; email: string; role?: string };

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const inflightRef = useRef(false);

  async function refresh() {
    if (inflightRef.current) return;
    inflightRef.current = true;
    try {
      const data = await fetchJson<{ user: User | null }>("/api/auth/me", { method: "GET" });
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      inflightRef.current = false;
    }
  }

  async function logout() {
    await fetchJson("/api/auth/logout", { method: "POST", body: "{}" });
    setUser(null);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
