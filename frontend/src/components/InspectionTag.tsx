import type { Evaluation } from "../api";

function conditionColor(condition: string) {
  switch (condition) {
    case "Excellent":
    case "Good":
      return "var(--color-good)";
    case "Fair":
      return "var(--color-fair)";
    default:
      return "var(--color-poor)";
  }
}

function impactGlyph(impact: string) {
  if (impact === "positive") return "✓";
  if (impact === "negative") return "✕";
  return "•";
}

function impactColor(impact: string) {
  if (impact === "positive") return "text-[var(--color-good)]";
  if (impact === "negative") return "text-[var(--color-poor)]";
  return "text-[var(--color-muted)]";
}

export function InspectionTag({ evaluation }: { evaluation: Evaluation }) {
  const color = conditionColor(evaluation.condition);

  return (
    <div className="relative">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 tag-hole z-10" />
      <div className="bg-[var(--color-panel)] border border-[var(--color-hairline)] rounded-2xl pt-7 pb-5 px-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] font-mono">
              Evaluation report
            </p>
            <h3 className="font-display text-xl font-semibold mt-1">
              {evaluation.make || "Vehicle"} {evaluation.model || ""}
              <span className="text-[var(--color-muted)] font-mono text-base ml-2">
                {evaluation.manufactureYear}
              </span>
            </h3>
          </div>
          <div
            className="stamp shrink-0 rounded-full border-4 px-4 py-2 text-center"
            style={{ borderColor: color, color }}
          >
            <div className="font-display text-2xl font-bold leading-none">
              {evaluation.score.toFixed(0)}
            </div>
            <div className="text-[10px] uppercase tracking-widest font-mono mt-0.5">
              {evaluation.condition}
            </div>
          </div>
        </div>

        <div className="perforation mt-5 pt-4 grid grid-cols-3 gap-3 text-center font-mono text-xs">
          <div>
            <div className="text-[var(--color-muted)]">Services</div>
            <div className="text-[var(--color-paper)] text-sm mt-0.5">{evaluation.numServices}</div>
          </div>
          <div>
            <div className="text-[var(--color-muted)]">Major accidents</div>
            <div className="text-[var(--color-paper)] text-sm mt-0.5">{evaluation.majorAccidents}</div>
          </div>
          <div>
            <div className="text-[var(--color-muted)]">Minor accidents</div>
            <div className="text-[var(--color-paper)] text-sm mt-0.5">{evaluation.minorAccidents}</div>
          </div>
        </div>

        <div className="mt-5 flex items-baseline justify-between border-t border-[var(--color-hairline)] pt-4">
          <span className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] font-mono">
            Est. price range
          </span>
          <span className="font-display text-lg font-semibold text-[var(--color-amber)]">
            ${evaluation.priceRangeLow.toLocaleString()} – ${evaluation.priceRangeHigh.toLocaleString()}
          </span>
        </div>

        <ul className="mt-4 space-y-1.5">
          {evaluation.factors.map((f) => (
            <li key={f.label} className="flex gap-2 text-sm">
              <span className={`font-mono ${impactColor(f.impact)}`}>{impactGlyph(f.impact)}</span>
              <span className="text-[var(--color-muted)]">
                <span className="text-[var(--color-paper)]">{f.label}:</span> {f.detail}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
