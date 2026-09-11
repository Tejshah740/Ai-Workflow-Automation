from datetime import datetime

import asyncpg
from fastapi import APIRouter, Depends

from app.db import get_db
from app.utils.deps import require_roles

router = APIRouter(tags=["dashboard"])

ALL_STATUSES = [
    "submitted",
    "ai_processing",
    "needs_review",
    "pending_approval",
    "approved",
    "rejected",
    "failed",
]

_can_view_dashboard = require_roles("admin", "reviewer", "approver")


@router.get("/api/dashboard/summary")
async def dashboard_summary(
    since: datetime | None = None,
    until: datetime | None = None,
    conn: asyncpg.Connection = Depends(get_db),
    _user=Depends(_can_view_dashboard),
):
    rows = await conn.fetch(
        """
        SELECT status, COUNT(*) AS count
        FROM submissions
        WHERE ($1::timestamptz IS NULL OR created_at >= $1)
          AND ($2::timestamptz IS NULL OR created_at <= $2)
        GROUP BY status
        """,
        since,
        until,
    )
    counts = {row["status"]: row["count"] for row in rows}
    return {status: counts.get(status, 0) for status in ALL_STATUSES}


@router.get("/api/dashboard/by-type")
async def dashboard_by_type(
    since: datetime | None = None,
    until: datetime | None = None,
    conn: asyncpg.Connection = Depends(get_db),
    _user=Depends(_can_view_dashboard),
):
    rows = await conn.fetch(
        """
        SELECT submission_type, status, COUNT(*) AS count
        FROM submissions
        WHERE ($1::timestamptz IS NULL OR created_at >= $1)
          AND ($2::timestamptz IS NULL OR created_at <= $2)
        GROUP BY submission_type, status
        ORDER BY submission_type, status
        """,
        since,
        until,
    )
    result: dict[str, dict[str, int]] = {}
    for row in rows:
        result.setdefault(row["submission_type"], {})[row["status"]] = row["count"]
    return result


@router.get("/api/reports/processing")
async def processing_report(
    since: datetime | None = None,
    until: datetime | None = None,
    conn: asyncpg.Connection = Depends(get_db),
    _user=Depends(_can_view_dashboard),
):
    completed = await conn.fetch(
        """
        SELECT details FROM audit_log
        WHERE event = 'ai_processing_completed'
          AND ($1::timestamptz IS NULL OR created_at >= $1)
          AND ($2::timestamptz IS NULL OR created_at <= $2)
        """,
        since,
        until,
    )
    confidences = [row["details"]["confidence"] for row in completed if "confidence" in row["details"]]
    auto_passed = sum(1 for row in completed if row["details"].get("next_status") == "pending_approval")
    needed_review = sum(1 for row in completed if row["details"].get("next_status") == "needs_review")

    failed_count = await conn.fetchval(
        """
        SELECT COUNT(*) FROM audit_log
        WHERE event = 'ai_processing_failed'
          AND ($1::timestamptz IS NULL OR created_at >= $1)
          AND ($2::timestamptz IS NULL OR created_at <= $2)
        """,
        since,
        until,
    )

    avg_seconds = await conn.fetchval(
        """
        SELECT AVG(EXTRACT(EPOCH FROM (al.created_at - s.created_at)))
        FROM audit_log al
        JOIN submissions s ON s.id = al.submission_id
        WHERE al.event = 'ai_processing_completed'
          AND ($1::timestamptz IS NULL OR al.created_at >= $1)
          AND ($2::timestamptz IS NULL OR al.created_at <= $2)
        """,
        since,
        until,
    )

    return {
        "total_processed": len(completed),
        "auto_passed": auto_passed,
        "needed_review": needed_review,
        "failed": failed_count,
        "average_confidence": (sum(confidences) / len(confidences)) if confidences else None,
        "average_processing_seconds": float(avg_seconds) if avg_seconds is not None else None,
    }


@router.get("/api/reports/approvals")
async def approvals_report(
    conn: asyncpg.Connection = Depends(get_db),
    _user=Depends(_can_view_dashboard),
):
    totals = await conn.fetch(
        "SELECT decision, COUNT(*) AS count FROM approvals WHERE decision IS NOT NULL GROUP BY decision"
    )
    by_level = await conn.fetch(
        """
        SELECT level, decision, COUNT(*) AS count FROM approvals
        WHERE decision IS NOT NULL
        GROUP BY level, decision
        ORDER BY level
        """
    )
    by_approver = await conn.fetch(
        """
        SELECT u.email, a.decision, COUNT(*) AS count
        FROM approvals a
        JOIN users u ON u.id = a.decided_by
        WHERE a.decision IS NOT NULL
        GROUP BY u.email, a.decision
        ORDER BY u.email
        """
    )
    return {
        "totals": {row["decision"]: row["count"] for row in totals},
        "by_level": [dict(r) for r in by_level],
        "by_approver": [dict(r) for r in by_approver],
    }


@router.get("/api/reports/errors")
async def errors_report(
    limit: int = 50,
    conn: asyncpg.Connection = Depends(get_db),
    _user=Depends(_can_view_dashboard),
):
    rows = await conn.fetch(
        """
        SELECT al.submission_id, al.details, al.created_at, s.submission_type, s.channel
        FROM audit_log al
        LEFT JOIN submissions s ON s.id = al.submission_id
        WHERE al.event = 'ai_processing_failed'
        ORDER BY al.created_at DESC
        LIMIT $1
        """,
        limit,
    )
    return [dict(r) for r in rows]