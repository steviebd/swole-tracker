CREATE TABLE IF NOT EXISTS "swole-tracker_session_debrief" (
  "id" serial PRIMARY KEY,
  "user_id" varchar(256) NOT NULL,
  "sessionId" integer NOT NULL REFERENCES "swole-tracker_workout_session"("id") ON DELETE cascade,
  "version" integer NOT NULL DEFAULT 1,
  "parentDebriefId" integer REFERENCES "swole-tracker_session_debrief"("id") ON DELETE set null,
  "summary" text NOT NULL,
  "prHighlights" json,
  "adherenceScore" numeric(5, 2),
  "focusAreas" json,
  "streakContext" json,
  "overloadDigest" json,
  "metadata" json,
  "isActive" boolean NOT NULL DEFAULT true,
  "viewedAt" timestamptz,
  "dismissedAt" timestamptz,
  "pinnedAt" timestamptz,
  "regenerationCount" integer NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz
);

CREATE INDEX IF NOT EXISTS "session_debrief_user_idx" ON "swole-tracker_session_debrief" ("user_id");
CREATE INDEX IF NOT EXISTS "session_debrief_session_idx" ON "swole-tracker_session_debrief" ("sessionId");
CREATE INDEX IF NOT EXISTS "session_debrief_created_idx" ON "swole-tracker_session_debrief" ("createdAt");
CREATE INDEX IF NOT EXISTS "session_debrief_user_created_idx" ON "swole-tracker_session_debrief" ("user_id", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "session_debrief_version_unique" ON "swole-tracker_session_debrief" ("user_id", "sessionId", "version");
CREATE UNIQUE INDEX IF NOT EXISTS "session_debrief_active_unique" ON "swole-tracker_session_debrief" ("user_id", "sessionId") WHERE "isActive" IS TRUE;
