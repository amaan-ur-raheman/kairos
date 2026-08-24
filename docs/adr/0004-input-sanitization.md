# ADR 0004 — Input Sanitization at Zod Boundary

**Status:** Accepted
**Date:** 2025-08-24
**Owner:** @security — appsec
**Deciders:** @security, @platform
**Timeline:** Proposed 2025-08-20 → Accepted 2025-08-24 → Implemented 2025-08-24

## Context
Routers accepted raw strings (no trimming, loose color format). Needed sanitization without Express `express-validator` (Elysia stack).

## Decision
Sanitization lives in **Zod schemas** at the oRPC procedure boundary (`packages/api/src/routers/*.ts`):
- All `z.string()` inputs use `.trim()`; IDs additionally `.min(1)`; `title` capped `.max(500)`; `color` validated `^#[0-9a-fA-F]{3,8}$`.
- No runtime `escape()` — React handles output escaping; DB is parameterized via Drizzle.
- Elysia security headers via `onAfterHandle` in `apps/server/src/index.ts` (mirrors `vercel.json` headers for local dev).

## Consequences
- Zero new deps — uses `zod` already in catalog. No `express-validator`.
- Every new procedure must add `.trim()` to string fields; code review checklist enforces.

## Verification
`bun run test` passes; `packages/api/__tests__/routers/*.test.ts` assert trimmed inputs and 400 on `color: "red"`.

## When to revisit
If we need HTML sanitization for rich text → add `DOMPurify` at that field only.
