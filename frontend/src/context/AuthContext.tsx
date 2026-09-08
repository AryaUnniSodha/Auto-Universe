import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { api, AuthUser, Role } from "@/lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem("universe_user");
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const authUser: AuthUser = {
      user_id: res.data.user_id,
      role: res.data.role as Role,
      full_name: res.data.full_name,
    };
    localStorage.setItem("universe_token", res.data.access_token);
    localStorage.setItem("universe_user", JSON.stringify(authUser));
    setUser(authUser);
    return authUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("universe_token");
    localStorage.removeItem("universe_user");
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
