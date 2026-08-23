import { ORPCError } from "@orpc/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@kairos/db", async () => {
  const { getMockedDb } = await import("../helpers/db-mock");
  return { db: getMockedDb() };
});

import { members as membersTable } from "@kairos/db/schema/members";

import { membersRouter } from "../../src/routers/members";
import { getCalls, onReturning, onSelect, resetDbMock } from "../helpers/db-mock";
import {
  clientOf,
  MEMBER_ID,
  MEMBER_ID_OTHER,
  managerCtx,
  memberCtx,
  memberRow,
} from "../helpers/fixtures";

describe("membersRouter", () => {
  beforeEach(() => resetDbMock());

  test("me returns the caller's member row", async () => {
    const row = memberRow();
    onSelect(membersTable, [row]);
    const result = await clientOf(membersRouter.me)(undefined, memberCtx());
    expect(result).toEqual(row);
    expect(getCalls()[0].op).toBe("select");
  });

  test("me returns null when the member row is missing", async () => {
    onSelect(membersTable, []);
    await expect(clientOf(membersRouter.me)(undefined, memberCtx())).resolves.toBeNull();
  });

  test("list returns all org members", async () => {
    const rows = [memberRow(), memberRow({ id: MEMBER_ID_OTHER, name: "Colleague" })];
    onSelect(membersTable, rows);
    await expect(clientOf(membersRouter.list)(undefined, memberCtx())).resolves.toEqual(rows);
  });

  describe("getById", () => {
    test("returns a member when found", async () => {
      const row = memberRow({ id: MEMBER_ID_OTHER });
      onSelect(membersTable, [row]);
      const getById = clientOf(membersRouter.getById);
      await expect(getById({ id: MEMBER_ID_OTHER }, memberCtx())).resolves.toEqual(row);
    });

    test("returns null when not found", async () => {
      onSelect(membersTable, []);
      const getById = clientOf(membersRouter.getById);
      await expect(getById({ id: "ghost" }, memberCtx())).resolves.toBeNull();
    });
  });

  describe("updateProfile", () => {
    test("a plain member can update their own profile", async () => {
      const updated = memberRow({ name: "New Name" });
      onReturning(membersTable, [updated]);
      const updateProfile = clientOf(membersRouter.updateProfile);
      const result = await updateProfile({ id: MEMBER_ID, name: "New Name" }, memberCtx());
      expect(result).toEqual([updated]);
      expect(getCalls()[0].payload).toEqual({ name: "New Name" });
    });

    test("a plain member cannot update another member's profile", async () => {
      const updateProfile = clientOf(membersRouter.updateProfile);
      const err = await updateProfile({ id: MEMBER_ID_OTHER, name: "Hacked" }, memberCtx()).catch(
        (e) => e,
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err.code).toBe("FORBIDDEN");
    });

    test.each(["owner", "manager"] as const)(
      "a %s can update another member's profile",
      async (role) => {
        const updated = memberRow({ id: MEMBER_ID_OTHER, jobRole: "Designer" });
        onReturning(membersTable, [updated]);
        const updateProfile = clientOf(membersRouter.updateProfile);
        const result = await updateProfile(
          { id: MEMBER_ID_OTHER, jobRole: "Designer" },
          managerCtx(role),
        );
        expect(result).toEqual([updated]);
      },
    );

    test("update returning no rows resolves to an empty list", async () => {
      // Simulates the where clause matching nothing (e.g., cross-org id) —
      // Drizzle scopes by organizationId in SQL; no error should leak.
      onReturning(membersTable, []);
      const updateProfile = clientOf(membersRouter.updateProfile);
      await expect(
        updateProfile({ id: MEMBER_ID, timezone: "Europe/Berlin" }, memberCtx()),
      ).resolves.toEqual([]);
    });
  });
});
