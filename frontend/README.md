# AI Workflow Automation — Frontend Client

A production-ready React 19 Single Page Application (SPA) built with Vite, TailwindCSS, React Router 7, and Lucide React. Provides an interface for document intake, AI extraction review, dynamic multi-level approval workflows, and real-time notifications.

---

## Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vite.dev/)
- **Routing**: [React Router 7](https://reactrouter.com/)
- **Styling**: [TailwindCSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **HTTP Client**: [Axios](https://axios-http.com/) (with JWT interceptors and auto-injection)
- **State Management**: React Context (`AuthContext`, `NotificationContext`)

---

## Features

- **Authentication & RBAC**:
  - OAuth2 password flow with JWT token storage in `localStorage`.
  - Automatic Axios request interceptor adding `Authorization: Bearer <token>`.
  - 401 response interceptor clearing auth state and redirecting to `/login`.
  - Role-Based Access Control (`admin`, `reviewer`, `approver`, `submitter`) governing navigation and actions.
- **Intake Management**:
  - Drag-and-drop document upload (PDF, PNG, JPG, TIFF up to 10MB) with progress feedback.
  - Custom key-value dynamic form submission.
  - Submissions list with status filters, intake channel tags, and desktop/tablet/mobile responsive views.
- **Submission Details & Inspection**:
  - Structured metadata overview (Status, Channel, Timestamps, File info).
  - Direct view into OCR extraction results and confidence gauges.
  - Chronological audit log trail tracking every AI and human event.
- **Workflow & Queue Management**:
  - Dynamic multi-level approval stepper.
  - Role-specific review queues (`needs_review` for reviewers, `pending_approval` for approvers).
  - Extracted field patch modal for reviewers to correct AI OCR extractions before escalation.
- **Real-Time Notifications Center**:
  - Live polling for unread alerts.
  - Interactive notification bell popover with quick mark-as-read.
  - Dedicated notification center page with event filters and clear rejection/approval notices.
- **Modern Responsive Design**:
  - Minimal light-mode glassmorphic theme.
  - Fully responsive across desktop, tablet (with smooth horizontal scroll tables), and mobile screens.

---

## Project Structure

```text
frontend/
├── public/                     # Static public assets
├── src/
│   ├── api/                    # API client layer
│   │   ├── client.js           # Configured Axios instance with interceptors
│   │   ├── auth.js             # Authentication API calls
│   │   ├── submissions.js      # Intake, extraction, validation, audit calls
│   │   ├── workflow.js         # Queue, rules, approvals, field correction calls
│   │   ├── notifications.js    # Notification list and mark-as-read calls
│   │   └── dashboard.py / .js  # Metrics and reporting calls
│   ├── components/             # Reusable UI components
│   │   ├── AppLayout.jsx       # Main shell with responsive sidebar & top header
│   │   ├── ProtectedRoute.jsx  # Route guard checking authentication and roles
│   │   ├── NotificationBell.jsx# Popover bell with unread badge and dropdown list
│   │   ├── ApprovalStepper.jsx # Visual multi-level approval chain tracker
│   │   ├── FieldCorrectionModal.jsx # Modal to edit/add extracted metadata fields
│   │   └── InputField.jsx      # Styled form input wrapper
│   ├── context/                # Global React Contexts
│   │   ├── AuthContext.jsx     # User state, login, register, token management
│   │   └── NotificationContext.jsx # Polled notification state and unread counters
│   ├── pages/                  # Page-level route views
│   │   ├── LoginPage.jsx       # User authentication
│   │   ├── RegisterPage.jsx    # User registration
│   │   ├── DashboardPage.jsx   # Metrics, pipeline tracks, volume matrices
│   │   ├── SubmissionsPage.jsx # Submissions list table & intake modal
│   │   ├── SubmissionDetailPage.jsx # AI extraction results & audit trail
│   │   ├── WorkflowQueuePage.jsx    # Actionable review/approval work queue
│   │   ├── WorkflowDetailPage.jsx   # Approval chain & decision actions
│   │   ├── WorkflowRulesPage.jsx    # Configurable multi-level approval rules
│   │   └── NotificationsPage.jsx    # Comprehensive alerts & notification center
│   ├── App.jsx                 # Route definitions and provider wrapping
│   ├── index.css               # Design tokens, Tailwind directives, glassmorphic utilities
│   └── main.jsx                # Application entry point
├── package.json                # Dependencies and npm scripts
├── tailwind.config.js          # Tailwind theme and content configuration
└── vite.config.js              # Vite server & build configuration
```

---

## Environment Configuration

Create a `.env` file in the `frontend/` directory (or use `.env.production`):

```bash
# Backend API Base URL (defaults to '/api' in dev proxy)
VITE_API_URL=http://localhost:8000
```

In development, Vite automatically proxies `/api` requests to `http://localhost:8000` via `vite.config.js`.

---

## Development & Build Commands

```bash
# Install dependencies
npm install

# Start development dev server with Hot Module Replacement (HMR)
npm run dev

# Run ESLint validation
npm run lint

# Build production bundle to dist/
npm run build

# Preview production build locally
npm run preview
```

---

## Production Deployment

### 1. Build Production Assets

```bash
npm run build
```

This generates optimized, minified JS, CSS, and HTML assets in `frontend/dist/`.

### 2. Serving with Nginx

Serve the pre-built `dist/` directory using Nginx with client-side SPA routing:

```nginx
server {
    listen 80;
    server_name workflows.example.com;

    root /var/www/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend service
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. Docker Multi-Stage Build

Example production Dockerfile for the frontend:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
