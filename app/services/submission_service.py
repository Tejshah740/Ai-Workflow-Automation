from typing import Any

import asyncpg


async def create_document_submission(
    conn: asyncpg.Connection,
    submitter_id: int,
    submission_type: str,
    stored_filename: str,
    original_filename: str,
    content_type: str,
    file_size_bytes: int,
):
    row = await conn.fetchrow(
        """
        INSERT INTO submissions (
            submitter_id, channel, submission_type,
            stored_filename, original_filename, content_type, file_size_bytes
        )
        VALUES ($1, 'document', $2, $3, $4, $5, $6)
        RETURNING *
        """,
        submitter_id,
        submission_type,
        stored_filename,
        original_filename,
        content_type,
        file_size_bytes,
    )
    user = await conn.fetchrow("SELECT name FROM users WHERE id = $1", submitter_id)
    result = dict(row)
    result["submitter_name"] = user["name"] if user else None
    result["extracted_fields"] = None
    return result


async def create_request_submission(
    conn: asyncpg.Connection,
    submitter_id: int,
    submission_type: str,
    fields: dict[str, Any],
):
    row = await conn.fetchrow(
        """
        INSERT INTO submissions (submitter_id, channel, submission_type, request_fields)
        VALUES ($1, 'request', $2, $3::jsonb)
        RETURNING *
        """,
        submitter_id,
        submission_type,
        fields,
    )
    user = await conn.fetchrow("SELECT name FROM users WHERE id = $1", submitter_id)
    result = dict(row)
    result["submitter_name"] = user["name"] if user else None
    result["extracted_fields"] = None
    return result


async def get_submission(conn: asyncpg.Connection, submission_id: int):
    return await conn.fetchrow(
        """
        SELECT s.*, u.name AS submitter_name, e.extracted_fields
        FROM submissions s
        LEFT JOIN users u ON s.submitter_id = u.id
        LEFT JOIN LATERAL (
            SELECT extracted_fields FROM extractions WHERE submission_id = s.id ORDER BY id DESC LIMIT 1
        ) e ON true
        WHERE s.id = $1
        """,
        submission_id,
    )


async def list_submissions(
    conn: asyncpg.Connection,
    submitter_id: int | None,
    status: str | None,
    channel: str | None,
    limit: int,
    offset: int,
):
    query = """
        SELECT s.*, u.name AS submitter_name, e.extracted_fields
        FROM submissions s
        LEFT JOIN users u ON s.submitter_id = u.id
        LEFT JOIN LATERAL (
            SELECT extracted_fields FROM extractions WHERE submission_id = s.id ORDER BY id DESC LIMIT 1
        ) e ON true
        WHERE 1=1
    """
    params: list[Any] = []
    if submitter_id is not None:
        params.append(submitter_id)
        query += f" AND s.submitter_id = ${len(params)}"
    if status is not None:
        params.append(status)
        query += f" AND s.status = ${len(params)}"
    if channel is not None:
        params.append(channel)
        query += f" AND s.channel = ${len(params)}"
    query += " ORDER BY s.created_at DESC"
    params.append(limit)
    query += f" LIMIT ${len(params)}"
    params.append(offset)
    query += f" OFFSET ${len(params)}"
    return await conn.fetch(query, *params)


async def delete_submission(conn: asyncpg.Connection, submission_id: int) -> None:
    await conn.execute("DELETE FROM submissions WHERE id = $1", submission_id)


async def log_audit_event(
    conn: asyncpg.Connection,
    submission_id: int,
    actor_id: int | None,
    event: str,
    details: dict[str, Any] | None = None,
) -> None:
    await conn.execute(
        """
        INSERT INTO audit_log (submission_id, actor_id, event, details)
        VALUES ($1, $2, $3, $4::jsonb)
        """,
        submission_id,
        actor_id,
        event,
        details,
    )