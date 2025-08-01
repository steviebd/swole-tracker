-- Fix foreign key constraint for templateExerciseId to allow template updates
-- Drop the existing foreign key constraint
ALTER TABLE "swole-tracker_session_exercise" DROP CONSTRAINT "swole-tracker_session_exercise_templateExerciseId_swole-tracker";--> statement-breakpoint

-- Add the new foreign key constraint with SET NULL on delete
ALTER TABLE "swole-tracker_session_exercise" ADD CONSTRAINT "swole-tracker_session_exercise_templateExerciseId_swole-tracker" FOREIGN KEY ("templateExerciseId") REFERENCES "swole-tracker_template_exercise"("id") ON DELETE set null;
