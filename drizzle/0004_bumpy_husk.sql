-- Reversal of feature: restore original foreign key constraint without ON DELETE cascade
ALTER TABLE "swole-tracker_workout_session" DROP CONSTRAINT IF EXISTS "swole-tracker_workout_session_templateId_swole-tracker_workout_template_id_fk";
--> statement-breakpoint
ALTER TABLE "swole-tracker_workout_session" ADD CONSTRAINT "swole-tracker_workout_session_templateId_swole-tracker_workout_template_id_fk" FOREIGN KEY ("templateId") REFERENCES "public"."swole-tracker_workout_template"("id") ON DELETE no action ON UPDATE no action;
