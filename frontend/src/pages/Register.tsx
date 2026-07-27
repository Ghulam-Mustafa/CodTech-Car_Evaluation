import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-amber)]">
            Car Evaluation System
          </p>
          <h1 className="font-display text-2xl font-semibold mt-2">Create account</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[var(--color-panel)] border border-[var(--color-hairline)] rounded-2xl p-6 space-y-4"
        >
          {error && (
            <p className="text-sm text-[var(--color-poor)] bg-[var(--color-poor)]/10 border border-[var(--color-poor)]/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div>
            <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] mb-1.5 font-mono">
              Name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--color-panel-raised)] border border-[var(--color-hairline)] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--color-amber)] transition-colors"
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] mb-1.5 font-mono">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--color-panel-raised)] border border-[var(--color-hairline)] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--color-amber)] transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] mb-1.5 font-mono">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--color-panel-raised)] border border-[var(--color-hairline)] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--color-amber)] transition-colors"
              placeholder="At least 8 characters"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-amber)] text-[var(--color-ink)] font-display font-semibold rounded-lg py-2.5 mt-2 hover:brightness-110 transition disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--color-muted)] mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-[var(--color-amber)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
