# AI Workflow Automation

An asynchronous workflow automation system built with FastAPI, PostgreSQL, Redis, and RQ (Redis Queue).

## Tech Stack

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **ASGI Server**: [Uvicorn](https://www.uvicorn.org/)
- **Database**: PostgreSQL with [asyncpg](https://github.com/MagicStack/asyncpg)
- **Task Queue / Cache**: Redis & [RQ](https://python-rq.org/)
- **OCR & Document Processing**: Tesseract OCR, Poppler (`pdf2image`, `pytesseract`, `Pillow`)
- **Authentication**: OAuth2 Password Flow with JWT (`python-jose`, `bcrypt`)
- **Validation & Anomaly Detection**: Schema checks, `python-dateutil`, duplicate checking & outlier scoring
- **Workflow & Routing**: Multi-level dynamic approval chains, role-based review queues, audit logs
- **Notifications & Email**: In-app notifications database, SMTP email integration, MailHog for testing
- **Settings Management**: [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- **Containerization**: Docker & Docker Compose

## Project Structure

```text
.
├── app/
│   ├── __init__.py
│   ├── config.py                 # Application settings & environment parsing
│   ├── db.py                     # asyncpg database pool & lifecycle management
│   ├── main.py                   # FastAPI entrypoint, middleware, health endpoints
│   ├── queue.py                  # Redis Queue (RQ) configuration
│   ├── schema.sql                # Database schema migrations & table definitions
│   ├── jobs/
│   │   ├── __init__.py
│   │   └── processing.py         # Asynchronous worker jobs for AI processing & status routing
│   ├── models/
│   │   ├── __init__.py
│   │   ├── auth.py               # Pydantic schemas & enums for Auth (Role, UserCreate, Token)
│   │   ├── submissions.py        # Pydantic schemas & enums for Submissions (Channel, Status)
│   │   ├── validation.py         # Pydantic schemas for ValidationResult and ValidationIssue
│   │   └── workflow.py           # Pydantic schemas for workflow rules, field updates, decisions
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py               # Auth endpoints (register, login, me, promote)
│   │   ├── dashboard.py          # Metrics, reports, and analytics endpoints
│   │   ├── notifications.py      # Notifications endpoints (list, mark read, mark all read)
│   │   ├── submissions.py        # Submission endpoints (intake, downloads, extractions, validations)
│   │   └── workflow.py           # Workflow engine (rules, queues, field corrections, approve/reject)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── anomaly_service.py    # Statistical outlier and 24h duplicate submission detection
│   │   ├── auth_service.py       # Database queries for users & roles
│   │   ├── classification_service.py # Keyword-based document type classifier
│   │   ├── extraction_service.py # Regex field extractor (amount, date, invoice number)
│   │   ├── notification_service.py   # In-app notifications & email dispatch
│   │   ├── ocr_service.py        # OCR runner for images and PDFs with confidence scores
│   │   ├── submission_service.py # Database queries for submissions & audit logging
│   │   ├── validation_service.py # Business rule validation per submission type
│   │   └── workflow_service.py   # Multi-level approval chains and decision tracking
│   └── utils/
│       ├── __init__.py
│       ├── deps.py               # Auth dependencies & RBAC (get_current_user, require_roles)
│       ├── email.py              # SMTP email sender with fallback to console logging
│       ├── file_storage.py       # Safe file upload streaming, validation, storage
│       ├── parsing.py            # Robust amount and date parsing helpers
│       └── security.py           # Password hashing (bcrypt) & JWT helpers
├── docker-compose.yml             # Docker Compose definition (PostgreSQL, Redis, API, Worker, MailHog)
├── Dockerfile                    # Container specification with Tesseract & Poppler
├── requirements.txt              # Python package dependencies
├── .env.example                  # Template for environment variables
└── README.md
```

## Getting Started

### 1. Prerequisites

- Python 3.12+ (or 3.13)
- PostgreSQL (or Docker)
- Redis (or Docker)
- **Local OCR (optional if running locally outside Docker)**:
  - macOS: `brew install tesseract poppler`
  - Linux: `apt-get install tesseract-ocr poppler-utils`

### 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your environment settings in `.env`:

| Variable | Description | Default |
|---|---|---|
| `APP_NAME` | Name of the FastAPI application | `"Workflow Automation System"` |
| `DEBUG` | Enable/disable debug mode | `False` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://workflow_user:workflow_pass@localhost:5432/workflow_db` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379/0` |
| `CORS_ORIGINS` | JSON list of allowed CORS origins | `["http://localhost:5173", "http://localhost:3000"]` |
| `JWT_SECRET_KEY` | Secret key for signing JWT tokens | Required |
| `JWT_ALGORITHM` | JWT signing algorithm | `"HS256"` |
| `JWT_EXPIRE_MINUTES`| Access token expiration in minutes | `1440` |
| `UPLOAD_DIR` | Storage directory for uploaded documents | `"/app/uploads"` (Docker) or `"./uploads"` (Local) |
| `MAX_UPLOAD_SIZE_BYTES` | Maximum allowed upload size (bytes) | `10485760` (10 MB) |
| `CONFIDENCE_THRESHOLD` | Threshold for routing to `pending_approval` vs `needs_review` | `0.6` |
| `SMTP_HOST` | SMTP server host (`mailhog` in Docker, `localhost` locally, or leave blank for console fallback) | `None` |
| `SMTP_PORT` | SMTP server port | `1025` |
| `SMTP_FROM` | Sender email address | `"noreply@workflow.local"` |
| `SMTP_USE_TLS` | Enable TLS for SMTP | `False` |

### 3. Running with Docker Compose (Recommended)

To start all services (PostgreSQL, Redis, API, RQ Worker, MailHog) at once:

```bash
docker compose up --build
```

- The API will be available at [http://localhost:8000](http://localhost:8000).
- Interactive API docs are available at [http://localhost:8000/docs](http://localhost:8000/docs).
- MailHog Web UI (for viewing captured test emails) is available at [http://localhost:8025](http://localhost:8025).

### 4. Running Locally

1. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Ensure PostgreSQL and Redis are running locally.

4. Start the FastAPI API server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

5. In a separate terminal, start the RQ Worker:
   ```bash
   rq worker --url redis://localhost:6379
   ```

## Processing, Workflow & Notifications Pipeline

1. **Intake**: A document or request is submitted with status `submitted`.
2. **AI Processing**: An RQ worker asynchronously executes OCR, classification, and metadata extraction.
3. **Validation & Anomaly Detection**: Validates schema rules, checks for 24h duplicates, and flags statistical outliers.
4. **Initial Routing & Notifications**:
   - High confidence (`>= 0.6`) + valid fields: moves to `pending_approval`, generates approval chain, and dispatches notification/email to the level 1 approvers.
   - Low confidence (`< 0.6`) OR validation issues: moves to `needs_review` and notifies reviewers.
   - Failures notify the submitter and admins.
5. **Human Review**:
   - Reviewers view the `needs_review` queue via `GET /api/workflow/queue`.
   - Reviewers/admins can inspect and patch extracted or form fields (`PUT /api/workflow/{submission_id}/fields`).
   - Resolving review (`POST /api/workflow/{submission_id}/resolve`) re-runs validation and transitions the submission to `pending_approval`, notifying approvers.
6. **Multi-Level Approval**:
   - Approvers view their actionable queue via `GET /api/workflow/queue`.
   - Each level is approved in sequential order (`POST /api/workflow/{submission_id}/approve`), notifying the next role in chain.
   - Once all levels approve, the submission reaches `approved` and the submitter is notified via email and in-app message.
   - Any approver or reviewer can reject (`POST /api/workflow/{submission_id}/reject`), notifying the submitter.

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user (`submitter` by default) | No |
| `POST` | `/api/auth/login` | Authenticate with form credentials and get JWT token | No |
| `GET` | `/api/auth/me` | Fetch the authenticated user's profile | Bearer Token |
| `PUT` | `/api/auth/promote/{user_id}` | Promote/change user role (`admin`, `reviewer`, `approver`, `submitter`) | Admin only |

### Submissions & Intake (`/api/submissions`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/submissions/documents` | Upload a document file (PDF, PNG, JPG, TIFF up to 10MB) and enqueue AI processing | Bearer Token |
| `POST` | `/api/submissions/requests` | Submit structured JSON form/request payload and enqueue processing | Bearer Token |
| `GET` | `/api/submissions` | List submissions (users see own; admins see all; supports filter by status/channel) | Bearer Token |
| `GET` | `/api/submissions/{submission_id}` | Get submission details by ID | Bearer Token (Owner or Admin) |
| `GET` | `/api/submissions/{submission_id}/download` | Download uploaded document file | Bearer Token (Owner or Admin) |
| `GET` | `/api/submissions/{submission_id}/extraction` | Get latest AI extraction & confidence results for a submission | Bearer Token (Owner or Admin) |
| `GET` | `/api/submissions/{submission_id}/validation` | Get latest validation & anomaly detection results for a submission | Bearer Token (Owner or Admin) |
| `GET` | `/api/submissions/{submission_id}/audit` | View complete chronological audit log trail for a submission | Bearer Token (Owner, Reviewer, Approver, Admin) |
| `DELETE` | `/api/submissions/{submission_id}` | Delete submission (only allowed if status is `submitted`) | Bearer Token (Owner or Admin) |

### Workflow Engine (`/api/workflow`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/workflow/rules` | List configured workflow approval rules by submission type | Bearer Token |
| `PUT` | `/api/workflow/rules/{submission_type}` | Upsert approval levels (e.g. `["reviewer", "approver"]`) | Admin only |
| `GET` | `/api/workflow/queue` | View actionable queue items (`needs_review` and `pending_approval`) | Bearer Token |
| `GET` | `/api/workflow/{submission_id}` | View submission status and all sequential approval levels | Bearer Token (Owner, Reviewer, Approver, Admin) |
| `PUT` | `/api/workflow/{submission_id}/fields` | Correct extracted or submitted fields while in `needs_review` | Reviewer, Admin |
| `POST` | `/api/workflow/{submission_id}/resolve` | Re-run validation and escalate from `needs_review` to `pending_approval` | Reviewer, Admin |
| `POST` | `/api/workflow/{submission_id}/approve` | Approve current level in the approval chain | Required Role, Admin |
| `POST` | `/api/workflow/{submission_id}/reject` | Reject submission with optional comment | Reviewer, Approver, Admin |

### Notifications (`/api/notifications`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/notifications` | List notifications for authenticated user (supports `unread_only`, `limit`, `offset`) | Bearer Token |
| `POST` | `/api/notifications/{notification_id}/read` | Mark specific notification as read | Bearer Token (Owner) |
| `POST` | `/api/notifications/read-all` | Mark all user notifications as read | Bearer Token |

### Dashboard & Analytics (`/api/dashboard` & `/api/reports`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/dashboard/summary` | Global submission status counts with optional date filters (`since`, `until`) | Reviewer, Approver, Admin |
| `GET` | `/api/dashboard/by-type` | Submission counts matrix grouped by submission type and status | Reviewer, Approver, Admin |
| `GET` | `/api/reports/processing` | AI metrics: total processed, auto-pass count, review count, avg confidence & duration | Reviewer, Approver, Admin |
| `GET` | `/api/reports/approvals` | Approval vs rejection metrics across levels and individual approvers | Reviewer, Approver, Admin |
| `GET` | `/api/reports/errors` | Recent failure logs and error details from audit log | Reviewer, Approver, Admin |

### Health Check

Verify the API status:

```bash
curl http://localhost:8000/health
```

Expected Response:
```json
{"status": "ok"}
```
