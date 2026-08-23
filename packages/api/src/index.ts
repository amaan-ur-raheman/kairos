import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.auth?.userId) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      auth: context.auth,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

const requireOrg = o.middleware(async ({ context, next }) => {
  if (!context.auth?.userId) {
    throw new ORPCError("UNAUTHORIZED");
  }
  if (!context.auth.organizationId || !context.auth.memberId || !context.auth.role) {
    throw new ORPCError("FORBIDDEN", {
      message: context.auth.organizationId
        ? "You are not a member of this organization"
        : "No organization selected",
    });
  }
  return next({
    context: {
      auth: {
        userId: context.auth.userId,
        organizationId: context.auth.organizationId,
        memberId: context.auth.memberId,
        role: context.auth.role,
      },
    },
  });
});

/** Authenticated + must have an active org. Use for any org-scoped procedure. */
export const orgProcedure = protectedProcedure.use(requireOrg);
