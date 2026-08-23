import { beforeEach, describe, expect, test } from "vitest";
import { getClerkAuthToken, setClerkAuthTokenGetter } from "../clerk-auth";

describe("clerk-auth token bridge", () => {
  beforeEach(() => {
    setClerkAuthTokenGetter(null);
  });

  test("returns null when no getter is registered", async () => {
    await expect(getClerkAuthToken()).resolves.toBeNull();
  });

  test("round-trips a token through the registered getter", async () => {
    setClerkAuthTokenGetter(async () => "tok_123");
    await expect(getClerkAuthToken()).resolves.toBe("tok_123");
  });

  test("a registered getter returning null yields null", async () => {
    setClerkAuthTokenGetter(async () => null);
    await expect(getClerkAuthToken()).resolves.toBeNull();
  });

  test("unregistering with null stops resolving tokens", async () => {
    setClerkAuthTokenGetter(async () => "tok_123");
    setClerkAuthTokenGetter(null);
    await expect(getClerkAuthToken()).resolves.toBeNull();
  });
});
