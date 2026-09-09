from pathlib import Path

import asyncpg

from app.config import settings

_pool: asyncpg.Pool | None = None


async def connect_db() -> asyncpg.Pool:
    global _pool
    _pool = await asyncpg.create_pool(settings.database_url)
    return _pool


async def disconnect_db() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialized")
    return _pool


async def get_db():
    """FastAPI dependency: yields a connection from the pool."""
    async with get_pool().acquire() as conn:
        yield conn


async def init_db() -> None:
    """Runs schema.sql on startup. Each module appends its own
    CREATE TABLE IF NOT EXISTS statements there as it's built."""
    schema_path = Path(__file__).parent / "schema.sql"
    sql = schema_path.read_text().strip()
    if not sql:
        return
    async with get_pool().acquire() as conn:
        await conn.execute(sql)