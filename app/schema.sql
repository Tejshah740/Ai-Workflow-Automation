-- Accumulates DDL across modules. Executed in full on API startup (init_db in app/db.py).
-- Every statement should be idempotent (CREATE TABLE IF NOT EXISTS, etc).

-- Module 2: auth
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'submitter'
        CHECK (role IN ('admin', 'reviewer', 'approver', 'submitter')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);