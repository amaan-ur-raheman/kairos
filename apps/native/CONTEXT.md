# Native app context

Expo + React Native (native-uniwind preset), drawer navigation.

## Purpose
Mobile mirror of the web app: calendar week view, team list/detail, status setting, sign-in/up, settings.

## Layout
- `app/(drawer)/` — main tabs: `index.tsx` (calendar), `team.tsx`, `team/[id].tsx`, `settings.tsx`.
- `app/(auth)/` — Clerk sign-in/sign-up.
- `components/org-gate.tsx` — blocks the app until an active Clerk organization is selected.
- `utils/orpc.ts` — oRPC client over fetch with a Clerk token getter.
- `lib/theme.ts` — shared color/typography constants (`C`, `SERIF`, `STATUS_META`) mirroring the web design tokens.

## Gotchas
- Status labels/order and date helpers come from `@kairos/shared` — do not re-copy them here. Recurrence expansion uses the pure lib from `@kairos/api/lib/recurrence` (same module the web calendar imports).
- Colors remain local (`lib/theme.ts`) because web uses CSS variables; keep hex values in `STATUS_COLORS` in sync with `apps/web/src/index.css`.
- Requires `EXPO_PUBLIC_SERVER_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env`.
