-- Database Performance Optimization - Phase 2
-- Schema Normalization: Extract hot JSON fields to dedicated columns

-- Add extracted columns to user_preferences table
ALTER TABLE user_preferences ADD COLUMN progression_type_enum TEXT NOT NULL DEFAULT 'adaptive';
ALTER TABLE user_preferences ADD COLUMN warmup_percentages_array TEXT NOT NULL DEFAULT '40,60,80';

-- Add extracted columns to WHOOP tables for faster querying
ALTER TABLE whoop_recovery ADD COLUMN recovery_score_tier TEXT;
ALTER TABLE whoop_sleep ADD COLUMN sleep_quality_tier TEXT;

-- Populate extracted columns with data from existing JSON fields
UPDATE user_preferences SET progression_type_enum = progression_type WHERE progression_type IS NOT NULL;

-- Extract warmup percentages from JSON to comma-separated string
UPDATE user_preferences SET warmup_percentages_array = 
  CASE 
    WHEN warmupPercentages LIKE '[%]' THEN 
      substr(warmupPercentages, 2, length(warmupPercentages) - 2) -- Remove brackets
    ELSE '40,60,80'
  END;

-- Populate recovery score tiers based on recovery_score
UPDATE whoop_recovery SET recovery_score_tier = 
  CASE 
    WHEN recovery_score >= 80 THEN 'high'
    WHEN recovery_score >= 50 THEN 'medium'
    WHEN recovery_score >= 0 THEN 'low'
    ELSE NULL
  END
WHERE recovery_score IS NOT NULL;

-- Populate sleep quality tiers based on sleep_performance_percentage
UPDATE whoop_sleep SET sleep_quality_tier = 
  CASE 
    WHEN sleep_performance_percentage >= 85 THEN 'excellent'
    WHEN sleep_performance_percentage >= 70 THEN 'good'
    WHEN sleep_performance_percentage >= 50 THEN 'fair'
    WHEN sleep_performance_percentage >= 0 THEN 'poor'
    ELSE NULL
  END
WHERE sleep_performance_percentage IS NOT NULL;

-- Create indexes for the new extracted columns
CREATE INDEX user_preferences_progression_type_enum_idx ON user_preferences(progression_type_enum);
CREATE INDEX user_preferences_warmup_percentages_array_idx ON user_preferences(warmup_percentages_array);
CREATE INDEX whoop_recovery_score_tier_idx ON whoop_recovery(recovery_score_tier);
CREATE INDEX whoop_sleep_quality_tier_idx ON whoop_sleep(sleep_quality_tier);

-- Composite indexes for common query patterns
CREATE INDEX whoop_recovery_user_tier_idx ON whoop_recovery(user_id, recovery_score_tier);
CREATE INDEX whoop_sleep_user_tier_idx ON whoop_sleep(user_id, sleep_quality_tier);