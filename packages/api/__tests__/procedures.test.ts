import { ORPCError } from "@orpc/server";
import { beforeEach, describe, expect, test } from "vitest";
import { orgProcedure, protectedProcedure, publicProcedure } from "../src/index";

import { clientOf, memberCtx, noOrgCtx, unauthenticatedCtx } from "./helpers/fixtures";

const callPublic = clientOf(publicProcedure.handler(() => "ok"));
const callProtected = clientOf(protectedProcedure.handler(() => "ok"));
const callOrg = clientOf(orgProcedure.handler(() => "ok"));

describe("procedure middleware chain", () => {
  beforeEach(() => {});

  test("publicProcedure runs without any auth", async () => {
    await expect(callPublic(undefined, unauthenticatedCtx())).resolves.toBe("ok");
  });

  test("protectedProcedure throws UNAUTHORIZED when unauthenticated", async () => {
    const err = await callProtected(undefined, unauthenticatedCtx()).catch((e) => e);
    expect(err).toBeInstanceOf(ORPCError);
    expect(err.code).toBe("UNAUTHORIZED");
  });

  test("protectedProcedure passes with an authenticated context", async () => {
    await expect(callProtected(undefined, memberCtx())).resolves.toBe("ok");
  });

  describe("orgProcedure", () => {
    test("throws UNAUTHORIZED when unauthenticated", async () => {
      const err = await callOrg(undefined, unauthenticatedCtx()).catch((e) => e);
      expect(err.code).toBe("UNAUTHORIZED");
    });

    test('throws FORBIDDEN "No organization selected" when no org is active', async () => {
      const err = await callOrg(undefined, noOrgCtx()).catch((e) => e);
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toBe("No organization selected");
    });

    test("throws FORBIDDEN when org exists but membership is missing", async () => {
      const err = await callOrg(undefined, memberCtx({ memberId: null, role: null })).catch(
        (e) => e,
      );
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toContain("not a member");
    });

    test("throws FORBIDDEN when role is missing", async () => {
      const err = await callOrg(undefined, memberCtx({ role: null })).catch((e) => e);
      expect(err.code).toBe("FORBIDDEN");
    });

    test("passes for a fully org-scoped member", async () => {
      await expect(callOrg(undefined, memberCtx())).resolves.toBe("ok");
    });
  });
});
