from typing import Literal

from pydantic import BaseModel


class ValidationIssue(BaseModel):
    field: str
    issue: str
    severity: Literal["error", "warning"]


class ValidationResult(BaseModel):
    submission_id: int
    is_valid: bool
    issues: list[ValidationIssue]