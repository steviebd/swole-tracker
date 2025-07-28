# AGENT.md - T3 Stack (Swole Tracker) Configuration

## Commands
- **Dev**: `pnpm dev` (with Turbo)
- **Build**: `pnpm build`
- **Lint/Check**: `pnpm check` (lints + typecheck)
- **Format**: `pnpm format:write`
- **Database**: `pnpm db:push` (dev), `pnpm db:studio` (UI)

## Architecture
- **T3 Stack**: Next.js 15 App Router + tRPC + Drizzle ORM + NextAuth + Tailwind
- **Database**: PostgreSQL with Drizzle ORM (schema: `src/server/db/schema.ts`)
- **API**: tRPC routers in `src/server/api/` (type-safe client-server communication)
- **Auth**: NextAuth v5 in `src/server/auth/`
- **Frontend**: App Router (`src/app/`), components in `src/app/_components/`

## Code Style
- **Package Manager**: pnpm (required)
- **Types**: Strict TypeScript, `type` imports with inline style
- **Imports**: Use `~/` alias for `src/`, prefer type imports
- **Naming**: camelCase variables/functions, PascalCase components
- **Database**: Always use `where` clauses with updates/deletes (enforced by ESLint)
- **Format**: Prettier with Tailwind plugin
- **Unused vars**: Prefix with `_` to ignore ESLint warnings
