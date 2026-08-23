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
- Date/status logic is duplicated from web on purpose for now (no shared RN-safe package yet); keep the two in sync when changing recurrence or status behavior.
- Requires `EXPO_PUBLIC_SERVER_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env`.
