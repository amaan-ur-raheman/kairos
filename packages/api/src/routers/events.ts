import { db } from "@kairos/db";
import { calendarEvents } from "@kairos/db/schema/calendar-events";
import { members } from "@kairos/db/schema/members";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import z from "zod";
import { orgProcedure } from "../index";

const nanoid = () => crypto.randomUUID();

const recurrenceSchema = z.object({
  recurrence: z.enum(["none", "daily", "weekdays", "weekly", "monthly", "yearly"]).default("none"),
  recurrenceDays: z.array(z.number().min(0).max(6)).default([]),
  recurrenceInterval: z.number().min(1).max(52).default(1),
  recurrenceUntil: z.string().datetime().nullish(),
});

const eventFields = {
  title: z.string().min(1),
  start: z.string().datetime(),
  end: z.string().datetime(),
  color: z.string().default("#3f51b5"),
  ...recurrenceSchema.shape,
};

export const eventsRouter = {
  /** The authenticated member's own calendar events. */
  list: orgProcedure.handler(async ({ context }) => {
    return db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.memberId, context.auth!.memberId!));
  }),

  /** Any member's events in the same org (for member schedule view). */
  listForMember: orgProcedure
    .input(z.object({ memberId: z.string() }))
    .handler(async ({ input, context }) => {
      // Verify target is in same org
      const target = await db
        .select({ orgId: members.organizationId })
        .from(members)
        .where(eq(members.id, input.memberId))
        .limit(1);
      if (!target[0] || target[0].orgId !== context.auth!.organizationId) {
        throw new ORPCError("NOT_FOUND", { message: "Member not found" });
      }
      return db.select().from(calendarEvents).where(eq(calendarEvents.memberId, input.memberId));
    }),

  create: orgProcedure.input(z.object(eventFields)).handler(async ({ input, context }) => {
    if (new Date(input.end) <= new Date(input.start)) {
      throw new ORPCError("BAD_REQUEST", { message: "End must be after start" });
    }
    if (input.recurrence === "weekly" && input.recurrenceDays.length === 0) {
      throw new ORPCError("BAD_REQUEST", { message: "Pick at least one day of the week" });
    }
    const rows = await db
      .insert(calendarEvents)
      .values({
        id: nanoid(),
        memberId: context.auth!.memberId!,
        title: input.title,
        startTime: new Date(input.start),
        endTime: new Date(input.end),
        color: input.color,
        recurrence: input.recurrence,
        recurrenceDays: input.recurrenceDays,
        recurrenceInterval: input.recurrenceInterval,
        recurrenceUntil: input.recurrenceUntil ? new Date(input.recurrenceUntil) : null,
      })
      .returning();
    return rows[0];
  }),

  /** Edits apply to the whole series (recurring events are a single definition). */
  update: orgProcedure
    .input(z.object({ id: z.string(), ...eventFields }))
    .handler(async ({ input, context }) => {
      if (new Date(input.end) <= new Date(input.start)) {
        throw new ORPCError("BAD_REQUEST", { message: "End must be after start" });
      }
      if (input.recurrence === "weekly" && input.recurrenceDays.length === 0) {
        throw new ORPCError("BAD_REQUEST", { message: "Pick at least one day of the week" });
      }
      const updated = await db
        .update(calendarEvents)
        .set({
          title: input.title,
          startTime: new Date(input.start),
          endTime: new Date(input.end),
          color: input.color,
          recurrence: input.recurrence,
          recurrenceDays: input.recurrenceDays,
          recurrenceInterval: input.recurrenceInterval,
          recurrenceUntil: input.recurrenceUntil ? new Date(input.recurrenceUntil) : null,
        })
        .where(
          and(
            eq(calendarEvents.id, input.id),
            eq(calendarEvents.memberId, context.auth!.memberId!),
          ),
        )
        .returning();
      if (!updated[0]) throw new ORPCError("NOT_FOUND", { message: "Event not found" });
      return updated[0];
    }),

  /** Deletes the whole series for recurring events. */
  delete: orgProcedure.input(z.object({ id: z.string() })).handler(async ({ input, context }) => {
    const deleted = await db
      .delete(calendarEvents)
      .where(
        and(eq(calendarEvents.id, input.id), eq(calendarEvents.memberId, context.auth!.memberId!)),
      )
      .returning();
    if (!deleted[0]) throw new ORPCError("NOT_FOUND", { message: "Event not found" });
    return deleted[0];
  }),
};
