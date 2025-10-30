# Claude Code: Swole Tracker Development Guide

This document provides context and guidelines for AI-assisted development on the Swole Tracker project.

## Quick Context

Swole Tracker is a modern fitness tracking application with WHOOP integration, offline-first architecture, and real-time sync capabilities. It's built for gym-goers who need a reliable, mobile-optimized experience.

## Tech Stack Summary

- **Framework**: Next.js 15 (App Router)
- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **Backend**: tRPC v11, Drizzle ORM
- **Database**: Cloudflare D1 (SQLite-based)
- **Auth**: WorkOS
- **Analytics**: PostHog
- **Package Manager**: Bun
- **Deployment**: Cloudflare Workers
- **Testing**: Vitest
- **Secrets**: Infisical (no local .env files)

## Development Workflow

### Starting Development

```bash
# Install dependencies
bun install

# Start dev server (connects to remote D1)
bun dev

# Alternative: Next.js dev server only (fallback)
bun dev:next
```

### Common Commands

```bash
# Code quality checks
bun check                  # Lint + typecheck
bun run test              # Run tests
bun run coverage          # Tests with coverage

# Database operations
infisical run -- bun db:push                          # Push schema
infisical run --env <env> -- wrangler d1 execute <db> --file scripts/create-views.sql  # Create views

# Design tokens
bun run tokens:build      # Regenerate Material 3 tokens

# Deployment
bun build                 # Build for production
bun deploy                # Deploy to Cloudflare Workers
```

## Critical Constraints & Patterns

### 1. Cloudflare D1 SQL Variable Limit

**MOST IMPORTANT**: D1 has a ~90 SQL variable limit per statement.

Always use chunking helpers for bulk operations:

```typescript
// Location: src/server/db/chunk-utils.ts
import { chunkedBatch, whereInChunks } from '~/server/db/chunk-utils';

// For bulk inserts/updates
await chunkedBatch(db, items, async (chunk) => {
  await db.insert(table).values(chunk);
});

// For large IN clauses
const results = await whereInChunks(db, ids, async (idChunk) => {
  return db.select().from(table).where(inArray(table.id, idChunk));
});
```

This applies to:
- Workout saves
- Template mutations
- Analytics queries
- WHOOP sync operations
- Any bulk data operations

### 2. Offline-First Architecture

- All mutations must queue for offline support
- Use optimistic updates with TanStack Query
- Handle conflict resolution for sync
- Test offline scenarios

### 3. Design Principles

- **Energy Through Motion**: Smooth transitions, purposeful animations
- **Warm Motivation Over Cold Data**: Inspiring, not clinical
- **Mobile-First, Touch-Optimized**: Thumb-friendly for gym use
- **Glass Architecture**: Depth through layering and backdrop blur
- **Accessible Energy**: WCAG 2.2 AA compliance required

### 4. Material 3 Theming

- Source: `src/design-tokens/material3-palettes.generated.json`
- CSS Output: `src/styles/material3-tokens.css`
- Regenerate after palette changes: `bun run tokens:build`
- Test coverage required for theme changes
- Docs: `docs/material3-theme-guide.md`, `DESIGN_MANIFESTO.md`

### 5. Environment & Secrets

- No local `.env` files - everything via Infisical
- Access workspace through Infisical CLI
- Run commands with: `infisical run -- <command>`
- Update wrangler.toml: `bun run update-wrangler-config <env>`

## Project Structure

```
swole-tracker/
├── src/
│   ├── app/                    # Next.js App Router pages
│   ├── server/
│   │   ├── api/routers/       # tRPC endpoints
│   │   └── db/                # Database schema & utilities
│   ├── lib/                   # Shared utilities
│   ├── hooks/                 # Custom React hooks
│   ├── design-tokens/         # Material 3 palette data
│   └── styles/                # Global styles & tokens
├── apps/mobile/               # Android mobile app
├── docs/                      # Documentation
└── scripts/                   # Build & deployment scripts
```

## Testing Approach

- **Unit tests**: Vitest for utilities, hooks, components
- **Coverage**: Run `bun run coverage` before PRs
- **Design tokens**: Test accessibility compliance
- **Offline scenarios**: Test sync and conflict resolution
- Test files: `src/__tests__/`

### Running Specific Tests

```bash
# Theme/design system tests
bun run test -- src/__tests__/design-tokens/material3-theme.test.ts

# Component tests
bun run test -- src/__tests__/components/

# Hook tests
bun run test -- src/__tests__/hooks/
```

## Common Development Tasks

### Adding a New tRPC Route

1. Create router in `src/server/api/routers/`
2. Add to root router in `src/server/api/root.ts`
3. Use chunking helpers for bulk operations
4. Add tests
5. Update client-side hooks in `src/hooks/`

### Modifying Database Schema

1. Update schema in `src/server/db/schema/`
2. Push changes: `infisical run -- bun db:push`
3. If views are affected, update `scripts/create-views.sql`
4. Run view script in staging/production
5. Update TypeScript types (Drizzle auto-generates)

### Adding UI Components

1. Follow Material 3 design system
2. Use theme tokens from CSS variables
3. Ensure mobile-first, touch-optimized (min 44×44px targets)
4. Test accessibility (WCAG 2.2 AA)
5. Add animations with reduced-motion support
6. Test offline scenarios if interactive

### Updating Design Tokens

1. Edit `src/design-tokens/material3-palettes.generated.json`
2. Run `bun run tokens:build`
3. Review `src/styles/material3-tokens.css`
4. Run theme tests: `bun run test -- src/__tests__/design-tokens/`
5. Test in both light and dark modes

## Important Files to Know

- **Database helpers**: `src/server/db/chunk-utils.ts` (chunking)
- **Theme guide**: `docs/material3-theme-guide.md`
- **Design manifesto**: `DESIGN_MANIFESTO.md`
- **Schema**: `src/server/db/schema/`
- **Root tRPC router**: `src/server/api/root.ts`
- **Wrangler config**: `wrangler.toml` (generated, don't edit directly)

## Pre-Commit Checklist

- [ ] Run `bun check` (lint + typecheck)
- [ ] Run `bun run test` (all tests pass)
- [ ] Check chunking for any bulk DB operations
- [ ] Verify accessibility (WCAG 2.2 AA)
- [ ] Test on mobile viewport
- [ ] Test offline functionality if applicable
- [ ] Update tests for new features
- [ ] Update docs if needed

## Known Issues & Workarounds

- **Wrangler dev integration**: Configured but has build issues - use `bun dev` instead
- **Database views**: Not auto-created by `db:push` - run view script manually
- **D1 variable limits**: Always use chunking helpers, never raw bulk operations
- **Environment variables**: Must use Infisical CLI, no local .env files

## Getting Help

- Check `README.md` for setup and getting started
- Check `AGENTS.md` for detailed project context
- Check `docs/material3-theme-guide.md` for theming
- Check `DESIGN_MANIFESTO.md` for design philosophy

## Code Style Preferences

- TypeScript: Strict mode enabled
- Formatting: Follow existing patterns
- Naming: Descriptive, no abbreviations unless common
- Comments: Why, not what (code should be self-documenting)
- Tests: Co-locate with features when possible, or use `__tests__/`
- Accessibility: Always consider keyboard navigation and screen readers

## Performance Considerations

- Cloudflare D1 query latency (remote database)
- Chunking adds roundtrips but prevents failures
- Optimize bundle size for mobile
- Use React 19 concurrent features
- Leverage TanStack Query caching
- Test on slower network conditions

---

**Remember**: This is a fitness app used in the gym. Prioritize mobile UX, offline reliability, and quick interactions. Every feature should work seamlessly on a phone with sweaty fingers.
