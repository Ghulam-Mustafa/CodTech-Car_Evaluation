"""
Trains the vehicle condition-scoring model for the Car Evaluation System.

Since we don't have a real labeled dataset, this generates a synthetic one
using a domain-informed rule (age, services, accidents -> condition score)
plus noise, then fits a GradientBoostingRegressor on top of it. This gives
a genuine learned model (not a hardcoded formula) that captures nonlinear
interactions, e.g. a major accident hurts more on an already-old car.

Run: python train_model.py
Produces: model.pkl (trained sklearn pipeline) in this directory.
"""

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import joblib

CURRENT_YEAR = 2026
rng = np.random.default_rng(42)

N = 8000


def make_dataset(n):
    manufacture_year = rng.integers(1998, CURRENT_YEAR + 1, size=n)
    age = CURRENT_YEAR - manufacture_year

    # service history: fewer services on newer cars, roughly 1/year with noise
    num_services = np.clip(
        (age * rng.normal(1.0, 0.4, size=n)).round(), 0, 40
    ).astype(int)

    # accident counts, skewed toward zero
    major_accidents = rng.choice([0, 1, 2, 3], size=n, p=[0.72, 0.18, 0.07, 0.03])
    minor_accidents = rng.choice([0, 1, 2, 3, 4], size=n, p=[0.5, 0.25, 0.15, 0.07, 0.03])

    # domain rule: base score decays with age, penalized by accidents,
    # slightly helped by consistent servicing (up to a point -- too many
    # services can also signal a car that needed a lot of work).
    base = 100 - age * 2.8
    service_effect = np.where(
        num_services <= age * 1.5,
        np.minimum(num_services, 12) * 1.2,   # healthy maintenance
        -np.maximum(num_services - age * 1.5, 0) * 0.8,  # excessive repairs
    )
    accident_effect = -(major_accidents * 16 + minor_accidents * 5)
    # interaction: accidents hurt more on already-old cars
    interaction = -(age * 0.15) * (major_accidents + 0.4 * minor_accidents)

    noise = rng.normal(0, 4.0, size=n)
    score = base + service_effect + accident_effect + interaction + noise
    score = np.clip(score, 0, 100)

    X = np.column_stack([manufacture_year, num_services, major_accidents, minor_accidents])
    return X, score


def main():
    X, y = make_dataset(N)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)

    model = GradientBoostingRegressor(
        n_estimators=300,
        max_depth=3,
        learning_rate=0.05,
        subsample=0.8,
        random_state=42,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    print(f"Validation MAE: {mae:.2f} points (0-100 scale)")

    joblib.dump({"model": model, "feature_order": ["manufacture_year", "num_services", "major_accidents", "minor_accidents"]}, "model.pkl")
    print("Saved model.pkl")


if __name__ == "__main__":
    main()
