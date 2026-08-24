# ADR 0002 — Clerk JWT Verification + Org Membership Model

**Status:** Accepted
**Date:** 2025-08-14
**Owner:** @security — auth squad
**Deciders:** @security, @platform
**Timeline:** Proposed 2025-08-12 → Accepted 2025-08-14 → Live 2025-08-15

## Context
Multi-tenant orgs with Clerk auth. Need JWT signature verification + local role cache without downgrading manager→member on Clerk role drift.

## Decision
- Verify JWT via `@clerk/backend` `clerkClient.authenticateRequest()` in `packages/api/src/context.ts` with `authorizedParties = [CORS_ORIGIN, ...CLERK_AUTHORIZED_PARTIES]`.
- Signature + `azp` (audience) validated by Clerk SDK; we treat any rejection as `auth: null` (401 via `requireAuth` middleware).
- Local `members` table is source-of-truth for role; Clerk roles only **upgrade** (member→manager/owner), never downgrade. Cached 60s (`MEMBERSHIP_CACHE_TTL_MS`).

## Consequences
- No custom JWT libs — Clerk SDK is the verifier. Do not add `jsonwebtoken`/`express-jwt`.
- `orgProcedure` must be used for all org-scoped procedures; per-id fetches must re-check `organizationId`.

## Verification
- `packages/api/__tests__/context.test.ts` mocks `authenticateRequest` and asserts 401 on bad signature.
- Manual: expired token → 401; valid token with wrong `azp` → 401 unless listed in `CLERK_AUTHORIZED_PARTIES`.

## When to revisit
If moving off Clerk → replace `createContext` verifier and re-audit role-sync semantics.
