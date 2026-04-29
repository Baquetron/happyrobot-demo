# Seed data generator

Standalone script that produces deterministic sample data for the demo backend.
Outputs land in [`backend/data/`](../backend/data/) and are loaded into Postgres
on app startup by [`backend/app/seed.py`](../backend/app/seed.py).

## Run

No dependencies — Python stdlib only.

```bash
python seed-generator/generate.py
```

## What it produces

- **`backend/data/loads.json`** — 300 loads, 250 `available` + 50 `booked` (used by the app on startup to seed Postgres)
- **`backend/data/calls.json`** — 80 calls: 50 booked + 10 prior-failed-attempts on later-booked loads + 20 pure failures (12 rejected total / 10 no_load / 8 failed_verification)
- **`backend/data/loads.csv`** + **`backend/data/calls.csv`** — same data in CSV form for spreadsheet review and agent test scripting. Not consumed by the app.

## Constraints baked in

| Constraint | Where in the script |
|---|---|
| Pickup datetimes spread across May 2026 | `random_pickup()` |
| Origin distribution weighted toward freight hubs (multiple loads from same origin) | `ORIGIN_WEIGHTS`, `weighted_origin()` |
| 8 chained pairs (load B's origin = load A's destination, 4–24h gap) | `inject_chains()` |
| Equipment ↔ commodity pairings respected (Reefer↔Frozen/Produce, Flatbed↔Steel, …) | `EQUIPMENT_COMMODITY` |
| 50 booked loads spread across origins, not clustered | `mark_booked()` round-robin |
| Realistic carriers (4 real big MCs + 8 fictional) | `CARRIERS` |
| Failed-verification calls use plausible-looking but fake MCs | `INVALID_MCS` |
| Outcome breakdown of failures: 12 rejected / 10 no_load / 8 failed_verification | `generate_calls()` |
| Sentiment skew on booked: 35 positive / 12 neutral / 3 negative (per ~50) | `gen_winning_call()` |

## Determinism

`random.seed(42)` at module load. Re-runs produce the same JSON byte-for-byte
(modulo dict-iteration order in CPython 3.7+, which is insertion-ordered).

## Tweaking

Common changes:

- **More/fewer loads:** edit `n=300` in `main()`'s `generate_loads(300)` call.
- **More/fewer booked:** edit `n_booked=50` in `mark_booked(...)`.
- **Different chain count:** edit `num_chains=8` in `inject_chains(...)`.
- **Failure mix:** edit the three `for _ in range(N)` loops at the bottom of `generate_calls()`.

After regenerating, redeploy (or drop tables in Railway and let the app reseed)
to push the new data into Postgres.
