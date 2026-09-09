import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.db import get_db
from app.models.auth import PromoteRequest, Token, UserCreate, UserOut
from app.services.auth_service import (
    authenticate_user,
    create_user,
    get_user_by_email,
    update_user_role,
)
from app.utils.deps import get_current_user, require_roles
from app.utils.security import create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, conn: asyncpg.Connection = Depends(get_db)):
    existing = await get_user_by_email(conn, payload.email)
    if existing is not None:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = await create_user(conn, payload.email, payload.password)
    return dict(user)


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    conn: asyncpg.Connection = Depends(get_db),
):
    user = await authenticate_user(conn, form_data.username, form_data.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": str(user["id"])})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return dict(user)


@router.put("/promote/{user_id}", response_model=UserOut)
async def promote(
    user_id: int,
    payload: PromoteRequest,
    conn: asyncpg.Connection = Depends(get_db),
    _admin=Depends(require_roles("admin")),
):
    user = await update_user_role(conn, user_id, payload.role)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(user)
