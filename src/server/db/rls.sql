-- Enable RLS on all tables
ALTER TABLE "swole-tracker_workout_template" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "swole-tracker_template_exercise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "swole-tracker_workout_session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "swole-tracker_session_exercise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "swole-tracker_user_preferences" ENABLE ROW LEVEL SECURITY;

-- Create a function to get the current user ID from Clerk JWT
CREATE OR REPLACE FUNCTION auth.clerk_user_id()
RETURNS TEXT AS $$
BEGIN
  -- Extract user ID from Clerk JWT token
  -- This assumes the JWT contains the user ID in the 'sub' claim
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('request.jwt.claim.sub', true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for workout templates
CREATE POLICY "Users can access own workout templates" ON "swole-tracker_workout_template"
  FOR ALL
  USING (user_id = auth.clerk_user_id())
  WITH CHECK (user_id = auth.clerk_user_id());

-- Create RLS policies for template exercises  
CREATE POLICY "Users can access own template exercises" ON "swole-tracker_template_exercise"
  FOR ALL
  USING (user_id = auth.clerk_user_id())
  WITH CHECK (user_id = auth.clerk_user_id());

-- Create RLS policies for workout sessions
CREATE POLICY "Users can access own workout sessions" ON "swole-tracker_workout_session"
  FOR ALL
  USING (user_id = auth.clerk_user_id())
  WITH CHECK (user_id = auth.clerk_user_id());

-- Create RLS policies for session exercises
CREATE POLICY "Users can access own session exercises" ON "swole-tracker_session_exercise"
  FOR ALL
  USING (user_id = auth.clerk_user_id())
  WITH CHECK (user_id = auth.clerk_user_id());

-- Create RLS policies for user preferences
CREATE POLICY "Users can access own preferences" ON "swole-tracker_user_preferences"
  FOR ALL
  USING (user_id = auth.clerk_user_id())
  WITH CHECK (user_id = auth.clerk_user_id());
