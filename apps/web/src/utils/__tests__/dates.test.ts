import { describe, expect, test } from "vitest";
import { weekStartOf } from "../dates";

describe("weekStartOf", () => {
  test("midweek date maps back to its Monday", () => {
    expect(weekStartOf(new Date(2024, 0, 10))).toEqual(new Date(2024, 0, 8)); // Wed → Mon
  });

  test("Monday maps to itself", () => {
    expect(weekStartOf(new Date(2024, 0, 8))).toEqual(new Date(2024, 0, 8));
  });

  test("Sunday maps to the previous Monday (not next week)", () => {
    expect(weekStartOf(new Date(2024, 0, 7))).toEqual(new Date(2024, 0, 1));
  });

  test("Saturday maps to the Monday four days earlier", () => {
    expect(weekStartOf(new Date(2024, 0, 13))).toEqual(new Date(2024, 0, 8)); // Sat → Mon
  });

  test("works across month boundaries", () => {
    // Wed Apr 3 2024 → Mon Apr 1 2024
    expect(weekStartOf(new Date(2024, 3, 3))).toEqual(new Date(2024, 3, 1));
    // Sun Jun 2 2024 → Mon May 27 2024 (previous month)
    expect(weekStartOf(new Date(2024, 5, 2))).toEqual(new Date(2024, 4, 27));
  });
});
