-- Incremental Aggregation Table Migration
-- Creates table for storing pre-computed daily aggregations

-- Create daily aggregations table
CREATE TABLE IF NOT EXISTS daily_aggregations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  total_volume REAL NOT NULL DEFAULT 0,
  total_sets INTEGER NOT NULL DEFAULT 0,
  total_reps INTEGER NOT NULL DEFAULT 0,
  unique_exercises INTEGER NOT NULL DEFAULT 0,
  workout_count INTEGER NOT NULL DEFAULT 0,
  max_one_rm REAL NOT NULL DEFAULT 0,
  avg_one_rm REAL NOT NULL DEFAULT 0,
  personal_records INTEGER NOT NULL DEFAULT 0,
  last_updated TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS daily_aggregations_user_date_idx ON daily_aggregations(user_id, date DESC);
CREATE INDEX IF NOT EXISTS daily_aggregations_user_idx ON daily_aggregations(user_id);
CREATE INDEX IF NOT EXISTS daily_aggregations_date_idx ON daily_aggregations(date DESC);

-- Create unique constraint to prevent duplicate aggregations
CREATE UNIQUE INDEX IF NOT EXISTS daily_aggregations_user_date_unique ON daily_aggregations(user_id, date);

-- Add triggers for updated_at timestamp (if supported by D1)
-- Note: D1 doesn't support triggers, so we'll handle this in application logic

-- Create aggregation metadata table for tracking optimization status
CREATE TABLE IF NOT EXISTS aggregation_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  last_aggregated_date TEXT NOT NULL,
  total_aggregations INTEGER NOT NULL DEFAULT 0,
  aggregation_enabled BOOLEAN NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS aggregation_metadata_user_unique ON aggregation_metadata(user_id);

-- Insert initial metadata for existing users (this would be run in a separate data migration)
-- INSERT OR IGNORE INTO aggregation_metadata (user_id, last_aggregated_date, total_aggregations)
-- SELECT DISTINCT user_id, MIN(workoutDate), 0 FROM workout_sessions GROUP BY user_id;