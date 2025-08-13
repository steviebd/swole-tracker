# Production Clerk to Supabase Migration Guide

This guide provides safe, step-by-step instructions for migrating from Clerk to Supabase Auth in production environments.

## 🚨 Pre-Migration Checklist

- [ ] **Full database backup** completed and verified
- [ ] **Supabase project** set up and configured for production
- [ ] **Environment files** prepared (`.env.production`)
- [ ] **User communication** plan ready
- [ ] **Rollback plan** documented
- [ ] **Testing completed** in staging environment
- [ ] **Maintenance window** scheduled

## 📁 Environment Setup

### 1. Create Production Environment File

```bash
cp .env.production.example .env.production
```

Update `.env.production` with your actual production values:

```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
DATABASE_URL=postgresql://user:pass@prod-host:5432/db?sslmode=require
```

### 2. Verify Environment

```bash
# Test connection
bun run scripts/production-migration.ts --env production analyze
```

## 🔍 Phase 1: Analysis & Planning

### 1. Analyze Current Data

```bash
# Generate comprehensive user analysis
bun run scripts/migration-helper.ts user-report .env.production
bun run scripts/production-migration.ts --env production analyze
```

This creates:
- `user-report-production-[timestamp].json` - Detailed user data analysis
- `migration-analysis-production-[timestamp].json` - Database analysis

### 2. Generate User Mapping

```bash
# Create mapping SQL template
bun run scripts/migration-helper.ts create-mapping .env.production
```

This generates `user-mapping-production-[timestamp].sql` with template mappings.

### 3. Prepare User Data

For each user found:

1. **Export from Clerk Dashboard**:
   - Go to Clerk Dashboard → Users
   - Export user data (includes emails)
   - Note user IDs and email addresses

2. **Create in Supabase**:
   - Option A: Have users register new accounts
   - Option B: Create users via Supabase Dashboard
   - Option C: Use Supabase Admin API to create users

3. **Update Mapping SQL**:
   ```sql
   -- Replace template values with real data
   INSERT INTO "swole-tracker_user_migration_mapping"
   (clerk_user_id, supabase_user_id, email, migration_environment)
   VALUES
     ('user_2abc...', '123e4567-e89b-12d3-a456-426614174000', 'user@example.com', 'production');
   ```

## 🛠️ Phase 2: Migration Setup

### 1. Create Migration Infrastructure

```bash
# Create mapping table in production
bun run scripts/production-migration.ts --env production create-mapping-table
```

### 2. Insert User Mappings

Run your updated SQL file against the production database:

```sql
-- Execute your user-mapping-production-[timestamp].sql file
```

### 3. Validate Mappings

```bash
# Verify all mappings are valid
bun run scripts/migration-helper.ts validate-mapping .env.production
```

Ensure all validations pass before proceeding.

## 💾 Phase 3: Backup & Safety

### 1. Create Full Backup

```bash
# Create timestamped backup tables
bun run scripts/production-migration.ts --env production backup-data
```

This creates backup tables like:
- `swole-tracker_workout_template_backup_production_[timestamp]`
- `swole-tracker_workout_session_backup_production_[timestamp]`
- etc.

### 2. Verify Backups

```sql
-- Verify backup tables exist and have correct row counts
SELECT 
  schemaname,
  tablename,
  n_tup_ins as row_count
FROM pg_stat_user_tables 
WHERE tablename LIKE '%_backup_production_%'
ORDER BY tablename;
```

## 🚀 Phase 4: Migration Execution

### 1. Dry Run (REQUIRED)

```bash
# Simulate the migration - NO CHANGES MADE
bun run scripts/production-migration.ts --env production migrate-users --dry-run
```

**Review the output carefully**:
- Verify user mappings are correct
- Check expected record counts
- Ensure no unexpected data changes

### 2. Execute Migration

**⚠️ POINT OF NO RETURN - ENSURE BACKUPS ARE READY**

```bash
# Execute the actual migration
bun run scripts/production-migration.ts --env production migrate-users
```

### 3. Immediate Verification

```bash
# Verify migration completed successfully
bun run scripts/production-migration.ts --env production verify
```

## ✅ Phase 5: Post-Migration

### 1. Application Testing

- [ ] Deploy Supabase Auth version to production
- [ ] Test user login/registration flows
- [ ] Verify data access for migrated users
- [ ] Test protected routes and API endpoints

### 2. User Communication

- [ ] Notify users of auth system change
- [ ] Provide new login instructions
- [ ] Set up support for migration issues

### 3. Monitoring

- [ ] Monitor error logs for auth issues
- [ ] Track user login success rates
- [ ] Watch for data access problems

## 🆘 Emergency Procedures

### Rollback Migration

If migration fails or causes issues:

```sql
-- Example rollback (adjust table names based on your backup timestamp)
UPDATE "swole-tracker_workout_template" 
SET user_id = backup.user_id 
FROM "swole-tracker_workout_template_backup_production_[timestamp]" backup
WHERE "swole-tracker_workout_template".id = backup.id;

-- Repeat for all affected tables
```

### Quick Health Check

```bash
# Quick verification of current state
bun run scripts/production-migration.ts --env production analyze
```

## 🧹 Phase 6: Cleanup (After 1-2 weeks)

Once migration is confirmed successful:

```bash
# Remove backup tables (CAREFUL!)
bun run scripts/production-migration.ts --env production cleanup
```

Or manually:

```sql
-- List backup tables first
SELECT tablename FROM pg_tables WHERE tablename LIKE '%_backup_production_%';

-- Drop when ready (IRREVERSIBLE)
-- DROP TABLE "swole-tracker_workout_template_backup_production_[timestamp]";
```

## 📊 Migration Checklist

### Pre-Migration
- [ ] Environment files configured
- [ ] Database backup completed
- [ ] User data exported from Clerk
- [ ] Supabase users created
- [ ] Mapping data prepared and validated
- [ ] Dry run completed successfully

### During Migration
- [ ] Maintenance mode enabled (optional)
- [ ] Backup tables created
- [ ] Migration executed
- [ ] Verification passed
- [ ] Application deployed with Supabase Auth

### Post-Migration
- [ ] User testing completed
- [ ] Error monitoring in place
- [ ] User communication sent
- [ ] Support processes updated
- [ ] Documentation updated

## 🔧 Troubleshooting

### Common Issues

1. **"No pending migrations found"**
   - Check mapping table has data for correct environment
   - Verify `migration_environment` field matches

2. **"Invalid UUID format"**
   - Ensure Supabase user IDs are proper UUIDs
   - Run validation script to identify issues

3. **Database connection errors**
   - Verify production DATABASE_URL
   - Check SSL requirements and firewall settings

4. **Auth flows not working**
   - Verify Supabase project configuration
   - Check Site URL and Redirect URL settings

### Getting Help

- Review migration logs in generated JSON files
- Check Supabase dashboard for auth errors
- Verify environment variable configuration
- Test with staging environment first

## 📝 Notes

- Keep all generated analysis files for audit trail
- Document any custom changes for future reference
- Plan for gradual user migration if needed
- Consider feature flags for auth system switching