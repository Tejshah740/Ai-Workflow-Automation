import asyncio

import asyncpg

from app.utils.email import send_email

EVENT_SUBJECTS = {
    "needs_review": "Submission needs review",
    "pending_approval": "Submission awaiting your approval",
    "submission_approved": "Your submission was approved",
    "submission_rejected": "Your submission was rejected",
    "submission_failed": "Submission processing failed",
}


def _subject_for(event: str) -> str:
    return EVENT_SUBJECTS.get(event, "Workflow notification")


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
    row = await conn.fetchrow("SELECT email FROM users WHERE id = $1", user_id)
    await _create(conn, user_id, submission_id, event, message)
    if row:
        await asyncio.to_thread(send_email, row["email"], _subject_for(event), message)


async def notify_role(
    conn: asyncpg.Connection, role: str, submission_id: int | None, event: str, message: str
) -> None:
    users = await conn.fetch("SELECT id, email FROM users WHERE role = $1", role)
    for user in users:
        await _create(conn, user["id"], submission_id, event, message)
        await asyncio.to_thread(send_email, user["email"], _subject_for(event), message)