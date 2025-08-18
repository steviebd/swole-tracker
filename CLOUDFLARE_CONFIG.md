# Cloudflare Configuration Management

This project uses environment variables to manage Cloudflare resource IDs securely, keeping sensitive information out of version control.

## How It Works

1. **`wrangler.toml.template`** - Template file with placeholder values
2. **Environment Variables** - Store actual resource IDs in `.env` files
3. **Generation Script** - Creates `wrangler.toml` from template + env vars
4. **`.gitignore`** - Excludes the generated `wrangler.toml` from version control

## Setup Instructions

### 1. Configure Environment Variables

Add these to your `.env` file:

```bash
# Cloudflare Resource IDs
CLOUDFLARE_PROD_D1_DATABASE_ID=your_production_d1_database_id
CLOUDFLARE_PROD_RATE_LIMIT_KV_ID=your_production_rate_limit_kv_id
CLOUDFLARE_PROD_CACHE_KV_ID=your_production_cache_kv_id

CLOUDFLARE_STAGING_D1_DATABASE_ID=your_staging_d1_database_id
CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID=your_staging_rate_limit_kv_id
CLOUDFLARE_STAGING_CACHE_KV_ID=your_staging_cache_kv_id
```

### 2. Generate wrangler.toml

```bash
# Generate wrangler.toml from environment variables
bun run generate:wrangler

# Alternative command
bun run wrangler:config
```

### 3. Create Cloudflare Resources

#### Production Resources:
```bash
# Create D1 database
wrangler d1 create swole-tracker-prod

# Create KV namespaces
wrangler kv namespace create "RATE_LIMIT_KV" --env production
wrangler kv namespace create "CACHE_KV" --env production
```

#### Staging Resources:
```bash
# Create D1 database
wrangler d1 create swole-tracker-staging

# Create KV namespaces  
wrangler kv:namespace create "RATE_LIMIT_KV" --env staging
wrangler kv:namespace create "CACHE_KV" --env staging
```

### 4. Update Environment Variables

Copy the IDs from the `wrangler` command outputs and update your `.env` file with the actual values.

### 5. Regenerate Configuration

```bash
# After updating environment variables
bun run generate:wrangler
```

## File Structure

```
├── wrangler.toml.template    # Template with placeholders
├── wrangler.toml            # Generated file (gitignored)
├── .env.example             # Environment variable examples
├── .env                     # Your actual environment variables
└── scripts/
    └── generate-wrangler-config.ts  # Generation script
```

## Benefits

✅ **Security** - Keeps sensitive resource IDs out of version control  
✅ **Flexibility** - Easy to update IDs without touching code  
✅ **Team Collaboration** - Each developer can have their own resource IDs  
✅ **Environment Management** - Separate configs for dev/staging/prod  
✅ **Automation** - Can be integrated into CI/CD pipelines  

## Important Notes

- **Always run `bun run generate:wrangler`** before deploying
- **Never commit `wrangler.toml`** - it contains sensitive IDs
- **Update `.env` file** when creating new Cloudflare resources
- **Development IDs** are included in template (not sensitive for local dev)

## Troubleshooting

### Missing Environment Variables
The script will warn you about missing variables:
```bash
⚠️  Missing environment variables:
   - CLOUDFLARE_PROD_D1_DATABASE_ID
   - CLOUDFLARE_PROD_RATE_LIMIT_KV_ID
```

### Invalid Configuration
If deployment fails, check that:
1. All environment variables are set correctly
2. Resource IDs match what exists in your Cloudflare account
3. You've run the generation script after updating env vars

### Local Development
For local development, the existing resource IDs are hardcoded in the template since they're not sensitive for local testing.