import asyncpg

from app.models.validation import ValidationIssue
from app.utils.parsing import parse_amount

MIN_HISTORY_FOR_OUTLIER_CHECK = 5
OUTLIER_MULTIPLIER = 3


async def _recent_amounts(conn: asyncpg.Connection, submission_type: str, exclude_id: int) -> list[float]:
    rows = await conn.fetch(
        """
        SELECT s.channel, s.request_fields, e.extracted_fields
        FROM submissions s
        LEFT JOIN LATERAL (
            SELECT extracted_fields FROM extractions e
            WHERE e.submission_id = s.id ORDER BY e.id DESC LIMIT 1
        ) e ON true
        WHERE s.submission_type = $1 AND s.id != $2
          AND s.status NOT IN ('failed', 'rejected')
        ORDER BY s.created_at DESC
        LIMIT 50
        """,
        submission_type,
        exclude_id,
    )
    amounts = []
    for row in rows:
        fields = row["extracted_fields"] if row["channel"] == "document" else row["request_fields"]
        amount = parse_amount((fields or {}).get("amount"))
        if amount is not None:
            amounts.append(amount)
    return amounts


async def check_amount_outlier(
    conn: asyncpg.Connection, submission_type: str, exclude_id: int, amount: float | None
) -> ValidationIssue | None:
    if amount is None:
        return None
    history = await _recent_amounts(conn, submission_type, exclude_id)
    if len(history) < MIN_HISTORY_FOR_OUTLIER_CHECK:
        return None
    avg = sum(history) / len(history)
    if avg > 0 and amount > avg * OUTLIER_MULTIPLIER:
        return ValidationIssue(
            field="amount",
            issue=f"${amount:.2f} is more than {OUTLIER_MULTIPLIER}x the recent average "
            f"(${avg:.2f}) for {submission_type}",
            severity="warning",
        )
    return None


async def check_duplicate(conn: asyncpg.Connection, submission, amount: float | None) -> ValidationIssue | None:
    if amount is None:
        return None
    rows = await conn.fetch(
        """
        SELECT s.id, s.channel, s.request_fields, e.extracted_fields
        FROM submissions s
        LEFT JOIN LATERAL (
            SELECT extracted_fields FROM extractions e
            WHERE e.submission_id = s.id ORDER BY e.id DESC LIMIT 1
        ) e ON true
        WHERE s.submitter_id = $1 AND s.submission_type = $2 AND s.id != $3
          AND s.created_at > now() - interval '24 hours'
        """,
        submission["submitter_id"],
        submission["submission_type"],
        submission["id"],
    )
    for row in rows:
        fields = row["extracted_fields"] if row["channel"] == "document" else row["request_fields"]
        other_amount = parse_amount((fields or {}).get("amount"))
        if other_amount is not None and abs(other_amount - amount) < 0.01:
            return ValidationIssue(
                field="*",
                issue=f"Possible duplicate of submission #{row['id']} (same amount and type, within 24h)",
                severity="warning",
            )
    return None