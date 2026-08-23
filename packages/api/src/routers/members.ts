import { db } from "@kairos/db";
import { members } from "@kairos/db/schema/members";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import z from "zod";
import { orgProcedure } from "../index";

export const membersRouter = {
  /** The authenticated user's member row in the active organization. */
  me: orgProcedure.handler(async ({ context }) => {
    const rows = await db
      .select()
      .from(members)
      .where(
        and(
          eq(members.id, context.auth!.memberId!),
          eq(members.organizationId, context.auth!.organizationId!),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }),

  list: orgProcedure.handler(async ({ context }) => {
    return db
      .select()
      .from(members)
      .where(eq(members.organizationId, context.auth!.organizationId!));
  }),

  getById: orgProcedure.input(z.object({ id: z.string() })).handler(async ({ input, context }) => {
    const rows = await db
      .select()
      .from(members)
      .where(
        and(eq(members.id, input.id), eq(members.organizationId, context.auth!.organizationId!)),
      )
      .limit(1);
    return rows[0] ?? null;
  }),

  updateProfile: orgProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().max(200).optional(),
        jobRole: z.string().max(200).optional(),
        timezone: z.string().max(64).optional(),
        skills: z.array(z.string().max(100)).max(50).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { id, ...fields } = input;
      // Only allow updating your own profile unless you're a manager/owner
      if (
        id !== context.auth!.memberId &&
        !["owner", "manager"].includes(context.auth!.role ?? "")
      ) {
        throw new ORPCError("FORBIDDEN", { message: "Cannot update another member's profile" });
      }
      return db
        .update(members)
        .set(fields)
        .where(and(eq(members.id, id), eq(members.organizationId, context.auth!.organizationId!)))
        .returning();
    }),
};
