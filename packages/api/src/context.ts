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

/**
 * Accepted token audiences (`azp`): the configured CORS origin plus any extra
 * origins from `CLERK_AUTHORIZED_PARTIES` (comma-separated). Extra parties are
 * needed when native clients or multiple deployments mint tokens with a
 * different `azp` than the API's own CORS origin.
 */
function authorizedParties(): string[] {
  const extra = (env.CLERK_AUTHORIZED_PARTIES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [env.CORS_ORIGIN, ...extra];
}

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

/**
 * Maps a Clerk org role to the local members.role.
 * `org:admin` → owner; `org:manager` → manager; everything else → member.
 */
function roleForClerkRole(orgRole: string | null): "owner" | "manager" | "member" {
  if (orgRole === "org:admin") return "owner";
  if (orgRole === "org:manager") return "manager";
  return "member";
}

/** Short-lived in-process cache so warm serverless isolates skip repeated lookups. */
const MEMBERSHIP_CACHE_TTL_MS = 60_000;
const membershipCache = new Map<string, { id: string; role: string | null; at: number }>();

/** Test hook: clears the in-process membership cache. */
export function clearMembershipCacheForTests() {
  membershipCache.clear();
}

async function ensureLocalMembership(userId: string, orgId: string, orgRole: string | null) {
  const cacheKey = `${userId}:${orgId}`;
  const cached = membershipCache.get(cacheKey);
  if (cached && Date.now() - cached.at < MEMBERSHIP_CACHE_TTL_MS) {
    return { id: cached.id, role: cached.role };
  }

  const existing = await db
    .select({ id: members.id, role: members.role })
    .from(members)
    .where(and(eq(members.clerkUserId, userId), eq(members.organizationId, orgId)))
    .limit(1);

  const clerkDerived = roleForClerkRole(orgRole);
  if (existing[0]) {
    // Propagate Clerk-derived roles only upward (admin→owner, manager) and never
    // downgrade — managers can still be granted locally via the DB without a
    // matching Clerk custom role.
    if (
      clerkDerived !== "member" &&
      existing[0].role !== clerkDerived &&
      !(clerkDerived === "manager" && existing[0].role === "owner")
    ) {
      await db.update(members).set({ role: clerkDerived }).where(eq(members.id, existing[0].id));
      existing[0].role = clerkDerived;
    }
    membershipCache.set(cacheKey, { ...existing[0], at: Date.now() });
    return existing[0];
  }

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
  const role = clerkDerived;

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
  if (synced[0]) {
    membershipCache.set(cacheKey, { ...synced[0], at: Date.now() });
  }
  return synced[0] ?? null;
}

export async function createContext({ context }: CreateContextOptions): Promise<RequestContext> {
  type AuthRequestState = Awaited<ReturnType<typeof clerkClient.authenticateRequest>>;
  let requestState: AuthRequestState;
  try {
    requestState = await clerkClient.authenticateRequest(context.request, {
      authorizedParties: authorizedParties(),
    });
  } catch (err) {
    // Distinguish token rejection from infrastructure failure for diagnosability
    console.warn(
      "[auth] Clerk rejected request:",
      err instanceof Error ? err.message : String(err),
    );
    return { auth: null };
  }

  try {
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
