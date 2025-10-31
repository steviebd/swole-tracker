# TODO: Dev Environment Refactor

## Context

Currently, `bun run dev` builds and runs on Cloudflare Workers (slow) and connects to remote D1. This refactor aims to make local development fast by default, while keeping the Workers + remote D1 workflow available for integration testing.

## Goals

- `bun run dev` → Fast local Next.js dev server with local D1 database
- `bun run dev:worker` → Current behavior (Workers build + remote D1)
- `bun run db:push:local` → Push schema to local SQLite database
- `bun run db:push:dev` → Keep existing behavior (push to remote D1)

## Implementation Plan

### 1. Remove Deprecated Scripts ✅

**File:** `scripts/create-views.sql`

**Action:** Delete this file (no longer used in current setup)

**Files to check for references:**
- `CLAUDE.md`
- `README.md`
- Any documentation in `docs/`
- `package.json` scripts

---

### 2. Update Drizzle Configuration

**File:** `drizzle.config.ts`

**Current state:**
```typescript
export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
    databaseId: process.env.D1_DB_ID ?? "",
    token: process.env.CLOUDFLARE_API_TOKEN ?? "",
  },
} satisfies Config;
```

**New implementation:**
```typescript
import { type Config } from "drizzle-kit";

const isLocal = process.env.USE_LOCAL_DB === "true";

export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  ...(isLocal
    ? {
        // Local SQLite configuration
        driver: "better-sqlite",
        dbCredentials: {
          url: "./.wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite",
        },
      }
    : {
        // Remote D1 HTTP configuration
        driver: "d1-http",
        dbCredentials: {
          accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
          databaseId: process.env.D1_DB_ID ?? "",
          token: process.env.CLOUDFLARE_API_TOKEN ?? "",
        },
      }),
} satisfies Config;
```

**Why:** Allows Drizzle to push schema to either local SQLite file or remote D1 based on `USE_LOCAL_DB` environment variable.

**Dependencies:** May need to install `better-sqlite3` if not already present:
```bash
bun add -D better-sqlite3
bun add -D @types/better-sqlite3
```

---

### 3. Update Wrangler Configuration

**File:** `wrangler.toml`

**Changes needed:**

In the `[env.dev]` section, modify the D1 database configuration:

**Current:**
```toml
[[env.dev.d1_databases]]
binding = "DB"
database_name = "swole-tracker-dev"
database_id = "9a5289e0-f1de-4d72-9bfa-d09451be725d"
remote = true
```

**New:**
```toml
[[env.dev.d1_databases]]
binding = "DB"
database_name = "swole-tracker-dev"
database_id = "9a5289e0-f1de-4d72-9bfa-d09451be725d"
# Remove 'remote = true' to allow local D1 emulation
# Add persist_to for local database storage
persist_to = "./.wrangler/state/v3/d1"
```

**Note:** The `persist_to` option tells wrangler where to store the local D1 SQLite database. This ensures data persists between dev sessions.

---

### 4. Update Package.json Scripts

**File:** `package.json`

**Changes needed:**

```json
{
  "scripts": {
    "dev": "NODE_ENV=development lsof -ti:8787 | xargs kill -9 2>/dev/null || true && wrangler dev --env dev --local",
    "dev:worker": "NODE_ENV=development infisical run --env dev -- bun run update-wrangler-config && lsof -ti:8787 | xargs kill -9 2>/dev/null || true && wrangler dev --env dev",
    "dev:next": "bunx next dev --port 8787",
    "db:push:local": "USE_LOCAL_DB=true drizzle-kit push --force",
    "db:push:dev": "infisical run --env dev -- drizzle-kit push --force"
  }
}
```

**Key changes:**
1. **`dev`**: Removed Infisical, added `--local` flag, added port killing
2. **`dev:worker`**: Renamed from old `dev`, keeps current behavior
3. **`dev:next`**: Keep as fallback (unchanged)
4. **`db:push:local`**: New command for local schema pushes
5. **`db:push:dev`**: Keep existing (unchanged)

**Workflow:**
- Default development: `bun dev` (fast, local D1)
- Workers testing: `bun dev:worker` (slow, remote D1, full Cloudflare environment)
- Next.js only: `bun dev:next` (fallback, no wrangler)

---

### 5. Update Documentation

**File:** `CLAUDE.md`

**Section to update:** "Development Workflow"

**New content:**

```markdown
## Development Workflow

### Starting Development

We have three development modes depending on your needs:

#### 1. Local Development (Default, Recommended) ⚡

Fast iteration with local D1 database and instant HMR:

```bash
bun dev
```

- Uses local SQLite database (`.wrangler/state/v3/d1/`)
- No Cloudflare Workers build step (fast startup)
- Uses environment variables from `wrangler.toml` [env.dev.vars]
- No Infisical connection required
- Data persists between sessions

**Use this for:** Daily development, feature work, UI iteration

#### 2. Workers Development (Integration Testing) 🔧

Test with full Cloudflare Workers environment and remote D1:

```bash
bun dev:worker
```

- Builds for Cloudflare Workers
- Connects to remote D1 database
- Loads secrets via Infisical
- Slower startup due to build step

**Use this for:** Testing Workers-specific features, integration testing, pre-deployment validation

#### 3. Next.js Only (Fallback) 🆘

Basic Next.js dev server without wrangler (if wrangler has issues):

```bash
bun dev:next
```

- Next.js dev server only
- May have missing bindings/environment issues
- Port 8787

**Use this for:** Emergency fallback if wrangler is broken

### Database Operations

#### Local Database

```bash
# Push schema to local SQLite database
bun run db:push:local

# Location: .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite
```

**Note:** The local database is automatically created on first `bun dev` or `bun db:push:local`. Data persists between sessions.

#### Remote Database (Unchanged)

```bash
# Push to dev environment
bun run db:push:dev

# Push to all environments
bun run db:push:all
```

### Common Commands

```bash
# Code quality checks
bun check                  # Lint + typecheck
bun run test              # Run tests
bun run coverage          # Tests with coverage

# Database operations (remote)
infisical run -- bun db:push                          # Push schema to dev

# Design tokens
bun run tokens:build      # Regenerate Material 3 tokens

# Deployment
bun build                 # Build for production
bun deploy                # Deploy to Cloudflare Workers
```
```

**Also remove references to:**
- `scripts/create-views.sql`
- Any manual view creation steps
- Update "Known Issues & Workarounds" to reflect new workflow

---

### 6. Update .gitignore

**File:** `.gitignore`

**Verify/Add:**
```gitignore
# Wrangler local state
.wrangler/
.dev.vars

# Local database
*.sqlite
*.sqlite-journal
*.sqlite-wal
*.sqlite-shm
```

**Action:** Check if `.wrangler/` is already in `.gitignore`. If not, add it.

---

## Testing Checklist

After implementation, verify:

### Local Development (`bun dev`)
- [ ] Port 8787 is killed before starting
- [ ] Dev server starts without requiring Infisical
- [ ] Local D1 database is created at `.wrangler/state/v3/d1/`
- [ ] Can create/read/update/delete workouts
- [ ] Hot module replacement works
- [ ] Database persists after stopping and restarting dev server

### Local Database Push (`bun db:push:local`)
- [ ] Creates local SQLite file if it doesn't exist
- [ ] Pushes schema changes successfully
- [ ] Schema changes reflected in local dev server
- [ ] No errors about missing credentials

### Workers Development (`bun dev:worker`)
- [ ] Loads secrets from Infisical
- [ ] Connects to remote D1 database
- [ ] Wrangler config is updated before starting
- [ ] Port 8787 is killed before starting
- [ ] Can access remote data

### Remote Database Push (`bun db:push:dev`)
- [ ] Still works as before
- [ ] Pushes to remote D1 successfully

### Documentation
- [ ] `CLAUDE.md` updated with new workflow
- [ ] No references to `create-views.sql` remain
- [ ] `.gitignore` includes `.wrangler/`

---

## Migration Path for Developers

**Current users need to:**

1. Pull the changes
2. Run `bun install` (for any new dependencies)
3. Run `bun db:push:local` to create local database with schema
4. Run `bun dev` to start local development

**Optional:** If they want to seed local DB with remote data, they can:
- Export from remote D1 and import to local (manual process)
- Or start fresh locally (just use the local empty database)

---

## Notes

- Local database location is managed by wrangler: `.wrangler/state/v3/d1/`
- No need for database reset command - developers can delete `.wrangler/state/` directory if needed
- The `drizzle.config.ts` uses `better-sqlite` driver for local, `d1-http` for remote
- All environment variables for local dev come from `wrangler.toml` [env.dev.vars]
- Remote workflows (`dev:worker`, `db:push:dev`, etc.) remain unchanged

---

## Questions/Issues

If you encounter issues during implementation:

1. Check wrangler version: `wrangler --version` (should be compatible with `--local` flag)
2. Check if `better-sqlite3` is installed: `bun pm ls | grep better-sqlite`
3. Verify `.wrangler/` directory permissions
4. Check that port 8787 is available

---

## Success Criteria

✅ `bun dev` starts in < 5 seconds
✅ No Infisical connection required for local dev
✅ Local database persists between sessions
✅ `bun dev:worker` still works for remote testing
✅ All tests pass
✅ Documentation is clear and accurate
