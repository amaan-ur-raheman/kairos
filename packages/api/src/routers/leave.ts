import { db } from "@kairos/db";
import { leaveRequests } from "@kairos/db/schema/leave";
import { members } from "@kairos/db/schema/members";
import { ORPCError } from "@orpc/server";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import z from "zod";
import { orgProcedure } from "../index";

import { validateLeaveRange } from "../lib/leave-dates";

const nanoid = () => crypto.randomUUID();

/** Shared handler for approve/reject — they differ only in the resulting status. */
function decideLeave(status: "approved" | "rejected") {
  return orgProcedure
    .input(z.object({ id: z.string().trim().min(1) }))
    .handler(async ({ input, context }) => {
      if (!["owner", "manager"].includes(context.auth!.role ?? "")) {
        throw new ORPCError("FORBIDDEN", {
          message: "Only managers and owners can decide leave requests",
        });
      }

      const existing = await db
        .select({ request: leaveRequests })
        .from(leaveRequests)
        .innerJoin(members, eq(members.id, leaveRequests.memberId))
        .where(
          and(
            eq(leaveRequests.id, input.id),
            eq(members.organizationId, context.auth!.organizationId!),
          ),
        )
        .limit(1);
      if (!existing[0]?.request)
        throw new ORPCError("NOT_FOUND", { message: "Leave request not found" });
      if (existing[0].request.status !== "pending") {
        throw new ORPCError("BAD_REQUEST", {
          message: `Request was already ${existing[0].request.status}`,
        });
      }
      if (existing[0].request.memberId === context.auth!.memberId) {
        throw new ORPCError("FORBIDDEN", { message: "You cannot decide your own leave request" });
      }

      const updated = await db
        .update(leaveRequests)
        .set({
          status,
          approvedBy: context.auth!.memberId!,
          decidedAt: new Date(),
        })
        .where(eq(leaveRequests.id, input.id))
        .returning();

      return updated[0];
    });
}

export const leaveRouter = {
  /** Member creates a leave request */
  create: orgProcedure
    .input(
      z.object({
        type: z.enum(["vacation", "sick", "personal", "other"]),
        startDate: z.string(), // YYYY-MM-DD
        endDate: z.string(),
        startsHalfDay: z.boolean().default(false),
        endsHalfDay: z.boolean().default(false),
        reason: z.string().trim().max(2000).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const rangeError = validateLeaveRange(input.startDate, input.endDate);
      if (rangeError) throw new ORPCError("BAD_REQUEST", { message: rangeError });

      const rows = await db
        .insert(leaveRequests)
        .values({
          id: nanoid(),
          memberId: context.auth!.memberId!,
          ...input,
        })
        .returning();
      return rows[0];
    }),

  /** List own leave requests; optional `{ from, to }` (YYYY-MM-DD) overlap filter. */
  listForMember: orgProcedure
    .input(
      z
        .object({
          from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        })
        .optional(),
    )
    .handler(async ({ input, context }) => {
      const conditions = [eq(leaveRequests.memberId, context.auth!.memberId!)];
      if (input?.from && input?.to) {
        conditions.push(
          lte(leaveRequests.startDate, input.to),
          gte(leaveRequests.endDate, input.from),
        );
      }
      return db
        .select()
        .from(leaveRequests)
        .where(and(...conditions));
    }),

  /** Manager/Admin: list pending requests for the org */
  listPending: orgProcedure.handler(async ({ context }) => {
    const orgId = context.auth!.organizationId!;
    const orgMembers = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.organizationId, orgId));
    const memberIds = orgMembers.map((m) => m.id);
    if (memberIds.length === 0) return [];

    return db
      .select()
      .from(leaveRequests)
      .where(and(eq(leaveRequests.status, "pending"), inArray(leaveRequests.memberId, memberIds)));
  }),
  /** Approve a leave request */
  approve: decideLeave("approved"),
  reject: decideLeave("rejected"),
};
