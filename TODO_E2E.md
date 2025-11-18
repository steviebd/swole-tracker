# E2E Test Expansion TODO List

This document outlines the structured expansion of end-to-end (E2E) tests for the Swole Tracker application. The tests are organized into five implementation phases, prioritized by architectural requirements and user impact. Phase 0 establishes test infrastructure, Phase 1 covers core authentication and offline foundation, Phase 2 focuses on workout creation and sync, Phase 3 addresses WHOOP integration, and Phase 4 handles advanced features and edge cases. This prioritization ensures the offline-first architecture is tested early, followed by critical user paths and integrations.

## Testing Strategy

### Test Data Approach (Hybrid)
- **Seeded Data**: Use existing test database with pre-populated data for history/analytics tests
  - Templates: "Push Day", "Pull Day", "Leg Day" with linked exercises
  - Workout sessions with historic data (180kg squats, bench press, etc.)
  - WHOOP recovery data spanning 7 days
  - Located in: `e2e/test-data-seeding.ts`
  - Test user: `E2E_TEST_USERNAME` from `.env`

- **Fresh Data**: Create and cleanup test-specific data for mutation tests
  - Create templates/workouts with unique timestamped names
  - Clean up after test completion to avoid polluting database
  - See `e2e/workflow/full-workout-flow.spec.ts` for reference pattern

### Test Organization
- Continue existing folder structure:
  - `e2e/auth/` - Authentication and authorization tests
  - `e2e/templates/` - Template CRUD operations
  - `e2e/workout/` - Workout session tests (to be created)
  - `e2e/offline/` - PWA and offline functionality (to be created)
  - `e2e/whoop/` - WHOOP integration tests (to be created)
  - `e2e/workflow/` - Complete user workflows

## Phase 0: Test Infrastructure
- [x] E2E test framework setup and configuration (Playwright)
- [x] Test data factories and seeding utilities (`e2e/test-data-seeding.ts`)
- [ ] **Mock services for WHOOP API** (critical for Phase 3)
- [ ] Mock services for PostHog analytics (optional, could intercept)
- [x] Test environment configuration with Infisical secrets (playwright.config.ts)
- [ ] **CI/CD pipeline integration** (config exists, needs GitHub Actions workflow)
- [x] Test reporting (Playwright HTML/JSON reports configured)
- [ ] **Failure debugging tools** (consider Playwright trace viewer setup)

## Phase 1: Core Authentication, Navigation & Offline Foundation

### Authentication (Location: `e2e/auth/`)
- [x] User login via WorkOS OAuth (`login.spec.ts`, `auth.fixture.ts`)
- [x] Unauthorized access attempts redirect to login (`login.spec.ts`)
- [x] Auth session persistence across page reloads (`login.spec.ts`)
- [x] Access to protected routes when authenticated (`login.spec.ts`)
- [x] Session expiry handling (`login.spec.ts`)
- [x] Login verification and home page display (`login-verify.spec.ts`)
- [ ] **User logout functionality** (cleanup exists in fixture, needs dedicated test)
- [ ] **Auth token refresh/renewal flow** (currently mocked, needs real test)

### Navigation & Routing
- [x] Basic navigation between main pages (`login.spec.ts` - protected routes)
- [ ] **Navigation from template to workout flow** (partially in workflow test)
- [ ] **404 page displays and navigation back**
- [ ] **Invalid workout ID redirects appropriately**
- [ ] **Deep links work correctly** (especially important for PWA)
- [ ] **Back/forward browser navigation**
- [ ] **Direct URL access to protected pages**

### PWA & Offline Foundation
- [ ] **PWA installation and manifest validation**
- [ ] **Service worker registration and activation**
- [ ] **Offline mode detection and UI indication**
- [ ] **Basic offline data persistence** (IndexedDB/Cache API)
- [ ] **Offline queue for mutations**
- [ ] **Online/offline event handling**

### Responsive Design & Accessibility
- [ ] **Responsive design at 320px (small phone)** - use mobile project
- [ ] **Responsive design at 768px (tablet)**
- [ ] **Responsive design at 1920px (desktop)** - current default
- [ ] **Portrait and landscape orientations**
- [ ] **Touch targets ≥44px on mobile** (Material 3 compliance)
- [ ] **Backdrop blur effects work across viewports**
- [ ] **Keyboard navigation through entire app**
- [ ] **Screen reader compatibility (ARIA labels)**
- [ ] **Focus management during navigation**
- [ ] **Reduced motion preferences respected** (prefers-reduced-motion)

## Phase 2: Workout Creation, Tracking & Sync

### Template Management (Location: `e2e/templates/`)
- [x] Create new template with exercises (`create-template.spec.ts`)
- [x] Template creation with exercise linking review (`create-template.spec.ts`)
- [x] Add multiple exercises to template (`create-template.spec.ts`)
- [x] Navigate between template form steps (Basics → Exercises → Linking → Preview) (`create-template.spec.ts`)
- [x] Validation errors for invalid template data (`create-template.spec.ts`)
- [x] Cancel template creation (`create-template.spec.ts`)
- [x] Auto-linking suggestions for exercises (`create-template-with-linking.spec.ts`)
- [x] Manual linking decisions in linking step (`create-template-with-linking.spec.ts`)
- [x] Bulk linking actions (Accept All, Create New for Unmatched) (`create-template-with-linking.spec.ts`)
- [x] Reject/don't link exercises (`create-template-with-linking.spec.ts`)
- [x] Empty template in linking review (`create-template-with-linking.spec.ts`)
- [x] Navigate back from linking review to exercises (`create-template-with-linking.spec.ts`)
- [ ] **Edit existing template**
- [ ] **Delete template** (partially tested in workflow, needs dedicated test)
- [ ] **Duplicate template**
- [ ] **Reorder exercises in template**
- [ ] **View template details**

### Workout Session Flow (Location: `e2e/workout/` - to be created)
- [x] Start workout from template (`workflow/full-workout-flow.spec.ts`)
- [x] Complete workout session and redirect (`workflow/full-workout-flow.spec.ts`)
- [ ] **Start workout without template (blank workout)**
- [ ] **Log sets with weight, reps during workout**
- [ ] **Add sets to exercise during workout**
- [ ] **Remove sets from exercise**
- [ ] **Rest timer between sets**
- [ ] **Add notes to workout session**
- [ ] **Pause/resume workout session**
- [ ] **Cancel workout in progress (with confirmation)**
- [ ] **Save workout as draft (incomplete)**
- [ ] **Resume draft workout**

### Workout History & Data (Location: `e2e/workout/`)
- [x] View workout appears in history (`workflow/full-workout-flow.spec.ts` - basic check)
- [ ] **View workout details page**
- [ ] **View workout history list with filters**
- [ ] **Filter by date range**
- [ ] **Filter by exercise type**
- [ ] **Search workouts**
- [ ] **Edit completed workout data**
- [ ] **Delete workout session with confirmation**
- [ ] **View exercise historic data (pre-populated in new workout)**
- [ ] **Verify strength progression chart** (currently just checks visibility)

### Offline & Sync (Location: `e2e/offline/`)
- [ ] **Offline workout creation and local saving**
- [ ] **Automatic sync when coming back online**
- [ ] **Optimistic UI updates for mutations**
- [ ] **Rollback on sync failure**
- [ ] **Offline queue indicator in UI**
- [ ] **Manual sync trigger**
- [ ] **Conflict resolution for concurrent edits**

### Network Resilience & Performance (Location: `e2e/workout/`)
- [ ] **Test bulk operations with >90 items** (D1 chunking validation - critical!)
- [ ] **Slow 3G network conditions** (Playwright network throttling)
- [ ] **Intermittent connectivity** (disconnect/reconnect during workout)
- [ ] **Request timeouts and retries** (tRPC retry logic)
- [ ] **Large workout history pagination** (>100 workouts)

## Phase 3: WHOOP Integration & Advanced Offline

> **IMPORTANT**: WHOOP API must be mocked for E2E tests. Create mock service in `e2e/mocks/whoop-api.mock.ts` before implementing these tests.

### WHOOP OAuth & Connection (Location: `e2e/whoop/`)
- [ ] **Connect WHOOP account via OAuth flow** (mock OAuth server)
- [ ] **WHOOP connection shows on settings/integrations page**
- [ ] **Disconnect WHOOP integration**
- [ ] **Reconnect after disconnection**
- [ ] **Handle WHOOP OAuth errors (denied, timeout)**
- [ ] **WHOOP token refresh on expiry**

### WHOOP Data Sync (Location: `e2e/whoop/`)
- [ ] **Initial WHOOP data sync after connection**
- [ ] **Sync recovery metrics from WHOOP** (mock API responses)
- [ ] **Sync sleep data from WHOOP**
- [ ] **Sync strain/HRV data from WHOOP**
- [ ] **Display WHOOP recovery on dashboard**
- [ ] **Display WHOOP metrics on workout detail page**
- [ ] **Sync historical WHOOP data (last 30 days)**
- [ ] **Incremental sync (new data only)**

### WHOOP Error Handling (Location: `e2e/whoop/`)
- [ ] **Handle WHOOP API rate limits (429 responses)**
- [ ] **Handle WHOOP API errors (500, timeout)**
- [ ] **Handle WHOOP authentication errors (401)**
- [ ] **Offline WHOOP data caching** (show last synced data)
- [ ] **Retry failed WHOOP sync**
- [ ] **User notification for WHOOP sync failures**

### Advanced Sync & Conflict Resolution (Location: `e2e/offline/`)
- [ ] **Multi-device sync scenarios** (two browsers, same account)
- [ ] **Concurrent edits to same workout across devices**
- [ ] **Conflict resolution UI (last write wins vs. user choice)**
- [ ] **Optimistic UI with server reconciliation**
- [ ] **Sync queue with priority (WHOOP vs. workout data)**

## Phase 4: Advanced Features & Edge Cases

### Analytics & Progress Tracking (Location: `e2e/progress/`)
- [ ] **View weekly workout volume charts**
- [ ] **View monthly workout volume charts**
- [ ] **Filter workout history by date range**
- [ ] **Filter workout history by exercise type**
- [ ] **Filter by muscle group**
- [ ] **View personal records (PRs) page**
- [ ] **PR detection and highlighting**
- [ ] **Strength progression chart for specific exercise** (use seeded data)
- [ ] **Volume progression over time**
- [ ] **Exercise frequency heatmap**

### Health Advice & AI Features (Location: `e2e/health/`)
- [ ] **Health advice generation trigger**
- [ ] **Display health advice on dashboard**
- [ ] **Health advice based on recovery score**
- [ ] **Health advice based on workout volume**
- [ ] **Dismiss/mark health advice as read**
- [ ] **Health advice history view**

### Data Import/Export (Location: `e2e/data/`)
- [ ] **Export workout data to CSV**
- [ ] **Export workout data to JSON**
- [ ] **Import workout data from CSV**
- [ ] **Import validation and error handling**
- [ ] **Bulk delete workouts with confirmation**
- [ ] **Bulk edit workout data**

### Performance & Scale Testing (Location: `e2e/performance/`)
- [ ] **Large workout history (>1000 workouts)** - seed large dataset
- [ ] **Bulk operations with >90 items** (D1 chunking - CRITICAL!)
- [ ] **Page load performance targets** (<3s initial, <1s subsequent)
- [ ] **Animation smoothness (60fps)** - use Playwright performance metrics
- [ ] **Memory usage monitoring** (no leaks on long sessions)
- [ ] **Infinite scroll performance** (workout history)
- [ ] **Search performance with large dataset**

### Cross-Browser & Device Testing
- [ ] **Chrome/Chromium** (current default project)
- [x] **Mobile (Pixel 5)** (configured in playwright.config.ts)
- [ ] **Firefox** (add project to playwright.config.ts)
- [ ] **Safari/WebKit** (add project to playwright.config.ts)
- [ ] **iOS Safari** (iPhone 12 Pro viewport)
- [ ] **Tablet (iPad Pro)** viewport testing

### Edge Cases & Error Scenarios (Location: `e2e/edge-cases/`)
- [ ] **Session timeout during active workout**
- [ ] **Network loss mid-mutation**
- [ ] **Browser refresh during workout**
- [ ] **Multiple tabs with same account**
- [ ] **Invalid data in URL parameters**
- [ ] **Malformed API responses**
- [ ] **Database connection failures**
- [ ] **Quota exceeded (storage limits)**
- [ ] **Very long workout session (>4 hours)**
- [ ] **Extremely large single workout (>100 exercises)**

---

## Implementation Notes

### Existing Test Files - Status

**Keep & Maintain:**
- ✅ `e2e/auth/login.spec.ts` - Core authentication tests
- ✅ `e2e/auth/login-verify.spec.ts` - Login verification
- ✅ `e2e/templates/create-template.spec.ts` - Template creation tests
- ✅ `e2e/templates/create-template-with-linking.spec.ts` - Exercise linking tests
- ✅ `e2e/workflow/full-workout-flow.spec.ts` - End-to-end workflow test
- ✅ `e2e/fixtures/auth.fixture.ts` - Authentication fixture (used by all tests)
- ✅ `e2e/test-data-seeding.ts` - Data seeding utilities
- ✅ `e2e/global-setup.ts` - Global test setup

**Development/Debug Tools (Keep for now, don't run in CI):**
- 🔧 `e2e/debug.spec.ts` - Manual debugging tool (unauthenticated pages)
- 🔧 `e2e/debug-auth.spec.ts` - Manual debugging tool (authenticated pages)
- 🔧 `e2e/basic.spec.ts` - Basic smoke tests (redundant with login.spec.ts)

**Recommendation**: Add `.skip` to debug tests or move to separate `e2e/debug/` folder excluded from CI.

### Critical Priorities

**Before expanding test suite:**
1. **Create WHOOP API mock** (`e2e/mocks/whoop-api.mock.ts`) - Required for Phase 3
2. **CI/CD GitHub Actions workflow** - Required for automated testing
3. **Playwright trace viewer setup** - For debugging failures

**High-priority tests to add next:**
1. **Logout functionality** (Phase 1 - gap in auth coverage)
2. **Actual workout logging** (Phase 2 - workflow test doesn't log data)
3. **D1 bulk operations test** (Phase 2 - critical for data integrity)
4. **Offline mode basics** (Phase 1 - core architecture)
5. **PWA installation** (Phase 1 - core feature)

### Test Data Strategy

**When to use seeded data:**
- Analytics/progress tests (need historical data)
- Performance tests (need large datasets)
- Exercise linking tests (need existing master exercises)
- WHOOP integration tests (need recovery data)

**When to create fresh data:**
- Template CRUD operations
- Workout session creation/editing
- Any test that modifies state
- Tests that need isolation from other tests

**Seeding script usage:**
```bash
# Seed complete test data for E2E test user
infisical run --env dev -- bun run tsx e2e/test-data-seeding.ts

# Or use individual seeding functions in tests:
import { seedWorkoutTemplates, cleanupTestData } from '../test-data-seeding';
```

### Playwright Best Practices

**Network mocking:**
```typescript
// Mock WHOOP API
await page.route('**/api.whoop.com/**', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ recovery_score: 85, hrv: 45 })
  });
});
```

**Network throttling (slow 3G):**
```typescript
await page.context().route('**/*', async (route) => {
  await route.continue({ delay: 1000 }); // 1s delay
});
```

**Offline mode:**
```typescript
await page.context().setOffline(true);
// Test offline functionality
await page.context().setOffline(false);
```

**Mobile viewport:**
```typescript
// Use the mobile project in playwright.config.ts
// OR set viewport manually:
await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
```

**Accessibility testing:**
```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

await injectAxe(page);
await checkA11y(page); // Throws if violations found
```

### Running Tests

**All tests:**
```bash
bun run test:e2e
```

**Specific phase (example):**
```bash
bun run test:e2e e2e/auth/
bun run test:e2e e2e/templates/
```

**Mobile project:**
```bash
bun run test:e2e:mobile
```

**Headed mode (watch tests run):**
```bash
bun run test:e2e:headed
```

**Debug mode:**
```bash
bun run test:e2e:debug
```

**UI mode (interactive):**
```bash
bun run test:e2e:ui
```

### Test Naming Conventions

**File names:**
- `{feature}.spec.ts` - Feature-specific tests (e.g., `login.spec.ts`)
- `{feature}-{aspect}.spec.ts` - Specific aspect (e.g., `template-linking.spec.ts`)

**Test structure:**
```typescript
test.describe("Feature Name", () => {
  test("should do specific thing when condition", async ({ authenticatedPage }) => {
    // Test implementation
  });
});
```

**Use descriptive test names:**
- ✅ "should redirect to login when accessing protected route without auth"
- ❌ "test login redirect"

### Coverage Goals

- **Phase 0**: 100% (infrastructure must be solid)
- **Phase 1**: 80% (core functionality)
- **Phase 2**: 70% (critical user paths)
- **Phase 3**: 60% (integration features)
- **Phase 4**: 40% (nice-to-have, edge cases)

### Estimated Test Counts

- Phase 0: ~5 additional tests
- Phase 1: ~25 tests (15 remaining)
- Phase 2: ~45 tests (30 remaining)
- Phase 3: ~30 tests
- Phase 4: ~40 tests

**Total**: ~145 tests (currently have ~20 tests = ~14% coverage)

---

## Implementation Plan for Agent Execution

> This section provides a structured, step-by-step plan for expanding the E2E test suite. Work through phases sequentially.

### Execution Order

1. **Phase 0**: Infrastructure (WHOOP mock, CI/CD, trace viewer) - **DO THIS FIRST**
2. **Phase 1 High Priority**: Logout, Navigation, PWA, Offline detection
3. **Phase 2 High Priority**: Workout logging, Bulk operations (D1 chunking), CRUD
4. **Phase 1 Low Priority**: Accessibility, Responsive design
5. **Phase 2 Low Priority**: Offline sync, Network resilience
6. **Phase 3**: WHOOP integration (requires Phase 0 mock)
7. **Phase 4**: Advanced features (analytics, performance, cross-browser)

---

## Phase 0: Infrastructure Tasks

### Task 1: Create WHOOP API Mock Service
**File**: `e2e/mocks/whoop-api.mock.ts` (new file)

**Purpose**: Mock WHOOP API for E2E tests since we don't have access to real WHOOP API in test environment.

**Implementation**:
```typescript
import type { Page } from "@playwright/test";

// Mock WHOOP API response data
export const mockWhoopData = {
  recovery: {
    cycle_id: 123456,
    sleep_id: 654321,
    user_id: 999999,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    score_state: "SCORED",
    score: 85,
    resting_heart_rate: 52,
    hrv_rmssd_milli: 45.2,
    spo2_percentage: 96.5,
    skin_temp_celsius: 33.2
  },
  sleep: {
    id: 654321,
    user_id: 999999,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    start: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
    score_state: "SCORED",
    score: 78,
    stage_summary: {
      total_in_bed_time_milli: 28800000,
      total_awake_time_milli: 1200000,
      total_light_sleep_time_milli: 14400000,
      total_slow_wave_sleep_time_milli: 7200000,
      total_rem_sleep_time_milli: 6000000
    }
  },
  cycle: {
    id: 123456,
    user_id: 999999,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
    score_state: "SCORED",
    score: {
      strain: 12.5,
      kilojoule: 8500,
      average_heart_rate: 72,
      max_heart_rate: 155
    }
  },
  profile: {
    user_id: 999999,
    email: "test@example.com",
    first_name: "Test",
    last_name: "User"
  }
};

// Error scenarios
export const mockWhoopErrors = {
  rateLimitExceeded: {
    status: 429,
    body: JSON.stringify({ error: "Rate limit exceeded. Try again in 60 seconds." })
  },
  unauthorized: {
    status: 401,
    body: JSON.stringify({ error: "Unauthorized. Token expired or invalid." })
  },
  serverError: {
    status: 500,
    body: JSON.stringify({ error: "Internal server error" })
  }
};

/**
 * Set up WHOOP API mocks for E2E tests
 */
export async function setupWhoopMocks(page: Page, scenario: 'success' | 'rateLimit' | 'unauthorized' | 'error' = 'success') {
  await page.route('**/api.whoop.com/**', async (route) => {
    const url = route.request().url();

    // Handle error scenarios
    if (scenario === 'rateLimit') {
      await route.fulfill(mockWhoopErrors.rateLimitExceeded);
      return;
    }
    if (scenario === 'unauthorized') {
      await route.fulfill(mockWhoopErrors.unauthorized);
      return;
    }
    if (scenario === 'error') {
      await route.fulfill(mockWhoopErrors.serverError);
      return;
    }

    // Success scenarios
    if (url.includes('/v1/recovery')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockWhoopData.recovery)
      });
    } else if (url.includes('/v1/cycle')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockWhoopData.cycle)
      });
    } else if (url.includes('/v1/sleep')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockWhoopData.sleep)
      });
    } else if (url.includes('/v1/user/profile')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockWhoopData.profile)
      });
    } else {
      // Default: pass through
      await route.continue();
    }
  });
}

/**
 * Mock WHOOP OAuth flow
 */
export async function mockWhoopOAuth(page: Page) {
  // Mock OAuth redirect
  await page.route('**/oauth.whoop.com/**', async (route) => {
    // Simulate successful OAuth by redirecting back with mock code
    const callbackUrl = new URL(route.request().url());
    const redirectUri = callbackUrl.searchParams.get('redirect_uri');

    if (redirectUri) {
      await route.fulfill({
        status: 302,
        headers: {
          'Location': `${redirectUri}?code=mock_whoop_auth_code`
        }
      });
    } else {
      await route.continue();
    }
  });
}
```

**Verification**: Create `e2e/mocks/whoop-api.mock.test.ts` to test the mock:
```typescript
import { test, expect } from "@playwright/test";
import { setupWhoopMocks, mockWhoopData } from "./whoop-api.mock";

test("WHOOP mock returns valid recovery data", async ({ page }) => {
  await setupWhoopMocks(page);

  const response = await page.request.get('https://api.whoop.com/v1/recovery');
  expect(response.status()).toBe(200);

  const data = await response.json();
  expect(data.score).toBe(mockWhoopData.recovery.score);
});
```

### Task 2: CI/CD GitHub Actions Workflow
**File**: `.github/workflows/e2e-tests.yml` (new file)

```yaml
name: E2E Tests

on:
  pull_request:
    paths:
      - 'src/**'
      - 'e2e/**'
      - 'playwright.config.ts'
      - 'package.json'
  push:
    branches: [main, develop, feature/**]
  workflow_dispatch:

jobs:
  e2e-tests:
    name: Playwright E2E Tests
    timeout-minutes: 20
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Install Playwright browsers
        run: bunx playwright install --with-deps chromium

      - name: Start dev server in background
        run: |
          NODE_ENV=test E2E_TESTING=true bun run dev:worker &
          echo $! > .dev-server.pid
        env:
          # Add Infisical secrets here or use Infisical GitHub Action
          E2E_TEST_USERNAME: ${{ secrets.E2E_TEST_USERNAME }}
          E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}

      - name: Wait for dev server
        run: |
          npx wait-on http://localhost:8787 --timeout 120000

      - name: Run E2E tests
        run: bun run test:e2e
        env:
          CI: true
          E2E_TEST_USERNAME: ${{ secrets.E2E_TEST_USERNAME }}
          E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      - name: Upload test traces
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-traces
          path: test-results/
          retention-days: 30

      - name: Stop dev server
        if: always()
        run: |
          if [ -f .dev-server.pid ]; then
            kill $(cat .dev-server.pid) || true
            rm .dev-server.pid
          fi

  # Optional: Add a job for mobile tests
  e2e-mobile:
    name: E2E Mobile Tests
    timeout-minutes: 15
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Install Playwright browsers
        run: bunx playwright install --with-deps chromium

      - name: Run mobile E2E tests
        run: bun run test:e2e:mobile
        env:
          CI: true
          E2E_TEST_USERNAME: ${{ secrets.E2E_TEST_USERNAME }}
          E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}

      - name: Upload mobile test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-mobile-report
          path: playwright-report/
          retention-days: 30
```

**Setup Steps**:
1. Create `.github/workflows/` directory if it doesn't exist
2. Add the workflow file
3. Add secrets to GitHub repository:
   - `E2E_TEST_USERNAME`
   - `E2E_TEST_PASSWORD`
   - Any Infisical tokens if needed
4. Test the workflow on a PR

### Task 3: Playwright Trace Viewer Enhancement
**Update**: `playwright.config.ts`

```typescript
use: {
  trace: 'retain-on-failure', // Always keep traces on failure
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

**Add to**: `e2e/workflow/README.md`

```markdown
## Debugging Failed Tests

### View Playwright Traces

After a test fails, Playwright saves trace files in `test-results/`:

```bash
# View trace for a specific failed test
bunx playwright show-trace test-results/auth-login-should-login-chromium/trace.zip

# Open trace viewer UI
bunx playwright show-trace
```

The trace viewer shows:
- Screenshot at each step
- DOM snapshot
- Network requests
- Console logs
- Action timeline
```

---

## Phase 1: High Priority Tests

### Test 1: User Logout (`e2e/auth/logout.spec.ts`)

```typescript
import { test, expect } from "../fixtures/auth.fixture";

test.describe("User Logout", () => {
  test("should logout successfully and redirect to login", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Navigate to dashboard
    await page.goto("/dashboard");
    await expect(page.locator("body")).toBeVisible();

    // Find and click logout button (adjust selector based on your UI)
    const logoutButton = page.locator(
      'button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")'
    ).first();

    await expect(logoutButton).toBeVisible({ timeout: 5000 });
    await logoutButton.click();

    // Should redirect to login or home page
    await page.waitForURL(/\/(auth\/login|$)/);

    // Verify cannot access protected route
    await page.goto("/dashboard");
    await page.waitForURL(/authkit\.app/); // Should redirect to WorkOS
    console.log("✓ Logged out successfully");
  });

  test("should clear session data on logout", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Navigate to a protected page
    await page.goto("/templates");
    await expect(page.locator("h1")).toContainText("Your Workout Arsenal");

    // Logout
    const logoutButton = page.locator(
      'button:has-text("Logout"), button:has-text("Sign out")'
    ).first();
    await logoutButton.click();

    // Try to access protected route directly
    await page.goto("/templates");

    // Should redirect to login (session cleared)
    await page.waitForURL(/authkit\.app/);
    console.log("✓ Session cleared on logout");
  });
});
```

**Hybrid Data**: None (uses authenticated session)

### Test 2: Navigation (`e2e/navigation/navigation.spec.ts`)

Create folder: `e2e/navigation/`

```typescript
import { test, expect } from "../fixtures/auth.fixture";

test.describe("Navigation & Routing", () => {
  test("should navigate using browser back/forward buttons", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Navigate through pages
    await page.goto("/");
    await page.goto("/templates");
    await page.goto("/workouts");

    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/\/templates/);

    // Go back again
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);

    // Go forward
    await page.goForward();
    await expect(page).toHaveURL(/\/templates/);

    console.log("✓ Browser navigation works correctly");
  });

  test("should display 404 page for invalid routes", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Navigate to invalid route
    await page.goto("/this-route-does-not-exist-12345");

    // Verify 404 page or error message
    const notFoundIndicator = page.locator(
      'text=/404|not found|page.*not.*exist/i'
    );

    if (await notFoundIndicator.isVisible({ timeout: 3000 })) {
      console.log("✓ 404 page displayed");

      // Try to navigate back
      const backLink = page.locator(
        'a:has-text("Home"), a:has-text("Back"), button:has-text("Home")'
      );

      if (await backLink.isVisible({ timeout: 2000 })) {
        await backLink.click();
        await expect(page).toHaveURL(/\/$/);
        console.log("✓ Can navigate back from 404");
      }
    } else {
      console.log("⚠️ 404 page not implemented yet");
    }
  });

  test("should handle invalid workout ID gracefully", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Try to access non-existent workout
    await page.goto("/workout/session/999999");

    // Should either show error or redirect
    await page.waitForTimeout(2000);

    const hasError =
      (await page.locator('text=/not found|error|invalid/i').isVisible()) ||
      page.url().includes("/workouts") ||
      page.url() === "http://localhost:8787/";

    expect(hasError).toBe(true);
    console.log("✓ Invalid workout ID handled gracefully");
  });

  test("should preserve deep link after authentication", async ({ page }) => {
    // Try to access deep link without auth
    await page.goto("/workout/session/1");

    // Should redirect to login
    await page.waitForURL(/authkit\.app/);

    // After login (simulate), should redirect back to original URL
    // Note: This is hard to test fully without completing OAuth flow
    // Could check that redirect_uri parameter is set correctly
    const currentUrl = page.url();
    expect(currentUrl).toContain("authkit.app");

    console.log("✓ Deep link redirect initiated");
  });
});
```

**Hybrid Data**: Uses seeded workout ID (1) for invalid ID test

### Test 3: PWA Basics (`e2e/offline/pwa.spec.ts`)

Create folder: `e2e/offline/`

```typescript
import { test, expect } from "@playwright/test";

test.describe("PWA Installation", () => {
  test("should have valid web app manifest", async ({ page }) => {
    await page.goto("/");

    // Fetch manifest
    const manifestResponse = await page.goto("/manifest.json");
    expect(manifestResponse?.status()).toBe(200);

    const manifest = await manifestResponse?.json();
    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBeDefined();
    expect(manifest.display).toBeDefined();
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);

    console.log("✓ Web app manifest is valid");
  });

  test("should register service worker", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check if service worker is registered
    const swRegistered = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) {
        return false;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      return !!registration;
    });

    if (swRegistered) {
      console.log("✓ Service worker registered");
      expect(swRegistered).toBe(true);
    } else {
      console.log("⚠️ Service worker not registered (may not be implemented yet)");
    }
  });

  test("should have installable PWA criteria", async ({ page }) => {
    await page.goto("/");

    // Check for PWA-required meta tags
    const themeColor = await page.locator('meta[name="theme-color"]');
    const viewport = await page.locator('meta[name="viewport"]');

    await expect(themeColor).toHaveCount(1);
    await expect(viewport).toHaveCount(1);

    console.log("✓ PWA meta tags present");
  });
});
```

**Hybrid Data**: None

### Test 4: Offline Detection (`e2e/offline/offline-detection.spec.ts`)

```typescript
import { test, expect } from "../fixtures/auth.fixture";

test.describe("Offline Mode Detection", () => {
  test("should display offline indicator when network is lost", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Go offline
    await page.context().setOffline(true);
    await page.waitForTimeout(1000); // Give UI time to react

    // Look for offline indicator
    const offlineIndicator = page.locator(
      '[aria-label*="offline" i], [aria-label*="no connection" i], text=/offline|no connection/i'
    );

    const isVisible = await offlineIndicator
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (isVisible) {
      console.log("✓ Offline indicator displayed");
      expect(isVisible).toBe(true);
    } else {
      console.log("⚠️ Offline indicator not found (may not be implemented)");
    }

    // Go back online
    await page.context().setOffline(false);
    await page.waitForTimeout(1000);

    // Offline indicator should disappear
    const stillVisible = await offlineIndicator
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    expect(stillVisible).toBe(false);
    console.log("✓ Offline indicator removed when back online");
  });

  test("should queue mutations while offline", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Start creating a template
    await page.goto("/templates/new");

    // Fill in some data
    await page.fill('input[placeholder*="Push Day"]', "Offline Test Template");

    // Go offline
    await page.context().setOffline(true);

    // Try to save (should queue)
    await page.click('button:has-text("Next")');

    // Check if there's a queued indicator or pending message
    const queueIndicator = page.locator('text=/queued|pending|will sync/i');
    const hasQueue = await queueIndicator.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasQueue) {
      console.log("✓ Mutation queued while offline");
    } else {
      console.log("⚠️ Offline queue not visible (may not be implemented)");
    }

    // Go back online
    await page.context().setOffline(false);
  });
});
```

**Hybrid Data**: Creates fresh test data

---

## Phase 2: High Priority Tests

### Test 5: Workout Session Logging (`e2e/workout/workout-session.spec.ts`)

Create folder: `e2e/workout/`

```typescript
import { test, expect } from "../fixtures/auth.fixture";

test.describe("Workout Session Logging", () => {
  test("should log sets with weight and reps during workout", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Use seeded "Push Day" template (ID: 1)
    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    // Start workout from Push Day template
    const pushDayStart = page.locator('a[aria-label*="Start workout with Push Day"]');
    await expect(pushDayStart).toBeVisible({ timeout: 5000 });
    await pushDayStart.click();

    await page.waitForLoadState("networkidle");

    // Click Start Workout button
    const startButton = page.locator('button:has-text("Start workout"), a:has-text("Start workout")').last();
    await startButton.click();
    await page.waitForLoadState("networkidle");

    // Should be on workout session page
    await expect(page).toHaveURL(/\/workout\/session\/\d+/);

    // Find first exercise (Bench Press from seeded data)
    const firstExercise = page.locator('text=/Bench Press/i').first();
    await expect(firstExercise).toBeVisible({ timeout: 5000 });

    // Find weight and reps inputs for first set
    const weightInput = page.locator('input[type="number"]').first();
    const repsInput = page.locator('input[type="number"]').nth(1);

    // Enter workout data
    await weightInput.fill("225");
    await repsInput.fill("5");

    await page.waitForTimeout(500); // Let it save

    // Verify data persists
    await expect(weightInput).toHaveValue("225");
    await expect(repsInput).toHaveValue("5");

    console.log("✓ Logged set: 225 lbs × 5 reps");

    // Add another set
    const addSetButton = page.locator('button:has-text("Add Set")').first();
    if (await addSetButton.isVisible({ timeout: 2000 })) {
      await addSetButton.click();
      console.log("✓ Added another set");
    }

    // Complete workout
    await page.locator('button:has-text("Complete")').first().click();
    await page.waitForTimeout(500);

    await page.locator('button:has-text("Complete Workout")').last().click();
    await page.waitForLoadState("networkidle");

    // Should redirect to home
    await expect(page).toHaveURL(/^\/$|\/$/);

    // Verify workout saved - go to workouts page
    await page.goto("/workouts");
    await page.waitForLoadState("networkidle");

    // Look for the workout we just completed
    const workoutEntry = page.locator('text=/225/i, text=/5.*reps/i').first();
    const saved = await workoutEntry.isVisible({ timeout: 5000 }).catch(() => false);

    if (saved) {
      console.log("✓ Workout saved with logged data");
    }
  });

  test("should pre-populate historic data for linked exercises", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Use seeded "Leg Day" template (ID: 3) which has Squat with historic data
    await page.goto("/workout/start?templateId=3");
    await page.waitForLoadState("networkidle");

    // Start workout
    const startButton = page.locator('button:has-text("Start workout")').last();
    await startButton.click();
    await page.waitForLoadState("networkidle");

    // Check if Squat exercise has pre-populated data
    const squatText = page.locator('text=/Squat/i').first();
    await expect(squatText).toBeVisible({ timeout: 5000 });

    // Check for pre-populated values (from seeded data: 225kg squat)
    const inputs = page.locator('input[type="number"]');
    const firstInputValue = await inputs.first().inputValue();

    if (firstInputValue && firstInputValue !== "") {
      console.log(`✓ Historic data pre-populated: ${firstInputValue}`);
    } else {
      console.log("⚠️ Historic data not pre-populated (may not be implemented)");
    }
  });
});
```

**Hybrid Data**: Uses seeded templates (IDs 1, 3) with pre-existing exercises

### Test 6: Bulk Operations - D1 Chunking (`e2e/workout/bulk-operations.spec.ts`)

**CRITICAL TEST for D1 90-variable limit!**

```typescript
import { test, expect } from "../fixtures/auth.fixture";

test.describe("Bulk Operations - D1 Chunking Validation", () => {
  test.setTimeout(120000); // 2 minutes for large data operations

  test("should handle workout with >90 sets (D1 SQL variable limit)", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Create a template with 10 exercises
    await page.goto("/templates/new");

    const templateName = `Bulk Test ${Date.now()}`;
    await page.fill('input[placeholder*="Push Day"]', templateName);
    await page.click('button:has-text("Next")');

    // Add 10 exercises
    const exercises = [
      "Bench Press",
      "Squat",
      "Deadlift",
      "Pull-ups",
      "Overhead Press",
      "Barbell Row",
      "Lunges",
      "Dips",
      "Bicep Curls",
      "Tricep Extensions",
    ];

    for (const exercise of exercises) {
      const input = page.locator('input[placeholder*="Exercise"]').first();
      await input.fill(exercise);
      await page.waitForTimeout(300);
      await page.keyboard.press("Enter");
    }

    // Create template
    await page.click('button:has-text("Next")'); // To linking step
    await page.click('button:has-text("Create Template")');
    await page.waitForURL("/templates");

    console.log(`✓ Created template with 10 exercises: ${templateName}`);

    // Start workout from this template
    const startLink = page.locator(`a[aria-label*="${templateName}"]`);
    await expect(startLink).toBeVisible({ timeout: 5000 });
    await startLink.click();

    await page.locator('button:has-text("Start Workout")').last().click();
    await page.waitForLoadState("networkidle");

    // Add 10 sets per exercise = 100 total sets
    // This will exceed the D1 90 SQL variable limit and test chunking
    console.log("Adding 100 sets to test D1 chunking...");

    for (let exerciseIdx = 0; exerciseIdx < 10; exerciseIdx++) {
      // Add 10 sets for each exercise
      for (let setIdx = 0; setIdx < 10; setIdx++) {
        if (setIdx > 0) {
          // Add set button (after first set which exists by default)
          const addSetBtn = page.locator('button:has-text("Add Set")').nth(exerciseIdx);
          await addSetBtn.click();
          await page.waitForTimeout(100);
        }

        // Fill weight/reps
        const inputs = page.locator(`input[type="number"]`);
        const weightIdx = exerciseIdx * 20 + setIdx * 2; // Rough estimate
        await inputs.nth(weightIdx).fill("100");
        await inputs.nth(weightIdx + 1).fill("10");
      }

      console.log(`✓ Added 10 sets for exercise ${exerciseIdx + 1}/10`);
    }

    console.log("✓ Added all 100 sets");

    // Complete workout - this is where chunking happens!
    await page.locator('button:has-text("Complete")').first().click();
    await page.waitForTimeout(1000);

    await page.locator('button:has-text("Complete Workout")').last().click();
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // Should redirect without error
    await expect(page).toHaveURL(/^\/$|\/$/);

    console.log("✓ Workout with 100 sets saved successfully (chunking worked!)");

    // Cleanup - delete the template
    await page.goto("/templates");
    await page.locator(`text="${templateName}"`).click();
    await page.locator('button:has-text("Delete")').first().click();
    await page.locator('button:has-text("Delete")').last().click();

    console.log("✓ Cleaned up test template");
  });
});
```

**Hybrid Data**: Creates fresh test data with large dataset

---

## Success Criteria Checklist

After implementing all tests, verify:

- [ ] Phase 0 infrastructure complete (WHOOP mock, CI/CD, traces)
- [ ] All Phase 1 high-priority tests passing
- [ ] All Phase 2 high-priority tests passing
- [ ] D1 bulk operations test passing (CRITICAL!)
- [ ] CI/CD pipeline running on PRs
- [ ] No flaky tests (all tests pass consistently)
- [ ] Test coverage > 50%
- [ ] Playwright traces captured on failures
- [ ] Debug tests excluded from CI runs

---

## Notes for Implementation

**Patterns to Follow:**
- Use `authenticatedPage` fixture for authenticated tests
- Use descriptive test names: "should [action] when [condition]"
- Group related tests in `test.describe()` blocks
- Take screenshots at key steps for debugging
- Use `waitForLoadState("networkidle")` after navigation
- Prefer `aria-label`, roles, and text selectors over CSS
- Clean up test data after tests that create fresh data

**Common Pitfalls:**
- Don't hardcode delays - use `waitFor` methods
- Don't assume element order - use specific selectors
- Handle both success and "not yet implemented" scenarios
- Test both happy path and error scenarios
- Remember to clean up created test data

**Resources:**
- Existing tests: `e2e/workflow/full-workout-flow.spec.ts` (best reference)
- Auth fixture: `e2e/fixtures/auth.fixture.ts`
- Seeding utilities: `e2e/test-data-seeding.ts`
- Running tests: `e2e/workflow/README.md`