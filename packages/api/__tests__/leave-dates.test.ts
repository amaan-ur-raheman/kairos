import { describe, expect, test } from "vitest";
import { validateLeaveRange } from "../src/lib/leave-dates";

describe("validateLeaveRange", () => {
  test("accepts a valid range", () => {
    expect(validateLeaveRange("2024-01-01", "2024-01-05")).toBeNull();
  });

  test("same-day leave is valid", () => {
    expect(validateLeaveRange("2024-01-01", "2024-01-01")).toBeNull();
  });

  test("rejects end before start", () => {
    expect(validateLeaveRange("2024-01-05", "2024-01-01")).not.toBeNull();
  });

  test("rejects wrong format", () => {
    expect(validateLeaveRange("Jan 5 2024", "2024-01-05")).not.toBeNull();
    expect(validateLeaveRange("2024-1-1", "2024-01-05")).not.toBeNull();
  });

  test("rejects empty strings", () => {
    expect(validateLeaveRange("", "2024-01-05")).not.toBeNull();
    expect(validateLeaveRange("2024-01-01", "")).not.toBeNull();
  });

  test("rejects rollover dates like Feb 30", () => {
    expect(validateLeaveRange("2024-02-30", "2024-03-05")).not.toBeNull();
  });

  test("rejects impossible month and day values", () => {
    expect(validateLeaveRange("2024-13-01", "2024-12-31")).not.toBeNull();
    expect(validateLeaveRange("2024-00-10", "2024-01-10")).not.toBeNull();
    expect(validateLeaveRange("2024-01-32", "2024-02-01")).not.toBeNull();
  });

  describe("leap years", () => {
    test("accepts Feb 29 in a leap year", () => {
      expect(validateLeaveRange("2024-02-29", "2024-03-01")).toBeNull();
    });

    test("rejects Feb 29 in a non-leap year", () => {
      expect(validateLeaveRange("2025-02-29", "2025-03-01")).not.toBeNull();
      expect(validateLeaveRange("1900-02-29", "1900-03-01")).not.toBeNull(); // 1900 not a leap year
    });
  });

  test("accepts a multi-month range", () => {
    expect(validateLeaveRange("2024-11-25", "2025-01-06")).toBeNull();
  });

  test("error messages mention the offending date", () => {
    const err = validateLeaveRange("2024-02-30", "2024-03-05");
    expect(err).toContain("2024-02-30");
  });
});
