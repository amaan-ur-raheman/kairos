import { db } from "@kairos/db";
import { availabilityStatus, workingHours } from "@kairos/db/schema/availability";
import { members } from "@kairos/db/schema/members";
import { ORPCError } from "@orpc/server";
import { and, eq, gt, inArray, isNull, or } from "drizzle-orm";
import z from "zod";
import { orgProcedure } from "../index";

const nanoid = () => crypto.randomUUID();

async function assertEditableMember(memberId: string, organizationId: string) {
  const rows = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.organizationId, organizationId)))
    .limit(1);
  if (!rows[0]) throw new ORPCError("NOT_FOUND", { message: "Member not found" });
}

async function assertCanEdit(
  memberId: string,
  context: {
    auth: { memberId: string | null; organizationId: string | null; role: string | null };
  },
) {
  if (
    memberId !== context.auth.memberId &&
    !["owner", "manager"].includes(context.auth.role ?? "")
  ) {
    throw new ORPCError("FORBIDDEN", { message: "You cannot edit another member's availability" });
  }
  await assertEditableMember(memberId, context.auth.organizationId!);
}

export const availabilityRouter = {
  setStatus: orgProcedure
    .input(
      z.object({
        memberId: z.string().optional(), // defaults to self
        status: z.enum(["available", "busy", "in_meeting", "focus_time", "traveling", "offline"]),
        note: z.string().max(500).optional(),
        expiresAt: z.string().datetime().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const memberId = input.memberId ?? context.auth!.memberId!;
      await assertCanEdit(memberId, context);
      // ponytail: neon-http has no transactions; db.batch runs both atomically server-side
      const results = await db.batch([
        db.delete(availabilityStatus).where(eq(availabilityStatus.memberId, memberId)),
        db
          .insert(availabilityStatus)
          .values({
            id: nanoid(),
            memberId,
            status: input.status,
            note: input.note,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          })
          .returning(),
      ]);
      return (results[1] as (typeof availabilityStatus.$inferSelect)[])[0];
    }),

  setWorkingHours: orgProcedure
    .input(
      z.object({
        memberId: z.string().optional(),
        hours: z
          .array(
            z.object({
              dayOfWeek: z.number().min(0).max(6),
              startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM"),
              endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM"),
              isWorkingDay: z.boolean(),
            }),
          )
          .min(1),
      }),
    )
    .handler(async ({ input, context }) => {
      for (const h of input.hours) {
        if (h.isWorkingDay && h.startTime >= h.endTime) {
          throw new ORPCError("BAD_REQUEST", {
            message: `Start time must be before end time (${h.startTime} → ${h.endTime})`,
          });
        }
      }
      const memberId = input.memberId ?? context.auth!.memberId!;
      await assertCanEdit(memberId, context);
      // ponytail: neon-http has no transactions; db.batch runs both atomically server-side
      const results = await db.batch([
        db.delete(workingHours).where(eq(workingHours.memberId, memberId)),
        db
          .insert(workingHours)
          .values(
            input.hours.map((h) => ({
              id: nanoid(),
              memberId,
              ...h,
            })),
          )
          .returning(),
      ]);
      return results[1] as (typeof workingHours.$inferSelect)[];
    }),

  getWorkingHours: orgProcedure
    .input(z.object({ memberId: z.string().optional() }))
    .handler(async ({ input, context }) => {
      const memberId = input.memberId ?? context.auth!.memberId!;
      // Read is org-wide, but the target must belong to the caller's org
      const target = await db
        .select({ id: members.id })
        .from(members)
        .where(
          and(eq(members.id, memberId), eq(members.organizationId, context.auth!.organizationId!)),
        )
        .limit(1);
      if (!target[0]) throw new ORPCError("NOT_FOUND", { message: "Member not found" });
      return db
        .select()
        .from(workingHours)
        .where(eq(workingHours.memberId, memberId))
        .orderBy(workingHours.dayOfWeek);
    }),

  getForOrg: orgProcedure.handler(async ({ context }) => {
    const orgId = context.auth!.organizationId!;
    const orgMembers = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.organizationId, orgId));

    const memberIds = orgMembers.map((m) => m.id);
    if (memberIds.length === 0) return [];

    // Expired statuses are treated as "no status set"
    return db
      .select()
      .from(availabilityStatus)
      .where(
        and(
          inArray(availabilityStatus.memberId, memberIds),
          or(isNull(availabilityStatus.expiresAt), gt(availabilityStatus.expiresAt, new Date())),
        ),
      );
  }),
};
