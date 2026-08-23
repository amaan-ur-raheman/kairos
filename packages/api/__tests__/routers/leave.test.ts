import { ORPCError } from "@orpc/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@kairos/db", async () => {
  const { getMockedDb } = await import("../helpers/db-mock");
  return { db: getMockedDb() };
});

import { leaveRequests } from "@kairos/db/schema/leave";
import { members as membersTable } from "@kairos/db/schema/members";

import { leaveRouter } from "../../src/routers/leave";
import { getCalls, getCallsByOp, onReturning, onSelect, resetDbMock } from "../helpers/db-mock";
import { clientOf, MEMBER_ID, MEMBER_ID_OTHER, managerCtx, memberCtx } from "../helpers/fixtures";

const validInput = {
  type: "vacation" as const,
  startDate: "2026-08-10",
  endDate: "2026-08-14",
};

describe("leaveRouter", () => {
  beforeEach(() => resetDbMock());

  describe("create", () => {
    test("creates a request attributed to the caller", async () => {
      const create = clientOf(leaveRouter.create);
      const result = await create(validInput, memberCtx());

      expect(result.memberId).toBe(MEMBER_ID);
      const insert = getCallsByOp("insert")[0];
      expect(insert.payload).toMatchObject({ ...validInput, memberId: MEMBER_ID });
    });

    test("rejects an inverted date range with BAD_REQUEST", async () => {
      const create = clientOf(leaveRouter.create);
      const err = await create(
        { ...validInput, startDate: "2026-08-14", endDate: "2026-08-10" },
        memberCtx(),
      ).catch((e) => e);

      expect(err).toBeInstanceOf(ORPCError);
      expect(err.code).toBe("BAD_REQUEST");
      expect(getCallsByOp("insert")).toHaveLength(0);
    });

    test("rejects a rollover date like Feb 30", async () => {
      const create = clientOf(leaveRouter.create);
      await expect(
        create({ type: "sick", startDate: "2026-02-30", endDate: "2026-03-01" }, memberCtx()),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  test("listForMember returns only the caller's requests", async () => {
    const rows = [{ id: "lr1", memberId: MEMBER_ID, status: "pending", ...validInput }];
    onSelect(leaveRequests, rows);
    const result = await clientOf(leaveRouter.listForMember)(undefined, memberCtx());
    expect(result).toEqual(rows);
  });

  describe("listPending", () => {
    test("returns pending requests across the org's members", async () => {
      onSelect(membersTable, [{ id: MEMBER_ID }, { id: MEMBER_ID_OTHER }]);
      const pending = [
        { id: "lr1", memberId: MEMBER_ID_OTHER, status: "pending", type: "vacation" },
      ];
      onSelect(leaveRequests, pending);

      const result = await clientOf(leaveRouter.listPending)(undefined, managerCtx());
      expect(result).toEqual(pending);
    });

    test("returns [] without querying leave when the org has no members", async () => {
      onSelect(membersTable, []);
      const result = await clientOf(leaveRouter.listPending)(undefined, managerCtx());
      expect(result).toEqual([]);
      expect(getCalls().filter((c) => c.table === leaveRequests)).toHaveLength(0);
    });
  });

  describe.each([
    ["approve", "approved"],
    ["reject", "rejected"],
  ] as const)("%s", (action, expectedStatus) => {
    test(`${action} requires owner/manager role`, async () => {
      const decide = clientOf(leaveRouter[action]);
      const err = await decide({ id: "lr1" }, memberCtx()).catch((e) => e);

      expect(err).toBeInstanceOf(ORPCError);
      expect(err.code).toBe("FORBIDDEN");
    });

    test(`${action} sets status, approver and decidedAt`, async () => {
      onSelect(leaveRequests, [
        { request: { id: "lr1", memberId: MEMBER_ID_OTHER, status: "pending" } },
      ]);
      onReturning(leaveRequests, [
        { id: "lr1", memberId: MEMBER_ID_OTHER, status: expectedStatus },
      ]);

      const decide = clientOf(leaveRouter[action]);
      const result = await decide({ id: "lr1" }, managerCtx());

      expect(result.status).toBe(expectedStatus);
      const update = getCallsByOp("update")[0];
      expect(update.payload).toMatchObject({
        status: expectedStatus,
        approvedBy: MEMBER_ID,
      });
      expect(update.payload.decidedAt).toBeInstanceOf(Date);
    });

    test(`${action} is NOT_FOUND for requests outside the org`, async () => {
      onSelect(leaveRequests, []);
      const decide = clientOf(leaveRouter[action]);
      const err = await decide({ id: "elsewhere" }, managerCtx()).catch((e) => e);
      expect(err.code).toBe("NOT_FOUND");
    });
  });
});
