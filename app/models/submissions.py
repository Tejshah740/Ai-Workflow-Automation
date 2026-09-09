from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel


class Channel(str, Enum):
    document = "document"
    request = "request"


class SubmissionStatus(str, Enum):
    submitted = "submitted"
    ai_processing = "ai_processing"
    needs_review = "needs_review"
    pending_approval = "pending_approval"
    approved = "approved"
    rejected = "rejected"
    failed = "failed"


class RequestSubmissionCreate(BaseModel):
    submission_type: str
    fields: dict[str, Any]


class SubmissionOut(BaseModel):
    id: int
    submitter_id: int
    channel: Channel
    submission_type: str
    status: SubmissionStatus
    original_filename: str | None = None
    content_type: str | None = None
    file_size_bytes: int | None = None
    request_fields: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime