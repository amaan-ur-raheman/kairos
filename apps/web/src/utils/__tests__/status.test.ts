import { describe, expect, test } from "vitest";
import { STATUS_META, STATUS_ORDER, statusMeta } from "../status";

describe("STATUS constants", () => {
  test("every ordered status has metadata", () => {
    for (const status of STATUS_ORDER) {
      expect(STATUS_META[status]).toBeDefined();
      expect(STATUS_META[status].label).toBeTruthy();
      expect(STATUS_META[status].color).toMatch(/^var\(--status-/);
    }
  });

  test("order contains no duplicates and covers all statuses", () => {
    expect(new Set(STATUS_ORDER).size).toBe(STATUS_ORDER.length);
    expect(Object.keys(STATUS_META).sort()).toEqual([...STATUS_ORDER].sort());
  });
});

describe("statusMeta", () => {
  test("resolves known statuses", () => {
    expect(statusMeta("available").label).toBe("Available");
    expect(statusMeta("in_meeting").label).toBe("In a Meeting");
  });

  test.each([null, undefined, ""])("falls back to offline for %s", (input) => {
    expect(statusMeta(input as never).label).toBe(STATUS_META.offline.label);
  });

  test("falls back to offline for unknown statuses", () => {
    expect(statusMeta("party_mode")).toEqual(STATUS_META.offline);
  });
});
