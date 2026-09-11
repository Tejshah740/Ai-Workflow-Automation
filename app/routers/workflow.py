import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_db
from app.models.workflow import DecisionInput, FieldsUpdate, WorkflowRuleUpdate
from app.services.submission_service import get_submission, log_audit_event
from app.services.validation_service import run_validation
from app.services.workflow_service import create_approval_chain, get_current_level, record_decision
from app.utils.deps import get_current_user, require_roles

router = APIRouter(prefix="/api/workflow", tags=["workflow"])


def _can_view(submission, user) -> bool:
    if user["role"] in ("admin", "reviewer", "approver"):
        return True
    return submission["submitter_id"] == user["id"]


@router.get("/rules")
async def list_rules(conn: asyncpg.Connection = Depends(get_db), user=Depends(get_current_user)):
    rows = await conn.fetch("SELECT * FROM workflow_rules ORDER BY submission_type")
    return [dict(r) for r in rows]


@router.put("/rules/{submission_type}")
async def upsert_rule(
    submission_type: str,
    payload: WorkflowRuleUpdate,
    conn: asyncpg.Connection = Depends(get_db),
    _admin=Depends(require_roles("admin")),
):
    row = await conn.fetchrow(
        """
        INSERT INTO workflow_rules (submission_type, levels)
        VALUES ($1, $2::jsonb)
        ON CONFLICT (submission_type) DO UPDATE SET levels = $2::jsonb, updated_at = now()
        RETURNING *
        """,
        submission_type,
        payload.levels,
    )
    return dict(row)


@router.get("/queue")
async def my_queue(conn: asyncpg.Connection = Depends(get_db), user=Depends(get_current_user)):
    needs_review = []
    pending = []

    if user["role"] in ("admin", "reviewer"):
        rows = await conn.fetch("SELECT * FROM submissions WHERE status = 'needs_review' ORDER BY created_at")
        needs_review = [dict(r) for r in rows]

    if user["role"] in ("admin", "approver"):
        rows = await conn.fetch("SELECT * FROM submissions WHERE status = 'pending_approval' ORDER BY created_at")
        for row in rows:
            current = await get_current_level(conn, row["id"])
            if current and (user["role"] == "admin" or current["required_role"] == user["role"]):
                pending.append(dict(row))

    return {"needs_review": needs_review, "pending_approval": pending}


@router.get("/{submission_id}")
async def get_workflow_status(
    submission_id: int,
    conn: asyncpg.Connection = Depends(get_db),
    user=Depends(get_current_user),
):
    submission = await get_submission(conn, submission_id)
    if submission is None or not _can_view(submission, user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    approvals = await conn.fetch(
        "SELECT * FROM approvals WHERE submission_id = $1 ORDER BY level", submission_id
    )
    return {"submission": dict(submission), "approvals": [dict(a) for a in approvals]}


@router.put("/{submission_id}/fields")
async def correct_fields(
    submission_id: int,
    payload: FieldsUpdate,
    conn: asyncpg.Connection = Depends(get_db),
    user=Depends(require_roles("reviewer", "admin")),
):
    submission = await get_submission(conn, submission_id)
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if submission["status"] != "needs_review":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fields can only be corrected while status is needs_review",
        )

    if submission["channel"] == "document":
        extraction = await conn.fetchrow(
            "SELECT id, extracted_fields FROM extractions WHERE submission_id = $1 ORDER BY id DESC LIMIT 1",
            submission_id,
        )
        current_fields = (extraction["extracted_fields"] if extraction else {}) or {}
        merged = {**current_fields, **payload.fields}
        await conn.execute(
            "UPDATE extractions SET extracted_fields = $1::jsonb WHERE id = $2",
            merged,
            extraction["id"],
        )
    else:
        current_fields = submission["request_fields"] or {}
        merged = {**current_fields, **payload.fields}
        await conn.execute(
            "UPDATE submissions SET request_fields = $1::jsonb, updated_at = now() WHERE id = $2",
            merged,
            submission_id,
        )

    await log_audit_event(
        conn, submission_id, user["id"], "fields_corrected", {"corrected_fields": payload.fields}
    )
    return {"status": "ok", "fields": merged}


@router.post("/{submission_id}/resolve")
async def resolve_review(
    submission_id: int,
    conn: asyncpg.Connection = Depends(get_db),
    user=Depends(require_roles("reviewer", "admin")),
):
    submission = await get_submission(conn, submission_id)
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if submission["status"] != "needs_review":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Can only resolve submissions in needs_review"
        )

    validation_result = await run_validation(conn, submission)

    await conn.execute(
        "UPDATE submissions SET status = 'pending_approval', updated_at = now() WHERE id = $1",
        submission_id,
    )
    await create_approval_chain(conn, submission_id, submission["submission_type"])
    await log_audit_event(
        conn,
        submission_id,
        user["id"],
        "review_resolved",
        {"validation_valid": validation_result.is_valid, "issue_count": len(validation_result.issues)},
    )
    return {"status": "pending_approval", "validation": validation_result.model_dump()}


@router.post("/{submission_id}/approve")
async def approve_submission(
    submission_id: int,
    payload: DecisionInput,
    conn: asyncpg.Connection = Depends(get_db),
    user=Depends(get_current_user),
):
    submission = await get_submission(conn, submission_id)
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if submission["status"] != "pending_approval":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Submission is not pending approval")

    current = await get_current_level(conn, submission_id)
    if current is None:
        raise HTTPException(status_code=500, detail="No approval chain found for this submission")
    if user["role"] != "admin" and user["role"] != current["required_role"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"Requires role: {current['required_role']}"
        )

    await record_decision(conn, current["id"], "approved", user["id"], payload.comment)

    next_level = await get_current_level(conn, submission_id)
    if next_level is None:
        await conn.execute(
            "UPDATE submissions SET status = 'approved', updated_at = now() WHERE id = $1", submission_id
        )
        final_status = "approved"
    else:
        final_status = "pending_approval"

    await log_audit_event(
        conn,
        submission_id,
        user["id"],
        "level_approved",
        {"level": current["level"], "next_status": final_status},
    )
    return {"status": final_status}


@router.post("/{submission_id}/reject")
async def reject_submission(
    submission_id: int,
    payload: DecisionInput,
    conn: asyncpg.Connection = Depends(get_db),
    user=Depends(get_current_user),
):
    submission = await get_submission(conn, submission_id)
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    if submission["status"] == "needs_review":
        if user["role"] not in ("reviewer", "admin"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requires role: reviewer")
    elif submission["status"] == "pending_approval":
        current = await get_current_level(conn, submission_id)
        if current is None:
            raise HTTPException(status_code=500, detail="No approval chain found for this submission")
        if user["role"] != "admin" and user["role"] != current["required_role"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=f"Requires role: {current['required_role']}"
            )
        await record_decision(conn, current["id"], "rejected", user["id"], payload.comment)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Submission cannot be rejected from its current status"
        )

    await conn.execute(
        "UPDATE submissions SET status = 'rejected', updated_at = now() WHERE id = $1", submission_id
    )
    await log_audit_event(
        conn,
        submission_id,
        user["id"],
        "submission_rejected",
        {"from_status": submission["status"], "comment": payload.comment},
    )
    return {"status": "rejected"}