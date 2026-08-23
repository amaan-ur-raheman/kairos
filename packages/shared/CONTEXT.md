# Shared package context

Platform-agnostic pure TypeScript shared by web and native: status metadata and date helpers.

## Layout
- `src/status.ts` — availability status keys (`AVAILABILITY_STATUSES`), display order, labels, and safe-normalization helpers. The enum source of truth is the DB schema; this module mirrors it for both clients.
- `src/dates.ts` — `dayKey`, `isSameDay`, `weekStartOf`, `getWeekDates`, `shiftDays`. Dependency-free and React-Native-safe.

## Conventions
- No platform imports (no React, no react-native, no node APIs) — anything here must run in Metro and Vite.
- Colors stay per-app on purpose: web maps status keys to CSS variables, native to hex constants in `apps/native/lib/theme.ts`.
- Recurrence expansion lives in `@kairos/api/lib/recurrence` (also pure); this package is for everything else that used to be duplicated.
