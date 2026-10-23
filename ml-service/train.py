"""Trains a used-car price model on the CarDekho 'Car details v3.csv' dataset."""
import os, datetime, numpy as np, pandas as pd, joblib
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import r2_score, mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder

CSV = os.environ.get("DATA_CSV", "data/Car details v3.csv")
CAT = ["brand", "fuel", "seller_type", "transmission", "owner"]
NUM = ["age", "km_driven", "mileage", "engine", "max_power", "seats"]
THIS_YEAR = datetime.date.today().year

def _num(s):  # "23.4 kmpl" -> 23.4, "1248 CC" -> 1248, "74 bhp" -> 74
    return pd.to_numeric(s.astype(str).str.extract(r"([\d.]+)")[0], errors="coerce")

def load():
    if not os.path.exists(CSV):
        raise SystemExit(f"Dataset not found at '{CSV}'. Download 'Car details v3.csv' from Kaggle into ml-service/data/.")
    df = pd.read_csv(CSV)
    need = {"name", "year", "selling_price", "km_driven", "fuel", "seller_type", "transmission", "owner", "mileage", "engine", "max_power", "seats"}
    if need - set(df.columns): raise SystemExit(f"CSV is missing columns: {sorted(need - set(df.columns))}")
    df["brand"] = df["name"].str.split().str[0]
    for c in ["mileage", "engine", "max_power"]: df[c] = _num(df[c])
    df = df.dropna(subset=["selling_price", "year", "km_driven"]).drop_duplicates()
    return df[(df.selling_price > 0) & (df.km_driven < 1_000_000)]

def features(df):
    df = df.copy(); df["age"] = (THIS_YEAR - df["year"]).clip(lower=0)
    return df[CAT + NUM]

def category(name):
    text = str(name).lower()
    if any(word in text for word in ["suv", "xuv", "thar", "duster", "creta", "venue", "ecosport", "vitara", "fortuner", "endeavour", "qualis", "bolero", "scorpio", "seltos", "harrier", "nexon", "hector", "wr-v", "br-v"]):
        return "SUV"
    if any(word in text for word in ["hatch", "alto", "swift", "i10", "i20", "wagon", "celerio", "baleno", "tiago", "polo", "brio", "micra", "figo", "beat", "ritz", "ignis", "kwid", "800", "zen"]):
        return "Hatchback"
    if any(word in text for word in ["sedan", "city", "verna", "dzire", "swift dzire", "ciaz", "aspire", "amaze", "etios", "vios", "octavia", "rapid", "vento", "accent", "corolla"]):
        return "Sedan"
    if any(word in text for word in ["van", "omni", "eeco", "ertiga", "lodgy", "carens"]):
        return "MPV"
    if any(word in text for word in ["convertible", "roadster", "coupe"]):
        return "Coupe/Convertible"
    return "Other"

def fit():
    df = load(); X, y = features(df), np.log1p(df["selling_price"])
    pre = ColumnTransformer([("c", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=np.nan), CAT)], remainder="passthrough")
    model = Pipeline([("pre", pre), ("gb", HistGradientBoostingRegressor(
        categorical_features=list(range(len(CAT))), max_iter=500, learning_rate=.06, random_state=1))])
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=.2, random_state=1)
    model.fit(Xtr, ytr); p = model.predict(Xte)
    print(f"Rows={len(df)}  R2(log)={r2_score(yte, p):.3f}  MAE=Rs {mean_absolute_error(np.expm1(yte), np.expm1(p)):,.0f}")
    res = yte - p
    model.fit(X, y)  # refit on everything for serving
    models_by_brand = {brand: sorted(group.name.dropna().unique().tolist())
                       for brand, group in df.groupby("brand")}
    model_specs = {}
    for name, group in df.groupby("name"):
        values = {}
        for column in ["mileage", "engine", "max_power", "seats"]:
            value = group[column].median()
            if pd.notna(value):
                values[column] = round(float(value), 1)
        if values:
            model_specs[name] = {**values, "category": category(name)}
    meta = {"options": {c: sorted(df[c].dropna().unique().tolist()) for c in CAT},
            "models_by_brand": models_by_brand,
            "model_specs": model_specs,
            "low": float(np.quantile(res, .1)), "high": float(np.quantile(res, .9)),
            "km_by_age": {int(a): float(v) for a, v in df.assign(a=THIS_YEAR - df.year).groupby("a").km_driven.median().items()}}
    return {"model": model, "meta": meta}

if __name__ == "__main__":
    joblib.dump(fit(), "model.joblib")
