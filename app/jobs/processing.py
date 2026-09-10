import asyncio
from pathlib import Path

import asyncpg

from app.config import settings
from app.db import init_connection
from app.services.classification_service import classify_text
from app.services.extraction_service import extract_fields
from app.services.ocr_service import run_ocr

PERMANENT_ERRORS = (FileNotFoundError,)


def process_submission_job(submission_id: int) -> None:
    asyncio.run(_process_submission(submission_id))


async def _process_submission(submission_id: int) -> None:
    conn = await asyncpg.connect(settings.database_url)
    await init_connection(conn)
    try:
        submission = await conn.fetchrow("SELECT * FROM submissions WHERE id = $1", submission_id)
        if submission is None:
            return

        await conn.execute(
            "UPDATE submissions SET status = 'ai_processing', updated_at = now() WHERE id = $1",
            submission_id,
        )

        try:
            if submission["channel"] == "document":
                overall_confidence = await _process_document(conn, submission)
            else:
                overall_confidence = 1.0  
        except PERMANENT_ERRORS as exc:
            await _fail_permanently(conn, submission_id, str(exc))
            return

        next_status = (
            "pending_approval" if overall_confidence >= settings.confidence_threshold else "needs_review"
        )
        await conn.execute(
            "UPDATE submissions SET status = $1, updated_at = now() WHERE id = $2",
            next_status,
            submission_id,
        )
        await conn.execute(
            "INSERT INTO audit_log (submission_id, event, details) VALUES ($1, $2, $3::jsonb)",
            submission_id,
            "ai_processing_completed",
            {"confidence": overall_confidence, "next_status": next_status},
        )
    finally:
        await conn.close()


async def _process_document(conn: asyncpg.Connection, submission) -> float:
    file_path = Path(settings.upload_dir) / submission["stored_filename"]
    if not file_path.exists():
        raise FileNotFoundError(f"Stored file missing: {file_path}")

    raw_text, ocr_confidence = await asyncio.to_thread(run_ocr, file_path)
    predicted_type, classification_confidence = classify_text(raw_text)
    fields = extract_fields(raw_text)
    overall_confidence = min(ocr_confidence, classification_confidence)

    await conn.execute(
        """
        INSERT INTO extractions (
            submission_id, raw_text, ocr_confidence, predicted_type,
            classification_confidence, extracted_fields
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        """,
        submission["id"],
        raw_text,
        ocr_confidence,
        predicted_type,
        classification_confidence,
        fields,
    )
    await conn.execute(
        "UPDATE submissions SET submission_type = $1 WHERE id = $2",
        predicted_type,
        submission["id"],
    )
    return overall_confidence


async def _fail_permanently(conn: asyncpg.Connection, submission_id: int, error: str) -> None:
    await conn.execute(
        "UPDATE submissions SET status = 'failed', updated_at = now() WHERE id = $1",
        submission_id,
    )
    await conn.execute(
        "INSERT INTO audit_log (submission_id, event, details) VALUES ($1, $2, $3::jsonb)",
        submission_id,
        "ai_processing_failed",
        {"error": error, "retried": False},
    )


def handle_processing_failure(job, connection, exc_type, exc_value, traceback) -> bool:
    if job.retries_left:
        return True
    submission_id = job.args[0]
    asyncio.run(_mark_failed_after_retries(submission_id, str(exc_value)))
    return True


async def _mark_failed_after_retries(submission_id: int, error: str) -> None:
    conn = await asyncpg.connect(settings.database_url)
    await init_connection(conn)
    try:
        await conn.execute(
            "UPDATE submissions SET status = 'failed', updated_at = now() WHERE id = $1",
            submission_id,
        )
        await conn.execute(
            "INSERT INTO audit_log (submission_id, event, details) VALUES ($1, $2, $3::jsonb)",
            submission_id,
            "ai_processing_failed",
            {"error": error, "retried": True},
        )
    finally:
        await conn.close()