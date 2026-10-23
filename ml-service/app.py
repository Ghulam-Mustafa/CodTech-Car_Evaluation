import os, datetime, joblib, numpy as np, pandas as pd
from typing import Optional
from fastapi import FastAPI
from pydantic import BaseModel, Field
from train import features, fit, THIS_YEAR

if not os.path.exists("model.joblib"): joblib.dump(fit(), "model.joblib")
bundle = joblib.load("model.joblib"); model, meta = bundle["model"], bundle["meta"]
app = FastAPI(title="Car Evaluation ML")

class Car(BaseModel):
    brand: str; fuel: str; seller_type: str; transmission: str; owner: str
    year: int = Field(ge=1980, le=THIS_YEAR)
    km_driven: float = Field(ge=0)
    mileage: Optional[float] = None; engine: Optional[float] = None
    max_power: Optional[float] = None; seats: Optional[float] = None
    asking_price: Optional[float] = Field(default=None, ge=0)
    condition: str = "Good"
    service_history: str = "Partial"
    accident_history: str = "No accidents"
    tyre_condition: str = "Good"
    photo_adjustment: float = Field(default=0, ge=-15, le=6)

def price(row):
    return float(np.expm1(model.predict(features(pd.DataFrame([row])))[0]))

@app.get("/options")
def options():
    return {**meta["options"], "models_by_brand": meta.get("models_by_brand", {}),
            "model_specs": meta.get("model_specs", {})}

@app.post("/evaluate")
def evaluate(c: Car):
    row = c.model_dump(exclude={"asking_price"}); est = price(row)
    adjustments = {
        "condition": {"Excellent": 0.06, "Good": 0.0, "Fair": -0.07, "Needs work": -0.15},
        "service_history": {"Full": 0.05, "Partial": 0.0, "None": -0.06},
        "accident_history": {"No accidents": 0.0, "Minor repairs": -0.05, "Major accident": -0.14},
        "tyre_condition": {"New": 0.02, "Good": 0.0, "Replace soon": -0.025},
    }
    adjustment = sum(adjustments[key].get(getattr(c, key), 0) for key in adjustments) + c.photo_adjustment / 100
    est = est * (1 + adjustment)
    low, high = est * np.exp(meta["low"]), est * np.exp(meta["high"])
    age = THIS_YEAR - c.year; typical = meta["km_by_age"].get(age)
    what_if = []
    if typical and c.km_driven > typical * 1.2: what_if.append(("If it had average kms for its age", {**row, "km_driven": typical}))
    if c.owner != "First Owner": what_if.append(("If it were a first-owner car", {**row, "owner": "First Owner"}))
    if c.km_driven < (typical or 1e9) * .8: what_if.append(("If it had average kms for its age", {**row, "km_driven": typical}))
    drivers = [{"factor": f, "change": round(price(r) - est)} for f, r in what_if]
    per_year = float(np.clip(c.km_driven / max(age, 1), 5000, 25000))
    forecast = [{"years": y, "price": round(price({**row, "year": c.year - y, "km_driven": c.km_driven + per_year * y}))} for y in range(1, 6)]
    verdict = None
    if c.asking_price:
        verdict = ("Below market. Check why it is cheap." if c.asking_price < low else
                   "Above market. Negotiate hard." if c.asking_price > high else "Fair price.")
    return {"estimated_price": round(est), "low": round(low), "high": round(high), "asking_price": c.asking_price,
            "base_estimate": round(est / (1 + adjustment)), "adjustment": round(adjustment * 100),
            "verdict": verdict, "drivers": drivers, "forecast": forecast}
