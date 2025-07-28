# AGENT.md - T3 Stack (Swole Tracker) Configuration

## Commands
- **Dev**: `pnpm dev` (with Turbo)
- **Build**: `pnpm build`
- **Lint/Check**: `pnpm check` (lints + typecheck)
- **Type Check**: `pnpm typecheck`
- **Format**: `pnpm format:write`, `pnpm format:check`
- **Database**: `pnpm db:push` (dev), `pnpm db:studio` (UI), `pnpm db:generate`, `pnpm db:migrate`
- **Tests**: No test framework currently configured

## Architecture
- **T3 Stack**: Next.js 15 App Router + tRPC + Drizzle ORM + Clerk + Tailwind
- **Database**: PostgreSQL with Drizzle ORM (schema: `src/server/db/schema.ts`)
- **API**: tRPC routers in `src/server/api/routers/`, root at `src/server/api/root.ts`
- **Auth**: Clerk in `src/server/auth/`, middleware at `src/middleware.ts`
- **Frontend**: App Router (`src/app/`), components in `src/app/_components/`
- **Styling**: Tailwind CSS v4, mobile-first design

## Code Style
- **Package Manager**: pnpm (required)
- **Types**: Strict TypeScript, inline `type` imports (e.g., `import { type Foo }`)
- **Imports**: Use `~/` alias for `src/`, prefer type imports
- **Naming**: camelCase variables/functions, PascalCase components
- **Database**: Always use `where` clauses with updates/deletes (enforced by ESLint)
- **Format**: Prettier with Tailwind plugin, verbatimModuleSyntax enabled
- **Unused vars**: Prefix with `_` to ignore ESLint warnings
