import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_db
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(
    unread_only: bool = False,
    limit: int = 20,
    offset: int = 0,
    conn: asyncpg.Connection = Depends(get_db),
    user=Depends(get_current_user),
):
    query = "SELECT * FROM notifications WHERE user_id = $1"
    params: list = [user["id"]]
    if unread_only:
        query += " AND read_at IS NULL"
    query += " ORDER BY created_at DESC LIMIT $2 OFFSET $3"
    params += [limit, offset]
    rows = await conn.fetch(query, *params)
    return [dict(r) for r in rows]


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: int,
    conn: asyncpg.Connection = Depends(get_db),
    user=Depends(get_current_user),
):
    row = await conn.fetchrow(
        "UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 RETURNING *",
        notification_id,
        user["id"],
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return dict(row)


@router.post("/read-all")
async def mark_all_read(conn: asyncpg.Connection = Depends(get_db), user=Depends(get_current_user)):
    await conn.execute(
        "UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL", user["id"]
    )
    return {"status": "ok"}