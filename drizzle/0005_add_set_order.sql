-- Add setOrder field to session_exercise table for tracking set order within exercises
ALTER TABLE "swole-tracker_session_exercise" ADD COLUMN "setOrder" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "session_exercise_set_order_idx" ON "swole-tracker_session_exercise" USING btree ("exerciseName","setOrder");
