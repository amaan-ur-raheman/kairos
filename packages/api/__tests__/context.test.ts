import { beforeEach, describe, expect, test, vi } from "vitest";

const clerkFake = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  users: { getUser: vi.fn() },
  organizations: { getOrganization: vi.fn() },
}));

vi.mock("@clerk/backend", () => ({
  createClerkClient: () => clerkFake,
}));

vi.mock("@kairos/env/server", () => ({
  env: {
    DATABASE_URL: "postgres://mock",
    CLERK_SECRET_KEY: "sk_test_mock",
    CLERK_PUBLISHABLE_KEY: "pk_test_mock",
    CORS_ORIGIN: "http://localhost:3001",
    NODE_ENV: "test",
  },
}));

vi.mock("@kairos/db", async () => {
  const { getMockedDb } = await import("./helpers/db-mock");
  return { db: getMockedDb() };
});

import { members as membersTable } from "@kairos/db/schema/members";
import { organizations } from "@kairos/db/schema/organizations";

import { clearMembershipCacheForTests, createContext } from "../src/context";
import { getCallsByOp, onSelect, resetDbMock } from "./helpers/db-mock";
import { MEMBER_ID, ORG_ID, USER_ID } from "./helpers/fixtures";

function makeRequest() {
  return new Request("http://localhost:3000/rpc", {
    headers: { authorization: "Bearer test-token" },
  });
}

/** A Clerk state where the user is signed in but has no active org. */
function authState(overrides: Record<string, unknown> = {}) {
  return {
    isAuthenticated: true,
    userId: USER_ID,
    ...overrides,
  };
}

describe("createContext", () => {
  beforeEach(() => {
    resetDbMock();
    clearMembershipCacheForTests();
    vi.clearAllMocks();
    clerkFake.authenticateRequest.mockResolvedValue({
      toAuth: () => authState(),
    });
  });

  test("returns null auth when Clerk authentication fails entirely", async () => {
    clerkFake.authenticateRequest.mockRejectedValue(new Error("bad token"));
    const ctx = await createContext({ context: { request: makeRequest() } as never });
    expect(ctx.auth).toBeNull();
  });

  test("returns null auth for unauthenticated requests", async () => {
    clerkFake.authenticateRequest.mockResolvedValue({
      toAuth: () => ({ isAuthenticated: false }),
    });
    const ctx = await createContext({ context: { request: makeRequest() } as never });
    expect(ctx.auth).toBeNull();
  });

  test("authenticated without an active org passes through with null org fields", async () => {
    const ctx = await createContext({ context: { request: makeRequest() } as never });

    expect(ctx.auth).toEqual({
      userId: USER_ID,
      organizationId: null,
      memberId: null,
      role: null,
    });
    // No membership sync should have touched the database.
    expect(getCallsByOp("select")).toHaveLength(0);
  });

  test("reuses an existing local membership without hitting Clerk again", async () => {
    onSelect(membersTable, [{ id: MEMBER_ID, role: "member" }]);
    clerkFake.authenticateRequest.mockResolvedValue({
      toAuth: () => authState({ orgId: ORG_ID, orgRole: "org:member" }),
    });

    const ctx = await createContext({ context: { request: makeRequest() } as never });

    expect(ctx.auth).toEqual({
      userId: USER_ID,
      organizationId: ORG_ID,
      memberId: MEMBER_ID,
      role: "member",
    });
    expect(clerkFake.users.getUser).not.toHaveBeenCalled();
    expect(getCallsByOp("insert")).toHaveLength(0);
  });

  test("creates the organization and member on first sight, mapping org:admin → owner", async () => {
    // First select finds nothing; second (post-sync) select returns the new row.
    onSelect(membersTable, [], [{ id: MEMBER_ID, role: "owner" }]);
    clerkFake.users.getUser.mockResolvedValue({
      firstName: "Ada",
      lastName: "Lovelace",
      username: "ada",
      primaryEmailAddressId: "email_2",
      emailAddresses: [
        { id: "email_1", emailAddress: "old@example.com" },
        { id: "email_2", emailAddress: "ada@example.com" },
      ],
      imageUrl: "https://img.example/ada.png",
    });
    clerkFake.organizations.getOrganization.mockResolvedValue({ name: "Acme Inc" });
    clerkFake.authenticateRequest.mockResolvedValue({
      toAuth: () => authState({ orgId: ORG_ID, orgRole: "org:admin" }),
    });

    const ctx = await createContext({ context: { request: makeRequest() } as never });

    expect(ctx.auth?.role).toBe("owner");

    const [orgInsert] = getCallsByOp("insert").filter((c) => c.table === organizations);
    expect(orgInsert.payload).toMatchObject({ id: ORG_ID, name: "Acme Inc" });

    const [memberInsert] = getCallsByOp("insert").filter((c) => c.table === membersTable);
    expect(memberInsert.payload).toMatchObject({
      organizationId: ORG_ID,
      clerkUserId: USER_ID,
      name: "Ada Lovelace",
      email: "ada@example.com", // primary email wins over other addresses
      avatarUrl: "https://img.example/ada.png",
      role: "owner",
    });
  });

  test("non-admin Clerk roles map to plain member", async () => {
    onSelect(membersTable, [], [{ id: MEMBER_ID, role: "member" }]);
    clerkFake.users.getUser.mockResolvedValue({
      firstName: null,
      lastName: null,
      username: "fallback_name",
      primaryEmailAddressId: null,
      emailAddresses: [],
      imageUrl: null,
    });
    clerkFake.organizations.getOrganization.mockResolvedValue({ name: "Acme" });
    clerkFake.authenticateRequest.mockResolvedValue({
      toAuth: () => authState({ orgId: ORG_ID, orgRole: "org:custom_role" }),
    });

    const ctx = await createContext({ context: { request: makeRequest() } as never });

    expect(ctx.auth?.role).toBe("member");
    const [memberInsert] = getCallsByOp("insert").filter((c) => c.table === membersTable);
    expect(memberInsert.payload.name).toBe("fallback_name"); // name fallback chain
    expect(memberInsert.payload.email).toBe(`${USER_ID}@invalid.local`);
    expect(memberInsert.payload.role).toBe("member");
  });

  test("membership sync failure is treated as unauthenticated", async () => {
    onSelect(membersTable, []); // no existing membership
    clerkFake.users.getUser.mockRejectedValue(new Error("clerk down"));
    clerkFake.authenticateRequest.mockResolvedValue({
      toAuth: () => authState({ orgId: ORG_ID, orgRole: "org:admin" }),
    });

    const ctx = await createContext({ context: { request: makeRequest() } as never });
    expect(ctx.auth).toBeNull();
  });
});
