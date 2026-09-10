from datetime import date
from typing import Any

import asyncpg

from app.models.validation import ValidationIssue, ValidationResult
from app.services.anomaly_service import check_amount_outlier, check_duplicate
from app.utils.parsing import parse_amount, parse_date


def _require(fields: dict, key: str, issues: list[ValidationIssue]) -> None:
    if not fields.get(key):
        issues.append(ValidationIssue(field=key, issue=f"{key} is required", severity="error"))


def _check_amount_field(fields: dict, issues: list[ValidationIssue]) -> None:
    raw = fields.get("amount")
    if not raw:
        return
    amount = parse_amount(raw)
    if amount is None:
        issues.append(ValidationIssue(field="amount", issue="Amount is not a valid number", severity="error"))
    elif amount <= 0:
        issues.append(ValidationIssue(field="amount", issue="Amount must be positive", severity="error"))


def validate_invoice(fields: dict) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    _require(fields, "amount", issues)
    _require(fields, "invoice_number", issues)
    _check_amount_field(fields, issues)

    raw_date = fields.get("date")
    if raw_date:
        parsed = parse_date(raw_date)
        if parsed is None:
            issues.append(ValidationIssue(field="date", issue="Date is not parseable", severity="warning"))
        elif parsed > date.today():
            issues.append(ValidationIssue(field="date", issue="Invoice date is in the future", severity="warning"))
    return issues


def validate_receipt(fields: dict) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    _require(fields, "amount", issues)
    _check_amount_field(fields, issues)
    return issues


def _validate_minimal(fields: dict) -> list[ValidationIssue]:
    """Flag only if nothing at all was extracted — used for types without a strict schema yet."""
    if not any(fields.values()):
        return [ValidationIssue(field="*", issue="No fields could be extracted", severity="warning")]
    return []


def validate_other(fields: dict) -> list[ValidationIssue]:
    return []


DOCUMENT_VALIDATORS = {
    "invoice": validate_invoice,
    "receipt": validate_receipt,
    "purchase_order": _validate_minimal,
    "contract": _validate_minimal,
    "other": validate_other,
}


def validate_leave_request(fields: dict) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    _require(fields, "start_date", issues)
    _require(fields, "end_date", issues)

    start = parse_date(fields.get("start_date")) if fields.get("start_date") else None
    if fields.get("start_date") and start is None:
        issues.append(ValidationIssue(field="start_date", issue="start_date is not parseable", severity="error"))

    end = parse_date(fields.get("end_date")) if fields.get("end_date") else None
    if fields.get("end_date") and end is None:
        issues.append(ValidationIssue(field="end_date", issue="end_date is not parseable", severity="error"))

    if start and end and end < start:
        issues.append(ValidationIssue(field="end_date", issue="end_date is before start_date", severity="error"))
    return issues


def validate_amount_request(fields: dict) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    _require(fields, "amount", issues)
    _check_amount_field(fields, issues)
    return issues


def validate_other_request(fields: dict) -> list[ValidationIssue]:
    return []


REQUEST_VALIDATORS = {
    "leave_request": validate_leave_request,
    "purchase_request": validate_amount_request,
    "expense_reimbursement": validate_amount_request,
    "other_request": validate_other_request,
}


def validate_submission(channel: str, submission_type: str, fields: dict[str, Any]) -> list[ValidationIssue]:
    if channel == "document":
        validator = DOCUMENT_VALIDATORS.get(submission_type, validate_other)
    else:
        validator = REQUEST_VALIDATORS.get(submission_type, validate_other_request)
    return validator(fields)


async def run_validation(conn: asyncpg.Connection, submission) -> ValidationResult:

    if submission["channel"] == "document":
        extraction = await conn.fetchrow(
            "SELECT extracted_fields FROM extractions WHERE submission_id = $1 ORDER BY id DESC LIMIT 1",
            submission["id"],
        )
        fields = extraction["extracted_fields"] if extraction and extraction["extracted_fields"] else {}
    else:
        fields = submission["request_fields"] or {}

    issues = validate_submission(submission["channel"], submission["submission_type"], fields)

    amount = parse_amount(fields.get("amount"))
    dup_issue = await check_duplicate(conn, submission, amount)
    if dup_issue:
        issues.append(dup_issue)
    outlier_issue = await check_amount_outlier(conn, submission["submission_type"], submission["id"], amount)
    if outlier_issue:
        issues.append(outlier_issue)

    is_valid = not any(i.severity == "error" for i in issues)

    await conn.execute(
        "INSERT INTO validations (submission_id, is_valid, issues) VALUES ($1, $2, $3::jsonb)",
        submission["id"],
        is_valid,
        [i.model_dump() for i in issues],
    )

    return ValidationResult(submission_id=submission["id"], is_valid=is_valid, issues=issues)