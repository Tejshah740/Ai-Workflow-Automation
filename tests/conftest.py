import os

os.environ.setdefault(
    "DATABASE_URL", "postgresql://workflow_user:workflow_pass@localhost:5432/workflow_db_test"
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-do-not-use-in-production")
os.environ.setdefault("UPLOAD_DIR", "/tmp/workflow-automation-test-uploads")

import asyncio
from pathlib import Path
from urllib.parse import urlparse, urlunparse

import asyncpg
import pytest
import pytest_asyncio
import redis as redis_lib
from fastapi.testclient import TestClient

from app.config import settings
from app.db import init_connection
from app.main import app
from app.utils.security import hash_password

SCHEMA_PATH = Path(__file__).resolve().parent.parent / "app" / "schema.sql"

TABLES = [
    "notifications",
    "approvals",
    "workflow_rules",
    "validations",
    "extractions",
    "audit_log",
    "submissions",
    "users",
]


async def _ensure_test_database_exists() -> None:
    parsed = urlparse(settings.database_url)
    db_name = parsed.path.lstrip("/")
    admin_url = urlunparse(parsed._replace(path="/postgres"))

    conn = await asyncpg.connect(admin_url)
    try:
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", db_name)
        if not exists:
            await conn.execute(f'CREATE DATABASE "{db_name}"')
    finally:
        await conn.close()


async def _apply_schema() -> None:
    conn = await asyncpg.connect(settings.database_url)
    await init_connection(conn)
    try:
        await conn.execute(SCHEMA_PATH.read_text())
    finally:
        await conn.close()


async def _truncate_all() -> None:
    conn = await asyncpg.connect(settings.database_url)
    await init_connection(conn)
    try:
        await conn.execute(f"TRUNCATE {', '.join(TABLES)} RESTART IDENTITY CASCADE")
    finally:
        await conn.close()


_db_available = False


@pytest.fixture(scope="session", autouse=True)
def _test_database_ready():
    global _db_available
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    try:
        asyncio.run(_ensure_test_database_exists())
        asyncio.run(_apply_schema())
        _db_available = True
    except Exception:
        _db_available = False


@pytest.fixture(autouse=True)
def _clean_state(_test_database_ready):
    if _db_available:
        try:
            asyncio.run(_truncate_all())
            redis_lib.from_url(settings.redis_url).flushdb()
        except Exception:
            pass
    yield


@pytest.fixture
def client():
    if not _db_available:
        pytest.skip("Test database not available")
    with TestClient(app) as c:
        yield c


@pytest_asyncio.fixture
async def db_conn():
    if not _db_available:
        pytest.skip("Test database not available")
    conn = await asyncpg.connect(settings.database_url)
    await init_connection(conn)
    try:
        yield conn
    finally:
        await conn.close()


TEST_PASSWORD = "testpassword123"


async def create_test_user(conn, email: str, role: str = "submitter", password: str = TEST_PASSWORD) -> int:

    row = await conn.fetchrow(
        "INSERT INTO users (email, hashed_password, role) VALUES ($1, $2, $3) RETURNING id",
        email,
        hash_password(password),
        role,
    )
    return row["id"]


@pytest.fixture
def seed_user():
    

    def _seed(email: str, role: str = "submitter", password: str = TEST_PASSWORD) -> int:
        async def _do() -> int:
            conn = await asyncpg.connect(settings.database_url)
            await init_connection(conn)
            try:
                return await create_test_user(conn, email, role, password)
            finally:
                await conn.close()

        return asyncio.run(_do())

    return _seed


@pytest.fixture
def auth_headers(client):
    def _headers(email: str, password: str = TEST_PASSWORD) -> dict:
        r = client.post("/api/auth/login", data={"username": email, "password": password})
        assert r.status_code == 200, r.text
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    return _headers