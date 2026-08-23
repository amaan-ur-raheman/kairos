# Server context

Elysia on Bun exposing the oRPC API.

## Purpose
Thin HTTP shell: CORS, rate limiting, Clerk auth context, and two handler mounts. No business logic lives here — everything is in `@kairos/api`.

## Layout
- `src/index.ts` is the single entrypoint:
  - `/rpc*` → oRPC RPC handler (what web/native clients call)
  - `/api-reference*` → OpenAPI reference UI
  - `/` → health check ("OK")
- Rate limiting: sliding window (120 req/min/IP) applied to `/rpc*`, implemented in `src/rate-limit.ts`. With `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` set it is a global cap via Upstash Redis; without them it falls back to an in-memory per-isolate window that only damps bursts. Redis errors fail open.
- On Vercel, `vercel.json` rewrites `/api/*` from the web service to this service and strips the prefix; auth routes (`/auth/*`) are excluded so Clerk handles them.

## Gotchas
- `createContext` (from `@kairos/api/context`) runs per request, verifies the Clerk JWT, and lazily syncs the user/org into local DB rows. Any throw there becomes a 401 downstream by design.
- Local dev listens on :3000; under Vercel the app export is used without `app.listen`.
- The Vercel deployment artifact IS this package's tsdown bundle (`dist/index.mjs`, all npm deps inlined). It requires the project env var `VERCEL_ENABLE_EXPERIMENTAL_BUILD_MODE=1` — without it Vercel's elysia builder materializes an empty function that crashes at cold start with `ResolveMessage {}`.
