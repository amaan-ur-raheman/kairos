# Environment package context

Typed environment variables via `@t3-oss/env-core` + zod, split per target.

- `server.ts` — `DATABASE_URL`, Clerk secret/publishable keys, `CORS_ORIGIN` (falls back to the Vercel deployment URL), optional `CLERK_AUTHORIZED_PARTIES` (extra Clerk token audiences, comma-separated), optional Upstash vars (`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` enabling the global rate limiter), `NODE_ENV`. Importing it validates at startup; CI/test runs set placeholder values (`vitest.config.ts`).
- `web.ts` — `VITE_SERVER_URL` (absolute URL or same-origin path like `/api` — production uses `/api` via the vercel rewrite) and `VITE_CLERK_PUBLISHABLE_KEY`.
- `native.ts` — `EXPO_PUBLIC_SERVER_URL` (must be absolute), `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, and optional Google client ID/scheme variables for native social sign-in.

## Gotchas
- `import.meta.env` is untyped in this package (no vite/client types); the cast is intentional and annotated.
- Add new vars to the schema first — code should never read `process.env` directly outside this package.
