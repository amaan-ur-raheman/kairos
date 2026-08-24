CREATE UNIQUE INDEX "availability_member_unique_idx" ON "availability_status" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "working_hours_member_day_unique_idx" ON "working_hours" USING btree ("member_id", "day_of_week");--> statement-breakpoint
DROP INDEX "availability_member_idx";--> statement-breakpoint
DROP INDEX "working_hours_member_idx";
