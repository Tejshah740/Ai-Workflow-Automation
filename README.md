# AI Workflow Automation

An asynchronous workflow automation system built with FastAPI, PostgreSQL, Redis, RQ (Redis Queue), and a modern React + Vite frontend.

## Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **ASGI Server**: [Uvicorn](https://www.uvicorn.org/)
- **Database**: PostgreSQL with [asyncpg](https://github.com/MagicStack/asyncpg)
- **Task Queue / Cache**: Redis & [RQ](https://python-rq.org/)
- **OCR & Document Processing**: Tesseract OCR, Poppler (`pdf2image`, `pytesseract`, `Pillow`)
- **Authentication**: OAuth2 Password Flow with JWT (`python-jose`, `bcrypt`)
- **Validation & Anomaly Detection**: Schema checks, `python-dateutil`, duplicate checking & outlier scoring
- **Workflow & Routing**: Multi-level dynamic approval chains, role-based review queues, audit logs
- **Notifications**: In-app notifications database and notification center
- **Settings Management**: [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- **Containerization**: Docker & Docker Compose

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- **Routing**: [React Router 7](https://reactrouter.com/)
- **Styling**: [TailwindCSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **HTTP Client**: [Axios](https://axios-http.com/) (with JWT interceptors & auth context)

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
│   │   ├── submissions.py        # Submission endpoints (intake, extractions, validations)
│   │   └── workflow.py           # Workflow engine (rules, queues, field corrections, approve/reject)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── anomaly_service.py    # Statistical outlier and 24h duplicate submission detection
│   │   ├── auth_service.py       # Database queries for users & roles
│   │   ├── classification_service.py # Keyword-based document type classifier
│   │   ├── extraction_service.py # Regex field extractor (amount, date, invoice number)
│   │   ├── notification_service.py   # In-app notifications
│   │   ├── ocr_service.py        # OCR runner for images and PDFs with confidence scores
│   │   ├── submission_service.py # Database queries for submissions & audit logging
│   │   ├── validation_service.py # Business rule validation per submission type
│   │   └── workflow_service.py   # Multi-level approval chains and decision tracking
│   └── utils/
│       ├── __init__.py
│       ├── deps.py               # Auth dependencies & RBAC (get_current_user, require_roles)
│       ├── file_storage.py       # Safe file upload streaming, validation, storage
│       ├── parsing.py            # Robust amount and date parsing helpers
│       └── security.py           # Password hashing (bcrypt) & JWT helpers
├── frontend/                     # React 19 + Vite + TailwindCSS client application
│   ├── src/
│   │   ├── api/                  # Axios instance with auth interceptors
│   │   ├── components/           # ProtectedRoute, InputField, UI components
│   │   ├── context/              # AuthContext (login, register, token handling)
│   │   ├── pages/                # LoginPage, RegisterPage, DashboardPage
│   │   ├── App.jsx               # Main router & routes
│   │   ├── main.jsx              # App root & providers
│   │   └── index.css             # Tailwind base & component styles
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── tests/                        # Comprehensive test suite
│   ├── conftest.py               # Shared test fixtures, mock data & DB lifecycle
│   ├── unit/                     # Unit tests (validation rules, OCR scoring)
│   ├── integration/              # Integration tests (workflow engine & approval chains)
│   └── e2e/                      # End-to-end pipeline flow tests
├── scripts/                      # Developer and administrative scripts
│   └── seed_users.py             # Database user seeding script
├── docker-compose.yml             # Docker Compose definition (PostgreSQL, Redis, API, Worker)
├── Dockerfile                    # Container specification with Tesseract & Poppler
├── requirements.txt              # Production Python package dependencies
├── requirements-dev.txt          # Development & test dependencies
├── pytest.ini                    # Pytest configuration
├── .env.example                  # Template for environment variables
└── README.md
```

## Getting Started

### 1. Prerequisites

- Python 3.12+ (or 3.13)
- Node.js 18+ & npm
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


### 3. Running with Docker Compose (Backend Services)

To start all backend services (PostgreSQL, Redis, API, RQ Worker) at once:

```bash
docker compose up --build
```

- The API will be available at [http://localhost:8000](http://localhost:8000).
- Interactive API docs are available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 4. Running Backend Locally

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

### 5. Running Frontend Locally

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite dev server:
   ```bash
   npm run dev
   ```

The frontend application will be live at [http://localhost:5173](http://localhost:5173).

### 6. Running Tests

1. Install development and test dependencies:
   ```bash
   pip install -r requirements-dev.txt
   ```

2. Run the test suite:
   ```bash
   pytest
   ```

   - **Unit Tests** (`tests/unit/`): Run in-memory, testing validation rules and OCR scoring algorithms.
   - **Integration Tests** (`tests/integration/`): Verify workflow engine approval chains against the test database.
   - **End-to-End Tests** (`tests/e2e/`): Test complete submission, AI processing, failure recovery, and audit tracking.

## Processing, Workflow & Notifications Pipeline

1. **Intake**: A document or request is submitted with status `submitted`.
2. **AI Processing**: An RQ worker asynchronously executes OCR, classification, and metadata extraction.
3. **Validation & Anomaly Detection**: Validates schema rules, checks for 24h duplicates, and flags statistical outliers.
4. **Initial Routing & Notifications**:
   - High confidence (`>= 0.6`) + valid fields: moves to `pending_approval`, generates approval chain, and dispatches in-app notification to the level 1 approvers.
   - Low confidence (`< 0.6`) OR validation issues: moves to `needs_review` and notifies reviewers.
   - Failures notify the submitter and admins.
5. **Human Review**:
   - Reviewers view the `needs_review` queue via `GET /api/workflow/queue`.
   - Reviewers/admins can inspect and patch extracted or form fields (`PUT /api/workflow/{submission_id}/fields`).
   - Resolving review (`POST /api/workflow/{submission_id}/resolve`) re-runs validation and transitions the submission to `pending_approval`, notifying approvers.
6. **Multi-Level Approval**:
   - Approvers view their actionable queue via `GET /api/workflow/queue`.
   - Each level is approved in sequential order (`POST /api/workflow/{submission_id}/approve`), notifying the next role in chain.
   - Once all levels approve, the submission reaches `approved` and the submitter is notified via in-app message.
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
| `GET` | `/api/submissions/{submission_id}/extraction` | Get latest AI extraction & confidence results for a submission | Bearer Token (Owner or Admin) |
| `GET` | `/api/submissions/{submission_id}/validation` | Get latest validation & anomaly detection results for a submission | Bearer Token (Owner or Admin) |
| `GET` | `/api/submissions/{submission_id}/audit` | View complete chronological audit log trail for a submission | Bearer Token (Owner, Reviewer, Approver, Admin) |
| `DELETE` | `/api/submissions/{submission_id}` | Delete submission and associated records | Bearer Token (Owner or Admin) |

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

## Production Deployment & Operations

### 1. Production Architecture Overview

- **FastAPI Backend**: Run behind a production WSGI/ASGI manager using Gunicorn with Uvicorn worker classes (`uvicorn.workers.UvicornWorker`).
- **Asynchronous Workers**: Run one or more RQ worker instances managed by systemd or container orchestrators (Docker Compose, Kubernetes, AWS ECS).
- **PostgreSQL**: Managed PostgreSQL 15+ instance with connection pooling and automated backups.
- **Redis**: Persistent Redis instance (AOF enabled) for reliable background task queues.
- **Reverse Proxy**: Nginx or Caddy terminating TLS/SSL, serving static frontend assets, and proxying `/api` traffic to the backend.

### 2. Production ASGI Server Configuration

In production, avoid running with `--reload`. Use Gunicorn with Uvicorn workers:

```bash
# Recommended worker count: (2 x $NUM_CORES) + 1
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --graceful-timeout 30 \
  --access-logfile - \
  --error-logfile -
```

### 3. Scaling Background Workers

Scale worker processes across CPU cores according to document intake throughput:

```bash
# Start multiple dedicated worker processes
rq worker --url redis://redis:6379/0 --name worker-1 default &
rq worker --url redis://redis:6379/0 --name worker-2 default &
```

Monitor queue depth and worker health:
```bash
rq info --url redis://redis:6379/0
```

### 4. Production Nginx Configuration

Example Nginx virtual host configuration with TLS termination, HTTP/2, security headers, and reverse proxying:

```nginx
server {
    listen 80;
    server_name workflows.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name workflows.example.com;

    ssl_certificate /etc/letsencrypt/live/workflows.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/workflows.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://workflows.example.com;" always;

    client_max_body_size 10M;

    # Frontend Single Page App
    root /var/www/workflows-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API & Health Endpoints
    location ~ ^/(api|health|docs|openapi.json|redoc) {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }
}
```

### 5. Production Security Checklist

- [ ] **JWT Secret Key**: Generate a 256-bit cryptographic secret (`openssl rand -hex 32`) and set `JWT_SECRET_KEY` in environment. Never commit secrets to source control.
- [ ] **CORS Restrictions**: Set `CORS_ORIGINS` strictly to your production domain (e.g. `["https://workflows.example.com"]`), never wildcard `*`.
- [ ] **Database Credentials**: Use strong passwords and enforce SSL connections (`sslmode=require` in `DATABASE_URL`).
- [ ] **Upload Quotas & File Validation**: Keep `MAX_UPLOAD_SIZE_BYTES=10485760` (10MB) and verify MIME types.
- [ ] **Non-Root Execution**: Ensure containers and systemd services run under unprivileged service users.

### 6. Database Backups & Maintenance

- **Automated Nightly Backup**:
  ```bash
  pg_dump -Fc -d workflow_db -h localhost -U workflow_user > /backups/workflow_db_$(date +%F).dump
  ```
- **Restoring from Backup**:
  ```bash
  pg_restore -d workflow_db -c -h localhost -U workflow_user /backups/workflow_db_YYYY-MM-DD.dump
  ```
- **Document Storage Backups**: Sync `./uploads` to redundant S3 or object storage via cron.

### 7. Troubleshooting & Common Issues

| Issue | Root Cause | Solution |
|---|---|---|
| `PDFInfoNotInstalledError` / `TesseractNotFoundError` | Missing system OCR/Poppler binaries on host | Install `tesseract-ocr` and `poppler-utils` via apt/brew, or use Docker container. |
| Redis Connection Refused | Redis daemon stopped or invalid `REDIS_URL` | Check Redis service status (`systemctl status redis` or `docker compose ps`). |
| Database connection timeouts | PostgreSQL connection limit reached | Ensure connections are properly released back to pool in `app.db`. |
| Uploaded file 413 Payload Too Large | File size exceeds `MAX_UPLOAD_SIZE_BYTES` or Nginx `client_max_body_size` | Adjust limit in both `.env` and `nginx.conf`. |

