import type { Context } from "../../src/context";

export const ORG_ID = "org_test_1";
export const ORG_ID_OTHER = "org_other_2";

export const USER_ID = "user_test_1";
export const MEMBER_ID = "member_me";
export const MEMBER_ID_OTHER = "member_colleague";

type ClientOptions = { context: Context };

/**
 * Creates a per-call-invocable client for an oRPC procedure.
 * oRPC only honors caller-supplied contexts when `.callable()` was given a
 * context function — this wires that up so tests can pass a fresh context
 * on every invocation: `const me = clientOf(membersRouter.me); await me(input, memberCtx())`
 */
export function clientOf<P extends { callable: (options?: unknown) => unknown }>(
  procedure: P,
): (input: never, options?: ClientOptions) => Promise<unknown> {
  const call = procedure.callable({
    // Identity: the caller's context becomes the procedure's initial context.
    context: (clientContext: unknown) => clientContext,
  }) as (input: never, options?: ClientOptions) => Promise<unknown>;
  return call;
}

/** Full org-scoped auth context (plain member role), wrapped for procedure clients. */
export function memberCtx(overrides: Partial<NonNullable<Context["auth"]>> = {}): ClientOptions {
  return {
    context: {
      auth: {
        userId: USER_ID,
        organizationId: ORG_ID,
        memberId: MEMBER_ID,
        role: "member",
        ...overrides,
      },
    },
  };
}

/** Owner/manager variant — can edit other members. */
export function managerCtx(role: "owner" | "manager" = "owner"): ClientOptions {
  return memberCtx({ role });
}

/** Authenticated but no active organization selected. */
export function noOrgCtx(): ClientOptions {
  return {
    context: {
      auth: { userId: USER_ID, organizationId: null, memberId: null, role: null },
    },
  };
}

/** Not authenticated at all. */
export function unauthenticatedCtx(): ClientOptions {
  return { context: { auth: null } };
}

export const memberRow = (overrides: Record<string, unknown> = {}) => ({
  id: MEMBER_ID,
  organizationId: ORG_ID,
  clerkUserId: USER_ID,
  name: "Test Member",
  email: "test@example.com",
  avatarUrl: null,
  role: "member",
  jobRole: null,
  timezone: "UTC",
  skills: [],
  createdAt: new Date("2025-01-01T00:00:00Z"),
  ...overrides,
});
