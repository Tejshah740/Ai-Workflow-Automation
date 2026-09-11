from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import connect_db, disconnect_db, init_db
from app.routers import auth, dashboard, notifications, submissions, workflow


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await init_db()
    yield
    await disconnect_db()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(submissions.router)
app.include_router(workflow.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}