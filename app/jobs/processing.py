import asyncio
from pathlib import Path

import asyncpg

from app.config import settings
from app.db import init_connection
from app.services.classification_service import classify_text
from app.services.extraction_service import extract_fields
from app.services.ocr_service import run_ocr
from app.services.validation_service import run_validation

# Bad input — retrying won't help, fail immediately instead of burning RQ's retry budget.
PERMANENT_ERRORS = (FileNotFoundError,)


def process_submission_job(submission_id: int) -> None:
    """RQ entrypoint (sync — RQ workers run jobs synchronously). Wraps the async pipeline."""
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
                overall_confidence = 1.0  # structured fields, nothing to extract/classify
        except PERMANENT_ERRORS as exc:
            await _fail_permanently(conn, submission_id, str(exc))
            return

        # re-fetch: classification may have just updated submission_type
        submission = await conn.fetchrow("SELECT * FROM submissions WHERE id = $1", submission_id)
        validation_result = await run_validation(conn, submission)

        low_confidence = overall_confidence < settings.confidence_threshold
        has_validation_errors = not validation_result.is_valid
        next_status = "needs_review" if (low_confidence or has_validation_errors) else "pending_approval"

        await conn.execute(
            "UPDATE submissions SET status = $1, updated_at = now() WHERE id = $2",
            next_status,
            submission_id,
        )
        await conn.execute(
            "INSERT INTO audit_log (submission_id, event, details) VALUES ($1, $2, $3::jsonb)",
            submission_id,
            "ai_processing_completed",
            {
                "confidence": overall_confidence,
                "validation_valid": validation_result.is_valid,
                "validation_issue_count": len(validation_result.issues),
                "next_status": next_status,
            },
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
    """RQ failure callback. Fires on EVERY failed attempt, not just the last one —
    job.retries_left tells us whether RQ is about to retry (skip) or this is final (mark failed)."""
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