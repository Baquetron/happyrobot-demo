# HappyRobot Demo

Inbound-carrier sales demo for the HappyRobot platform. A voice agent answers calls from freight carriers, verifies them via the **FMCSA QCMobile API**, finds matching loads, negotiates a rate, books the load, and logs call metrics for a dashboard.

This repo contains the **backend API** that powers the agent. The HappyRobot workflow lives in the HappyRobot platform and calls this API over HTTPS.

---

## Architecture

```
┌────────────────┐    HTTPS / X-API-Key     ┌──────────────────┐
│  HappyRobot    │ ───────────────────────▶ │  FastAPI app     │
│  voice agent   │                          │  (this repo)     │
└────────────────┘                          └────┬─────────────┘
                                                 │
                              ┌──────────────────┼──────────────────┐
                              ▼                                     ▼
                   ┌──────────────────┐              ┌──────────────────────┐
                   │  Postgres        │              │  FMCSA QCMobile API  │
                   │  (Railway)       │              │  (carrier lookup)    │
                   └──────────────────┘              └──────────────────────┘
```

- **Backend:** FastAPI + SQLAlchemy 2.x + Pydantic v2
- **DB:** Postgres (Railway plugin)
- **Hosting:** Railway, auto-deploys from GitHub `main` (Dockerfile builder)
- **HTTPS:** Railway edge (Let's Encrypt)
- **Auth:** `X-API-Key` header on every endpoint except `/health`

---

## Repo layout

```
happyrobot-demo/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   ├── data/
│   │   ├── loads.json          # 300 seed loads (250 available + 50 booked)
│   │   ├── calls.json          # 80 seed calls (mixed outcomes)
│   │   ├── loads.csv           # CSV mirror for testing/spreadsheet review
│   │   └── calls.csv           # CSV mirror
│   └── app/
│       ├── main.py             # FastAPI app, lifespan, CORS, router mounts
│       ├── config.py           # pydantic-settings; normalizes Railway DB URL
│       ├── database.py         # engine + SessionLocal + get_db
│       ├── models.py           # Load, Call SQLAlchemy models
│       ├── schemas.py          # Pydantic request/response models
│       ├── auth.py             # require_api_key dependency
│       ├── seed.py             # seeds data/loads.json into DB on first start
│       └── routers/
│           ├── loads.py        # /loads/search, /loads/{id}, POST /loads/{id}/book
│           ├── fmcsa.py        # /carriers/verify
│           ├── calls.py        # POST /calls, GET /calls
│           └── metrics.py      # GET /metrics
├── seed-generator/             # standalone script that produces backend/data/*.json + *.csv
│   ├── generate.py
│   └── README.md
├── README.md
└── .gitignore
```

---

## Database schema

Source of truth: [backend/app/models.py](backend/app/models.py).

### `loads`

| Column              | Type             | Notes                                                             |
| ------------------- | ---------------- | ----------------------------------------------------------------- |
| `load_id`           | str (PK)         | e.g. `L-1001`                                                     |
| `origin`            | str (indexed)    | e.g. "Dallas, TX"                                                 |
| `destination`       | str (indexed)    |                                                                   |
| `pickup_datetime`   | datetime         | ISO 8601                                                          |
| `delivery_datetime` | datetime         |                                                                   |
| `equipment_type`    | str (indexed)    | Dry Van / Reefer / Flatbed / Step Deck                            |
| `loadboard_rate`    | int              | USD, always a multiple of 10                                      |
| `notes`             | text             |                                                                   |
| `weight`            | float            | lbs                                                               |
| `commodity_type`    | str              |                                                                   |
| `num_of_pieces`     | int              |                                                                   |
| `miles`             | float            |                                                                   |
| `dimensions`        | str              |                                                                   |
| `status`            | str (indexed)    | `available` \| `booked` (default `available`)                     |
| `company_name`      | str? (indexed)   | Carrier company that booked. Null while available.                |
| `mc_number`         | str? (indexed)   | MC number of carrier that booked. Null while available.           |
| `agreement_date`    | datetime?        | When the deal was struck. Null while available.                   |
| `agreed_rate`       | int?             | Final negotiated price. Null while available. Per the agent's policy: equals `loadboard_rate` when the deal closes in rounds 1–2, or `round(loadboard_rate × 1.05)` when it reaches round 3. Mirror of `calls.final_rate` for the winning call. |

### `calls`

| Column                | Type             | Notes                                                                |
| --------------------- | ---------------- | -------------------------------------------------------------------- |
| `id`                  | int (PK)         | autoincrement                                                        |
| `created_at`          | datetime (idx)   |                                                                      |
| `carrier_name`        | str?             |                                                                      |
| `mc_number`           | str? (indexed)   |                                                                      |
| `load_id`             | FK → loads       |                                                                      |
| `initial_rate`        | int?             | snapshot of `loadboard_rate` at call time (multiple of 10)           |
| `final_rate`          | int?             | negotiated rate (booked: same as initial in rounds 1–2, or +5% rounded in round 3; rejected: carrier's outside-ceiling counter) |
| `negotiation_rounds`  | int              | default 0                                                            |
| `outcome`             | str (indexed)    | `booked` \| `rejected` \| `no_load` \| `failed_verification`         |
| `sentiment`           | str (indexed)    | `positive` \| `neutral` \| `negative`                                |
| `duration_seconds`    | float?           |                                                                      |
| `notes`               | text?            |                                                                      |

**Why two tables:** one load can have many call attempts (multiple carriers may call about the same load — only one wins). `loads` holds shipment data + booking-result fields (`status`, `company_name`, `mc_number`, `agreement_date`, `agreed_rate`) so a single GET shows the booking outcome without a join. `calls` is the source of truth for every call attempt and per-conversation data (`final_rate`, sentiment, duration, negotiation rounds, outcome).

---

## API endpoints

Base URL (Railway): `https://happyrobot-demo-production.up.railway.app`
Auth: `X-API-Key: <key>` header on every endpoint below except `/health`.

| Method | Path                       | Purpose                                                                                       |
| ------ | -------------------------- | --------------------------------------------------------------------------------------------- |
| GET    | `/health`                  | Liveness probe (no auth)                                                                      |
| GET    | `/loads/search`            | Filter loads. Params: `origin`, `destination`, `equipment_type`, `pickup_date` (YYYY-MM-DD, matches that calendar day in UTC), `pickup_after`, `pickup_before`, `min_rate`, `max_rate`, `include_booked` (default false), `limit` (default 10). |
| GET    | `/loads/{load_id}`         | Single load lookup                                                                            |
| POST   | `/loads/{load_id}/book`    | Marks the load as booked. Touches the loads table only — agent must follow with `POST /calls` to record the conversation. Returns 409 if already booked. |
| GET    | `/carriers/verify?mc={mc}` | Verifies carrier eligibility via FMCSA. Strips `MC-` prefix automatically.                    |
| POST   | `/calls`                   | Logs a call outcome that did NOT result in a booking (failed verification, no load, rejection). |
| GET    | `/calls`                   | List recent calls (paginated via `limit`, default 50)                                         |
| GET    | `/metrics`                 | Aggregated dashboard data                                                                     |

### Eligibility logic (`/carriers/verify`)

Carrier is eligible iff **all three**:
- `allowedToOperate == "Y"`
- `statusCode == "A"`
- `oosDate is null`

### Booking request body (`POST /loads/{id}/book`)

```json
{
  "mc_number": "244265",
  "company_name": "SWIFT TRANSPORTATION",
  "final_rate": 2300
}
```

After a successful booking the agent must also `POST /calls` with `outcome: "booked"` and the conversation metadata (sentiment, duration, negotiation_rounds, notes). One call per call, regardless of outcome.

---

## Environment variables

Set in **Railway → app service → Variables**. See [backend/.env.example](backend/.env.example) for local-dev placeholders.

| Var              | Description                                                              |
| ---------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`   | Reference Railway's Postgres plugin: `${{ Postgres.DATABASE_URL }}`. App auto-normalizes scheme to `postgresql+psycopg2://`. |
| `API_KEY`        | Strong random hex string. Required on every API call (`X-API-Key` header). |
| `FMCSA_WEB_KEY`  | FMCSA QCMobile webKey (request from https://mobile.fmcsa.dot.gov/).       |
| `FMCSA_BASE_URL` | Optional; defaults to `https://mobile.fmcsa.dot.gov/qc/services`.         |
| `CORS_ORIGINS`   | Comma-separated origins or `*`.                                           |

---

## Deployment

Railway auto-deploys on every push to `main`.

### One-time Railway setup

1. Create a project → Deploy from GitHub repo (`Baquetron/happyrobot-demo`).
2. **+ New → Database → PostgreSQL**.
3. App service → **Settings → Source → Root Directory** = `backend`.
4. App service → **Settings → Networking → Generate Domain** (port `8000`).
5. App service → **Variables** → set the env vars listed above.
6. Push to `main`. Railway builds via the [Dockerfile](backend/Dockerfile).

### Smoke tests after deploy

```bash
URL="https://happyrobot-demo-production.up.railway.app"
KEY="<your API_KEY>"

curl -s "$URL/health"
curl -i -s "$URL/loads/search" | head -1                              # expect 401
curl -s -H "X-API-Key: $KEY" "$URL/loads/search" | jq '. | length'
curl -s -H "X-API-Key: $KEY" "$URL/loads/search?origin=Dallas" | jq
curl -s -H "X-API-Key: $KEY" "$URL/carriers/verify?mc=87413" | jq
curl -s -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -X POST "$URL/loads/L-1001/book" \
  -d '{"mc_number":"244265","company_name":"SWIFT TRANSPORTATION","final_rate":2300,"negotiation_rounds":2,"sentiment":"positive","duration_seconds":142.5}' | jq
curl -s -H "X-API-Key: $KEY" "$URL/metrics" | jq
```

---

## FMCSA API gotcha

The QCMobile API IP-whitelists callers. Calls from a developer machine return **403 from `awselb/2.0`** — the AWS LB rejects before the API sees the request. Calls from the deployed Railway server work.

**Implication:** `/carriers/verify` can only be smoke-tested from the deployed URL, not locally.

When picking a "happy path" MC for testing, verify it on https://safer.fmcsa.dot.gov/CompanySnapshot.aspx first — carrier statuses change frequently.

---

## Negotiation policy (designed, not yet implemented)

Up to 3 back-and-forth rounds:

| Round   | Logic                                                                                  |
| ------- | -------------------------------------------------------------------------------------- |
| 1       | If carrier offer ≤ current → accept. Else hold firm at original rate.                  |
| 2       | If carrier offer ≤ current → accept. Else go up to `original × 1.05`.                  |
| 3 (last)| If carrier offer ≤ current → accept. Else final at `original × 1.10`.                  |
| > 3     | Stop, transfer or end call.                                                            |

Planned implementation: `POST /negotiate` endpoint so policy lives in code, not the LLM prompt. Body: `{ load_id, carrier_offer, round }` → `{ action, broker_offer, message }`.

---

## Roadmap

- [x] Postgres schema + Load/Call models
- [x] Seed data (20 loads in [backend/data/loads.json](backend/data/loads.json))
- [x] `/loads/search`, `/loads/{id}`, `POST /loads/{id}/book`
- [x] `/carriers/verify` (FMCSA QCMobile)
- [x] `/calls` log endpoints
- [x] `/metrics` dashboard endpoint
- [x] Dockerfile + Railway deploy config
- [x] First successful Railway deploy + green smoke tests
- [x] Add `mc_number` + `agreed_rate` booking-result fields on `loads`
- [x] Sample data generator (300 loads / 80 calls, deterministic) + CSV mirrors
- [ ] Wire HappyRobot workflow to API (replace JSON knowledge base)
- [ ] Tighten `CORS_ORIGINS` to actual HappyRobot origin

_(Negotiation handled by HappyRobot agent; dashboard frontend descoped for now.)_

---

## Local dev (optional — Railway-direct is also fine)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then edit values
# requires a local Postgres at the URL in .env
uvicorn app.main:app --reload --port 8000
```

`/carriers/verify` will fail with 403 locally (FMCSA IP allowlist). Everything else works.
