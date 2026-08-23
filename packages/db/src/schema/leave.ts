import { boolean, date, index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { members } from "./members";

export const leaveRequests = pgTable(
  "leave_requests",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    type: varchar("type", {
      enum: ["vacation", "sick", "personal", "other"],
    })
      .notNull()
      .default("vacation"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    startsHalfDay: boolean("starts_half_day").default(false).notNull(),
    endsHalfDay: boolean("ends_half_day").default(false).notNull(),
    status: varchar("status", {
      enum: ["pending", "approved", "rejected", "cancelled"],
    })
      .notNull()
      .default("pending"),
    reason: text("reason"),
    approvedBy: text("approved_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    decidedAt: timestamp("decided_at"),
  },
  (t) => [
    index("leave_member_idx").on(t.memberId),
    index("leave_member_dates_idx").on(t.memberId, t.startDate, t.endDate),
    index("leave_status_idx").on(t.status),
  ],
);
