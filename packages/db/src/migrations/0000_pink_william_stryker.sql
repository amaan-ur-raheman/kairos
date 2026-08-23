CREATE TABLE "availability_status" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"status" varchar DEFAULT 'available' NOT NULL,
	"note" text,
	"expires_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "working_hours" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"is_working_day" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"title" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"color" text DEFAULT '#3f51b5' NOT NULL,
	"recurrence" text DEFAULT 'none' NOT NULL,
	"recurrence_days" integer[] DEFAULT '{}' NOT NULL,
	"recurrence_interval" integer DEFAULT 1 NOT NULL,
	"recurrence_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"type" varchar DEFAULT 'vacation' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"starts_half_day" boolean DEFAULT false NOT NULL,
	"ends_half_day" boolean DEFAULT false NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"reason" text,
	"approved_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"decided_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"avatar_url" text,
	"role" varchar DEFAULT 'member' NOT NULL,
	"job_role" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"skills" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"working_hours_start" time DEFAULT '09:00' NOT NULL,
	"working_hours_end" time DEFAULT '18:00' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "availability_status" ADD CONSTRAINT "availability_status_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_member_idx" ON "availability_status" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "working_hours_member_idx" ON "working_hours" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "calendar_events_member_idx" ON "calendar_events" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "leave_member_idx" ON "leave_requests" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "leave_member_dates_idx" ON "leave_requests" USING btree ("member_id","start_date","end_date");--> statement-breakpoint
CREATE INDEX "leave_status_idx" ON "leave_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "members_org_idx" ON "members" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_org_clerk_user_idx" ON "members" USING btree ("organization_id","clerk_user_id");