import { ORPCError } from "@orpc/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@kairos/db", async () => {
  const { getMockedDb } = await import("../helpers/db-mock");
  return { db: getMockedDb() };
});

import { availabilityStatus, workingHours } from "@kairos/db/schema/availability";
import { members as membersTable } from "@kairos/db/schema/members";

import { availabilityRouter } from "../../src/routers/availability";
import { getCalls, getCallsByOp, onSelect, resetDbMock } from "../helpers/db-mock";
import {
  clientOf,
  MEMBER_ID,
  MEMBER_ID_OTHER,
  managerCtx,
  memberCtx,
  noOrgCtx,
} from "../helpers/fixtures";

describe("availabilityRouter", () => {
  beforeEach(() => resetDbMock());

  describe("setStatus", () => {
    test("defaults to the caller's own member id", async () => {
      onSelect(membersTable, [{ id: MEMBER_ID }]); // assertEditableMember
      const setStatus = clientOf(availabilityRouter.setStatus);
      const result = await setStatus({ status: "focus_time", note: "deep work" }, memberCtx());

      expect(result.status).toBe("focus_time");
      const insert = getCalls().find((c) => c.op === "insert");
      expect(insert?.payload).toMatchObject({
        memberId: MEMBER_ID,
        status: "focus_time",
        note: "deep work",
      });
    });

    test("replaces any previous status (delete before insert)", async () => {
      onSelect(membersTable, [{ id: MEMBER_ID }]); // assertEditableMember
      const setStatus = clientOf(availabilityRouter.setStatus);
      await setStatus({ status: "busy" }, memberCtx());

      expect(getCallsByOp("delete").length).toBe(1);
      expect(getCallsByOp("insert").length).toBe(1);
    });

    test("a plain member cannot set another member's status", async () => {
      const setStatus = clientOf(availabilityRouter.setStatus);
      const err = await setStatus(
        { memberId: MEMBER_ID_OTHER, status: "offline" },
        memberCtx(),
      ).catch((e) => e);

      expect(err).toBeInstanceOf(ORPCError);
      expect(err.code).toBe("FORBIDDEN");
    });

    test.each(["owner", "manager"] as const)(
      "a %s can set another member's status",
      async (role) => {
        onSelect(membersTable, [{ id: MEMBER_ID_OTHER }]); // assertEditableMember
        const setStatus = clientOf(availabilityRouter.setStatus);
        const result = await setStatus(
          { memberId: MEMBER_ID_OTHER, status: "traveling" },
          managerCtx(role),
        );
        expect(result.status).toBe("traveling");
      },
    );

    test("target member outside the org is NOT_FOUND even for owners", async () => {
      onSelect(membersTable, []); // assertEditableMember finds nothing
      const setStatus = clientOf(availabilityRouter.setStatus);
      const err = await setStatus(
        { memberId: "stranger", status: "available" },
        managerCtx(),
      ).catch((e) => e);

      expect(err.code).toBe("NOT_FOUND");
    });

    test("expiresAt is persisted as a Date when provided", async () => {
      onSelect(membersTable, [{ id: MEMBER_ID }]); // assertEditableMember
      const setStatus = clientOf(availabilityRouter.setStatus);
      await setStatus({ status: "busy", expiresAt: "2026-01-01T12:00:00.000Z" }, memberCtx());
      const insert = getCalls().find((c) => c.op === "insert");
      expect(insert?.payload).toMatchObject({
        expiresAt: new Date("2026-01-01T12:00:00.000Z"),
      });
    });
  });

  describe("setWorkingHours", () => {
    const validDay = { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isWorkingDay: true };

    test.each([
      ["09:00", "09:00"],
      ["18:00", "09:00"],
    ])("rejects %s → %s with BAD_REQUEST", async (start, end) => {
      const setWorkingHours = clientOf(availabilityRouter.setWorkingHours);
      const err = await setWorkingHours(
        { hours: [{ ...validDay, startTime: start, endTime: end }] },
        memberCtx(),
      ).catch((e) => e);

      expect(err).toBeInstanceOf(ORPCError);
      expect(err.code).toBe("BAD_REQUEST");
    });

    test("replaces existing hours for self by default", async () => {
      onSelect(membersTable, [{ id: MEMBER_ID }]); // assertEditableMember
      const setWorkingHours = clientOf(availabilityRouter.setWorkingHours);
      const result = await setWorkingHours(
        { hours: [validDay, { ...validDay, dayOfWeek: 2 }] },
        memberCtx(),
      );

      expect(result).toHaveLength(2);
      expect(getCallsByOp("delete").length).toBe(1);
      const insert = getCallsByOp("insert")[0];
      expect(Array.isArray(insert.payload)).toBe(true);
    });

    test("cannot edit another member's hours without a privileged role", async () => {
      const setWorkingHours = clientOf(availabilityRouter.setWorkingHours);
      const err = await setWorkingHours(
        { memberId: MEMBER_ID_OTHER, hours: [validDay] },
        memberCtx(),
      ).catch((e) => e);
      expect(err.code).toBe("FORBIDDEN");
    });

    test("owner can edit another member's hours after membership check", async () => {
      onSelect(membersTable, [{ id: MEMBER_ID_OTHER }]);
      const setWorkingHours = clientOf(availabilityRouter.setWorkingHours);
      const result = await setWorkingHours(
        { memberId: MEMBER_ID_OTHER, hours: [validDay] },
        managerCtx(),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("getWorkingHours", () => {
    test("returns own hours ordered by day of week", async () => {
      const rows = [
        {
          id: "wh1",
          memberId: MEMBER_ID,
          dayOfWeek: 0,
          startTime: "10:00",
          endTime: "16:00",
          isWorkingDay: false,
        },
        {
          id: "wh2",
          memberId: MEMBER_ID,
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
          isWorkingDay: true,
        },
      ];
      onSelect(membersTable, [{ id: MEMBER_ID }]); // org-scope check
      onSelect(workingHours, rows);
      const result = await clientOf(availabilityRouter.getWorkingHours)({}, memberCtx());
      expect(result).toEqual(rows);
    });
  });

  describe("getForOrg", () => {
    test("returns non-expired statuses for all org members", async () => {
      onSelect(membersTable, [{ id: MEMBER_ID }, { id: MEMBER_ID_OTHER }]);
      const statuses = [
        { id: "st1", memberId: MEMBER_ID, status: "available", note: null, expiresAt: null },
      ];
      onSelect(availabilityStatus, statuses);

      const result = await clientOf(availabilityRouter.getForOrg)(undefined, memberCtx());
      expect(result).toEqual(statuses);
    });

    test("returns an empty list when the org has no members", async () => {
      onSelect(membersTable, []);
      const getForOrg = clientOf(availabilityRouter.getForOrg);
      // Must not query availability at all — otherwise db-mock throws on the
      // unconfigured table.
      await expect(getForOrg(undefined, memberCtx())).resolves.toEqual([]);
      expect(getCalls().filter((c) => c.table === availabilityStatus)).toHaveLength(0);
    });
  });

  test("all routers reject unauthenticated contexts via orgProcedure", async () => {
    await expect(
      clientOf(availabilityRouter.setStatus)({ status: "busy" }, noOrgCtx()),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
