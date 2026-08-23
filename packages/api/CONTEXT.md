# API package context

oRPC routers + pure domain logic. The brain of the product; both web and native depend on it.

## Routers (`src/routers/`)
- `members` — `me`, org-scoped `list`/`getById`, `updateProfile` (self or manager/owner only).
- `availability` — status (6 states, expiring), working hours (7-day sets, HH:MM validated), org-wide status feed.
- `leave` — requests with half-days and approval workflow. Approve/reject: manager/owner only, pending-only, no self-approval.
- `events` — calendar events with recurrence; edits/deletes apply to the whole series.

## Procedures
- `publicProcedure` → `protectedProcedure` (auth) → `orgProcedure` (auth + active org membership). All business routers are `orgProcedure`.
- Org isolation is enforced per-router by checking the target member belongs to the caller's organization — keep that pattern for any new target-by-id endpoint.

## Pure libs (`src/lib/`)
- `recurrence.ts` — occurrence expansion shared with the web client (imported directly, not via RPC). Window-clamped iteration; weekly phase anchored to Mondays.
- `leave-dates.ts` — leave range validation (catches rollover dates).

## Conventions
- IDs are `crypto.randomUUID()` at insert time.
- Neon has no transactions in HTTP mode — multi-statement writes use `db.batch`.
- Validation lives in zod input schemas at the procedure boundary.
