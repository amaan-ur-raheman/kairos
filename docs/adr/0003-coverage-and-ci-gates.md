# ADR 0003 — Coverage Thresholds + CI Gates

**Status:** Accepted
**Date:** 2025-08-24
**Owner:** @platform — CI owners
**Deciders:** @platform
**Timeline:** Proposed 2025-08-22 → Accepted 2025-08-24 → Implemented 2025-08-24

## Context
No enforced coverage; Vercel deploys lacked dry-run checks. Need Codacy-compatible reporting without adding new deps.

## Decision
- Vitest `v8` provider with `lcov` + `html` + `text` reporters (`vitest.config.ts`). Thresholds: 80% statements/lines, 75% branches/functions — fails `bun run test:coverage` if breached.
- CI (`/.github/workflows/ci.yml`): `bun run test:coverage` → upload `coverage/lcov.info` to Codacy (via `bunx codacy-coverage`, token from `CODACY_API_TOKEN` secret) → upload artifact → `bun run deploy:check` (vercel dry-run, `continue-on-error` until `VERCEL_TOKEN` is set).
- Env sync stays manual via `bun run env:preview|production` (`scripts/sync-vercel-env.ts`) — do not auto-sync secrets in CI.

## Consequences
- `bun add -d @vitest/coverage-v8` only — no new coverage SaaS vendor beyond Codacy.
- Coverage excludes `**/__tests__/**` and generated files.

## Verification
`bun run test:coverage` passes locally (84.8% stmts); CI job `build-and-test` is green. Codacy step is no-op locally without token.

## When to revisit
If Codacy is dropped → swap reporter to Codecov/Sonar with same `lcov.info`.
