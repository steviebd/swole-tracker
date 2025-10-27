-- Adds support for customizable progress targets in KPI hero cards and consistency section
ALTER TABLE user_preferences
ADD COLUMN targetWorkoutsPerWeek REAL NOT NULL DEFAULT 3;
