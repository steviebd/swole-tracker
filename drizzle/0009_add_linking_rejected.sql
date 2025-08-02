-- Migration: Add linkingRejected column to template_exercise table
-- This column tracks if user explicitly chose not to link a template exercise to a master exercise

ALTER TABLE "swole-tracker_template_exercise" 
ADD COLUMN "linkingRejected" boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN "swole-tracker_template_exercise"."linkingRejected" 
IS 'Track if user explicitly chose not to link this template exercise to a master exercise';
