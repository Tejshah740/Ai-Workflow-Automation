import asyncpg


async def _create(
    conn: asyncpg.Connection, user_id: int, submission_id: int | None, event: str, message: str
) -> None:
    await conn.execute(
        "INSERT INTO notifications (user_id, submission_id, event, message) VALUES ($1, $2, $3, $4)",
        user_id,
        submission_id,
        event,
        message,
    )


async def notify_user(
    conn: asyncpg.Connection, user_id: int, submission_id: int | None, event: str, message: str
) -> None:
    await _create(conn, user_id, submission_id, event, message)


async def notify_role(
    conn: asyncpg.Connection, role: str, submission_id: int | None, event: str, message: str
) -> None:
    users = await conn.fetch("SELECT id FROM users WHERE role = $1", role)
    for user in users:
        await _create(conn, user["id"], submission_id, event, message)