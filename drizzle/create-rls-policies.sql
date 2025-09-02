-- Create RLS policies for tables with user_id column
-- This script creates policies that allow users to access only their own data
-- It's idempotent and will skip tables that don't have user_id or already have policies

DO $$
DECLARE
    table_record RECORD;
    has_user_id BOOLEAN;
    policy_exists BOOLEAN;
    policy_name TEXT;
BEGIN
    -- Loop through all tables in the current schema
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = current_schema()
    LOOP
        -- Check if table has user_id column
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = table_record.schemaname 
            AND table_name = table_record.tablename 
            AND column_name = 'user_id'
        ) INTO has_user_id;
        
        -- Skip if no user_id column
        IF NOT has_user_id THEN
            RAISE NOTICE 'Skipping table %.% - no user_id column', table_record.schemaname, table_record.tablename;
            CONTINUE;
        END IF;
        
        -- Generate policy names
        policy_name := table_record.tablename || '_user_policy';
        
        -- Check if policy already exists
        SELECT EXISTS (
            SELECT 1 
            FROM pg_policies 
            WHERE schemaname = table_record.schemaname 
            AND tablename = table_record.tablename 
            AND policyname = policy_name
        ) INTO policy_exists;
        
        -- Skip if policy already exists
        IF policy_exists THEN
            RAISE NOTICE 'Skipping table %.% - policy % already exists', 
                        table_record.schemaname, 
                        table_record.tablename, 
                        policy_name;
            CONTINUE;
        END IF;
        
        -- Create comprehensive policy for all operations (SELECT, INSERT, UPDATE, DELETE)
        BEGIN
            -- Create policy for all operations
            EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id)',
                          policy_name,
                          table_record.schemaname, 
                          table_record.tablename);
            
            RAISE NOTICE 'Created policy % for table %.%', 
                        policy_name,
                        table_record.schemaname, 
                        table_record.tablename;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to create policy for table %.%: %', 
                            table_record.schemaname, 
                            table_record.tablename, 
                            SQLERRM;
        END;
    END LOOP;
END $$;