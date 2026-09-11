from typing import Any

from pydantic import BaseModel


class WorkflowRuleUpdate(BaseModel):
    levels: list[str]


class FieldsUpdate(BaseModel):
    fields: dict[str, Any]


class DecisionInput(BaseModel):
    comment: str | None = None