const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export interface Factor {
  label: string;
  impact: "positive" | "negative" | "neutral";
  detail: string;
}

export interface Evaluation {
  id: number;
  make: string | null;
  model: string | null;
  manufactureYear: number;
  numServices: number;
  majorAccidents: number;
  minorAccidents: number;
  score: number;
  condition: string;
  priceRangeLow: number;
  priceRangeHigh: number;
  factors: Factor[];
  createdAt: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error || "Something went wrong", res.status);
  }
  return data as T;
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  createEvaluation: (
    token: string,
    payload: {
      make: string;
      model: string;
      manufacture_year: number;
      num_services: number;
      major_accidents: number;
      minor_accidents: number;
    }
  ) =>
    request<Evaluation>("/evaluations", { method: "POST", body: JSON.stringify(payload) }, token),

  listEvaluations: (token: string) => request<Evaluation[]>("/evaluations", {}, token),
};

export { ApiError };
