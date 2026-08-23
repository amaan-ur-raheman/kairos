# Web app context

TanStack Start (SSR) + React 19 + Tailwind v4 SPA-style app.

## Purpose
Team availability product: personal calendar (day/week/month/schedule views), team roster with per-member schedules, status setting, leave requests, profile/working-hours settings.

## Layout
- `src/routes/` — file-based routes. `/` redirects to `/calendar`. Pages are large self-contained components (`calendar.tsx` is the biggest; `team/$id.tsx` mirrors its grid logic).
- `src/components/calendar/` — extracted from the calendar route: `constants.ts` (grid constants, tint tables), `date-utils.ts` (formatting helpers; day helpers re-exported from `@kairos/shared`), `event-dialog.tsx` (create/edit dialog).
- `src/components/` — header, sidebar nav, loading/error states (`states.tsx`).
- `src/utils/orpc.ts` — typed oRPC client; all data fetching goes through TanStack Query (`orpc.<router>.<proc>.queryOptions()`).
- `index.css` — custom "paper" design system (CSS variables like `--ember`, `--ink-*`, `--paper-*`). Design prototypes live in `docs/design/prototypes/`.

## Conventions
- Auth via Clerk (`@clerk/tanstack-react-start`); server URL defaults to same-origin `/api`.
- Recurrence expansion happens client-side using the shared pure lib from `@kairos/api/lib/recurrence`.
- Status/event colors map through CSS variable tint tables defined per page.

## Gotchas
- `routeTree.gen.ts` is generated — never edit.
- Calendar drag-to-create and popover positioning assume fixed pixel grid constants shared across pages.
