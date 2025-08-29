# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Key Development Commands

**Development workflow:**
- `bun dev` - Start Next.js dev server with Turbopack
- `bun build` - Build the application
- `bun preview` - Build and start locally
- `bun check` - Run lint + typecheck (use before commits)
- `bun typecheck` - TypeScript type checking only
- `bun lint` / `bun lint:fix` - ESLint checking/fixing

**Testing:**
- `bun test` - Run Vitest unit tests
- `bun test:ci` - Run tests with coverage
- `bun test:watch` - Watch mode testing
- `bun coverage` - Generate coverage report
- `bun e2e` - Run Playwright e2e tests
- `bun test:e2e:ui` - Run e2e tests with UI

**Convex Backend:**
- `bun convex dev` - Start Convex development backend
- `bun convex deploy` - Deploy Convex functions to production
- `bun convex dashboard` - Open Convex dashboard
- `bun convex logs` - View function logs
- `bun convex import` - Import data to Convex
- `bun convex export` - Export data from Convex

**Code formatting:**
- `bun format:write` - Format code with Prettier
- `bun format:check` - Check formatting

## Core Architecture

**Stack:** Next.js 15 + React 19 + TypeScript + Convex + WorkOS Authentication

**Key directories:**
- `src/app/` - Next.js App Router pages and components
- `convex/` - Convex backend functions (queries, mutations, actions)
- `convex/schema.ts` - Convex database schema definition
- `src/lib/` - Utilities (analytics, offline queue, AI prompts)
- `src/hooks/` - Custom React hooks
- `src/providers/` - React context providers (PostHog, Theme, ConvexAuth)
- `apps/mobile/` - Mobile (Android) app folder

**Authentication:** WorkOS authentication with automatic user session management. Protected routes automatically handle authentication state.

**Database:** Convex real-time database with automatic user isolation. All queries and mutations automatically filter by authenticated user.

## Important Implementation Details

**Convex Function Structure:**
- Queries in `convex/` directory export query functions
- Mutations in `convex/` directory export mutation functions  
- Actions in `convex/` directory export action functions for external API calls
- Input validation with Convex's built-in validation using `v.object()`, `v.string()`, etc.

**Authentication Patterns:**
- Use `ctx.auth.getUserIdentity()` in Convex functions to get current user
- Convex automatically handles user sessions with WorkOS
- Frontend uses `useConvexAuth()` hook for auth state
- Use `<Authenticated>`, `<Unauthenticated>`, and `<AuthLoading>` components

**Database Queries:**
- Convex automatically provides real-time updates
- Use `useQuery()` hook for reactive data fetching
- Use `useMutation()` hook for data updates
- All user data automatically isolated by Convex auth system

**Environment Variables:**
- Schema defined in `src/env.js` with @t3-oss/env-nextjs
- Create a `.env.local` file from `.env.example` with your environment variables
- Required: CONVEX_URL, WorkOS keys
- Optional: PostHog, AI Gateway, rate limiting configs

**Real-time Features:**
- Built-in real-time subscriptions via Convex
- Automatic UI updates when data changes
- Offline-first with automatic sync when connection restored
- Connection status indicators built into Convex React hooks

**Rate Limiting:**
- Rate limiting handled within Convex functions
- Configurable limits via environment variables
- Per-user rate limiting automatically enforced

**Error Handling:**
- Use `ConvexError` for user-facing errors in Convex functions
- Global error handling with Sonner toast notifications
- Custom `useApiMutation` hook wraps mutations with error handling

## Testing Setup

**Unit tests:** Vitest with jsdom environment, setup in `src/__tests__/setup.ts`
**E2E tests:** Playwright with config in `playwright.config.ts`
**Coverage:** Focuses on `src/lib/` and `convex/` directories
**Mocking:** MSW for external API mocking, Convex provides test utilities

## Key Patterns

**Path alias:** Use `~/*` for imports from `src/`
**Logging:** Use `src/lib/logger.ts` instead of console methods
**Analytics:** PostHog integration via `src/lib/posthog.ts` and provider
**Type safety:** Strict TypeScript with `noUncheckedIndexedAccess: true`
**API calls:** Use Convex queries/mutations instead of REST APIs

**Convex Function Examples:**
```typescript
// Query example
export const getWorkouts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    
    return await ctx.db
      .query("workouts")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

// Mutation example  
export const createWorkout = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");
    
    return await ctx.db.insert("workouts", {
      name: args.name,
      userId: identity.subject,
      createdAt: Date.now(),
    });
  },
});
```

**React Hook Examples:**
```typescript
// Data fetching
const workouts = useQuery(api.workouts.getWorkouts);

// Data mutations
const createWorkout = useMutation(api.workouts.createWorkout);

// Authentication
const { isAuthenticated, isLoading } = useConvexAuth();
```

## Development Notes

- Uses bun as package manager (pinned in package.json)  
- Node.js version pinned to 20.19.4 via Volta
- Create `.env.local` file with required environment variables
- Mobile-first design with real-time capabilities
- Progressive Web App with service worker
- Tailwind CSS v4 for styling
- Convex provides automatic TypeScript types for all functions