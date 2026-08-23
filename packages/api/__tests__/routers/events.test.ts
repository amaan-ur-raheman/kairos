import { ORPCError } from "@orpc/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@kairos/db", async () => {
  const { getMockedDb } = await import("../helpers/db-mock");
  return { db: getMockedDb() };
});

import { calendarEvents } from "@kairos/db/schema/calendar-events";
import { members as membersTable } from "@kairos/db/schema/members";

import { eventsRouter } from "../../src/routers/events";
import { getCallsByOp, onReturning, onSelect, resetDbMock } from "../helpers/db-mock";
import { clientOf, MEMBER_ID, MEMBER_ID_OTHER, memberCtx, ORG_ID } from "../helpers/fixtures";

const baseInput = {
  title: "Standup",
  start: "2026-08-10T09:00:00.000Z",
  end: "2026-08-10T09:30:00.000Z",
};

describe("eventsRouter", () => {
  beforeEach(() => resetDbMock());

  describe("create", () => {
    test("creates an event owned by the caller with defaults applied", async () => {
      const create = clientOf(eventsRouter.create);
      const result = await create(baseInput, memberCtx());

      expect(result.title).toBe("Standup");
      expect(result.memberId).toBe(MEMBER_ID);
      const insert = getCallsByOp("insert")[0];
      // zod defaults filled in
      expect(insert.payload).toMatchObject({
        color: "#3f51b5",
        recurrence: "none",
        recurrenceDays: [],
        recurrenceInterval: 1,
        recurrenceUntil: null,
      });
    });

    test.each([
      [
        "end before start",
        { ...baseInput, start: "2026-08-10T10:00:00.000Z", end: "2026-08-10T09:00:00.000Z" },
      ],
      ["end equal to start", { ...baseInput, end: "2026-08-10T09:00:00.000Z" }],
    ])("rejects %s", async (_label, input) => {
      const create = clientOf(eventsRouter.create);
      const err = await create(input, memberCtx()).catch((e) => e);
      expect(err).toBeInstanceOf(ORPCError);
      expect(err.code).toBe("BAD_REQUEST");
      expect(getCallsByOp("insert")).toHaveLength(0);
    });

    test("rejects weekly recurrence without any selected days", async () => {
      const create = clientOf(eventsRouter.create);
      const err = await create({ ...baseInput, recurrence: "weekly" }, memberCtx()).catch((e) => e);

      expect(err.code).toBe("BAD_REQUEST");
      expect(err.message).toMatch(/day of the week/i);
    });

    test("converts ISO strings to Date objects for storage", async () => {
      await clientOf(eventsRouter.create)(baseInput, memberCtx());
      const insert = getCallsByOp("insert")[0];
      expect(insert.payload.startTime).toEqual(new Date(baseInput.start));
      expect(insert.payload.endTime).toEqual(new Date(baseInput.end));
    });
  });

  test("list returns the caller's own events", async () => {
    const rows = [{ id: "ev1", memberId: MEMBER_ID, title: "Standup" }];
    onSelect(calendarEvents, rows);
    const result = await clientOf(eventsRouter.list)(undefined, memberCtx());
    expect(result).toEqual(rows);
  });

  describe("listForMember", () => {
    test("returns another member's events within the same org", async () => {
      onSelect(membersTable, [{ orgId: ORG_ID }]);
      const rows = [{ id: "ev2", memberId: MEMBER_ID_OTHER, title: "Deep work" }];
      onSelect(calendarEvents, rows);

      const listForMember = clientOf(eventsRouter.listForMember);
      await expect(listForMember({ memberId: MEMBER_ID_OTHER }, memberCtx())).resolves.toEqual(
        rows,
      );
    });

    test("is NOT_FOUND when the target member does not exist or is cross-org", async () => {
      onSelect(membersTable, []); // not found
      const listForMember = clientOf(eventsRouter.listForMember);
      const err = await listForMember({ memberId: "ghost" }, memberCtx()).catch((e) => e);
      expect(err.code).toBe("NOT_FOUND");
    });
  });

  describe("update", () => {
    test("updates an event owned by the caller", async () => {
      const updated = { id: "ev1", ...baseInput, title: "Renamed" };
      onReturning(calendarEvents, [updated]);

      const update = clientOf(eventsRouter.update);
      const result = await update({ id: "ev1", ...baseInput, title: "Renamed" }, memberCtx());
      expect(result.title).toBe("Renamed");
    });

    test("is NOT_FOUND for another member's event (ownership scoped in SQL)", async () => {
      onReturning(calendarEvents, []);
      const update = clientOf(eventsRouter.update);
      const err = await update({ id: "not-mine", ...baseInput }, memberCtx()).catch((e) => e);

      expect(err).toBeInstanceOf(ORPCError);
      expect(err.code).toBe("NOT_FOUND");
    });

    test("rejects end <= start before touching the database", async () => {
      const update = clientOf(eventsRouter.update);
      await expect(
        update({ id: "ev1", ...baseInput, end: baseInput.start }, memberCtx()),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(getCallsByOp("update")).toHaveLength(0);
    });
  });

  describe("delete", () => {
    test("deletes an event owned by the caller", async () => {
      const deleted = { id: "ev1", memberId: MEMBER_ID };
      onReturning(calendarEvents, [deleted]);

      const remove = clientOf(eventsRouter.delete);
      await expect(remove({ id: "ev1" }, memberCtx())).resolves.toEqual(deleted);
    });

    test("is NOT_FOUND for another member's event", async () => {
      onReturning(calendarEvents, []);
      const remove = clientOf(eventsRouter.delete);
      await expect(remove({ id: "not-mine" }, memberCtx())).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });
});
