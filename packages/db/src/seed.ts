/**
 * Seed script: creates a demo org with 8 fake members + working hours + a leave request.
 * Run: bun run db:seed (from repo root) or cd packages/db && bun run src/seed.ts
 *
 * Uses Drizzle directly (no Clerk). Clerk sync happens in the app.
 * Note: the seeded member IDs (user_001 etc.) won't match real Clerk users —
 * this is for testing the calendar/data layer. Sign-in flows need real Clerk IDs.
 */
import dotenv from "dotenv";

dotenv.config({ path: "../../apps/server/.env" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Check apps/server/.env");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

const ORG_ID = "org_demo_001";
const MEMBERS = [
  {
    id: "user_001",
    name: "Aisha Patel",
    email: "aisha@example.com",
    role: "owner" as const,
    jobRole: "CEO",
    timezone: "America/New_York",
  },
  {
    id: "user_002",
    name: "Ben Torres",
    email: "ben@example.com",
    role: "manager" as const,
    jobRole: "Engineering Manager",
    timezone: "America/Chicago",
  },
  {
    id: "user_003",
    name: "Clara Wu",
    email: "clara@example.com",
    role: "member" as const,
    jobRole: "Senior Frontend Engineer",
    timezone: "America/Los_Angeles",
  },
  {
    id: "user_004",
    name: "David Kim",
    email: "david@example.com",
    role: "member" as const,
    jobRole: "Backend Engineer",
    timezone: "Asia/Seoul",
  },
  {
    id: "user_005",
    name: "Elena Rossi",
    email: "elena@example.com",
    role: "manager" as const,
    jobRole: "Product Manager",
    timezone: "Europe/Rome",
  },
  {
    id: "user_006",
    name: "Fatima Al-Hassan",
    email: "fatima@example.com",
    role: "member" as const,
    jobRole: "DevOps Engineer",
    timezone: "Asia/Dubai",
  },
  {
    id: "user_007",
    name: "George Chen",
    email: "george@example.com",
    role: "member" as const,
    jobRole: "Full Stack Engineer",
    timezone: "Asia/Shanghai",
  },
  {
    id: "user_008",
    name: "Hana Nakamura",
    email: "hana@example.com",
    role: "member" as const,
    jobRole: "Designer",
    timezone: "Asia/Tokyo",
  },
];

const in2Weeks = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
const in3Weeks = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);

async function seed() {
  console.log("Seeding organization...");
  await db
    .insert(schema.organizations)
    .values({
      id: ORG_ID,
      name: "Kairos Demo",
      timezone: "UTC",
      workingHoursStart: "09:00",
      workingHoursEnd: "18:00",
    })
    .onConflictDoNothing();

  console.log(`Seeding ${MEMBERS.length} members...`);
  await db
    .insert(schema.members)
    .values(
      MEMBERS.map((m) => ({
        id: m.id,
        organizationId: ORG_ID,
        clerkUserId: m.id, // Fake Clerk IDs for seeded data
        name: m.name,
        email: m.email,
        role: m.role,
        jobRole: m.jobRole,
        timezone: m.timezone,
      })),
    )
    .onConflictDoNothing();

  console.log("Seeding default working hours (Mon-Fri 9-5)...");
  const hours = MEMBERS.flatMap((m) =>
    Array.from({ length: 7 }, (_, day) => ({
      id: `wh_${m.id}_${day}`,
      memberId: m.id,
      dayOfWeek: day,
      startTime: "09:00",
      endTime: "18:00",
      isWorkingDay: day >= 1 && day <= 5,
    })),
  );
  await db.insert(schema.workingHours).values(hours).onConflictDoNothing();

  console.log("Seeding a leave request...");
  await db
    .insert(schema.leaveRequests)
    .values({
      id: "leave_001",
      memberId: "user_003",
      type: "vacation",
      startDate: in2Weeks,
      endDate: in3Weeks,
      status: "pending",
      reason: "Family trip",
    })
    .onConflictDoNothing();

  console.log("Seed complete!");
  console.log(`  Org: ${ORG_ID} (${MEMBERS.length} members, 1 leave request)`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
