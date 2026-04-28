from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, SessionLocal, engine
from .routers import calls, fmcsa, loads, metrics
from .seed import seed_loads


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_loads(db)
    yield


app = FastAPI(title="HappyRobot Broker API", lifespan=lifespan)

origins = (
    ["*"]
    if settings.cors_origins.strip() == "*"
    else [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(loads.router)
app.include_router(fmcsa.router)
app.include_router(calls.router)
app.include_router(metrics.router)


@app.get("/health")
def health():
    return {"status": "ok"}
