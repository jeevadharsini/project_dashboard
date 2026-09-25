# Real-Time Client Project Dashboard

Full-stack project/task dashboard with role-based access, live updates over
WebSocket, and a persisted activity/audit trail.

**Stack:** React + TypeScript (Vite) · Node.js + Express + TypeScript ·
PostgreSQL + Prisma · Socket.io · node-cron · JWT access/refresh auth.

## Setup

### 1. Database
Create a Postgres database (locally, Docker, or a hosted instance like
Supabase/Neon/RDS).

### 2. Backend
```bash
cd backend
cp .env.example .env        # fill in DATABASE_URL and generate real secrets
npm install
npx prisma migrate dev --name init
npm run seed                # creates admin/PM/developer users + sample data
npm run dev                 # http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env        # set VITE_API_URL if not localhost:4000
npm install
npm run dev                 # http://localhost:5173
```

### Seeded logins (password for all: `Password123!`)
- `admin@example.com` — Admin
- `pm1@example.com`, `pm2@example.com` — Project Managers
- `dev1@example.com` .. `dev4@example.com` — Developers

## Environment variables (backend/.env)
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Signing secrets — generate with `openssl rand -hex 64`, never commit real values |
| `ACCESS_TOKEN_TTL` | Access token lifetime (e.g. `15m`) |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh token lifetime in days |
| `CORS_ORIGIN` | Allowed frontend origin |
| `COOKIE_SECURE` | Set `true` in production (HTTPS only) |

## Database schema
`User` (role: ADMIN/PM/DEVELOPER) · `Client` · `Project` (owned by a PM) ·
`Task` (belongs to a Project, optionally assigned to a User) ·
`ActivityLog` (immutable status-change history) · `Notification` ·
`RefreshToken`. All relationships use foreign keys; see
`backend/prisma/schema.prisma` for the full model.

## Architecture
- **REST API** (Express) handles auth, CRUD, and dashboard aggregates.
  Every protected route runs `authenticateUser` (verifies the JWT) plus a
  role middleware (`requireAdmin` / `requireProjectManager` /
  `requireDeveloper`). Role checks happen **only** on the backend — the
  frontend hiding a button is not a security boundary. Ownership is
  re-checked per-resource (`assertProjectAccess`, task scope filters) so a
  PM/developer can't reach another PM's/developer's data by guessing an id.
- **Activity log**: task status changes go through a single service
  function (`changeTaskStatus`) that writes an `ActivityLog` row and updates
  the `Task` in one transaction. History is always read from `ActivityLog`,
  never reconstructed from the task's current status.
- **WebSocket** (Socket.io): clients authenticate at the handshake with the
  same access JWT used for REST. Clients join a `project:<id>` room only if
  the server confirms they're allowed to view that project (role-scoped).
  Status changes broadcast to that room; per-user events (notifications)
  go to a `user:<id>` room.
- **Missed events**: on every socket connection, the server queries
  Postgres for that user's last 20 relevant `ActivityLog` rows and sends
  them immediately — there is no in-memory event buffer, so a server
  restart or a long disconnect doesn't lose anything the client should see.
- **Presence**: online users are tracked in an in-memory map of
  `userId -> socket ids` (not persisted — presence is inherently transient)
  and broadcast as a simple count whenever it changes.
- **Overdue job**: `node-cron` runs every 5 minutes, finds tasks past their
  due date that aren't `DONE`/already `OVERDUE`, and transitions them
  through the same activity-log path as a manual change. Overdue is a
  stored fact, not something computed when a dashboard happens to load.

## Why these choices
- **Socket.io** over raw WebSockets: built-in reconnection, room-based
  broadcasting (perfect fit for per-project and per-user channels), and a
  JS/TS client that matches the rest of the stack.
- **node-cron** over an external scheduler: the overdue sweep is simple and
  infrequent enough that an in-process cron avoids the operational cost of
  a separate worker/queue system for this scope.
- **Refresh token strategy**: opaque random token (not a JWT) stored
  hashed in Postgres, delivered only via an `HttpOnly`, `SameSite=Lax`
  cookie scoped to `/api/auth`. Refresh **rotates** on every use (old token
  revoked, new one issued) to limit replay if a token is ever stolen. The
  access token lives in memory on the client only — never `localStorage` —
  to reduce XSS exposure.
- **Indexing**: indexes were added on every column this app actually
  filters/sorts/joins by at scale — `User.role`, `Project.creatorId`,
  `Task.projectId/assigneeId/status/priority/dueDate`,
  `ActivityLog.projectId/taskId/createdAt`, and
  `Notification(userId, isRead)` — rather than indexing everything, to keep
  writes cheap.

## Testing this yourself
- **Security**: log in as different roles and hit endpoints directly (curl/
  Postman) with another role's resource ids — e.g. a developer token
  against another developer's task id, or a PM token against another PM's
  project id. Expect 403/404, not data.
- **Real-time**: open the same project in two browser sessions (or two
  browsers), change a task's status in one, and confirm the other updates
  without a refresh. Then disconnect one client (dev tools offline, or
  close the tab), make more changes, reconnect, and confirm the last 20
  events arrive from `activity:missed`.

## Known limitations
- No email verification or password reset flow.
- No pagination on task/activity lists beyond fixed limits (50/20) — fine
  for demo data, would need cursor pagination at real scale.
- Presence is per-process only; running multiple backend instances behind
  a load balancer would need a shared store (e.g. Redis adapter for
  Socket.io) for both presence and room broadcast to work correctly.
- The overdue job runs on a fixed 5-minute cadence; not configurable via
  env var in this scaffold.
- No automated test suite included — the "how to test" section above
  describes the manual verification steps instead.
