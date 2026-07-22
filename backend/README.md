# AI Air Quality Monitoring API

Production-ready FastAPI backend skeleton for an AI-powered Air Quality Monitoring System.

## Stack

- Python 3.12
- FastAPI
- SQLAlchemy 2.x async
- PostgreSQL
- Alembic
- Pydantic v2
- JWT-ready configuration
- Docker and Docker Compose

## Local Setup

```powershell
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -e ".[dev]"
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

API docs are available at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Docker

```powershell
Copy-Item .env.example .env
docker compose up --build
```

## Alembic

```powershell
alembic revision --autogenerate -m "initial"
alembic upgrade head
```

## Authentication

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Logout requires a valid access token in the `Authorization: Bearer <token>` header and the
refresh token in the request body.

## Prediction

- `POST /predict`

The prediction service attempts to load:

- `models/cnn_lstm.keras`
- `models/scaler_x.pkl`
- `models/scaler_y.pkl`

If any artifact is missing, startup raises `ModelNotAvailableException`.

Satellite features are fetched through Google Earth Engine. Run `ee.Authenticate()` once before
using the prediction endpoint in an environment that has not authenticated Earth Engine yet.
Weather features are fetched from Open-Meteo with retry settings controlled by `.env`.

The model feature vector is built in this order:

`AOD`, `NO2`, `SO2`, `CO`, `O3`, `HCHO`, `Temperature`, `Humidity`,
`Wind Speed`, `Wind Direction`.

## AQI Map

- `GET /aqi-map`

Returns GeoJSON from prediction history when records exist. If no history exists, pass
`latitude`, `longitude`, and `date` query parameters to generate a current prediction point.

## HCHO

- `GET /hotspots`
- `GET /fires`
- `GET /transport`

All HCHO endpoints return GeoJSON and require `min_lat`, `min_lon`, `max_lat`, `max_lon`,
and `date` query parameters. `grid_size` is optional and defaults to `3`.

Current implementation uses Google Earth Engine HCHO and Open-Meteo wind data. DBSCAN-based
clustering is intentionally left as a TODO inside the service layer.

## Reports

- `GET /reports/predictions?format=csv`
- `GET /reports/predictions?format=pdf`
- `GET /reports/aqi?format=csv`
- `GET /reports/aqi?format=pdf`
- `GET /reports/hotspots?format=csv`
- `GET /reports/hotspots?format=pdf`

Reports are generated from database rows only. Prediction and AQI reports support
`start_date`, `end_date`, and `limit`. Hotspot reports support `active_only` and `limit`.
