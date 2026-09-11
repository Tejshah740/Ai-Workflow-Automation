import asyncpg

DEFAULT_APPROVAL_LEVELS = ["approver"]


async def get_workflow_levels(conn: asyncpg.Connection, submission_type: str) -> list[str]:
    rule = await conn.fetchrow(
        "SELECT levels FROM workflow_rules WHERE submission_type = $1", submission_type
    )
    return rule["levels"] if rule else DEFAULT_APPROVAL_LEVELS


async def create_approval_chain(conn: asyncpg.Connection, submission_id: int, submission_type: str) -> None:
    existing = await conn.fetchval("SELECT COUNT(*) FROM approvals WHERE submission_id = $1", submission_id)
    if existing:
        return
    levels = await get_workflow_levels(conn, submission_type)
    for level, role in enumerate(levels, start=1):
        await conn.execute(
            "INSERT INTO approvals (submission_id, level, required_role) VALUES ($1, $2, $3)",
            submission_id,
            level,
            role,
        )


async def get_current_level(conn: asyncpg.Connection, submission_id: int):
    """The lowest-numbered level still awaiting a decision, or None if the chain is complete."""
    return await conn.fetchrow(
        """
        SELECT * FROM approvals
        WHERE submission_id = $1 AND decision IS NULL
        ORDER BY level ASC
        LIMIT 1
        """,
        submission_id,
    )


async def record_decision(
    conn: asyncpg.Connection, approval_id: int, decision: str, decided_by: int, comment: str | None
) -> None:
    await conn.execute(
        """
        UPDATE approvals
        SET decision = $1, decided_by = $2, comment = $3, decided_at = now()
        WHERE id = $4
        """,
        decision,
        decided_by,
        comment,
        approval_id,
    )