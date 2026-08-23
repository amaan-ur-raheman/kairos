import { index, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { organizations } from "./organizations";

export const members = pgTable(
  "members",
  {
    id: text("id").primaryKey(), // Local member ID
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    avatarUrl: text("avatar_url"),
    role: varchar("role", { enum: ["owner", "manager", "member"] })
      .notNull()
      .default("member"),
    jobRole: text("job_role"), // e.g. "Backend Engineer"
    timezone: text("timezone").notNull().default("UTC"),
    skills: text("skills").array().default([]).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("members_org_idx").on(t.organizationId),
    uniqueIndex("members_org_clerk_user_idx").on(t.organizationId, t.clerkUserId),
  ],
);
