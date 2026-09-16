import asyncio
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncpg
from app.config import settings
from app.utils.security import hash_password

USERS = [
    ("admin@example.com", "admin123", "admin"),
    ("reviewer@example.com", "reviewer123", "reviewer"),
    ("approver@example.com", "approver123", "approver"),
]


async def seed():
    conn = await asyncpg.connect(settings.database_url)
    try:
        for email, password, role in USERS:
            hashed = hash_password(password)
            existing = await conn.fetchrow(
                "SELECT id, email, role FROM users WHERE email = $1", email
            )
            if existing:
                await conn.execute(
                    "UPDATE users SET hashed_password = $1, role = $2 WHERE id = $3",
                    hashed,
                    role,
                    existing["id"],
                )
                print(f"Updated user: {email} (ID: {existing['id']}, Role: {role})")
            else:
                row = await conn.fetchrow(
                    """
                    INSERT INTO users (email, hashed_password, role)
                    VALUES ($1, $2, $3)
                    RETURNING id, email, role, created_at
                    """,
                    email,
                    hashed,
                    role,
                )
                print(f"Created user: {email} (ID: {row['id']}, Role: {row['role']})")

        print("\nCurrent Users in Database:")
        rows = await conn.fetch(
            "SELECT id, email, role, created_at FROM users ORDER BY id"
        )
        for r in rows:
            print(f"- ID: {r['id']} | Email: {r['email']} | Role: {r['role']}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed())
