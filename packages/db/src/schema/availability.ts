import { boolean, index, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { members } from "./members";

export const availabilityStatus = pgTable(
  "availability_status",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    status: varchar("status", {
      enum: ["available", "busy", "in_meeting", "focus_time", "traveling", "offline"],
    })
      .notNull()
      .default("available"),
    note: text("note"),
    expiresAt: timestamp("expires_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("availability_member_idx").on(t.memberId)],
);

export const workingHours = pgTable(
  "working_hours",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 6=Saturday
    startTime: text("start_time").notNull(), // "09:00"
    endTime: text("end_time").notNull(), // "18:00"
    isWorkingDay: boolean("is_working_day").notNull().default(true),
  },
  (t) => [index("working_hours_member_idx").on(t.memberId)],
);
