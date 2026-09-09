import asyncpg

from app.models.auth import Role
from app.utils.security import hash_password, verify_password


async def get_user_by_email(conn: asyncpg.Connection, email: str):
    return await conn.fetchrow(
        "SELECT id, email, hashed_password, role, created_at FROM users WHERE email = $1",
        email,
    )


async def get_user_by_id(conn: asyncpg.Connection, user_id: int):
    return await conn.fetchrow(
        "SELECT id, email, hashed_password, role, created_at FROM users WHERE id = $1",
        user_id,
    )


async def create_user(conn: asyncpg.Connection, email: str, password: str):
    hashed = hash_password(password)
    return await conn.fetchrow(
        """
        INSERT INTO users (email, hashed_password, role)
        VALUES ($1, $2, $3)
        RETURNING id, email, role, created_at
        """,
        email,
        hashed,
        Role.submitter.value,
    )


async def authenticate_user(conn: asyncpg.Connection, email: str, password: str):
    user = await get_user_by_email(conn, email)
    if user is None or not verify_password(password, user["hashed_password"]):
        return None
    return user


async def update_user_role(conn: asyncpg.Connection, user_id: int, role: Role):
    return await conn.fetchrow(
        """
        UPDATE users SET role = $1 WHERE id = $2
        RETURNING id, email, role, created_at
        """,
        role.value,
        user_id,
    )