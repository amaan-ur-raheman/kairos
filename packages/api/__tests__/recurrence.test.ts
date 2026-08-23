import { describe, expect, test } from "vitest";
import { expandOccurrences, recurrenceLabel } from "../src/lib/recurrence";

const base = {
  recurrenceDays: [] as number[],
  recurrenceInterval: 1,
  recurrenceUntil: null as string | null,
};

// Mon 2025-02-10, 09:00–15:00 (the "college on Monday" case)
const mondayEvent = {
  ...base,
  startTime: "2025-02-10T09:00:00.000Z",
  endTime: "2025-02-10T15:00:00.000Z",
};

describe("expandOccurrences", () => {
  test("non-recurring event inside range appears once", () => {
    const occ = expandOccurrences(
      { ...mondayEvent, recurrence: "none" },
      new Date("2025-02-10T00:00:00Z"),
      new Date("2025-02-16T23:59:59Z"),
    );
    expect(occ.length).toBe(1);
  });

  test("non-recurring event outside range is empty", () => {
    const occ = expandOccurrences(
      { ...mondayEvent, recurrence: "none" },
      new Date("2025-03-01T00:00:00Z"),
      new Date("2025-03-07T23:59:59Z"),
    );
    expect(occ.length).toBe(0);
  });

  test("weekly on Monday: every Monday in a 4-week range", () => {
    const occ = expandOccurrences(
      { ...mondayEvent, recurrence: "weekly", recurrenceDays: [1] },
      new Date("2025-02-10T00:00:00Z"),
      new Date("2025-03-09T12:00:00Z"),
    );
    expect(occ.length).toBe(4); // Feb 10, 17, 24, Mar 3
    expect(occ[0].start.getUTCDay()).toBe(1);
  });

  test("college Monday 9-3: occurrence keeps 09:00–15:00", () => {
    const occ = expandOccurrences(
      { ...mondayEvent, recurrence: "weekly", recurrenceDays: [1] },
      new Date("2025-02-17T00:00:00Z"),
      new Date("2025-02-17T23:59:59Z"),
    );
    expect(occ.length).toBe(1);
    expect(occ[0].start.getUTCHours()).toBe(9);
    expect(occ[0].end.getUTCHours()).toBe(15);
  });

  test("weekdays skips weekends", () => {
    const occ = expandOccurrences(
      { ...mondayEvent, recurrence: "weekdays" },
      new Date("2025-02-10T00:00:00Z"),
      new Date("2025-02-16T23:59:59Z"),
    );
    expect(occ.length).toBe(5); // Mon-Fri
    for (const o of occ) expect(o.start.getUTCDay()).toBeLessThanOrEqual(5);
  });

  test("biweekly: every 2 weeks only", () => {
    const occ = expandOccurrences(
      { ...mondayEvent, recurrence: "weekly", recurrenceDays: [1], recurrenceInterval: 2 },
      new Date("2025-02-10T00:00:00Z"),
      new Date("2025-03-09T12:00:00Z"),
    );
    expect(occ.length).toBe(2); // Feb 10, Feb 24
    const dates = occ.map((o) => o.start.getUTCDate());
    expect(dates).toEqual([10, 24]);
  });

  test("weekly on Mon+Wed+Fri", () => {
    const occ = expandOccurrences(
      { ...mondayEvent, recurrence: "weekly", recurrenceDays: [1, 3, 5] },
      new Date("2025-02-10T00:00:00Z"),
      new Date("2025-02-16T23:59:59Z"),
    );
    expect(occ.length).toBe(3);
  });

  test("monthly: same date each month", () => {
    const occ = expandOccurrences(
      { ...mondayEvent, recurrence: "monthly" },
      new Date("2025-02-01T00:00:00Z"),
      new Date("2025-04-30T23:59:59Z"),
    );
    expect(occ.length).toBe(3); // Feb 10, Mar 10, Apr 10
  });

  test("yearly: once per year", () => {
    const occ = expandOccurrences(
      { ...mondayEvent, recurrence: "yearly" },
      new Date("2025-01-01T00:00:00Z"),
      new Date("2027-12-31T23:59:59Z"),
    );
    expect(occ.length).toBe(3);
  });

  test("recurrenceUntil caps expansion", () => {
    const occ = expandOccurrences(
      { ...mondayEvent, recurrence: "weekly", recurrenceDays: [1], recurrenceUntil: "2025-02-20" },
      new Date("2025-02-10T00:00:00Z"),
      new Date("2025-03-09T12:00:00Z"),
    );
    expect(occ.length).toBe(2); // Feb 10, Feb 17
  });

  describe("edge cases", () => {
    test("event straddling the range start is included", () => {
      // Event runs Sun Feb 9 22:00 → Mon Feb 10 04:00; range starts mid-event Monday.
      const occ = expandOccurrences(
        {
          ...base,
          startTime: "2025-02-09T22:00:00.000Z",
          endTime: "2025-02-10T04:00:00.000Z",
          recurrence: "none",
        },
        new Date("2025-02-10T02:00:00Z"),
        new Date("2025-02-10T23:59:59Z"),
      );
      expect(occ.length).toBe(1);
    });

    test("daily recurrence produces one occurrence per day", () => {
      const occ = expandOccurrences(
        { ...mondayEvent, recurrence: "daily" },
        new Date("2025-02-10T00:00:00Z"),
        new Date("2025-02-12T23:59:59Z"),
      );
      expect(occ.length).toBe(3); // Mon, Tue, Wed
    });

    test("recurrenceUntil on the exact last day still includes that day", () => {
      const occ = expandOccurrences(
        { ...mondayEvent, recurrence: "daily", recurrenceUntil: "2025-02-11" },
        new Date("2025-02-10T00:00:00Z"),
        new Date("2025-02-28T23:59:59Z"),
      );
      expect(occ.length).toBe(2); // Feb 10 + Feb 11
    });

    test("recurrenceUntil before the event start yields nothing", () => {
      const occ = expandOccurrences(
        {
          ...mondayEvent,
          recurrence: "weekly",
          recurrenceDays: [1],
          recurrenceUntil: "2025-02-01",
        },
        new Date("2025-02-10T00:00:00Z"),
        new Date("2025-03-09T12:00:00Z"),
      );
      expect(occ.length).toBe(0);
    });

    test("monthly skips months without that date (e.g. Jan 31)", () => {
      const jan31 = {
        ...base,
        startTime: "2025-01-31T10:00:00.000Z",
        endTime: "2025-01-31T11:00:00.000Z",
      };
      const occ = expandOccurrences(
        { ...jan31, recurrence: "monthly" },
        new Date("2025-01-01T00:00:00Z"),
        new Date("2025-04-30T23:59:59Z"),
      );
      expect(occ.length).toBe(2); // Jan 31 + Mar 31; February is skipped entirely
      const months = occ.map((o) => o.start.getMonth());
      expect(months).toEqual([0, 2]);
    });

    test("yearly respects month as well as day", () => {
      const feb14 = {
        ...base,
        startTime: "2025-02-14T10:00:00.000Z",
        endTime: "2025-02-14T11:00:00.000Z",
      };
      const occ = expandOccurrences(
        { ...feb14, recurrence: "yearly" },
        new Date("2025-01-01T00:00:00Z"),
        new Date("2026-12-31T23:59:59Z"),
      );
      expect(occ.length).toBe(2); // Feb 14 2025 + Feb 14 2026 — not Mar 14 etc.
    });

    test("weekly with empty days falls back to the anchor weekday", () => {
      const occ = expandOccurrences(
        { ...mondayEvent, recurrence: "weekly", recurrenceDays: [] },
        new Date("2025-02-10T00:00:00Z"),
        new Date("2025-02-23T23:59:59Z"),
      );
      expect(occ.length).toBe(2); // Two Mondays
      for (const o of occ) expect(o.start.getUTCDay()).toBe(1);
    });
  });
});

describe("recurrenceLabel", () => {
  test("labels", () => {
    expect(recurrenceLabel({ recurrence: "none", recurrenceDays: [], recurrenceInterval: 1 })).toBe(
      "Does not repeat",
    );
    expect(
      recurrenceLabel({ recurrence: "weekly", recurrenceDays: [1], recurrenceInterval: 1 }),
    ).toBe("Weekly on Mon");
    expect(
      recurrenceLabel({ recurrence: "weekly", recurrenceDays: [1], recurrenceInterval: 2 }),
    ).toBe("every 2 weeks on Mon");
    expect(
      recurrenceLabel({ recurrence: "weekly", recurrenceDays: [1, 3, 5], recurrenceInterval: 1 }),
    ).toBe("Weekly on Mon, Wed, Fri");
  });

  test("labels for other patterns", () => {
    expect(recurrenceLabel({ recurrence: "daily" })).toBe("Daily");
    expect(recurrenceLabel({ recurrence: "weekdays" })).toBe("Weekdays (Mon–Fri)");
    expect(recurrenceLabel({ recurrence: "monthly" })).toBe("Monthly");
    expect(recurrenceLabel({ recurrence: "yearly" })).toBe("Yearly");
    expect(
      recurrenceLabel({ recurrence: "weekly", recurrenceDays: [], recurrenceInterval: 3 }),
    ).toBe("Weekly");
  });

  test("sorts day names chronologically regardless of input order", () => {
    expect(recurrenceLabel({ recurrence: "weekly", recurrenceDays: [5, 1] })).toBe(
      "Weekly on Mon, Fri",
    );
  });
});
