import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { members } from "./members";

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    color: text("color").notNull().default("#3f51b5"),
    // recurrence
    recurrence: text("recurrence").notNull().default("none"), // none | daily | weekdays | weekly | monthly | yearly
    recurrenceDays: integer("recurrence_days").array().notNull().default([]), // 0=Sun..6=Sat (weekly patterns)
    recurrenceInterval: integer("recurrence_interval").notNull().default(1), // every N weeks
    recurrenceUntil: timestamp("recurrence_until"), // null = forever
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("calendar_events_member_idx").on(t.memberId)],
);
