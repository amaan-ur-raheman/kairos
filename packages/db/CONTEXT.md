# Database package context

Drizzle ORM schema + client for PostgreSQL (Neon).

## Schema (`src/schema/`)
- `organizations` — id is the Clerk org id; org-level timezone/working hours defaults.
- `members` — local mirror of Clerk users, unique per (org, clerkUser); roles: owner | manager | member.
- `availability_status` — one current status row per member, optional `expires_at`.
- `working_hours` — per-member weekly template, 0=Sunday..6=Saturday, HH:MM text times.
- `leave_requests` — half-day aware, status workflow pending → approved/rejected (+ cancelled), indexed on dates/status.
- `calendar_events` — recurrence as columns (`none|daily|weekdays|weekly|monthly|yearly`, days array, interval, until) rather than RRULE.

## Workflow
- Schema changes go through versioned migrations: `bun run db:generate`, review the SQL in `src/migrations/`, commit it, then `bun run db:migrate`. Never use `db:push` against shared environments (it caused drift once; migrations were re-baselined at `0000_pink_william_stryker`).
- `db.batch` instead of transactions (Neon HTTP driver limitation).
