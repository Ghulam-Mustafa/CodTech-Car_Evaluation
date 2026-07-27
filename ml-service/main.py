from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import joblib
import numpy as np
import os

CURRENT_YEAR = 2026
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

app = FastAPI(title="Car Evaluation ML Service")

_bundle = None


def get_bundle():
    global _bundle
    if _bundle is None:
        if not os.path.exists(MODEL_PATH):
            raise HTTPException(
                status_code=503,
                detail="Model not trained yet. Run train_model.py first.",
            )
        _bundle = joblib.load(MODEL_PATH)
    return _bundle


class EvaluationRequest(BaseModel):
    manufacture_year: int = Field(..., ge=1970, le=CURRENT_YEAR)
    num_services: int = Field(..., ge=0, le=100)
    major_accidents: int = Field(..., ge=0, le=10)
    minor_accidents: int = Field(..., ge=0, le=10)


class Factor(BaseModel):
    label: str
    impact: str  # "positive" | "negative" | "neutral"
    detail: str


class EvaluationResponse(BaseModel):
    score: float
    condition: str
    price_range_low: int
    price_range_high: int
    factors: list[Factor]


def condition_label(score: float) -> str:
    if score >= 85:
        return "Excellent"
    if score >= 70:
        return "Good"
    if score >= 50:
        return "Fair"
    if score >= 30:
        return "Poor"
    return "Very poor"


def estimate_price_range(score: float, age: int):
    # Simple depreciation heuristic layered on top of the ML condition score.
    # Assumes a rough "new car" baseline that depreciates with age, then
    # scaled by condition score. This is intentionally transparent/tunable
    # rather than learned, since price also depends on market data we don't have.
    baseline_new = 30000
    depreciated = baseline_new * (0.87 ** age)
    depreciated = max(depreciated, 2500)
    mid = depreciated * (score / 100)
    low = mid * 0.9
    high = mid * 1.1
    return int(round(low, -2)), int(round(high, -2))


def build_factors(manufacture_year, num_services, major_accidents, minor_accidents, age):
    factors = []

    if age <= 3:
        factors.append(Factor(label="Vehicle age", impact="positive", detail=f"{age} years old — relatively new"))
    elif age <= 8:
        factors.append(Factor(label="Vehicle age", impact="neutral", detail=f"{age} years old — moderate age"))
    else:
        factors.append(Factor(label="Vehicle age", impact="negative", detail=f"{age} years old — significant depreciation expected"))

    if major_accidents == 0 and minor_accidents == 0:
        factors.append(Factor(label="Accident history", impact="positive", detail="No recorded accidents"))
    elif major_accidents == 0:
        factors.append(Factor(label="Accident history", impact="negative", detail=f"{minor_accidents} minor accident(s) on record"))
    else:
        factors.append(Factor(label="Accident history", impact="negative", detail=f"{major_accidents} major and {minor_accidents} minor accident(s) — largest factor lowering score"))

    expected_services = max(age * 1.5, 1)
    if num_services <= expected_services:
        factors.append(Factor(label="Service history", impact="positive", detail=f"{num_services} services — consistent with regular maintenance"))
    else:
        factors.append(Factor(label="Service history", impact="negative", detail=f"{num_services} services — more than expected, may indicate recurring issues"))

    return factors


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": os.path.exists(MODEL_PATH)}


@app.post("/predict", response_model=EvaluationResponse)
def predict(req: EvaluationRequest):
    bundle = get_bundle()
    model = bundle["model"]

    age = CURRENT_YEAR - req.manufacture_year
    X = np.array([[req.manufacture_year, req.num_services, req.major_accidents, req.minor_accidents]])
    score = float(np.clip(model.predict(X)[0], 0, 100))

    low, high = estimate_price_range(score, age)
    factors = build_factors(req.manufacture_year, req.num_services, req.major_accidents, req.minor_accidents, age)

    return EvaluationResponse(
        score=round(score, 1),
        condition=condition_label(score),
        price_range_low=low,
        price_range_high=high,
        factors=factors,
    )
