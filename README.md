# AI Workflow Automation

An asynchronous workflow automation system built with FastAPI, PostgreSQL, Redis, and RQ (Redis Queue).

## Tech Stack

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **ASGI Server**: [Uvicorn](https://www.uvicorn.org/)
- **Database**: PostgreSQL with [asyncpg](https://github.com/MagicStack/asyncpg)
- **Task Queue / Cache**: Redis & [RQ](https://python-rq.org/)
- **Authentication**: OAuth2 Password Flow with JWT (`python-jose`, `bcrypt`)
- **Settings Management**: [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- **Containerization**: Docker & Docker Compose

## Project Structure

```text
.
├── app/
│   ├── __init__.py
│   ├── config.py           # Application settings & environment parsing
│   ├── db.py               # asyncpg database pool & lifecycle management
│   ├── main.py             # FastAPI entrypoint, middleware, health endpoints
│   ├── queue.py            # Redis Queue (RQ) configuration
│   ├── schema.sql          # Database schema migrations & table definitions
│   ├── models/
│   │   ├── __init__.py
│   │   └── auth.py         # Pydantic schemas & enums (Role, UserCreate, UserOut, Token)
│   ├── routers/
│   │   ├── __init__.py
│   │   └── auth.py         # Auth endpoints (register, login, me, promote)
│   ├── services/
│   │   ├── __init__.py
│   │   └── auth_service.py # Database queries & user lifecycle operations
│   └── utils/
│       ├── __init__.py
│       ├── deps.py         # Auth dependencies & RBAC (get_current_user, require_roles)
│       └── security.py     # Password hashing (bcrypt) & JWT helpers
├── docker-compose.yml       # Docker Compose definition (PostgreSQL, Redis, API, Worker)
├── Dockerfile              # Container specification for API and Worker
├── requirements.txt        # Python package dependencies
├── .env.example            # Template for environment variables
└── README.md
```

## Getting Started

### 1. Prerequisites

- Python 3.12+ (or 3.13)
- PostgreSQL (or Docker)
- Redis (or Docker)

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
| `JWT_SECRET_KEY` | Secret key for signing JWT tokens | `"supersecretjwtkeychangeinproduction1234567890"` |
| `JWT_ALGORITHM` | JWT signing algorithm | `"HS256"` |
| `JWT_EXPIRE_MINUTES`| Access token expiration in minutes | `60` |

### 3. Running with Docker Compose (Recommended)

To start all services (PostgreSQL, Redis, API, RQ Worker) at once:

```bash
docker compose up --build
```

The API will be available at [http://localhost:8000](http://localhost:8000).
Interactive API docs are available at [http://localhost:8000/docs](http://localhost:8000/docs).

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

## Authentication Endpoints

The following authentication routes are exposed under `/api/auth`:

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user (`submitter` by default) | No |
| `POST` | `/api/auth/login` | Authenticate with form credentials and get JWT token | No |
| `GET` | `/api/auth/me` | Fetch the authenticated user's profile | Bearer Token |
| `PUT` | `/api/auth/promote/{user_id}` | Promote/change user role (`admin`, `reviewer`, `approver`, `submitter`) | Admin only |

## Health Check

Verify the API status:

```bash
curl http://localhost:8000/health
```

Expected Response:
```json
{"status": "ok"}
```
