import { useState, useEffect, useRef } from "react";

const api = async (path, token, body, method) => {
  const r = await fetch("/api" + path, { method: method || (body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body) });
  const d = await r.json(); if (!r.ok) throw new Error(d.error || "Something went wrong."); return d;
};
const inr = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function Auth({ onToken }) {
  const [mode, setMode] = useState("login"), [f, setF] = useState({ email: "", password: "" }), [err, setErr] = useState("");
  const go = async e => { e.preventDefault(); setErr("");
    try { onToken((await api(`/auth/${mode}`, null, f)).token); } catch (x) { setErr(x.message); } };
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <form onSubmit={go} className="w-full max-w-sm space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">What is your car worth?</h1>
        <p className="text-ink/70">Enter its details. Get a fair market price in rupees.</p>
        <input className="w-full border border-line bg-white p-3" placeholder="Email" type="email" required
          value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        <input className="w-full border border-line bg-white p-3" placeholder="Password (6+ characters)" type="password" required
          value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
        {err && <p role="alert" className="text-stop">{err}</p>}
        <button className="w-full bg-ink text-paper p-3 font-semibold">{mode === "login" ? "Sign in" : "Create account"}</button>
        <button type="button" className="underline text-sm" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "New here? Create an account" : "Have an account? Sign in"}</button>
      </form>
    </main>
  );
}

const fields = [
  ["year", "Year made", 2017], ["km_driven", "Kilometres driven", 60000], ["mileage", "Ideal mileage (kmpl)", 18],
  ["engine", "Engine (CC)", 1197], ["max_power", "Power (bhp)", 82], ["seats", "Seats", 5], ["asking_price", "Asking price (optional)", ""],
];
const selects = [["brand", "Brand"], ["fuel", "Fuel"], ["transmission", "Transmission"], ["seller_type", "Seller type"], ["owner", "Owner"]];
const profileSelects = [
  ["condition", "Exterior & mechanical condition", ["Excellent", "Good", "Fair", "Needs work"]],
  ["service_history", "Service history", ["Full", "Partial", "None"]],
  ["accident_history", "Accident history", ["No accidents", "Minor repairs", "Major accident"]],
  ["tyre_condition", "Tyre condition", ["New", "Good", "Replace soon"]],
];
const fallbackImage = "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=85&sat=-10";
const specFields = new Set(["mileage", "engine", "max_power", "seats"]);

function FormattedReply({ text }) {
  const lines = text.split(/\r?\n/);
  return <div className="space-y-2">
    {lines.map((line, index) => {
      const clean = line.trim();
      if (!clean) return <div key={index} className="h-1" />;
      const bullet = clean.match(/^[-*]\s+(.+)/), numbered = clean.match(/^\d+[.)]\s+(.+)/);
      const content = bullet?.[1] || numbered?.[1] || clean;
      const formatted = content.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={partIndex}>{part.slice(2, -2)}</strong>
          : part
      );
      if (bullet || numbered) return <div key={index} className="flex gap-2"><span className="text-go font-bold">{numbered ? clean.match(/^\d+/)[0] : "•"}</span><span>{formatted}</span></div>;
      return <p key={index}>{formatted}</p>;
    })}
  </div>;
}

function useCount(target) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(target);
      return;
    }
    let raf, t0; const step = t => { t0 ??= t; const p = Math.min((t - t0) / 800, 1); setV(target * (1 - (1 - p) ** 3)); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

function RangeBar({ r }) {
  const lo = Math.min(r.low, r.asking_price ?? r.low) * 0.9, hi = Math.max(r.high, r.asking_price ?? r.high) * 1.1;
  const pos = n => `${((n - lo) / (hi - lo)) * 100}%`;
  return (
    <div className="relative h-10 mt-2" role="img" aria-label="Fair price range with asking price marker">
      <div className="absolute top-4 h-2 w-full bg-line" />
      <div className="absolute top-4 h-2 bg-go" style={{ left: pos(r.low), width: `calc(${pos(r.high)} - ${pos(r.low)})` }} />
      {r.asking_price != null && <div className="absolute top-1 w-0.5 h-8 bg-stop" style={{ left: pos(r.asking_price) }}>
        <span className="absolute -top-0.5 left-1 text-xs text-stop whitespace-nowrap">asking</span></div>}
    </div>
  );
}

function Forecast({ r }) {
  const pts = [{ years: 0, price: Number(r.estimated_price) }, ...(r.forecast || [])]
    .map(point => ({ years: Number(point.years), price: Number(point.price) }))
    .filter(point => Number.isFinite(point.years) && Number.isFinite(point.price));
  if (pts.length < 2) return null;
  const prices = pts.map(point => point.price);
  const max = Math.max(...prices), min = Math.min(...prices), span = max - min || Math.max(Math.abs(max) * 0.05, 1), W = 320, H = 110;
  const xy = p => [20 + (p.years / Math.max(pts.at(-1).years, 1)) * (W - 40), 15 + (1 - (p.price - min) / span) * (H - 45)];
  return (
    <div>
      <h3 className="font-semibold mb-1">Value over the next 5 years</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Projected price by year">
        <polyline fill="none" stroke="var(--color-go)" strokeWidth="2.5" points={pts.map(p => xy(p).join(",")).join(" ")} />
        {pts.map(p => { const [x, y] = xy(p); return <g key={p.years}><circle cx={x} cy={y} r="3.5" fill="var(--color-go)" />
          <text x={x} y={H - 18} textAnchor="middle" fontSize="10" fill="currentColor">{p.years ? `+${p.years}y` : "now"}</text>
          <text x={x} y={y - 7} textAnchor="middle" fontSize="9" fill="currentColor">{(p.price / 1e5).toFixed(1)}L</text></g>; })}
      </svg>
      <p className="text-sm text-ink/60">Assumes your current yearly driving pace. L means lakh rupees.</p>
    </div>
  );
}

function Result({ r }) {
  const shown = useCount(r.estimated_price), loss = r.forecast?.[2] ? Math.round((1 - r.forecast[2].price / r.estimated_price) * 100) : null;
  return (
    <section className="border border-line bg-white p-6 space-y-5 shadow-sm" aria-live="polite">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[.2em] text-go font-bold">Your market estimate</p><h2 className="text-2xl font-bold">{r.car}</h2></div>
        {r.adjustment != null && <span className={`rounded-full px-3 py-1 text-xs font-bold ${r.adjustment >= 0 ? "bg-emerald-100 text-go" : "bg-red-100 text-stop"}`}>{r.adjustment >= 0 ? "+" : ""}{r.adjustment}% profile adjustment</span>}</div>
      <div><p className="text-5xl font-bold text-go tabular-nums">{inr(shown)}</p>
        <p className="text-ink/70 mt-1">Likely range {inr(r.low)} to {inr(r.high)}</p><RangeBar r={r} /></div>
      {r.verdict && <p className="border-l-4 border-go pl-3"><strong>Asking {inr(r.asking_price)}.</strong> {r.verdict}</p>}
      {loss != null && <p>This car should lose about <strong>{loss}%</strong> of its value in 3 years.</p>}
      <Forecast r={r} />
      {r.drivers?.length > 0 && (<div>
        <h3 className="font-semibold mb-1">What would change the value</h3>
        <ul className="divide-y divide-line">{r.drivers.map(d => (
          <li key={d.factor} className="flex justify-between py-1.5"><span>{d.factor}</span>
            <span className={d.change >= 0 ? "text-go" : "text-stop"}>{d.change >= 0 ? "+" : "-"}{inr(Math.abs(d.change))}</span></li>))}</ul>
      </div>)}
    </section>
  );
}

const chips = ["How can I get a better price?", "Should I sell now or wait?", "What should I check before selling?"];
function Chat({ token, r }) {
  const [msgs, setMsgs] = useState([]), [txt, setTxt] = useState(""), [busy, setBusy] = useState(false), end = useRef();
  useEffect(() => { setMsgs([]); }, [r.id]);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [msgs, busy]);
  const send = async t => {
    if (!t.trim() || busy) return; const next = [...msgs, { role: "user", content: t }]; setMsgs(next); setTxt(""); setBusy(true);
    try {
      const response = await api("/chat", token, { messages: next, evaluation: r });
      setMsgs([...next, { role: "assistant", content: response.reply, source: response.source, reason: response.reason }]);
    }
    catch (x) { setMsgs([...next, { role: "assistant", content: x.message }]); } setBusy(false);
  };
  return (
    <section className="border border-line bg-white p-5 space-y-3">
      <h3 className="font-semibold">Ask the car advisor</h3>
      {msgs.length === 0 && <div className="flex flex-wrap gap-2">{chips.map(c => (
        <button key={c} onClick={() => send(c)} className="border border-line px-3 py-1.5 text-sm hover:bg-paper">{c}</button>))}</div>}
      <div className="max-h-72 overflow-y-auto space-y-2" aria-live="polite">
        {msgs.map((m, i) => (<div key={i} className={m.role === "user" ? "ml-10" : "mr-10"}><div className={`p-4 text-sm leading-6 ${m.role === "user" ? "bg-ink text-paper" : "bg-paper border border-line"}`}>{m.role === "assistant" ? <FormattedReply text={m.content} /> : m.content}</div>{m.role === "assistant" && <p className="mt-1 text-xs text-ink/45">{m.source === "gemini" ? "Gemini advisor" : m.reason || "Offline advisor"}</p>}</div>))}
        {busy && <p className="bg-paper mr-10 p-3 text-sm text-ink/60">Thinking...</p>}<div ref={end} />
      </div>
      <form onSubmit={e => { e.preventDefault(); send(txt); }} className="flex gap-2">
        <input className="flex-1 border border-line p-2" placeholder="Ask how to improve your car's value" value={txt} onChange={e => setTxt(e.target.value)} />
        <button className="bg-go text-paper px-4 font-semibold">Send</button>
      </form>
    </section>
  );
}

function PhotoInspection({ token, form, onReport }) {
  const [photos, setPhotos] = useState([]), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const addPhotos = event => {
    const selected = [...event.target.files].slice(0, 6 - photos.length);
    selected.forEach(file => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return;
      const reader = new FileReader();
      reader.onload = () => setPhotos(current => [...current, { name: file.name, data: reader.result }].slice(0, 6));
      reader.readAsDataURL(file);
    });
    event.target.value = "";
  };
  const inspect = async () => {
    if (photos.length < 2) { setError("Add at least two exterior angles."); return; }
    setError(""); setBusy(true);
    try { onReport(await api("/inspect-exterior", token, { images: photos.map(photo => photo.data), car: { brand: form.brand, model: form.name } })); }
    catch (x) { setError(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[.18em] text-ink/50 font-bold">AI exterior inspection</p><h3 className="text-lg font-bold">Let photos refine the price</h3></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-go">2–6 photos</span></div>
      <p className="mt-2 text-sm text-ink/60">Use clear front, rear, side and close-up photos. Only visible exterior details are assessed.</p>
      <label className="mt-4 block cursor-pointer rounded-xl border-2 border-dashed border-line p-4 text-center text-sm font-semibold hover:border-go">
        Add exterior photos
        <input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos} />
      </label>
      {photos.length > 0 && <div className="mt-4 grid grid-cols-3 gap-2">{photos.map((photo, index) => <div key={`${photo.name}-${index}`} className="relative"><img src={photo.data} alt={`Exterior photo ${index + 1}`} className="h-20 w-full rounded-lg object-cover" /><button type="button" aria-label={`Remove photo ${index + 1}`} className="absolute right-1 top-1 rounded-full bg-night px-2 py-1 text-xs text-white" onClick={() => setPhotos(current => current.filter((_, i) => i !== index))}>×</button></div>)}</div>}
      {error && <p role="alert" className="mt-3 text-sm text-stop">{error}</p>}
      <button type="button" disabled={busy || photos.length < 2} onClick={inspect} className="mt-4 w-full bg-night p-3 text-sm font-bold text-white disabled:opacity-40">{busy ? "Inspecting photos..." : "Inspect exterior condition"}</button>
    </div>
  );
}

function News({ token, options, initialBrand, initialModel, initialFuel }) {
  const [brand, setBrand] = useState(initialBrand || ""), [model, setModel] = useState(initialModel || ""), [fuel, setFuel] = useState(initialFuel || "");
  const [articles, setArticles] = useState([]), [loading, setLoading] = useState(false), [error, setError] = useState("");
  const models = options.models_by_brand?.[brand] || [];
  useEffect(() => { setBrand(initialBrand || ""); setModel(initialModel || ""); setFuel(initialFuel || ""); }, [initialBrand, initialModel, initialFuel]);
  const load = async () => {
    if (!brand || !model || !fuel) { setError("Select a brand, model, and fuel type first."); return; }
    setLoading(true); setError("");
    try {
      const data = await api(`/news?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}&fuel=${encodeURIComponent(fuel)}`, token);
      setArticles(data.articles || []);
    } catch (x) { setError(x.message); } finally { setLoading(false); }
  };
  useEffect(() => { if (brand && model && fuel) load(); }, [brand, model, fuel]);
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs uppercase tracking-[.18em] text-ink/50 font-bold">Current news</p>
          <h2 className="mt-1 text-xl font-bold">What is happening around this vehicle</h2>
          <p className="mt-1 text-sm text-ink/60">Live headlines matched to this brand and model, including fuel costs, resale demand, and company updates. Headlines are not used in the valuation.</p></div>
        <button type="button" onClick={load} disabled={loading} className="border border-line px-3 py-2 text-sm disabled:opacity-50">{loading ? "Loading..." : "Refresh"}</button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <label className="text-sm font-semibold">Brand
          <select className="select-field mt-1 w-full border border-line bg-white p-2" value={brand} onChange={e => { const value = e.target.value; setBrand(value); setModel(options.models_by_brand?.[value]?.[0] || ""); setArticles([]); }}>
            <option value="">Select brand</option>{(options.brand || []).map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Model
          <select className="select-field mt-1 w-full border border-line bg-white p-2" value={model} onChange={e => { setModel(e.target.value); setArticles([]); }} disabled={!brand}>
            <option value="">Select model</option>{models.map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Fuel type
          <select className="select-field mt-1 w-full border border-line bg-white p-2" value={fuel} onChange={e => { setFuel(e.target.value); setArticles([]); }}>
            <option value="">Select fuel</option>{(options.fuel || []).map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
      </div>
      {brand && model && fuel && <p className="mt-3 rounded-lg bg-paper p-3 text-sm">Showing news for <strong>{brand} {model}</strong> with <strong>{fuel}</strong> fuel.</p>}
      {error && <p role="alert" className="mt-4 text-sm text-stop">{error}</p>}
      {!error && !loading && !articles.length && <p className="mt-4 text-sm text-ink/60">No recent headlines were found.</p>}
      <div className="mt-4 space-y-3">{articles.map((article, index) => (
        <article key={`${article.link}-${index}`} className="border-t border-line pt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-go">{article.topic}</p>
          <a href={article.link} target="_blank" rel="noreferrer" className="mt-1 block font-semibold hover:underline">{article.title}</a>
          {article.published && <p className="mt-1 text-xs text-ink/50">{new Date(article.published).toLocaleString()}</p>}
        </article>
      ))}</div>
    </section>
  );
}

function History({ history, average, onSelect, onDelete }) {
  return (
    <section className="md:col-span-2 rounded-3xl border border-line bg-white p-6 shadow-[0_16px_45px_rgb(80_48_25/8%)]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div><p className="text-xs uppercase tracking-[.18em] text-go font-bold">Your garage journal</p>
          <h2 className="mt-1 text-2xl font-bold">Past evaluations</h2>
          <p className="mt-1 text-sm text-ink/60">Reopen an earlier estimate or compare the cars you have checked.</p></div>
        {history.length > 0 && <div className="rounded-2xl bg-paper px-4 py-3 text-right"><p className="text-xs text-ink/55">Average estimated value</p><p className="text-xl font-bold text-go">{inr(average)}</p></div>}
      </div>
      {!history.length ? <div className="grid place-items-center py-16 text-center"><p className="text-lg font-semibold">No evaluations yet</p><p className="mt-1 text-sm text-ink/55">Your saved valuations will appear here.</p></div> :
        <div className="mt-5 grid gap-3 md:grid-cols-2">{history.map(item => (
          <div key={item.id} className="flex items-center justify-between rounded-2xl border border-line bg-paper/60 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <button className="min-w-0 flex-1 text-left" onClick={() => onSelect(item)}><p className="truncate font-semibold">{item.car}</p><p className="mt-1 text-sm text-ink/55">{item.input.year} · {item.input.km_driven.toLocaleString("en-IN")} km</p></button>
            <div className="ml-4 text-right"><p className="font-bold text-go">{inr(item.estimated_price)}</p><button aria-label={`Delete ${item.car}`} className="mt-1 text-xs text-ink/45 hover:text-stop" onClick={() => onDelete(item.id)}>Delete</button></div>
          </div>
        ))}</div>}
    </section>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [opts, setOpts] = useState({});
  const [vehicleImage, setVehicleImage] = useState(fallbackImage);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageSource, setImageSource] = useState("fallback");
  const [inspection, setInspection] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [form, setForm] = useState({ name: "", ...Object.fromEntries(fields.map(([k, , v]) => [k, v])), ...Object.fromEntries(profileSelects.map(([k, , values]) => [k, values[1]])) });
  const [result, setResult] = useState(null), [history, setHistory] = useState([]), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const save = t => { t ? localStorage.setItem("token", t) : localStorage.removeItem("token"); setToken(t); };
  const load = () => api("/evaluations", token).then(setHistory).catch(() => save(null));
  const modelValues = (brand, name) => opts.model_specs?.[name] || {};
  const selectModel = (brand, name, current = form) => ({ ...current, brand, name, ...modelValues(brand, name) });
  useEffect(() => { if (token) load(); }, [token]);
  useEffect(() => { if (!token) return;
    api("/options").then(o => { setOpts(o); setForm(f => {
      const brand = f.brand ?? o.brand?.[0];
      const models = o.models_by_brand?.[brand] || [];
      const name = f.name || models[0] || "";
      return { ...f, ...Object.fromEntries(selects.map(([k]) => [k, f[k] ?? o[k]?.[0]])),
        brand, name, ...(o.model_specs?.[name] || {}) };
    }); })
      .catch(x => setErr(x.message)); }, [token]);
  useEffect(() => {
    if (!form.brand || !form.name) { setVehicleImage(fallbackImage); setImageSource("fallback"); setImageLoading(false); return; }
    let active = true;
    setVehicleImage(fallbackImage);
    setImageSource("fallback");
    setImageLoading(true);
    api(`/car-image?brand=${encodeURIComponent(form.brand)}&model=${encodeURIComponent(form.name)}`)
      .then(d => { if (active && d.image) { setVehicleImage(d.image); setImageSource(d.source || "vehicle photo"); } })
      .catch(() => {});
    const timeout = setTimeout(() => { if (active) setImageLoading(false); }, 8000);
    return () => { active = false; clearTimeout(timeout); };
  }, [form.brand, form.name]);
  if (!token) return <Auth onToken={save} />;

  const del = async id => { await api("/evaluations/" + id, token, null, "DELETE"); if (result?.id === id) setResult(null); load(); };
  const avg = history.length ? history.reduce((a, h) => a + h.estimated_price, 0) / history.length : 0;
  const submit = async e => { e.preventDefault(); setErr(""); setBusy(true);
    try { const body = { ...form, photo_adjustment: inspection?.adjustment_percent || 0 }; fields.forEach(([k]) => { body[k] = body[k] === "" ? null : Number(body[k]); });
      setResult(await api("/evaluations", token, body)); load(); } catch (x) { setErr(x.message); } setBusy(false); };

  return (
    <div className="min-h-screen">
      <header className="bg-night text-white"><div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center"><div><p className="text-go font-black tracking-[.25em] text-xs">CAR CHECK / INSIGHTS</p><h1 className="text-2xl font-black">Know your car's next move.</h1></div><button className="border border-white/20 px-4 py-2 text-sm" onClick={() => save(null)}>Sign out</button></div></header>
      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <div className="md:col-span-2 flex gap-2 border-b border-line">
        {[["dashboard", "Valuation"], ["news", "News"], ["history", "Past evaluations"]].map(([key, label]) => (
          <button type="button" key={key} onClick={() => setTab(key)} className={`px-4 py-2 text-sm font-semibold ${tab === key ? "border-b-2 border-go text-ink" : "text-ink/50"}`}>{label}</button>
        ))}
      </div>
      {tab === "news" ? <div className="md:col-span-2"><News token={token} options={opts} initialBrand={form.brand} initialModel={form.name} initialFuel={form.fuel} /></div> : tab === "history" ? <History history={history} average={avg} onSelect={setResult} onDelete={del} /> : <>
      <div className="md:col-span-2 overflow-hidden rounded-2xl bg-night text-white grid md:grid-cols-[1.2fr_1fr]">
        <div className="p-8 md:p-10"><p className="text-go font-bold text-sm mb-3">THE SMARTER SELLING DASHBOARD</p><h2 className="text-4xl md:text-5xl font-black tracking-tight max-w-xl">A sharper read on what your car is worth.</h2><p className="mt-4 text-white/65 max-w-lg">Combine market data with real-world ownership details to get a more honest estimate and a plan to sell better.</p></div>
        <div className="relative min-h-56 md:min-h-0 bg-slate-800">
          <img className="h-56 md:h-full w-full object-cover" src={vehicleImage} alt={`${form.brand || "Car"} ${form.name || "model"} vehicle photo`}
            onLoad={() => setImageLoading(false)} onError={() => { setVehicleImage(fallbackImage); setImageSource("fallback"); setImageLoading(false); }} />
          {imageLoading && <div className="absolute inset-0 grid place-items-center bg-night/55 text-sm text-white/80">Loading model image...</div>}
          {!imageLoading && <div className="absolute bottom-3 left-3 rounded-full bg-night/75 px-3 py-1 text-xs text-white">{imageSource === "fallback" ? "Representative vehicle image" : "Model photo · Wikimedia Commons"}</div>}
        </div>
      </div>
      <form onSubmit={submit} className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="space-y-3">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm ring-1 ring-black/5"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs uppercase tracking-[.18em] text-go font-bold">Vehicle profile</p><h2 className="mt-1 text-xl font-bold">Tell us about the car</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-go">Step 1 of 2</span></div><div className="grid grid-cols-2 gap-3">
          {selects.map(([k, label]) => (
            <label key={k} className="text-sm">{label}
              <select required className="select-field mt-1 w-full border border-line bg-white p-2" value={form[k] ?? ""} onChange={e => {
                const value = e.target.value;
                setForm(k === "brand"
                  ? selectModel(value, opts.models_by_brand?.[value]?.[0] || "")
                  : { ...form, [k]: value });
              }}>
                {(opts[k] || []).map(o => <option key={o}>{o}</option>)}</select></label>))}
          <label className="text-sm col-span-2">Car model
            <select required className="select-field mt-1 w-full border border-line bg-white p-2" value={form.name} onChange={e => setForm(selectModel(form.brand, e.target.value))}>
              {(opts.models_by_brand?.[form.brand] || []).map(model => <option key={model}>{model}</option>)}
            </select></label>
          <div className="col-span-2 rounded-lg bg-slate-50 p-3 text-sm"><span className="font-semibold">Vehicle category:</span> {opts.model_specs?.[form.name]?.category || "Other"}</div>
          {fields.map(([k, label]) => (
            <label key={k} className="text-sm">{label}{specFields.has(k) && <span className="ml-1 text-xs text-go">auto-filled</span>}
              <input type="number" min="0" required={k !== "asking_price"} className={`mt-1 w-full border border-line p-2 ${specFields.has(k) ? "bg-emerald-50" : "bg-white"}`}
                value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></label>))}
        </div></div>
        <p className="text-xs text-ink/55">Mileage, engine, power, and seats are filled from the selected model's dataset records. Review them if your car has a different variant.</p>
        </div>
        <div className="space-y-3">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-[.18em] text-go font-bold mb-1">Ownership profile</p><h2 className="mb-4 text-xl font-bold">Condition and history</h2><div className="grid grid-cols-2 gap-3">{profileSelects.map(([k, label, values]) => <label key={k} className="text-sm">{label}<select className="select-field mt-1 w-full border border-line bg-white p-2" value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })}>{values.map(v => <option key={v}>{v}</option>)}</select></label>)}</div><p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-ink/55">These details adjust the statistical estimate; the underlying market model is trained on listing data.</p></div>
        <PhotoInspection token={token} form={form} onReport={setInspection} />
        {inspection && <div className="rounded-xl border border-go/30 bg-emerald-50 p-4 text-sm"><div className="flex justify-between font-bold"><span>Photo condition: {inspection.label}</span><span>{inspection.score}/100 · {inspection.adjustment_percent >= 0 ? "+" : ""}{inspection.adjustment_percent}%</span></div><ul className="mt-2 list-disc pl-5 text-ink/70">{inspection.observations.map((observation, index) => <li key={index}>{observation}</li>)}</ul><p className="mt-2 text-xs text-ink/50">AI visual estimate ({inspection.confidence} confidence); hidden or mechanical issues are not assessed.</p></div>}
        {err && <p role="alert" className="text-stop">{err}</p>}
        <button disabled={busy} className="w-full bg-ink text-paper p-3 font-semibold disabled:opacity-50">{busy ? "Scoring..." : "Estimate value"}</button>
        </div>
      </form>
      {result ? <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-[1.15fr_.85fr] gap-8 items-start"><Result r={result} /><Chat token={token} r={result} /></div> : <div className="md:col-span-2 rounded-2xl border border-dashed border-line p-8 text-center text-ink/55">Complete the vehicle details and select <strong>Estimate value</strong> to see the chart, market range, drivers, and advisor.</div>}
      </>}
      </main>
    </div>
  );
}
