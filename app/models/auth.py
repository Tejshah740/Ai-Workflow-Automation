from datetime import datetime
from enum import Enum

from pydantic import BaseModel, EmailStr


class Role(str, Enum):
    admin = "admin"
    reviewer = "reviewer"
    approver = "approver"
    submitter = "submitter"


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: Role
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PromoteRequest(BaseModel):
    role: Role


