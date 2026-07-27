import { createContext, useContext, useState, type ReactNode } from "react";
import { api, type User } from "../api";

interface AuthState {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "ces_auth";

function loadStored(): { token: string | null; user: User | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, user: null };
    return JSON.parse(raw);
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = loadStored();
  const [token, setToken] = useState<string | null>(stored.token);
  const [user, setUser] = useState<User | null>(stored.user);

  function persist(token: string, user: User) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    setToken(token);
    setUser(user);
  }

  async function login(email: string, password: string) {
    const res = await api.login(email, password);
    persist(res.token, res.user);
  }

  async function register(name: string, email: string, password: string) {
    const res = await api.register(name, email, password);
    persist(res.token, res.user);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
