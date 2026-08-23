import { createClerkClient } from "@clerk/backend";
import { db } from "@kairos/db";
import { members } from "@kairos/db/schema/members";
import { organizations } from "@kairos/db/schema/organizations";
import { env } from "@kairos/env/server";
import { and, eq } from "drizzle-orm";
import type { Context as ElysiaContext } from "elysia";

const clerkClient = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
  publishableKey: env.CLERK_PUBLISHABLE_KEY,
});

export type ClerkContextAuth = {
  userId: string;
  organizationId: string | null;
  memberId: string | null;
  role: string | null;
};

export type RequestContext = {
  auth: ClerkContextAuth | null;
};

export type CreateContextOptions = {
  context: ElysiaContext;
};

async function ensureLocalMembership(userId: string, orgId: string, orgRole: string | null) {
  const existing = await db
    .select({ id: members.id, role: members.role })
    .from(members)
    .where(and(eq(members.clerkUserId, userId), eq(members.organizationId, orgId)))
    .limit(1);
  if (existing[0]) return existing[0];

  const [clerkUser, clerkOrganization] = await Promise.all([
    clerkClient.users.getUser(userId),
    clerkClient.organizations.getOrganization({ organizationId: orgId }),
  ]);
  const primaryEmail = clerkUser.emailAddresses.find(
    (email) => email.id === clerkUser.primaryEmailAddressId,
  )?.emailAddress;
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    primaryEmail ||
    userId;
  // Clerk org roles other than admin map to plain "member"; custom Clerk roles are
  // intentionally ignored — promote people via the local members.role column.
  const role = orgRole === "org:admin" ? "owner" : "member";

  await db
    .insert(organizations)
    .values({ id: orgId, name: clerkOrganization.name })
    .onConflictDoUpdate({
      target: organizations.id,
      set: { name: clerkOrganization.name },
    });
  await db
    .insert(members)
    .values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      clerkUserId: userId,
      name,
      email: primaryEmail ?? `${userId}@invalid.local`,
      avatarUrl: clerkUser.imageUrl,
      role,
    })
    .onConflictDoNothing();

  const synced = await db
    .select({ id: members.id, role: members.role })
    .from(members)
    .where(and(eq(members.clerkUserId, userId), eq(members.organizationId, orgId)))
    .limit(1);
  return synced[0] ?? null;
}

export async function createContext({ context }: CreateContextOptions): Promise<RequestContext> {
  try {
    const requestState = await clerkClient.authenticateRequest(context.request, {
      authorizedParties: [env.CORS_ORIGIN],
    });

    const auth = requestState.toAuth();
    if (!auth?.isAuthenticated || !("userId" in auth) || typeof auth.userId !== "string") {
      return { auth: null };
    }

    // Clerk's auth object uses orgId. We store the local role for the active org.
    const orgId = "orgId" in auth && typeof auth.orgId === "string" ? auth.orgId : null;
    let role: string | null = null;

    let memberId: string | null = null;
    if (orgId) {
      try {
        const membership = await ensureLocalMembership(
          auth.userId,
          orgId,
          "orgRole" in auth && typeof auth.orgRole === "string" ? auth.orgRole : null,
        );
        memberId = membership?.id ?? null;
        role = membership?.role ?? null;
      } catch (err) {
        console.error("ensureLocalMembership failed:", err);
        // Auth succeeded but membership sync failed — treat as unauthenticated
        return { auth: null };
      }
    }

    return {
      auth: {
        userId: auth.userId,
        organizationId: orgId,
        memberId,
        role,
      },
    };
  } catch (err) {
    console.error("createContext failed:", err);
    return { auth: null };
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;
