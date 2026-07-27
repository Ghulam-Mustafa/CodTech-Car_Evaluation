import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, ApiError, type Evaluation } from "../api";
import { InspectionTag } from "../components/InspectionTag";
import { BRANDS, CAR_CATALOG } from "../data/carCatalog";

const CURRENT_YEAR = new Date().getFullYear();

const emptyForm = {
  make: "",
  model: "",
  manufacture_year: CURRENT_YEAR - 5,
  num_services: 0,
  major_accidents: 0,
  minor_accidents: 0,
};

export default function Dashboard() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<Evaluation | null>(null);
  const [history, setHistory] = useState<Evaluation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .listEvaluations(token)
      .then((rows) => {
        setHistory(rows);
        if (rows.length > 0) setLatest(rows[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [token]);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleBrandChange(brand: string) {
    setForm((f) => ({ ...f, make: brand, model: "" }));
  }

  const variants = form.make ? CAR_CATALOG[form.make] || [] : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.createEvaluation(token, form);
      setLatest(result);
      setHistory((h) => [result, ...h]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not evaluate vehicle");
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--color-hairline)] px-6 py-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-amber)]">
            Car Evaluation System
          </p>
          <h1 className="font-display text-lg font-semibold">Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--color-muted)] hidden sm:inline">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm border border-[var(--color-hairline)] rounded-lg px-3 py-1.5 hover:border-[var(--color-amber)] hover:text-[var(--color-amber)] transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 grid md:grid-cols-2 gap-10">
        <section>
          <h2 className="font-display text-sm uppercase tracking-[0.2em] text-[var(--color-muted)] mb-4">
            Vehicle details
          </h2>
          <form
            onSubmit={handleSubmit}
            className="bg-[var(--color-panel)] border border-[var(--color-hairline)] rounded-2xl p-6 space-y-4"
          >
            {error && (
              <p className="text-sm text-[var(--color-poor)] bg-[var(--color-poor)]/10 border border-[var(--color-poor)]/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] mb-1.5 font-mono">
                  Brand
                </label>
                <select
                  required
                  value={form.make}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="w-full bg-[var(--color-panel-raised)] border border-[var(--color-hairline)] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--color-amber)] transition-colors appearance-none"
                >
                  <option value="" disabled>
                    Select brand
                  </option>
                  {BRANDS.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] mb-1.5 font-mono">
                  Variant
                </label>
                <select
                  required
                  value={form.model}
                  disabled={!form.make}
                  onChange={(e) => updateField("model", e.target.value)}
                  className="w-full bg-[var(--color-panel-raised)] border border-[var(--color-hairline)] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--color-amber)] transition-colors appearance-none disabled:opacity-50"
                >
                  <option value="" disabled>
                    {form.make ? "Select variant" : "Pick a brand first"}
                  </option>
                  {variants.map((variant) => (
                    <option key={variant} value={variant}>
                      {variant}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] mb-1.5 font-mono">
                Manufacture year
              </label>
              <input
                type="number"
                required
                min={1970}
                max={CURRENT_YEAR}
                value={form.manufacture_year}
                onChange={(e) => updateField("manufacture_year", Number(e.target.value))}
                className="w-full bg-[var(--color-panel-raised)] border border-[var(--color-hairline)] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--color-amber)] transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] mb-1.5 font-mono">
                Number of services
              </label>
              <input
                type="number"
                required
                min={0}
                value={form.num_services}
                onChange={(e) => updateField("num_services", Number(e.target.value))}
                className="w-full bg-[var(--color-panel-raised)] border border-[var(--color-hairline)] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--color-amber)] transition-colors font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] mb-1.5 font-mono">
                  Major accidents
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={form.major_accidents}
                  onChange={(e) => updateField("major_accidents", Number(e.target.value))}
                  className="w-full bg-[var(--color-panel-raised)] border border-[var(--color-hairline)] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--color-amber)] transition-colors font-mono"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] mb-1.5 font-mono">
                  Minor accidents
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={form.minor_accidents}
                  onChange={(e) => updateField("minor_accidents", Number(e.target.value))}
                  className="w-full bg-[var(--color-panel-raised)] border border-[var(--color-hairline)] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--color-amber)] transition-colors font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[var(--color-amber)] text-[var(--color-ink)] font-display font-semibold rounded-lg py-2.5 mt-2 hover:brightness-110 transition disabled:opacity-60"
            >
              {submitting ? "Evaluating…" : "Evaluate vehicle"}
            </button>
          </form>
        </section>

        <section>
          <h2 className="font-display text-sm uppercase tracking-[0.2em] text-[var(--color-muted)] mb-4">
            Latest result
          </h2>
          {latest ? (
            <InspectionTag evaluation={latest} />
          ) : (
            <div className="border border-dashed border-[var(--color-hairline)] rounded-2xl p-8 text-center text-[var(--color-muted)] text-sm">
              Submit vehicle details to see an evaluation here.
            </div>
          )}

          {history.length > 1 && (
            <div className="mt-8">
              <h3 className="font-display text-sm uppercase tracking-[0.2em] text-[var(--color-muted)] mb-3">
                History
              </h3>
              <ul className="space-y-2">
                {history.slice(1).map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between bg-[var(--color-panel)] border border-[var(--color-hairline)] rounded-xl px-4 py-3 text-sm"
                  >
                    <span>
                      {h.make || "Vehicle"} {h.model || ""}{" "}
                      <span className="text-[var(--color-muted)] font-mono">({h.manufactureYear})</span>
                    </span>
                    <span className="font-mono text-[var(--color-amber)]">{h.score.toFixed(0)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {loadingHistory && <p className="text-sm text-[var(--color-muted)] mt-3">Loading history…</p>}
        </section>
      </main>
    </div>
  );
}
