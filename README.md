# Car Evaluation System(Intern ID : CITS7455)

A full-stack web app that scores a used vehicle's condition and estimates a
price range from its manufacture year, service history, and accident record,
using a trained ML model.

## Architecture

```
frontend (React + Vite + Tailwind)
      │  REST (JWT auth)
      ▼
backend (Node/Express + SQLite)
      │  REST
      ▼
ml-service (Python FastAPI + scikit-learn)
```

- **frontend/** — React + TypeScript SPA. Registration/login, a vehicle
  detail form, and a dashboard that renders each evaluation as an
  "inspection tag" card with the score, condition, price range, and the
  factors that drove the result.
- **backend/** — Express API. Handles user registration/login (bcrypt +
  JWT), persists evaluations to SQLite, and calls the ML service to score
  each submission.
- **ml-service/** — FastAPI microservice wrapping a `GradientBoostingRegressor`
  (scikit-learn) trained on a synthetic-but-domain-informed dataset (age,
  service count, and major/minor accidents driving a 0–100 condition score).
  Kept as a separate service so it can be retrained, redeployed, or scaled
  independently of the main API.

## Prerequisites

- Node.js 18+
- Python 3.10+

## Setup

### 1. ML service

```bash
cd ml-service
pip install -r requirements.txt --break-system-packages   # drop the flag if not needed on your machine
python train_model.py        # trains and saves model.pkl (~a few seconds)
uvicorn main:app --port 8001
```

Runs at `http://localhost:8001`. Check `http://localhost:8001/health`.

### 2. Backend API

```bash
cd backend
cp .env.example .env
npm install
npm start
```

Runs at `http://localhost:4000`. Check `http://localhost:4000/api/health`.
Uses a local SQLite file (`data.sqlite`, created automatically) — no
database server required for local dev.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Runs at `http://localhost:5173`. Register an account, submit a vehicle,
and the dashboard will show the evaluation.

All three services need to be running at once for the app to work end to
end (frontend → backend → ml-service).

## API summary (backend)

| Method | Path                  | Auth | Description                          |
|--------|-----------------------|------|--------------------------------------|
| POST   | /api/auth/register    | No   | Create an account, returns a JWT     |
| POST   | /api/auth/login       | No   | Log in, returns a JWT                |
| POST   | /api/evaluations      | Yes  | Score a vehicle, persists the result |
| GET    | /api/evaluations      | Yes  | List the current user's evaluations  |
| GET    | /api/evaluations/:id  | Yes  | Fetch one evaluation                 |

## ML service summary

`POST /predict` with `{ manufacture_year, num_services, major_accidents, minor_accidents }`
returns `{ score, condition, price_range_low, price_range_high, factors }`.

The scoring model is trained on synthetic data generated from a
domain-informed rule (age depreciation, accident penalties that compound
on older cars, and a maintenance-consistency signal) plus noise — see
`ml-service/train_model.py` for the exact rule and to retrain with your
own labeled dataset if you have one.

## Notes on scaling this beyond local dev

- Swap SQLite for PostgreSQL by changing `backend/db.js` to a Postgres
  client — the schema is already relational and portable.
- The ML service is stateless and horizontally scalable behind a load
  balancer; the backend calls it over plain HTTP so this requires no code
  changes, just pointing `ML_SERVICE_URL` at a load-balanced endpoint.
- Add Redis in front of `GET /api/evaluations` if history lookups become
  frequent at scale.
- Containerize each service (Dockerfiles are a natural next step) and run
  behind an API gateway / reverse proxy for a single public entry point.
