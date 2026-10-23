# Car Evaluation System

**Intern ID: CITS7455**

A full-stack used-car evaluation and selling assistant. The application combines
a trained machine-learning model with ownership details, optional AI exterior
inspection, a Gemini selling advisor, model-specific vehicle information, and
current brand/model news.

## Architecture

```text
frontend (React + Vite + Tailwind)
      │  REST requests through Vite proxy
      ▼
backend (Node.js + Express + SQLite)
      │  REST
      ├──────────────► Gemini API
      ├──────────────► Google News RSS
      └──────────────► Wikimedia Commons
      │
      ▼
ml-service (Python FastAPI + scikit-learn)
```

- **frontend/** — React single-page application with registration/login,
  vehicle selection, valuation, AI photo inspection, news, chatbot, and saved
  evaluations.
- **backend/** — Express API for authentication, SQLite persistence, ML
  requests, Gemini requests, vehicle images, and current news.
- **ml-service/** — FastAPI service that loads the trained model, returns
  vehicle options and specifications, and evaluates resale prices.

## Features

- JWT registration and login with bcrypt password hashing.
- Used-car resale price estimation in INR.
- Likely price range based on held-out model prediction errors.
- Five-year value forecast.
- Model-specific automatic values for mileage, engine, power, seats, and
  vehicle category.
- Manual adjustments for condition, service history, accident history, and
  tyre condition.
- Optional Gemini exterior inspection using 2–6 JPG, PNG, or WebP photos.
- Gemini used-car selling advisor with normal and detailed response modes.
- Brand/model/fuel-specific current news tab covering model, fuel, market, and
  company topics.
- Vehicle image lookup through Wikimedia Commons with a local UI fallback.
- Past evaluations stored per user in SQLite.

## Prerequisites

- Node.js 18+
- Python 3.10+
- The supplied ML virtual environment may be used on Windows:
  `ml-service\mlenv\Scripts\python.exe`

## Configuration

Create `backend/.env` from `backend/.env.example`:

```powershell
Copy-Item backend\.env.example backend\.env
```

Configure:

```env
JWT_SECRET=replace-with-a-long-random-secret
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.8-flash
ML_URL=http://localhost:8000
```

`GEMINI_API_KEY` is optional for basic valuation. Without it, the chatbot uses
offline rule-based tips and photo inspection is unavailable. Keep
`backend/.env` private.

## Setup

### 1. ML service

The dataset is located at `ml-service/data/Car details v3.csv`.

```powershell
cd ml-service
.\mlenv\Scripts\python.exe -m pip install -r requirements.txt
.\mlenv\Scripts\python.exe train.py
.\mlenv\Scripts\python.exe -m uvicorn app:app --port 8000
```

The ML service runs at `http://localhost:8000`.

Useful endpoints:

```text
GET  http://localhost:8000/options
POST http://localhost:8000/evaluate
```

### 2. Backend API

```powershell
cd backend
npm install
npm start
```

The backend runs at `http://localhost:4000`.

Check its health:

```text
http://localhost:4000/api/health
```

### 3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

All three services must be running for the complete application flow:

```text
browser → frontend → backend → ML service
                         ├── Gemini
                         ├── Google News
                         └── Wikimedia Commons
```

## Backend API

| Method | Path | Auth | Description |
|---|---|---:|---|
| POST | `/api/auth/register` | No | Create an account and return a JWT |
| POST | `/api/auth/login` | No | Authenticate and return a JWT |
| GET | `/api/options` | No | Return ML options, model specifications, and categories |
| GET | `/api/health` | No | Check backend and ML-service connectivity |
| GET | `/api/car-image` | No | Find a matching Wikimedia vehicle image |
| POST | `/api/evaluations` | Yes | Evaluate and save a vehicle |
| GET | `/api/evaluations` | Yes | List the current user's saved evaluations |
| DELETE | `/api/evaluations/:id` | Yes | Delete one evaluation owned by the current user |
| POST | `/api/inspect-exterior` | Yes | Inspect 2–6 exterior photos with Gemini |
| POST | `/api/chat` | Yes | Ask the Gemini or offline car advisor |
| GET | `/api/news` | No | Fetch brand/model/fuel-specific current news |

Protected requests use:

```text
Authorization: Bearer <jwt-token>
```

## Valuation flow

1. The frontend loads options from `/api/options`.
2. The backend proxies that request to the ML service's `/options` endpoint.
3. Selecting a brand and model fills typical mileage, engine, power, seats,
   and category values from the dataset.
4. The user enters kilometres, year, asking price, and ownership details.
5. The frontend sends the completed form to `/api/evaluations`.
6. The backend forwards the ML features to `/evaluate`.
7. The ML service predicts the base resale price.
8. The ML service calculates the likely range, drivers, and forecast.
9. Condition, service, accident, tyre, and photo adjustments are applied.
10. The backend saves the result in SQLite and returns it to the frontend.

The base estimate is produced by the trained model. The final estimate also
contains clearly defined rule-based adjustments.

## ML model

The model is trained in [ml-service/train.py](ml-service/train.py) using
`Car details v3.csv`.

Model features include:

- Brand
- Fuel
- Seller type
- Transmission
- Previous owner
- Vehicle age
- Kilometres driven
- Mileage
- Engine
- Maximum power
- Seats

The training pipeline uses a log-transformed selling price, categorical
encoding, and `HistGradientBoostingRegressor`. The trained bundle is saved as
`ml-service/model.joblib`.

Condition, service history, accident history, tyre condition, and visible
exterior photo assessment are not trained model features. They are applied as
bounded post-prediction adjustments in `ml-service/app.py`.

## News flow

The News tab lets the user select a brand, model, and fuel type. The backend
builds several Google News RSS searches using all three selections, including
model updates, fuel costs, used-car demand, resale prices, and company news.

The backend parses article titles, links, publication dates, and topic labels,
removes duplicate links, and returns the results to the frontend. News is
informational only and does not change the ML valuation.

If Google News is unavailable, the API returns an explicit error instead of
inventing headlines.

## External services

- **Gemini API** — used-car chatbot and visible exterior photo inspection.
- **Google News RSS** — current news searches.
- **Wikimedia Commons** — model image lookup.

The valuation and saved-evaluation features do not depend on remote news or
vehicle images. Gemini features require `GEMINI_API_KEY`.

## Scaling notes

- Replace SQLite with PostgreSQL by updating `backend/db.js`.
- Keep the ML service stateless and deploy multiple instances behind a
  load balancer.
- Point `ML_URL` to the load-balanced ML service.
- Add caching for options, news, and image searches when traffic increases.
- Containerize the frontend, backend, and ML service separately for deployment.
