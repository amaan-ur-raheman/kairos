# ADR 0001 — Elysia + oRPC over Express/tRPC

**Status:** Accepted
**Date:** 2025-08-10
**Owner:** @platform — kairos platform team
**Deciders:** @platform, @web
**Timeline:** Evaluated 2025-08-01 → 2025-08-08 → Accepted 2025-08-10 → Implemented 2025-08-12

## Context
Needed a Bun-native server with end-to-end type safety for web + native clients. Express adds Node compat overhead; tRPC lacks first-class OpenAPI.

## Decision
Use **Elysia** (Bun-native, high perf) + **oRPC** (typed RPC + OpenAPI via `OpenAPIHandler` + `ZodToJsonSchemaConverter`) for all API traffic. Served via `apps/server/src/index.ts` with `/rpc` and `/api-reference`.

## Consequences
- `apps/server` owns HTTP (cors, rate-limit, security headers); `packages/api` owns domain logic and stays framework-agnostic (oRPC only).
- Do not add Express middleware — use Elysia `onAfterHandle` / plugins and oRPC `os.middleware`.

## Verification
`bun run build` succeeds; `bun run test` covers routers; `curl /api-reference` returns OpenAPI JSON.

## When to revisit
If we need Node-only hosting or Express middleware ecosystem → re-evaluate migration cost.
