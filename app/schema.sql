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

-- Module 3: intake
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    submitter_id INTEGER NOT NULL REFERENCES users(id),
    channel TEXT NOT NULL CHECK (channel IN ('document', 'request')),
    submission_type TEXT NOT NULL DEFAULT 'unknown',
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
        'submitted', 'ai_processing', 'needs_review', 'pending_approval',
        'approved', 'rejected', 'failed'
    )),
    -- channel = 'document'
    stored_filename TEXT,
    original_filename TEXT,
    content_type TEXT,
    file_size_bytes INTEGER,
    -- channel = 'request'
    request_fields JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER REFERENCES submissions(id) ON DELETE SET NULL,
    actor_id INTEGER REFERENCES users(id),
    event TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Module 4: AI extraction + confidence scoring
CREATE TABLE IF NOT EXISTS extractions (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    raw_text TEXT,
    ocr_confidence REAL,
    predicted_type TEXT,
    classification_confidence REAL,
    extracted_fields JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Module 5: validation + anomaly detection
CREATE TABLE IF NOT EXISTS validations (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    is_valid BOOLEAN NOT NULL,
    issues JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);