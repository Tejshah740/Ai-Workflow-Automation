from pathlib import Path

import asyncpg
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from rq import Retry

from app.config import settings
from app.db import get_db
from app.jobs.processing import handle_processing_failure, process_submission_job
from app.models.submissions import Channel, RequestSubmissionCreate, SubmissionOut, SubmissionStatus
from app.queue import task_queue
from app.services.submission_service import (
    create_document_submission,
    create_request_submission,
    delete_submission as delete_submission_row,
    get_submission,
    list_submissions,
    log_audit_event,
)
from app.utils.deps import get_current_user
from app.utils.file_storage import UploadValidationError, save_upload

router = APIRouter(prefix="/api/submissions", tags=["submissions"])


def _enqueue_processing(submission_id: int) -> None:
    task_queue.enqueue(
        process_submission_job,
        submission_id,
        retry=Retry(max=3, interval=[10, 30, 60]),
        on_failure=handle_processing_failure,
    )


def _ensure_owner_or_admin(submission, user) -> None:
    if user["role"] != "admin" and submission["submitter_id"] != user["id"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")


@router.post("/documents", response_model=SubmissionOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    submission_type: str = Form("unknown"),
    file: UploadFile = File(...),
    conn: asyncpg.Connection = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        stored_filename, size = await save_upload(
            file, Path(settings.upload_dir), settings.max_upload_size_bytes
        )
    except UploadValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    submission = await create_document_submission(
        conn,
        submitter_id=user["id"],
        submission_type=submission_type,
        stored_filename=stored_filename,
        original_filename=file.filename,
        content_type=file.content_type,
        file_size_bytes=size,
    )
    await log_audit_event(conn, submission["id"], user["id"], "submission_created", {"channel": "document"})
    _enqueue_processing(submission["id"])
    return dict(submission)


@router.post("/requests", response_model=SubmissionOut, status_code=status.HTTP_201_CREATED)
async def submit_request(
    payload: RequestSubmissionCreate,
    conn: asyncpg.Connection = Depends(get_db),
    user=Depends(get_current_user),
):
    submission = await create_request_submission(
        conn,
        submitter_id=user["id"],
        submission_type=payload.submission_type,
        fields=payload.fields,
    )
    await log_audit_event(conn, submission["id"], user["id"], "submission_created", {"channel": "request"})
    _enqueue_processing(submission["id"])
    return dict(submission)


@router.get("", response_model=list[SubmissionOut])
async def list_my_submissions(
    status_filter: SubmissionStatus | None = None,
    channel: Channel | None = None,
    limit: int = 20,
    offset: int = 0,
    conn: asyncpg.Connection = Depends(get_db),
    user=Depends(get_current_user),
):
    submitter_id = None if user["role"] == "admin" else user["id"]
    rows = await list_submissions(
        conn,
        submitter_id=submitter_id,
        status=status_filter.value if status_filter else None,
        channel=channel.value if channel else None,
        limit=limit,
        offset=offset,
    )
    return [dict(r) for r in rows]


@router.get("/{submission_id}", response_model=SubmissionOut)
async def get_one_submission(
    submission_id: int,
    conn: asyncpg.Connection = Depends(get_db),
    user=Depends(get_current_user),
):
    submission = await get_submission(conn, submission_id)
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    _ensure_owner_or_admin(submission, user)
    return dict(submission)


@router.get("/{submission_id}/download")
async def download_submission(
    submission_id: int,
    conn: asyncpg.Connection = Depends(get_db),
    user=Depends(get_current_user),
):
    submission = await get_submission(conn, submission_id)
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    _ensure_owner_or_admin(submission, user)
    if submission["channel"] != "document":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Submission has no file")

    file_path = Path(settings.upload_dir) / submission["stored_filename"]
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

    return FileResponse(
        file_path,
        media_type=submission["content_type"] or "application/octet-stream",
        filename=submission["original_filename"],
    )


@router.delete("/{submission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_one_submission(
    submission_id: int,
    conn: asyncpg.Connection = Depends(get_db),
    user=Depends(get_current_user),
):
    submission = await get_submission(conn, submission_id)
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    _ensure_owner_or_admin(submission, user)
    if submission["status"] != "submitted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only unprocessed submissions (status=submitted) can be deleted",
        )

    if submission["channel"] == "document" and submission["stored_filename"]:
        file_path = Path(settings.upload_dir) / submission["stored_filename"]
        file_path.unlink(missing_ok=True)

    await log_audit_event(
        conn, submission_id, user["id"], "submission_deleted", {"submission_id": submission_id}
    )
    await delete_submission_row(conn, submission_id)


@router.get("/{submission_id}/audit")
async def get_audit_trail(
    submission_id: int,
    conn: asyncpg.Connection = Depends(get_db),
    user=Depends(get_current_user),
):
    submission = await get_submission(conn, submission_id)
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if user["role"] not in ("admin", "reviewer", "approver") and submission["submitter_id"] != user["id"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    rows = await conn.fetch(
        "SELECT * FROM audit_log WHERE submission_id = $1 ORDER BY created_at", submission_id
    )
    return [dict(r) for r in rows]


@router.get("/{submission_id}/extraction")
async def get_extraction(
    submission_id: int,
    conn: asyncpg.Connection = Depends(get_db),
    user=Depends(get_current_user),
):
    submission = await get_submission(conn, submission_id)
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    _ensure_owner_or_admin(submission, user)

    extraction = await conn.fetchrow(
        "SELECT * FROM extractions WHERE submission_id = $1 ORDER BY id DESC LIMIT 1",
        submission_id,
    )
    if extraction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No extraction yet")
    return dict(extraction)


@router.get("/{submission_id}/validation")
async def get_validation(
    submission_id: int,
    conn: asyncpg.Connection = Depends(get_db),
    user=Depends(get_current_user),
):
    submission = await get_submission(conn, submission_id)
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    _ensure_owner_or_admin(submission, user)

    validation = await conn.fetchrow(
        "SELECT * FROM validations WHERE submission_id = $1 ORDER BY id DESC LIMIT 1",
        submission_id,
    )
    if validation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No validation yet")
    return dict(validation)