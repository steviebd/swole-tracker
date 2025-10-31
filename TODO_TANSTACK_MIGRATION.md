 # TanStack Start Framework Migration Plan

 > **CRITICAL CONTEXT:** This document outlines a **complete framework replacement** from Next.js 15 to TanStack Start. This is NOT a simple routing library swap—it's a fundamental architectural change requiring 3-4 months of dedicated effort.

 ## Executive Summary

 ### Current State
 - **Framework:** Next.js 15 (App Router)
 - **Build Tool:** Next.js + @opennextjs/cloudflare
 - **Deployment:** Cloudflare Workers via OpenNext.js adapter
 - **TanStack Progress:** Forms ✅, Virtual ✅, Table ✅ (Phases 3-4 complete)
 - **Production Status:** Stable, working deployment

 ### Proposed State
 - **Framework:** TanStack Start (Beta)
 - **Build Tool:** Vite + @cloudflare/vite-plugin
 - **Deployment:** Cloudflare Workers (native integration)
 - **TanStack Progress:** Full ecosystem (Router, Forms, Virtual, Table)
 - **Production Status:** Unknown, requires extensive testing

 ### Migration Scope
 - **Estimated Duration:** 12-16 weeks (3-4 months)
 - **Risk Level:** HIGH (beta framework, complete rewrite)
 - **Effort Level:** Full-time developer commitment
 - **Rollback Complexity:** HIGH (parallel systems not feasible)

 ---

 ## Phase 0: Strategic Analysis & Go/No-Go Decision (2 weeks)

 > **Purpose:** Make an informed decision about whether to proceed with this migration. This phase is designed to identify blockers BEFORE committing to a 3-4 month project.

 ### 0.1: Current Architecture Audit

 **Inventory existing codebase:**
 - [x] 19 Next.js page routes identified
 - [x] 12 tRPC router files identified
 - [x] OpenNext.js build system in use
 - [x] Cloudflare D1 database integration
 - [x] WorkOS authentication implementation
 - [x] PostHog analytics integration
 - [x] WHOOP OAuth integration
 - [x] Offline-first architecture with TanStack Query
 - [x] Material 3 design system implementation
 - [ ] **Document all Next.js-specific features in use:**
   - [ ] Server Components usage (if any)
   - [ ] Next.js Image component usage
   - [ ] next/headers, next/cookies usage
   - [ ] Middleware usage
   - [ ] API routes (vs tRPC)
   - [ ] Dynamic imports and code splitting patterns
   - [ ] Metadata API usage

 ### 0.2: TanStack Start Feasibility Research

 **Critical compatibility validation:**
 - [ ] **Set up TanStack Start test project:**
   ```bash
   npm create cloudflare@latest tanstack-test -- --framework=tanstack-start
   cd tanstack-test
   npm install
   npm run dev
   ```
 - [ ] **Test Core Integrations (Blockers):**
   - [ ] Cloudflare D1 database access in TanStack Start
   - [ ] tRPC v11 compatibility with TanStack Start
   - [ ] WorkOS authentication flows
   - [ ] Infisical secrets management
   - [ ] PostHog analytics initialization
   - [ ] TanStack Query persistence
 - [ ] **Test Existing Migrations (Must Work):**
   - [ ] Import existing TanStack Form components
   - [ ] Import existing TanStack Table components
   - [ ] Import existing TanStack Virtual components
   - [ ] Verify all existing components render correctly
 - [ ] **Test WHOOP Integration:**
   - [ ] OAuth callback handling
   - [ ] Webhook endpoint implementation
   - [ ] API token management
 - [ ] **Test Offline-First Architecture:**
   - [ ] Service worker compatibility
   - [ ] TanStack Query persistence with IndexedDB
   - [ ] Optimistic updates
   - [ ] Conflict resolution

 ### 0.3: Build System Analysis

 **Compare build systems:**
 - [ ] **Next.js + OpenNext.js (Current):**
   - [ ] Measure cold build time
   - [ ] Measure incremental build time
   - [ ] Measure dev server startup time
 - [ ] **TanStack Start (Proposed):**
   - [ ] Measure cold build time in test project
   - [ ] Measure HMR performance
   - [ ] Measure dev server startup time
 - [ ] **Create comparison matrix:**
   | Metric | Next.js | TanStack Start | Delta |
   |--------|---------|----------------|-------|
   | Cold Build | TBD | TBD | TBD |
   | Incremental | TBD | TBD | TBD |
   | Dev Startup | TBD | TBD | TBD |
   | Bundle Size | TBD | TBD | TBD |
   | HMR Speed | TBD | TBD | TBD |

 ### 0.4: Risk Assessment

 **Identify potential blockers:**
 - [ ] **Technical Risks:**
   - [ ] TanStack Start is in BETA (production readiness unknown)
   - [ ] Limited community support and examples
   - [ ] Cloudflare bindings issues documented (GitHub issues #3468, #4255, #4285)
   - [ ] No parallel system migration path (all-or-nothing cutover)
   - [ ] Unknown D1 chunking utilities compatibility
 - [ ] **Business Risks:**
   - [ ] 3-4 month timeline with no feature development
   - [ ] Potential production bugs in beta framework
   - [ ] Developer onboarding complexity increase
   - [ ] Limited hiring pool (niche framework knowledge)
 - [ ] **Operational Risks:**
   - [ ] New debugging/monitoring patterns
   - [ ] Different error handling patterns
   - [ ] Changed deployment pipeline
   - [ ] Different performance characteristics

 ### 0.5: Cost-Benefit Analysis

 **Benefits of migration:**
 - ✅ Native Cloudflare Workers support (no adapter layer)
 - ✅ Vite build system (potentially faster builds)
 - ✅ Type-safe routing with TanStack Router
 - ✅ Full TanStack ecosystem integration
 - ✅ Simpler deployment (no OpenNext.js workarounds)
 - ❓ Better developer experience (needs validation)
 - ❓ Smaller bundle size (needs measurement)

 **Costs of migration:**
 - ❌ 3-4 months of development time
 - ❌ Complete framework rewrite (all routes, layouts, components)
 - ❌ Learning curve for entire team
 - ❌ Beta framework risks (bugs, breaking changes)
 - ❌ Loss of Next.js ecosystem (plugins, documentation, community)
 - ❌ No guarantee of success (discovery phase may reveal blockers)
 - ❌ Delayed feature development during migration

 **Benefits of staying with Next.js:**
 - ✅ Already working in production
 - ✅ Mature, stable framework with long track record
 - ✅ Massive community support and resources
 - ✅ TanStack Forms, Virtual, Table already working (75% of value achieved)
 - ✅ Known deployment patterns
 - ✅ Faster feature development (no migration overhead)
 - ✅ React 19 and App Router are cutting edge

 ### 0.6: Decision Framework

 **GO Decision Criteria (ALL must be YES):**
 - [ ] All Phase 0.2 integrations work without major issues
 - [ ] Build performance is equal to or better than current
 - [ ] No critical blockers identified in GitHub issues
 - [ ] Stakeholder approval for 3-4 month timeline
 - [ ] Team commitment to learning new framework
 - [ ] Budget allocated for potential rollback
 - [ ] Acceptable production risk tolerance

 **NO-GO Decision Criteria (ANY triggers STOP):**
 - [ ] Critical integration doesn't work (D1, tRPC, auth)
 - [ ] TanStack Start build system incompatible with requirements
 - [ ] Active show-stopping bugs in TanStack Start
 - [ ] No clear migration path identified
 - [ ] Business cannot afford 3-4 month timeline
 - [ ] Team lacks bandwidth for migration effort

 **Quality Gates:**
 - [ ] **Comprehensive decision document created** with:
   - [ ] Technical feasibility assessment
   - [ ] Risk analysis with mitigation strategies
   - [ ] Cost-benefit analysis with quantified metrics
   - [ ] Timeline and resource requirements
   - [ ] Recommendation (GO or NO-GO) with justification
 - [ ] **Stakeholder review completed**
 - [ ] **Final GO/NO-GO decision documented**

 ---

 ## Phase 1: TanStack Start Proof of Concept (3-4 weeks)

 > ⚠️ **PREREQUISITE:** Phase 0 completed with GO decision

 > **Purpose:** Build a working proof of concept that validates the entire stack before committing to full migration.

 ### 1.1: Project Scaffold & Configuration (Week 1)

 **Create TanStack Start foundation:**
 - [ ] **Initialize new TanStack Start project:**
   ```bash
   # In separate directory for parallel development
   mkdir swole-tracker-tanstack
   cd swole-tracker-tanstack
   npm create cloudflare@latest . -- --framework=tanstack-start
   ```
 - [ ] **Install all required dependencies:**
   ```bash
   # Core framework
   npm install @tanstack/react-start @tanstack/react-router

   # Cloudflare integration
   npm install @cloudflare/vite-plugin wrangler

   # TanStack ecosystem (already migrated)
   npm install @tanstack/react-form @tanstack/zod-form-adapter
   npm install @tanstack/react-table @tanstack/react-virtual
   npm install @tanstack/react-query

   # Backend
   npm install @trpc/client @trpc/server @trpc/react-query
   npm install drizzle-orm drizzle-kit
   npm install zod superjson

   # Auth & APIs
   npm install @workos-inc/node oauth4webapi

   # UI & Styling
   npm install tailwindcss @tailwindcss/postcss
   npm install framer-motion lucide-react
   npm install class-variance-authority clsx tailwind-merge
   npm install @radix-ui/react-dialog @radix-ui/react-select # ... all radix components

   # Analytics
   npm install posthog-js posthog-node

   # Date utilities
   npm install date-fns

   # Environment
   # Note: @t3-oss/env-nextjs is Next.js specific, need alternative
   ```

 - [ ] **Configure TypeScript:**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "target": "ES2022",
       "lib": ["ES2022", "DOM", "DOM.Iterable"],
       "module": "ESNext",
       "moduleResolution": "Bundler",
       "resolveJsonModule": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "strict": true,
       "noUncheckedIndexedAccess": true,
       "isolatedModules": true,
       "jsx": "react-jsx",
       "baseUrl": ".",
       "paths": {
         "~/*": ["./src/*"],
         "@/*": ["./src/*"]
       }
     }
   }
   ```

 - [ ] **Configure Vite with Cloudflare plugin:**
   ```typescript
   // app.config.ts
   import { defineConfig } from '@tanstack/react-start/config'
   import { cloudflare } from 'unenv'

   export default defineConfig({
     tsr: {
       appDirectory: 'src',
     },
     server: {
       preset: 'cloudflare-module',
       unenv: cloudflare,
     },
     vite: {
       plugins: [
         // TailwindCSS, etc.
       ],
     },
   })
   ```

 - [ ] **Configure Wrangler for Cloudflare Workers:**
   ```jsonc
   // wrangler.jsonc
   {
     "$schema": "node_modules/wrangler/config-schema.json",
     "name": "swole-tracker-tanstack",
     "compatibility_date": "2025-04-12",
     "compatibility_flags": ["nodejs_compat"],
     "main": ".output/server/index.mjs",
     "assets": {
       "directory": "./.output/public/",
       "binding": "ASSETS"
     },

     // D1 Database binding
     "d1_databases": [
       {
         "binding": "DB",
         "database_name": "swole-tracker-dev",
"database_id": "9a5289e0-f1de-4d72-9bfa-d09451be725d"
       }
     ],

     // Environment variables (will integrate with Infisical)
     "vars": {
       "NODE_ENV": "development"
     }
   }
   ```

 - [ ] **Configure Tailwind CSS v4:**
   ```typescript
   // Copy existing tailwind config
   // Migrate Material 3 tokens
   // Ensure glass architecture styles work
   ```

 - [ ] **Set up Infisical integration:**
   ```bash
   # Test secrets access in TanStack Start context
   infisical run --env dev -- npm run dev
   ```

 ### 1.2: Database & Backend Integration (Week 1-2)

 **Port backend infrastructure:**
 - [ ] **Copy Drizzle schema from existing project:**
   ```bash
   cp -r ../swole-tracker/src/server/db ./src/server/
   ```
 - [ ] **Configure Drizzle for TanStack Start:**
   ```typescript
   // src/server/db/index.ts
   // Adapt D1 client initialization for TanStack Start context
   // Test D1 binding access from server functions
   ```
 - [ ] **Test database migrations:**
   ```bash
   # Ensure drizzle-kit works with new setup
   drizzle-kit push --config=drizzle.config.ts
   ```
 - [ ] **Port chunking utilities:**
   ```typescript
   // src/server/db/chunk-utils.ts
   // CRITICAL: Maintain D1 90-variable limit handling
   // Test chunkedBatch and whereInChunks functions
   ```
 - [ ] **Port one tRPC router for testing:**
   ```typescript
   // Start with simplest router (preferences.ts)
   // Test tRPC initialization in TanStack Start
   // Validate TanStack Query integration
   ```
 - [ ] **Test tRPC mutations and queries:**
   ```typescript
   // Ensure optimistic updates work
   // Test offline queue functionality
   // Validate error handling
   ```

 ### 1.3: Authentication Integration (Week 2)

 **Implement WorkOS authentication:**
 - [ ] **Port WorkOS configuration:**
   ```typescript
   // src/server/auth/workos.ts
   // Adapt for TanStack Start server context
   ```
 - [ ] **Implement OAuth callback handling:**
   ```typescript
   // TanStack Start route for /auth/callback
   // Test OAuth flow end-to-end
   ```
 - [ ] **Create authentication middleware:**
   ```typescript
   // Implement route protection patterns
   // Test redirect to sign-in for unauthenticated users
   ```
 - [ ] **Port session management:**
   ```typescript
   // Cookie-based session storage
   // Test session persistence across requests
   ```
 - [ ] **Test authentication flows:**
   - [ ] Sign in with WorkOS
   - [ ] OAuth callback processing
   - [ ] Session creation and retrieval
   - [ ] Protected route access
   - [ ] Sign out functionality

 ### 1.4: Routing & Layout Foundation (Week 2-3)

 **Create basic application structure:**
 - [ ] **Implement root route:**
   ```typescript
   // src/routes/__root.tsx
   import { createRootRoute, Outlet } from '@tanstack/react-router'

   export const Route = createRootRoute({
     component: RootLayout,
   })

   function RootLayout() {
     return (
       <html>
         <body>
           <Outlet />
         </body>
       </html>
     )
   }
   ```
 - [ ] **Port global providers:**
   ```typescript
   // TanStack Query Provider
   // PostHog Provider
   // Theme Provider
   // Auth Provider
   ```
 - [ ] **Port shared layout components:**
   ```typescript
   // Header component
   // Navigation component
   // Footer component
   ```
 - [ ] **Implement error boundaries:**
   ```typescript
   // Global error boundary
   // Route-level error handling
   ```
 - [ ] **Test Material 3 design system:**
   ```typescript
   // Verify theme tokens load correctly
   // Test glass architecture styles
   // Validate dark/light mode switching
   ```

 ### 1.5: Sample Routes Implementation (Week 3)

 **Build representative examples of each route type:**

 **Static Route:**
 - [ ] **Migrate /privacy page:**
   ```typescript
   // src/routes/privacy.tsx
   import { createFileRoute } from '@tanstack/react-router'

   export const Route = createFileRoute('/privacy')({
     component: PrivacyPage,
   })
   ```
 - [ ] Test static content rendering
 - [ ] Verify layout inheritance

 **Authenticated Route:**
 - [ ] **Migrate /dashboard (home page):**
   ```typescript
   // src/routes/index.tsx
   export const Route = createFileRoute('/')({
     beforeLoad: async ({ context }) => {
       // Auth check
     },
     loader: async ({ context }) => {
       // Fetch dashboard data via tRPC
     },
     component: DashboardPage,
   })
   ```
 - [ ] Test authentication guard
 - [ ] Test data loading with tRPC
 - [ ] Port dashboard components

 **Dynamic Route:**
 - [ ] **Migrate /workouts/[id] page:**
   ```typescript
   // src/routes/workouts/$id.tsx
   export const Route = createFileRoute('/workouts/$id')({
     loader: async ({ params }) => {
       // Fetch workout by ID
     },
     component: WorkoutDetailPage,
   })
   ```
 - [ ] Test dynamic parameter handling
 - [ ] Test data fetching
 - [ ] Test 404 handling

 **Complex Form Route:**
 - [ ] **Migrate /templates/new page:**
   ```typescript
   // src/routes/templates/new.tsx
   // Use already-migrated TanStack Form
   ```
 - [ ] Import existing template-form.tsx component
 - [ ] Test multi-step form functionality
 - [ ] Test drag-and-drop integration
 - [ ] Verify Zod validation works

 ### 1.6: Analytics & Monitoring (Week 3)

 **Set up observability:**
 - [ ] **Configure PostHog:**
   ```typescript
   // Initialize PostHog in TanStack Start
   // Test page view tracking
   // Test custom event tracking
   ```
 - [ ] **Set up error tracking:**
   ```typescript
   // Error boundary integration
   // Cloudflare Workers logging
   ```
 - [ ] **Performance monitoring:**
   ```typescript
   // Core Web Vitals tracking
   // Route navigation timing
   ```

 ### 1.7: Build & Deploy POC (Week 4)

 **Test production deployment:**
 - [ ] **Build production bundle:**
   ```bash
   npm run build
   ```
 - [ ] **Analyze bundle size:**
   ```bash
   # Compare to current Next.js bundle
   ```
 - [ ] **Deploy to Cloudflare Workers:**
   ```bash
   wrangler deploy
   ```
 - [ ] **Test deployed application:**
   - [ ] All POC routes work
   - [ ] Database queries succeed
   - [ ] Authentication flows work
   - [ ] Forms submit correctly
   - [ ] Analytics tracking fires
   - [ ] Error handling works

 ### 1.8: Performance Benchmarking (Week 4)

 **Measure key metrics:**
 - [ ] **Development Experience:**
   | Metric | Next.js | TanStack Start | Winner |
   |--------|---------|----------------|--------|
   | Dev server startup | TBD | TBD | TBD |
   | Hot reload speed | TBD | TBD | TBD |
   | Type checking speed | TBD | TBD | TBD |
   | Build time (cold) | TBD | TBD | TBD |
   | Build time (incremental) | TBD | TBD | TBD |

 - [ ] **Production Performance:**
   | Metric | Next.js | TanStack Start | Winner |
   |--------|---------|----------------|--------|
   | First Contentful Paint | TBD | TBD | TBD |
   | Largest Contentful Paint | TBD | TBD | TBD |
   | Time to Interactive | TBD | TBD | TBD |
   | Total JavaScript Size | TBD | TBD | TBD |
   | Initial Load Time | TBD | TBD | TBD |

 - [ ] **Database Performance:**
   - [ ] Test D1 query latency
   - [ ] Verify chunking utilities work
   - [ ] Test bulk operations

 **Quality Gates:**
 - [ ] POC successfully deployed to Cloudflare Workers
 - [ ] All critical integrations working:
   - [ ] D1 database access ✅
   - [ ] tRPC queries and mutations ✅
   - [ ] WorkOS authentication ✅
   - [ ] TanStack Form/Table/Virtual components ✅
   - [ ] PostHog analytics ✅
 - [ ] Performance meets or exceeds current baseline
 - [ ] Build system works reliably
 - [ ] No critical bugs or blockers identified
 - [ ] **GO/NO-GO decision for Phase 2:**
   - [ ] Technical validation complete
   - [ ] Performance acceptable
   - [ ] Team approval to proceed

 ---

 ## Phase 2: Full Application Migration (8-10 weeks)

 > ⚠️ **PREREQUISITE:** Phase 1 completed with successful POC and GO decision

 > **Purpose:** Systematically migrate the entire application from Next.js to TanStack Start.

 ### 2.1: Pre-Migration Setup (Week 1)

 **Prepare for migration:**
 - [ ] **Create migration branch strategy:**
   ```bash
   git checkout -b tanstack-start-migration
   # This will be a long-lived branch
   ```
 - [ ] **Set up parallel development:**
   ```
   swole-tracker/           # Original Next.js (maintenance only)
   swole-tracker-tanstack/  # New TanStack Start (active development)
   ```
 - [ ] **Document current state:**
   - [ ] All Next.js routes inventory
   - [ ] All components inventory
   - [ ] All tRPC routers inventory
   - [ ] All hooks inventory
   - [ ] All providers inventory
 - [ ] **Create migration tracking spreadsheet:**
   | Route | Complexity | Status | Owner | Notes |
   |-------|-----------|--------|-------|-------|
   | / | Medium | Not Started | - | Dashboard with multiple data sources |
   | /privacy | Low | Not Started | - | Static content |
   | ... | ... | ... | ... | ... |

 - [ ] **Set up automated testing:**
   ```bash
   # Port all Vitest tests to new project
   # Set up CI/CD for parallel testing
   ```

 ### 2.2: Core Infrastructure Migration (Week 1-2)

 **Complete backend setup:**
 - [ ] **Port all tRPC routers:**
   - [ ] exercises.ts (complex, 71KB)
   - [ ] progress.ts (complex, 141KB)
   - [ ] workouts.ts (complex, 36KB)
   - [ ] templates.ts (medium, 22KB)
   - [ ] insights.ts (medium, 21KB)
   - [ ] whoop.ts (medium, 18KB)
   - [ ] wellness.ts (medium, 11KB)
   - [ ] health-advice.ts (simple, 9KB)
   - [ ] session-debrief.ts (simple, 8KB)
   - [ ] preferences.ts (simple, 6KB)
   - [ ] suggestions.ts (simple, 4KB)
   - [ ] webhooks.ts (simple, 2KB)

 - [ ] **Port all database operations:**
   - [ ] Verify all Drizzle queries work
   - [ ] Test all chunking utilities
   - [ ] Validate all transactions
   - [ ] Test all bulk operations

 - [ ] **Port environment configuration:**
   ```typescript
   // Replace @t3-oss/env-nextjs with TanStack Start compatible solution
   // Integrate Infisical secrets
   // Test all environment variables
   ```

 - [ ] **Port all server utilities:**
   - [ ] Authentication helpers
   - [ ] Session management
   - [ ] Error handling utilities
   - [ ] Rate limiting (if applicable)
   - [ ] Caching utilities

 ### 2.3: UI Component Library Migration (Week 2-3)

 **Port all shared components:**
 - [ ] **Port Radix UI components:**
   - [ ] All dialog components
   - [ ] All select components
   - [ ] All avatar components
   - [ ] All collapsible components
   - [ ] All label components
   - [ ] All progress components
   - [ ] All slot components

 - [ ] **Port custom UI components:**
   ```bash
   # Copy from src/components/ui/
   # Verify they work in TanStack Start context
   ```
   - [ ] button.tsx
   - [ ] input.tsx
   - [ ] label.tsx
   - [ ] card.tsx
   - [ ] dialog.tsx
   - [ ] select.tsx
   - [ ] progress.tsx
   - [ ] empty-state.tsx
   - [ ] ... (all other UI components)

 - [ ] **Port TanStack Form components (already migrated):**
   - [ ] tanstack-form.tsx
   - [ ] Test in TanStack Start context
   - [ ] Verify all form patterns work

 - [ ] **Port design system:**
   - [ ] Material 3 tokens CSS
   - [ ] Theme utilities
   - [ ] Glass architecture styles
   - [ ] Animation utilities
   - [ ] Responsive design utilities

 ### 2.4: Authentication Routes (Week 3)

 **Migrate all auth-related routes:**
 - [ ] **Sign-in page:**
   ```typescript
   // src/routes/sign-in.tsx
   // Port WorkOS OAuth flow
   ```
 - [ ] **Auth callback:**
   ```typescript
   // src/routes/auth/callback.tsx
   // Handle OAuth callback
   ```
 - [ ] **Login page:**
   ```typescript
   // src/routes/auth/login/index.tsx
   // WorkOS-managed UI shell
   ```
 - [ ] **Register page:**
   ```typescript
   // src/routes/auth/register/index.tsx
   // WorkOS-managed UI shell
   ```
 - [ ] **Auth code error page:**
   ```typescript
   // src/routes/auth/auth-code-error/index.tsx
   ```

 **Test authentication:**
 - [ ] Sign in flow
 - [ ] OAuth callback processing
 - [ ] Session creation
 - [ ] Protected route access
 - [ ] Sign out flow
 - [ ] Token refresh (if applicable)

 ### 2.5: Core Application Routes (Week 3-5)

 **Migrate main application routes:**

 **Dashboard/Home (Week 3):**
 - [ ] **Migrate / (dashboard):**
   ```typescript
   // src/routes/index.tsx
   // Main dashboard page
   ```
 - [ ] Port all dashboard components:
   - [ ] DashboardClient.tsx
   - [ ] DashboardContent.tsx
   - [ ] QuickActionCards.tsx
   - [ ] RecentWorkoutsSection.tsx
   - [ ] WeeklyProgressSection.tsx
   - [ ] ConsistencySection.tsx
   - [ ] WellnessHistorySection.tsx
   - [ ] WhoopIntegrationSection.tsx
   - [ ] ... (all other dashboard components)

 **Workout Routes (Week 4):**
 - [ ] **Migrate /workout/start:**
   ```typescript
   // src/routes/workout/start/index.tsx
   ```
   - [ ] Port workout-starter.tsx
   - [ ] Test template selection
   - [ ] Test workout creation

 - [ ] **Migrate /workout/session/[id]:**
   ```typescript
   // src/routes/workout/session/$id.tsx
   ```
   - [ ] Port workout-session.tsx
   - [ ] Port WorkoutSessionWithHealthAdvice.tsx
   - [ ] Port all health advice components
   - [ ] Test real-time workout updates
   - [ ] Test offline functionality

 - [ ] **Migrate /workout/session/local/[localId]:**
   ```typescript
   // src/routes/workout/session/local/$localId.tsx
   ```
   - [ ] Test local session handling
   - [ ] Test sync to server

 - [ ] **Migrate /workouts (list page):**
   ```typescript
   // src/routes/workouts/index.tsx
   ```
   - [ ] Port workout-history.tsx
   - [ ] Test TanStack Table integration
   - [ ] Test filtering, sorting, pagination

 - [ ] **Migrate /workouts/[id] (detail page):**
   ```typescript
   // src/routes/workouts/$id.tsx
   ```
   - [ ] Port workout detail components
   - [ ] Test workout editing
   - [ ] Test workout deletion

 **Template Routes (Week 5):**
 - [ ] **Migrate /templates:**
   ```typescript
   // src/routes/templates/index.tsx
   ```
   - [ ] Port templates-list.tsx
   - [ ] Test TanStack Table integration

 - [ ] **Migrate /templates/new:**
   ```typescript
   // src/routes/templates/new/index.tsx
   ```
   - [ ] Port template-form.tsx (already TanStack Form)
   - [ ] Test multi-step form
   - [ ] Test drag-and-drop
   - [ ] Test exercise selection with TanStack Virtual

 - [ ] **Migrate /templates/[id]/edit:**
   ```typescript
   // src/routes/templates/$id.edit.tsx
   ```
   - [ ] Test template editing
   - [ ] Test template deletion

 ### 2.6: Additional Feature Routes (Week 5-6)

 **Migrate remaining routes:**

 - [ ] **Migrate /exercises:**
   ```typescript
   // src/routes/exercises/index.tsx
   ```
   - [ ] Port exercise-manager.tsx
   - [ ] Test TanStack Table with advanced features
   - [ ] Test bulk operations

 - [ ] **Migrate /progress:**
   ```typescript
   // src/routes/progress/index.tsx
   ```
   - [ ] Port ProgressDashboard.tsx
   - [ ] Port all progress components
   - [ ] Port all chart containers
   - [ ] Port StrengthProgressSection.tsx (uses TanStack Virtual)
   - [ ] Test analytics visualizations

 - [ ] **Migrate /connect-whoop:**
   ```typescript
   // src/routes/connect-whoop/index.tsx
   ```
   - [ ] Port WHOOP connection flow
   - [ ] Test OAuth integration

 - [ ] **Migrate /preferences-trigger:**
   ```typescript
   // src/routes/preferences-trigger/index.tsx
   ```
   - [ ] Port preferences modal
   - [ ] Test preference updates

 **Static Routes:**
 - [ ] **Migrate /privacy:**
   ```typescript
   // src/routes/privacy/index.tsx
   ```
 - [ ] **Migrate /terms:**
   ```typescript
   // src/routes/terms/index.tsx
   ```

 ### 2.7: Complex Component Migrations (Week 6-7)

 **Port complex, shared components:**

 **Modal Components:**
 - [ ] ConsistencyAnalysisModal.tsx
 - [ ] PRHistoryModal.tsx
 - [ ] PreferencesModal.tsx
 - [ ] ProgressionModal.tsx
 - [ ] SettingsModal.tsx
 - [ ] StrengthAnalysisModal.tsx
 - [ ] VolumeAnalysisModal.tsx
 - [ ] ManualWellnessModal.tsx (already TanStack Form)
 - [ ] SubjectiveWellnessModal.tsx (already TanStack Form)
 - [ ] conflict-resolution-modal.tsx

 **Status & Sync Components:**
 - [ ] enhanced-sync-indicator.tsx
 - [ ] sync-indicator.tsx
 - [ ] connection-status.tsx

 **WHOOP Integration Components:**
 - [ ] whoop-body-measurements.tsx
 - [ ] whoop-connection.tsx
 - [ ] whoop-cycles.tsx
 - [ ] whoop-profile.tsx
 - [ ] whoop-recovery.tsx
 - [ ] whoop-sleep.tsx
 - [ ] whoop-workouts.tsx

 **Workout Components:**
 - [ ] exercise-card.tsx
 - [ ] set-input.tsx
 - [ ] ExerciseHeader.tsx
 - [ ] SetList.tsx
 - [ ] session-debrief-panel.tsx

 **Other Components:**
 - [ ] exercise-input-with-linking.tsx
 - [ ] ExerciseLinkPicker.tsx
 - [ ] workout-detail-overlay.tsx

 ### 2.8: Hooks & Utilities Migration (Week 7)

 **Port all custom hooks:**
 - [ ] **Auth hooks:**
   - [ ] useAuth
   - [ ] useSession
   - [ ] Any WorkOS-related hooks

 - [ ] **Data hooks:**
   - [ ] Port all tRPC hooks
   - [ ] Verify TanStack Query integration
   - [ ] Test optimistic updates

 - [ ] **UI hooks:**
   - [ ] useMediaQuery
   - [ ] useTheme
   - [ ] Any animation hooks

 - [ ] **Tracking hooks:**
   - [ ] usePageTracking.ts
   - [ ] Any PostHog-related hooks

 **Port all utility functions:**
 - [ ] Date utilities
 - [ ] Formatting utilities
 - [ ] Validation utilities
 - [ ] Type guards
 - [ ] Constants

 ### 2.9: Provider Migration (Week 7-8)

 **Port all React context providers:**
 - [ ] **AuthProvider.tsx:**
   - [ ] Adapt for TanStack Start context
   - [ ] Test session management

 - [ ] **PageTransitionProvider.tsx:**
   - [ ] Adapt for TanStack Router
   - [ ] Test route transitions

 - [ ] **TanStack Query Provider:**
   - [ ] Configure persistence
   - [ ] Configure offline support
   - [ ] Test cache behavior

 - [ ] **PostHog Provider:**
   - [ ] Ensure tracking works
   - [ ] Test feature flags

 - [ ] **Theme Provider:**
   - [ ] Test dark/light mode
   - [ ] Test Material 3 tokens

 ### 2.10: Testing & Quality Assurance (Week 8-9)

 **Comprehensive testing:**

 **Unit Tests:**
 - [ ] Port all existing Vitest tests
 - [ ] Update for TanStack Start patterns
 - [ ] Achieve ≥95% coverage
 - [ ] All 839+ tests passing

 **Integration Tests:**
 - [ ] Test all user workflows end-to-end
 - [ ] Test offline functionality
 - [ ] Test authentication flows
 - [ ] Test WHOOP integration
 - [ ] Test workout creation and completion
 - [ ] Test template creation and usage

 **Performance Tests:**
 - [ ] Lighthouse scores for all major routes
 - [ ] Core Web Vitals measurement
 - [ ] Bundle size analysis
 - [ ] Database query performance
 - [ ] Offline functionality performance

 **Cross-Browser Testing:**
 - [ ] Chrome (desktop & mobile)
 - [ ] Safari (desktop & iOS)
 - [ ] Firefox (desktop & mobile)
 - [ ] Edge (desktop)

 **Device Testing:**
 - [ ] iOS Safari (primary user base)
 - [ ] Android Chrome
 - [ ] Tablet views
 - [ ] Desktop views

 **Accessibility Testing:**
 - [ ] WCAG 2.2 AA compliance
 - [ ] Screen reader testing
 - [ ] Keyboard navigation
 - [ ] Touch target sizes (≥44×44px)
 - [ ] Color contrast

 ### 2.11: Staging Deployment & User Testing (Week 9-10)

 **Deploy to staging environment:**
 - [ ] **Build production bundle:**
   ```bash
   npm run build
   ```
 - [ ] **Deploy to staging:**
   ```bash
   wrangler deploy --env staging
   ```
 - [ ] **Smoke test critical paths:**
   - [ ] User can sign in
   - [ ] User can create workout
   - [ ] User can complete workout
   - [ ] User can create template
   - [ ] Data persists correctly
   - [ ] Offline functionality works

 **Internal testing:**
 - [ ] Developer testing (1 week)
 - [ ] Document all bugs and issues
 - [ ] Fix critical bugs
 - [ ] Performance optimization

 **Beta user testing (optional but recommended):**
 - [ ] Recruit 5-10 power users
 - [ ] Provide staging access
 - [ ] Gather feedback
 - [ ] Monitor analytics
 - [ ] Monitor error logs

 ### 2.12: Production Preparation (Week 10)

 **Final pre-production checklist:**
 - [ ] **All tests passing:**
   - [ ] Unit tests ✅
   - [ ] Integration tests ✅
   - [ ] E2E tests ✅
   - [ ] Performance tests ✅

 - [ ] **Performance benchmarks met:**
   - [ ] LCP < 2.5s
   - [ ] FID < 100ms
   - [ ] CLS < 0.1
   - [ ] Bundle size acceptable

 - [ ] **Monitoring configured:**
   - [ ] Error tracking enabled
   - [ ] Performance monitoring enabled
   - [ ] Analytics tracking enabled
   - [ ] Cloudflare Workers observability enabled

 - [ ] **Documentation complete:**
   - [ ] Developer onboarding guide
   - [ ] Architecture documentation
   - [ ] Deployment guide
   - [ ] Troubleshooting guide
   - [ ] Rollback procedures

 - [ ] **Rollback plan ready:**
   - [ ] Database state documented
   - [ ] DNS configuration documented
   - [ ] Old deployment still accessible
   - [ ] Rollback script tested

 **Quality Gates:**
 - [ ] All migration tasks complete
 - [ ] All tests passing (100% of original functionality)
 - [ ] Performance meets or exceeds Next.js baseline
 - [ ] No critical bugs outstanding
 - [ ] Staging environment stable for 1 week
 - [ ] Team sign-off on production deployment
 - [ ] Stakeholder approval for cutover

 ---

 ## Phase 3: Production Cutover & Monitoring (2 weeks)

 > ⚠️ **PREREQUISITE:** Phase 2 completed with all quality gates passed

 > **Purpose:** Execute controlled production deployment with monitoring and rollback capability.

 ### 3.1: Pre-Cutover Validation (Day 1-2)

 **Final production checks:**
 - [ ] **Verify production environment:**
   - [ ] All secrets configured in Infisical (prod)
   - [ ] D1 production database accessible
   - [ ] WorkOS production OAuth configured
   - [ ] PostHog production key configured
   - [ ] WHOOP production OAuth configured

 - [ ] **Build production bundle:**
   ```bash
   infisical run --env prod -- npm run build
   ```

 - [ ] **Validate production build:**
   - [ ] Bundle size acceptable
   - [ ] All assets generated correctly
   - [ ] Source maps available for debugging

 - [ ] **Test production build locally:**
   ```bash
   wrangler dev --env production --local
   ```

 ### 3.2: Phased Rollout Strategy (Day 3-7)

 **Option A: Big Bang Cutover (Higher Risk)**
 - [ ] Deploy to production
 - [ ] Update DNS/routing
 - [ ] All users on new system immediately
 - [ ] Monitor closely for 48 hours

 **Option B: Canary Deployment (Recommended, Lower Risk)**
 - [ ] **Phase 1 (Day 3):** Deploy to 10% of users
   - [ ] Use Cloudflare Workers routing rules
   - [ ] Monitor error rates
   - [ ] Monitor performance metrics
   - [ ] Gather user feedback

 - [ ] **Phase 2 (Day 4):** Increase to 25% if Phase 1 successful
   - [ ] Continue monitoring
   - [ ] Address any issues

 - [ ] **Phase 3 (Day 5):** Increase to 50%
   - [ ] Validate stability at scale

 - [ ] **Phase 4 (Day 6):** Increase to 100%
   - [ ] All users on TanStack Start

 ### 3.3: Deployment Execution (Day 3)

 **Deploy to production:**
 - [ ] **Announce maintenance window (optional):**
   - [ ] Notify users of potential downtime
   - [ ] Set status page to "maintenance"

 - [ ] **Deploy to production:**
   ```bash
   infisical run --env prod -- wrangler deploy --env production --logpush
   ```

 - [ ] **Verify deployment:**
   - [ ] Check deployment logs
   - [ ] Verify new worker is active
   - [ ] Test basic functionality

 - [ ] **Update DNS/routing (if needed):**
   - [ ] May not be needed if using same domain

 - [ ] **Announce completion:**
   - [ ] Update status page
   - [ ] Notify users of new system

 ### 3.4: Post-Deployment Monitoring (Day 3-14)

 **24/7 monitoring for first 48 hours:**

 **Monitor error rates:**
 - [ ] Cloudflare Workers dashboard
 - [ ] PostHog error tracking
 - [ ] Custom error alerting
 - [ ] User-reported issues

 **Monitor performance:**
 - [ ] Core Web Vitals
 - [ ] API response times
 - [ ] D1 query latency
 - [ ] Workers CPU time
 - [ ] Memory usage

 **Monitor user behavior:**
 - [ ] Active users
 - [ ] Session duration
 - [ ] Feature usage
 - [ ] Conversion rates
 - [ ] User feedback

 **Key metrics to track:**
 | Metric | Target | Alert Threshold |
 |--------|--------|-----------------|
 | Error Rate | < 1% | > 2% |
 | LCP | < 2.5s | > 4s |
 | API Latency | < 500ms | > 1000ms |
 | Active Users | Maintain current | Drop > 20% |
 | Session Duration | Maintain current | Drop > 30% |

 ### 3.5: Issue Triage & Resolution (Day 3-14)

 **Establish on-call rotation:**
 - [ ] Primary on-call engineer
 - [ ] Secondary on-call engineer
 - [ ] Escalation path defined

 **Issue severity levels:**
 - **P0 (Critical):** Service down, data loss, security breach
   - Response time: Immediate
   - Resolution time: < 4 hours
   - Action: Consider immediate rollback

 - **P1 (High):** Major feature broken, significant performance degradation
   - Response time: < 1 hour
   - Resolution time: < 24 hours
   - Action: Hotfix or rollback

 - **P2 (Medium):** Minor feature issues, small performance impact
   - Response time: < 4 hours
   - Resolution time: < 1 week
   - Action: Schedule fix

 - **P3 (Low):** Cosmetic issues, nice-to-have improvements
   - Response time: < 1 day
   - Resolution time: Next sprint
   - Action: Backlog

 ### 3.6: Rollback Procedures (If Needed)

 **Decision criteria for rollback:**
 - [ ] Error rate > 5%
 - [ ] Critical functionality completely broken
 - [ ] Data integrity issues detected
 - [ ] Performance degradation > 50%
 - [ ] Security vulnerability discovered

 **Rollback execution:**
 - [ ] **Announce rollback:**
   - [ ] Notify stakeholders
   - [ ] Update status page

 - [ ] **Revert to previous deployment:**
   ```bash
   wrangler rollback --env production
   ```

 - [ ] **Verify rollback successful:**
   - [ ] Old system is active
   - [ ] Functionality restored
   - [ ] Error rates normalized

 - [ ] **Post-rollback analysis:**
   - [ ] Investigate root cause
   - [ ] Document learnings
   - [ ] Plan remediation
   - [ ] Schedule retry (if appropriate)

 ### 3.7: Stabilization Period (Day 7-14)

 **Week 2 focus: Stabilization**
 - [ ] **Address all P0/P1 issues**
 - [ ] **Optimize performance bottlenecks**
 - [ ] **Gather user feedback**
 - [ ] **Monitor trends**
 - [ ] **Document lessons learned**

 **Quality Gates:**
 - [ ] Error rate < 1% for 7 consecutive days
 - [ ] Performance metrics meet or exceed baseline
 - [ ] No critical bugs outstanding
 - [ ] User satisfaction maintained or improved
 - [ ] Team confident in new system

 ---

 ## Phase 4: Post-Migration Cleanup (2 weeks)

 > ⚠️ **PREREQUISITE:** Phase 3 completed with successful production deployment

 > **Purpose:** Clean up old code, optimize new system, and finalize documentation.

 ### 4.1: Old Code Cleanup (Week 1)

 **Remove Next.js artifacts:**
 - [ ] **Archive old Next.js codebase:**
   ```bash
   git tag next-js-final-version
   git push origin next-js-final-version
   ```

 - [ ] **Remove Next.js from package.json:**
   ```bash
   npm uninstall next
   npm uninstall @opennextjs/cloudflare
   npm uninstall eslint-config-next
   npm uninstall @t3-oss/env-nextjs
   ```

 - [ ] **Remove old build scripts:**
   - [ ] scripts/opennext-build.ts
 - [ ] **Remove old configuration files:**
   - [ ] next.config.js
   - [ ] Any Next.js-specific config

 - [ ] **Clean up old routes directory:**
   - [ ] Archive src/app/ directory
   - [ ] Document what was removed

 ### 4.2: Optimization Pass (Week 1-2)

 **Performance optimization:**
 - [ ] **Bundle size optimization:**
   - [ ] Analyze bundle with Vite's rollup visualizer
   - [ ] Remove unused dependencies
   - [ ] Implement code splitting where beneficial
   - [ ] Tree-shake unused code

 - [ ] **Runtime optimization:**
   - [ ] Profile critical paths
   - [ ] Optimize expensive computations
   - [ ] Implement caching strategies
   - [ ] Optimize database queries

 - [ ] **Asset optimization:**
   - [ ] Optimize images
   - [ ] Minimize CSS
   - [ ] Optimize fonts

 ### 4.3: Documentation Updates (Week 2)

 **Update all project documentation:**
 - [ ] **README.md:**
   - [ ] Update setup instructions
   - [ ] Update development workflow
   - [ ] Update build commands
   - [ ] Update deployment instructions

 - [ ] **CLAUDE.md:**
   - [ ] Update tech stack summary
   - [ ] Update development workflow
   - [ ] Update common commands
   - [ ] Update project structure
   - [ ] Remove Next.js references

 - [ ] **AGENTS.md:**
   - [ ] Update architecture overview
   - [ ] Update routing patterns
   - [ ] Update data fetching patterns

 - [ ] **Create new documentation:**
   - [ ] TanStack Start migration guide (for future reference)
   - [ ] TanStack Router patterns guide
   - [ ] Lessons learned document

 ### 4.4: Team Onboarding (Week 2)

 **Knowledge transfer:**
 - [ ] **Create onboarding guide:**
   - [ ] TanStack Start basics
   - [ ] TanStack Router patterns
   - [ ] Differences from Next.js
   - [ ] Common gotchas

 - [ ] **Team training session:**
   - [ ] Overview of new architecture
   - [ ] Demo of key patterns
   - [ ] Q&A session

 - [ ] **Update developer workflows:**
   - [ ] Update local setup guide
   - [ ] Update debugging guide
   - [ ] Update testing guide

 ### 4.5: Retrospective (Week 2)

 **Post-migration analysis:**
 - [ ] **Team retrospective:**
   - [ ] What went well?
   - [ ] What could be improved?
   - [ ] What did we learn?
   - [ ] What would we do differently?

 - [ ] **Metrics analysis:**
   - [ ] Compare final metrics to baseline
   - [ ] Quantify improvements (or regressions)
   - [ ] ROI analysis

 - [ ] **Stakeholder report:**
   - [ ] Migration summary
   - [ ] Challenges and solutions
   - [ ] Final outcomes
   - [ ] Recommendations for future

 **Quality Gates:**
 - [ ] All Next.js code removed
 - [ ] Performance optimizations complete
 - [ ] Documentation updated
 - [ ] Team trained on new system
 - [ ] Retrospective completed
 - [ ] Project officially closed

 ---

 ## Risk Management

 ### High-Risk Items

 | Risk | Impact | Likelihood | Mitigation |
 |------|--------|-----------|------------|
 | TanStack Start beta issues | HIGH | MEDIUM | Extensive Phase 1 POC, early testing, fallback to Next.js |
 | D1 integration problems | HIGH | LOW | Test thoroughly in Phase 1, chunking utilities proven |
 | Auth flow breaks | HIGH | LOW | Test extensively in Phase 1.3, keep WorkOS config identical |
 | Data migration issues | HIGH | LOW | No data migration needed, same D1 database |
 | Performance regression | MEDIUM | MEDIUM | Comprehensive benchmarking in Phase 1.8, 2.10 |
 | Team learning curve | MEDIUM | HIGH | Training, documentation, pair programming |
 | Offline functionality breaks | MEDIUM | MEDIUM | Test thoroughly in Phase 2.10, TanStack Query proven |
 | WHOOP integration breaks | MEDIUM | LOW | Test OAuth flow early, webhook handling validated |
 | Bundle size increase | LOW | MEDIUM | Monitor in Phase 1.8, optimize in Phase 4.2 |

 ### Rollback Strategy

 **Phase 1 (POC):** Easy rollback
 - No production impact
 - Just abandon parallel codebase

 **Phase 2 (Migration):** Moderate rollback difficulty
 - Parallel codebases exist
 - Can abandon migration if needed

 **Phase 3 (Cutover):** Difficult rollback
 - Old Next.js deployment must remain deployable
 - Database state may have diverged
 - User data continuity critical

 **Rollback readiness checklist:**
 - [ ] Old Next.js deployment tagged in git
 - [ ] Old deployment still builds successfully
 - [ ] Database schema compatible with both systems
 - [ ] Secrets available for both systems
 - [ ] Documented rollback procedure
 - [ ] Tested rollback procedure in staging
 - [ ] On-call team trained on rollback

 ---

 ## Success Metrics

 ### Technical Metrics

 **Performance:**
 - Target: Bundle size ≤ Next.js baseline +10%
 - Target: LCP < 2.5s (currently TBD)
 - Target: Build time improved by ≥20% (currently TBD)
 - Target: HMR < 500ms (currently TBD)

 **Reliability:**
 - Target: Error rate < 1%
 - Target: 99.9% uptime
 - Target: Zero data loss events

 **Developer Experience:**
 - Target: Dev server startup < 5s
 - Target: Type checking < 10s
 - Target: Team satisfaction ≥8/10

 ### Business Metrics

 **User Experience:**
 - Target: User satisfaction maintained or improved
 - Target: Session duration maintained or improved
 - Target: Feature usage maintained or improved
 - Target: Zero increase in support tickets

 **Project Metrics:**
 - Target: Complete in 12-16 weeks
 - Target: Zero production incidents
 - Target: Stay within budget
 - Target: All quality gates passed

 ---

 ## Timeline Summary

 | Phase | Duration | Outcome |
 |-------|----------|---------|
 | **Phase 0:** Strategic Analysis | 2 weeks | GO/NO-GO decision |
 | **Phase 1:** Proof of Concept | 3-4 weeks | Working POC, validated integrations |
 | **Phase 2:** Full Migration | 8-10 weeks | Complete application migrated |
 | **Phase 3:** Production Cutover | 2 weeks | Live on TanStack Start |
 | **Phase 4:** Post-Migration Cleanup | 2 weeks | Optimized and documented |
 | **TOTAL** | **15-18 weeks** | **3.5-4.5 months** |

 **Buffer:** Add 2-4 weeks for unexpected issues = **17-22 weeks (4-5.5 months)**

 ---

 ## Recommendation

 ### ⚠️ PAUSE AND EVALUATE

 Before committing to this migration, seriously consider:

 1. **You've already achieved 75% of TanStack value**
    - ✅ TanStack Form (Phase 3 complete)
    - ✅ TanStack Virtual (Phase 4 complete)
    - ✅ TanStack Table (Phase 4 complete)
    - ❌ TanStack Router (Phase 1-2 not started)

 2. **Is routing your biggest problem?**
    - Next.js App Router works well
    - Type-safe routing is nice-to-have, not must-have
    - Forms, tables, and virtual lists were actually pain points

 3. **This is a 4-5 month commitment**
    - No feature development during migration
    - High risk from beta framework
    - Complete rewrite required
    - No gradual migration path

 4. **Next.js is proven, TanStack Start is beta**
    - Next.js: Millions of production deployments
    - TanStack Start: Beta status, smaller community

 ### Alternative: Declare Victory

 **You could:**
 - ✅ Mark Phases 3-4 as COMPLETE
 - ✅ Keep Next.js for routing (it works!)
 - ✅ Keep all TanStack benefits you've already gained
 - ✅ Ship features instead of migrating frameworks
 - ✅ Revisit TanStack Start in 12 months when it's stable

 ---

 ## Decision Point

 **Before proceeding, answer these questions:**

 1. What specific problem does TanStack Start solve that Next.js doesn't?
 2. Is that problem worth 4-5 months of migration work?
 3. Can you afford zero feature development for 4-5 months?
 4. Are you comfortable betting on a beta framework?
 5. What happens if TanStack Start has a critical bug in production?

 If you can confidently answer these questions and still want to proceed, **start with Phase 0**. The Strategic Analysis phase is designed to identify blockers before you commit.

 ---

 _Last Updated: 2025-10-31_
 _Estimated Duration: 15-22 weeks (buffer included)_
 _Risk Level: HIGH_
 _Confidence Level: MEDIUM (depends on Phase 0 validation)_
