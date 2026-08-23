import { pgTable, text, time, timestamp } from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(), // Clerk org ID
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  workingHoursStart: time("working_hours_start").notNull().default("09:00"),
  workingHoursEnd: time("working_hours_end").notNull().default("18:00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
