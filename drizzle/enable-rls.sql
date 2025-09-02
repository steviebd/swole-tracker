-- Enable Row Level Security (RLS) for all tables with user_id column
-- This script is idempotent and will skip tables that already have RLS enabled
-- or don't have a user_id column

DO $$
DECLARE
    table_record RECORD;
    has_user_id BOOLEAN;
    rls_enabled BOOLEAN;
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
        
        -- Check if RLS is already enabled
        SELECT c.relrowsecurity 
        FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = table_record.schemaname 
        AND c.relname = table_record.tablename
        INTO rls_enabled;
        
        -- Skip if RLS already enabled
        IF rls_enabled THEN
            RAISE NOTICE 'Skipping table %.% - RLS already enabled', table_record.schemaname, table_record.tablename;
            CONTINUE;
        END IF;
        
        -- Enable RLS for this table
        BEGIN
            EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 
                          table_record.schemaname, 
                          table_record.tablename);
            RAISE NOTICE 'Enabled RLS for table %.%', table_record.schemaname, table_record.tablename;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to enable RLS for table %.%: %', 
                            table_record.schemaname, 
                            table_record.tablename, 
                            SQLERRM;
        END;
    END LOOP;
END $$;