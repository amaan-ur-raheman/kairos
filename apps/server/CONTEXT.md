# Server context

Elysia on Bun exposing the oRPC API.

## Purpose
Thin HTTP shell: CORS, rate limiting, Clerk auth context, and two handler mounts. No business logic lives here — everything is in `@kairos/api`.

## Layout
- `src/index.ts` is the single entrypoint:
  - `/rpc*` → oRPC RPC handler (what web/native clients call)
  - `/api-reference*` → OpenAPI reference UI
  - `/` → health check ("OK")
- Rate limiting: in-memory sliding window (120 req/min/IP) applied to `/rpc*`. Per-isolate only on serverless — see the `ponytail:` comment for the upgrade path.
- On Vercel, `vercel.json` rewrites `/api/*` from the web service to this service and strips the prefix; auth routes (`/auth/*`) are excluded so Clerk handles them.

## Gotchas
- `createContext` (from `@kairos/api/context`) runs per request, verifies the Clerk JWT, and lazily syncs the user/org into local DB rows. Any throw there becomes a 401 downstream by design.
- Local dev listens on :3000; under Vercel the app export is used without `app.listen`.
