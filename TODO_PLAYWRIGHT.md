# Playwright E2E Testing Implementation Plan

## Quick Reference

**Priority Coverage (Phase 1):**
1. 🔐 **Login and Authentication** - WorkOS OAuth flows (5 tests)
2. 📝 **Template Creation & Exercise Linking** - Template CRUD operations (5 tests)
3. 🏋️ **Workout Session Completion** - `/workout/session/[id]` flow (6 tests)

**Total:** 16 E2E tests covering core user journeys

**Tech Stack:**
- Framework: Playwright with TypeScript
- Test Runner: `bun run test:e2e`
- Environment: Local dev server (port 3000)
- CI/CD: GitHub Actions
- Agent: Playwright MCP for automated test maintenance

**Timeline:** 4 weeks to complete Phase 1

---

## Overview

This document provides a complete implementation plan for adding Playwright E2E testing to Swole Tracker. The plan prioritizes the following coverage in this order:

1. **Login and Authentication** - WorkOS auth flows
2. **Template Creation and Exercise Linking** - Creating templates with exercises
3. **Workout Session Completion** - Full `/workout/session/[id]` flow from start to finish

Additional coverage (offline functionality, mobile UX, etc.) can be added in later stages after these core flows are validated.

The plan uses the **local dev server** for test execution and includes a **comprehensive Playwright MCP agent workflow** for automated test maintenance.

## Current State

### Existing Test Infrastructure
- **Framework**: Vitest v3.2.4 with 56+ unit tests
- **Coverage**: 43% lines, 41% functions, 34% branches, 42% statements
- **Test Location**: `src/__tests__/`
- **Patterns**: Factory-based mocking, MSW for HTTP mocking
- **CI/CD**: GitHub Actions runs `bun run test` on all branches
- **Dev Server**: Next.js on port 3000 (`bun dev:next`)

### Testing Gaps
- ❌ No E2E browser automation tests
- ❌ User authentication flows not validated end-to-end
- ❌ Offline sync behavior only unit tested, not in real browser
- ❌ Form submissions and navigation not tested
- ❌ Mobile responsiveness and touch interactions not validated
- ❌ Real database operations mocked, not tested against D1

## Phase 1: Foundation Setup

### 1.1 Install Playwright

```bash
bun add -D @playwright/test
bunx playwright install chromium  # Mobile Chrome for gym-like testing
```

### 1.2 Create Playwright Configuration

**File**: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['github'], // For CI annotations
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Desktop testing
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Mobile testing (primary - gym use case)
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Start dev server automatically
  webServer: {
    command: 'bun dev:next',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

### 1.3 Create Directory Structure

```bash
mkdir -p e2e/{fixtures,helpers,workout,offline}
```

**Structure**:
```
swole-tracker/
├── e2e/
│   ├── fixtures/
│   │   ├── auth.fixture.ts       # WorkOS auth helpers
│   │   ├── db.fixture.ts         # Test data seeding
│   │   └── offline.fixture.ts    # Network mocking
│   ├── helpers/
│   │   ├── workout-actions.ts    # Reusable workout operations
│   │   └── assertions.ts         # Custom matchers
│   ├── workout/
│   │   ├── create-workout.spec.ts
│   │   ├── edit-workout.spec.ts
│   │   └── save-workout.spec.ts
│   ├── offline/
│   │   ├── queue-operations.spec.ts
│   │   └── sync-conflict.spec.ts
│   └── global-setup.ts           # CI prep, auth setup
├── playwright.config.ts
└── playwright-report/             # Generated artifacts
```

### 1.4 Add Scripts to package.json

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:mobile": "playwright test --project=mobile",
    "test:e2e:headed": "playwright test --headed",
    "test:all": "bun run test && bun run test:e2e"
  }
}
```

### 1.5 Create Global Setup (Optional)

**File**: `e2e/global-setup.ts`

```typescript
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Optional: Set up test database, seed initial data, etc.
  console.log('Running global E2E setup...');

  // Example: Verify dev server is responding
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(config.projects[0].use.baseURL!);
  await page.close();
  await browser.close();

  console.log('Global E2E setup complete');
}

export default globalSetup;
```

Update `playwright.config.ts` to use it:
```typescript
export default defineConfig({
  // ... other config
  globalSetup: './e2e/global-setup.ts',
});
```

## Phase 2: Core User Flows (Priority Order)

### Priority #1: Login and Authentication

The authentication flow is the foundation for all other tests. We need to validate the complete WorkOS authentication flow.

#### 2.1.1 Test Suite: Authentication Flows

**File**: `e2e/auth/login.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect unauthenticated user to login', async ({ page }) => {
    // Navigate to protected route
    await page.goto('/dashboard');

    // Should redirect to WorkOS auth
    await page.waitForURL(/.*authorize.*/);
    expect(page.url()).toContain('authorize');
  });

  test('should complete WorkOS OAuth flow', async ({ page }) => {
    // Start at home
    await page.goto('/');

    // Click sign in
    await page.click('[data-testid="sign-in"]');

    // Should redirect to WorkOS
    await page.waitForURL(/.*workos.*/);

    // TODO: Implement WorkOS test account flow
    // Option 1: Use WorkOS test mode credentials
    // Option 2: Mock WorkOS callback with valid tokens
    // Option 3: Use MSW to intercept WorkOS API calls

    // For now, we'll mock the callback
    // After successful auth, WorkOS redirects to /api/auth/callback?code=...
    await page.goto('/api/auth/callback?code=test_authorization_code');

    // Should redirect to dashboard after auth
    await page.waitForURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should logout user successfully', async ({ page }) => {
    // TODO: First authenticate (will use fixture once created)

    await page.goto('/dashboard');

    // Click user menu
    await page.click('[data-testid="user-menu"]');

    // Click logout
    await page.click('[data-testid="logout"]');

    // Should redirect to home and clear auth
    await page.waitForURL('/');
    await expect(page.locator('[data-testid="sign-in"]')).toBeVisible();

    // Verify auth cleared
    const hasAuthToken = await page.evaluate(() => {
      return localStorage.getItem('auth_token') !== null;
    });
    expect(hasAuthToken).toBe(false);
  });

  test('should persist session across page reloads', async ({ page }) => {
    // TODO: Authenticate user

    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    // Reload page
    await page.reload();

    // Should still be authenticated
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    expect(page.url()).toContain('/dashboard');
  });

  test('should handle invalid auth token', async ({ page }) => {
    // Set invalid token
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'invalid-token-xyz');
    });

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to login
    await page.waitForURL(/.*authorize.*/);
  });
});
```

#### 2.1.2 Create Authentication Fixture

**File**: `e2e/fixtures/auth.fixture.ts`

```typescript
import { test as base, expect } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: any;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to app
    await page.goto('/');

    // Option 1: Mock WorkOS auth by intercepting API calls
    await page.route('**/api/auth/**', async (route) => {
      const url = route.request().url();

      if (url.includes('/api/auth/session')) {
        // Return mock session
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'test-user-123',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
            },
            accessToken: 'mock-access-token',
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Set auth tokens in localStorage
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-access-token');
      localStorage.setItem('user_id', 'test-user-123');
    });

    // Navigate to dashboard to verify auth works
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 10000 });

    await use(page);

    // Cleanup after test
    await page.evaluate(() => localStorage.clear());
  },
});

export { expect };
```

**Note**: The exact implementation will depend on how WorkOS auth is currently set up. You may need to:
- Use actual WorkOS test credentials
- Mock the WorkOS OAuth flow
- Intercept tRPC auth endpoints
- Use existing MSW handlers from `src/__tests__/mocks/workos-auth.ts`

### Priority #2: Template Creation and Exercise Linking

Once authentication works, the next critical flow is creating workout templates and linking exercises.

#### 2.2.1 Test Suite: Template Creation

**File**: `e2e/templates/create-template.spec.ts`

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Template Creation', () => {
  test('should create a new empty template', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to templates page
    await page.goto('/templates');
    await expect(page.locator('h1')).toContainText('Templates');

    // Click create new template
    await page.click('[data-testid="create-template"]');

    // Fill template details
    await page.fill('[data-testid="template-name"]', 'Push Day');
    await page.fill('[data-testid="template-description"]', 'Chest, shoulders, triceps workout');

    // Save template
    await page.click('[data-testid="save-template"]');

    // Verify success
    await expect(page.locator('text=Template created')).toBeVisible();

    // Verify template appears in list
    await page.goto('/templates');
    await expect(page.locator('[data-testid="template-item"]')).toContainText('Push Day');
  });

  test('should add exercises to template', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Create template first
    await page.goto('/templates');
    await page.click('[data-testid="create-template"]');
    await page.fill('[data-testid="template-name"]', 'Leg Day');
    await page.click('[data-testid="save-template"]');

    // Now on template edit page
    await expect(page.locator('h1')).toContainText('Leg Day');

    // Add first exercise
    await page.click('[data-testid="add-exercise"]');

    // Search for exercise
    await page.fill('[data-testid="exercise-search"]', 'Squat');

    // Wait for search results
    await page.waitForSelector('[data-testid="exercise-result"]');

    // Select "Barbell Squat"
    await page.click('[data-testid="exercise-result-Barbell Squat"]');

    // Verify exercise added to template
    await expect(page.locator('[data-exercise="Barbell Squat"]')).toBeVisible();

    // Add second exercise
    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Leg Press');
    await page.click('[data-testid="exercise-result-Leg Press"]');

    // Verify both exercises in template
    await expect(page.locator('[data-exercise="Barbell Squat"]')).toBeVisible();
    await expect(page.locator('[data-exercise="Leg Press"]')).toBeVisible();

    // Save template
    await page.click('[data-testid="save-template"]');
    await expect(page.locator('text=Template saved')).toBeVisible();
  });

  test('should configure exercise details in template', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Create template and add exercise
    await page.goto('/templates');
    await page.click('[data-testid="create-template"]');
    await page.fill('[data-testid="template-name"]', 'Bench Focus');
    await page.click('[data-testid="save-template"]');

    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Bench Press');
    await page.click('[data-testid="exercise-result-Bench Press"]');

    // Configure exercise (e.g., suggested sets, reps, rest time)
    const exercise = page.locator('[data-exercise="Bench Press"]');

    // Set suggested sets
    await exercise.locator('[data-testid="suggested-sets"]').fill('4');

    // Set suggested reps
    await exercise.locator('[data-testid="suggested-reps"]').fill('8');

    // Set rest time
    await exercise.locator('[data-testid="rest-time"]').fill('90');

    // Add notes
    await exercise.locator('[data-testid="exercise-notes"]').fill('Focus on controlled eccentric');

    // Save
    await page.click('[data-testid="save-template"]');

    // Reload and verify persistence
    await page.reload();
    await expect(exercise.locator('[data-testid="suggested-sets"]')).toHaveValue('4');
    await expect(exercise.locator('[data-testid="suggested-reps"]')).toHaveValue('8');
  });

  test('should reorder exercises in template', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Create template with multiple exercises
    await page.goto('/templates');
    await page.click('[data-testid="create-template"]');
    await page.fill('[data-testid="template-name"]', 'Full Body');
    await page.click('[data-testid="save-template"]');

    // Add 3 exercises
    const exercises = ['Squat', 'Bench Press', 'Deadlift'];
    for (const exercise of exercises) {
      await page.click('[data-testid="add-exercise"]');
      await page.fill('[data-testid="exercise-search"]', exercise);
      await page.click(`[data-testid="exercise-result-${exercise}"]`);
    }

    // Verify initial order
    const exerciseList = page.locator('[data-testid="exercise-item"]');
    await expect(exerciseList.nth(0)).toContainText('Squat');
    await expect(exerciseList.nth(1)).toContainText('Bench Press');
    await expect(exerciseList.nth(2)).toContainText('Deadlift');

    // Drag Deadlift to first position
    const deadlift = page.locator('[data-exercise="Deadlift"]');
    const squat = page.locator('[data-exercise="Squat"]');
    await deadlift.dragTo(squat);

    // Verify new order
    await expect(exerciseList.nth(0)).toContainText('Deadlift');
    await expect(exerciseList.nth(1)).toContainText('Squat');
    await expect(exerciseList.nth(2)).toContainText('Bench Press');

    // Save and verify persistence
    await page.click('[data-testid="save-template"]');
    await page.reload();
    await expect(exerciseList.nth(0)).toContainText('Deadlift');
  });

  test('should delete exercise from template', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Create template with 2 exercises
    await page.goto('/templates');
    await page.click('[data-testid="create-template"]');
    await page.fill('[data-testid="template-name"]', 'Upper Body');
    await page.click('[data-testid="save-template"]');

    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Bench Press');
    await page.click('[data-testid="exercise-result-Bench Press"]');

    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Row');
    await page.click('[data-testid="exercise-result-Row"]');

    // Delete Bench Press
    await page.locator('[data-exercise="Bench Press"]')
      .locator('[data-testid="delete-exercise"]')
      .click();

    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]');

    // Verify only Row remains
    await expect(page.locator('[data-exercise="Bench Press"]')).not.toBeVisible();
    await expect(page.locator('[data-exercise="Row"]')).toBeVisible();
  });
});
```

### Priority #3: Workout Session Completion

The most critical flow: starting a workout session from a template and completing it end-to-end.

#### 2.3.1 Test Suite: Complete Workout Session

**File**: `e2e/workout/session-complete.spec.ts`

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Complete Workout Session (/workout/session/[id])', () => {
  test('should start session from template and complete workout', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Setup: Create a template first
    await page.goto('/templates');
    await page.click('[data-testid="create-template"]');
    await page.fill('[data-testid="template-name"]', 'Push Day');
    await page.click('[data-testid="save-template"]');

    // Add exercises to template
    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Bench Press');
    await page.click('[data-testid="exercise-result-Bench Press"]');

    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Overhead Press');
    await page.click('[data-testid="exercise-result-Overhead Press"]');

    await page.click('[data-testid="save-template"]');

    // Now start a workout session from this template
    await page.goto('/templates');
    await page.click('[data-testid="template-item-Push Day"]');

    // Click "Start Workout" button
    await page.click('[data-testid="start-workout-from-template"]');

    // Should navigate to /workout/session/[id]
    await page.waitForURL(/\/workout\/session\/\w+/);
    const sessionUrl = page.url();
    const sessionId = sessionUrl.split('/').pop();

    // Verify we're in an active session
    await expect(page.locator('[data-testid="active-session-indicator"]')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Push Day');

    // Verify exercises loaded
    await expect(page.locator('[data-exercise="Bench Press"]')).toBeVisible();
    await expect(page.locator('[data-exercise="Overhead Press"]')).toBeVisible();

    // Log sets for Bench Press
    const benchPress = page.locator('[data-exercise="Bench Press"]');

    // Set 1
    await benchPress.locator('[data-testid="add-set"]').click();
    await benchPress.locator('[data-testid="weight-input"]').last().fill('185');
    await benchPress.locator('[data-testid="reps-input"]').last().fill('8');
    await benchPress.locator('[data-testid="complete-set"]').last().click();

    // Verify set appears as completed
    await expect(benchPress.locator('[data-testid="set-row"]').last()).toHaveClass(/completed/);

    // Set 2
    await benchPress.locator('[data-testid="add-set"]').click();
    await benchPress.locator('[data-testid="weight-input"]').last().fill('185');
    await benchPress.locator('[data-testid="reps-input"]').last().fill('7');
    await benchPress.locator('[data-testid="complete-set"]').last().click();

    // Set 3
    await benchPress.locator('[data-testid="add-set"]').click();
    await benchPress.locator('[data-testid="weight-input"]').last().fill('185');
    await benchPress.locator('[data-testid="reps-input"]').last().fill('6');
    await benchPress.locator('[data-testid="complete-set"]').last().click();

    // Log sets for Overhead Press
    const overheadPress = page.locator('[data-exercise="Overhead Press"]');

    await overheadPress.locator('[data-testid="add-set"]').click();
    await overheadPress.locator('[data-testid="weight-input"]').last().fill('95');
    await overheadPress.locator('[data-testid="reps-input"]').last().fill('10');
    await overheadPress.locator('[data-testid="complete-set"]').last().click();

    await overheadPress.locator('[data-testid="add-set"]').click();
    await overheadPress.locator('[data-testid="weight-input"]').last().fill('95');
    await overheadPress.locator('[data-testid="reps-input"]').last().fill('9');
    await overheadPress.locator('[data-testid="complete-set"]').last().click();

    // Complete the workout
    await page.click('[data-testid="finish-workout"]');

    // Should show completion confirmation
    await expect(page.locator('[data-testid="workout-summary"]')).toBeVisible();

    // Verify summary statistics
    await expect(page.locator('[data-testid="total-sets"]')).toContainText('5');
    await expect(page.locator('[data-testid="total-volume"]')).toBeVisible();

    // Save workout
    await page.click('[data-testid="save-workout"]');

    // Should redirect to workout history or dashboard
    await page.waitForURL(/\/(history|dashboard)/);

    // Verify workout appears in history
    await page.goto('/history');
    await expect(page.locator('[data-testid="workout-item"]').first()).toContainText('Push Day');
  });

  test('should auto-save progress during session', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Start a workout session (simplified setup)
    await page.goto('/workout/new');
    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Squat');
    await page.click('[data-testid="exercise-result-Squat"]');

    // Should create a session
    await page.waitForURL(/\/workout\/session\/\w+/);
    const sessionId = page.url().split('/').pop();

    // Add a set
    await page.locator('[data-testid="add-set"]').click();
    await page.locator('[data-testid="weight-input"]').last().fill('225');
    await page.locator('[data-testid="reps-input"]').last().fill('5');

    // Verify auto-save indicator
    await expect(page.locator('[data-testid="auto-save-status"]')).toContainText('Saved');

    // Reload page to verify persistence
    await page.reload();

    // Session should still be active
    await expect(page.locator('[data-exercise="Squat"]')).toBeVisible();
    await expect(page.locator('[data-testid="weight-input"]')).toHaveValue('225');
    await expect(page.locator('[data-testid="reps-input"]')).toHaveValue('5');
  });

  test('should handle rest timer between sets', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Setup session with exercise
    await page.goto('/workout/new');
    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Deadlift');
    await page.click('[data-testid="exercise-result-Deadlift"]');
    await page.waitForURL(/\/workout\/session\/\w+/);

    // Complete a set
    await page.locator('[data-testid="add-set"]').click();
    await page.locator('[data-testid="weight-input"]').last().fill('315');
    await page.locator('[data-testid="reps-input"]').last().fill('5');
    await page.locator('[data-testid="complete-set"]').last().click();

    // Rest timer should appear
    await expect(page.locator('[data-testid="rest-timer"]')).toBeVisible();

    // Timer should be counting down (e.g., from 180 seconds)
    const timerText = await page.locator('[data-testid="rest-timer"]').textContent();
    expect(timerText).toMatch(/\d+:\d+/); // MM:SS format

    // Skip rest (optional interaction)
    await page.click('[data-testid="skip-rest"]');
    await expect(page.locator('[data-testid="rest-timer"]')).not.toBeVisible();
  });

  test('should edit/delete sets during session', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Setup session
    await page.goto('/workout/new');
    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Bench Press');
    await page.click('[data-testid="exercise-result-Bench Press"]');
    await page.waitForURL(/\/workout\/session\/\w+/);

    // Add two sets
    await page.locator('[data-testid="add-set"]').click();
    await page.locator('[data-testid="weight-input"]').last().fill('185');
    await page.locator('[data-testid="reps-input"]').last().fill('8');

    await page.locator('[data-testid="add-set"]').click();
    await page.locator('[data-testid="weight-input"]').last().fill('205');
    await page.locator('[data-testid="reps-input"]').last().fill('5');

    // Edit first set
    await page.locator('[data-testid="set-row"]').first()
      .locator('[data-testid="weight-input"]')
      .fill('195');

    await expect(page.locator('[data-testid="auto-save-status"]')).toContainText('Saved');

    // Delete second set
    await page.locator('[data-testid="set-row"]').nth(1)
      .locator('[data-testid="delete-set"]')
      .click();

    // Verify only 1 set remains
    await expect(page.locator('[data-testid="set-row"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="weight-input"]')).toHaveValue('195');
  });

  test('should add exercise mid-session', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Start session with one exercise
    await page.goto('/workout/new');
    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Squat');
    await page.click('[data-testid="exercise-result-Squat"]');
    await page.waitForURL(/\/workout\/session\/\w+/);

    // Add another exercise mid-session
    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Leg Press');
    await page.click('[data-testid="exercise-result-Leg Press"]');

    // Verify both exercises visible
    await expect(page.locator('[data-exercise="Squat"]')).toBeVisible();
    await expect(page.locator('[data-exercise="Leg Press"]')).toBeVisible();
  });

  test('should discard session without saving', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Start session and log data
    await page.goto('/workout/new');
    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Bench Press');
    await page.click('[data-testid="exercise-result-Bench Press"]');
    await page.waitForURL(/\/workout\/session\/\w+/);

    await page.locator('[data-testid="add-set"]').click();
    await page.locator('[data-testid="weight-input"]').last().fill('185');
    await page.locator('[data-testid="reps-input"]').last().fill('8');

    // Discard session
    await page.click('[data-testid="discard-workout"]');

    // Confirm discard
    await page.click('[data-testid="confirm-discard"]');

    // Should redirect away from session
    await page.waitForURL(/\/(dashboard|templates)/);

    // Verify workout not in history
    await page.goto('/history');
    const workoutItems = page.locator('[data-testid="workout-item"]');
    const count = await workoutItems.count();

    // If there are workouts, verify this one isn't there
    if (count > 0) {
      const firstWorkout = await workoutItems.first().textContent();
      expect(firstWorkout).not.toContain('Bench Press');
    }
  });
});
```

### 2.4 Test Suite 2: In-Session Operations

**File**: `e2e/workout/edit-workout.spec.ts`

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Active Workout Session', () => {
  test('should log sets progressively with auto-save', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/workout/new');
    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Deadlift');
    await page.click('[data-testid="exercise-result-Deadlift"]');

    // Add multiple sets with progressive overload
    const weights = [225, 275, 315, 365];
    for (const weight of weights) {
      await page.click('[data-testid="add-set"]');
      await page.fill('[data-testid="weight-input"]', weight.toString());
      await page.fill('[data-testid="reps-input"]', '5');

      // Verify auto-save indicator
      await expect(page.locator('[data-testid="auto-save-status"]')).toContainText('Saved');
    }

    // Verify all sets are displayed
    const setRows = page.locator('[data-testid="set-row"]');
    await expect(setRows).toHaveCount(4);
  });

  test('should reorder exercises via drag-drop', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Setup: Create workout with 3 exercises
    await page.goto('/workout/new');
    const exercises = ['Squat', 'Bench Press', 'Deadlift'];
    for (const exercise of exercises) {
      await page.click('[data-testid="add-exercise"]');
      await page.fill('[data-testid="exercise-search"]', exercise);
      await page.click(`[data-testid="exercise-result-${exercise}"]`);
    }

    // Drag Deadlift to first position
    const deadlift = page.locator('[data-exercise="Deadlift"]');
    const squat = page.locator('[data-exercise="Squat"]');

    await deadlift.dragTo(squat);

    // Verify new order
    const exerciseList = page.locator('[data-testid="exercise-item"]');
    await expect(exerciseList.nth(0)).toContainText('Deadlift');
    await expect(exerciseList.nth(1)).toContainText('Squat');
    await expect(exerciseList.nth(2)).toContainText('Bench Press');
  });

  test('should remove exercise mid-session', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/workout/new');

    // Add 2 exercises
    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Squat');
    await page.click('[data-testid="exercise-result-Squat"]');

    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Bench Press');
    await page.click('[data-testid="exercise-result-Bench Press"]');

    // Delete first exercise
    await page.locator('[data-exercise="Squat"]').locator('[data-testid="delete-exercise"]').click();

    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]');

    // Verify only Bench Press remains
    await expect(page.locator('[data-exercise="Squat"]')).not.toBeVisible();
    await expect(page.locator('[data-exercise="Bench Press"]')).toBeVisible();
  });
});
```

### 2.5 Test Suite 3: Mobile UX & Touch

**File**: `e2e/workout/mobile-ux.spec.ts`

```typescript
import { test, expect, devices } from '@playwright/test';
import { test as authTest } from '../fixtures/auth.fixture';

const mobileTest = authTest.extend({
  // Force mobile viewport
  viewport: { width: 390, height: 844 }, // iPhone 12 Pro
  isMobile: true,
});

mobileTest.describe('Mobile Workout UX', () => {
  mobileTest('should have touch-friendly targets (44x44px minimum)', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/workout/new');
    await page.click('[data-testid="add-exercise"]');

    // Verify button sizes meet accessibility requirements
    const addButton = page.locator('[data-testid="add-set"]');
    const box = await addButton.boundingBox();

    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  mobileTest('should adjust weight with +/- buttons', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/workout/new');
    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Squat');
    await page.click('[data-testid="exercise-result-Squat"]');
    await page.click('[data-testid="add-set"]');

    // Test increment button
    const weightInput = page.locator('[data-testid="weight-input"]');
    await weightInput.fill('135');

    await page.click('[data-testid="weight-increment"]');
    await expect(weightInput).toHaveValue('140'); // Assumes 5lb increments

    await page.click('[data-testid="weight-decrement"]');
    await expect(weightInput).toHaveValue('135');
  });

  mobileTest('should swipe to delete set', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/workout/new');
    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Bench Press');
    await page.click('[data-testid="exercise-result-Bench Press"]');

    // Add two sets
    await page.click('[data-testid="add-set"]');
    await page.click('[data-testid="add-set"]');

    // Swipe left on second set
    const setRow = page.locator('[data-testid="set-row"]').nth(1);
    const box = await setRow.boundingBox();

    if (box) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await page.touchscreen.swipe(
        { x: box.x + box.width - 10, y: box.y + box.height / 2 },
        { x: box.x + 10, y: box.y + box.height / 2 }
      );
    }

    // Tap delete button that appears
    await page.click('[data-testid="delete-set-button"]');

    // Verify only 1 set remains
    await expect(page.locator('[data-testid="set-row"]')).toHaveCount(1);
  });
});
```

## Phase 3: Additional Coverage (Future Work)

The following test suites can be implemented after the core flows are validated:

### 3.1 Offline Functionality E2E Tests

### 3.1 Create Offline Fixture

**File**: `e2e/fixtures/offline.fixture.ts`

```typescript
import { test as base, BrowserContext } from '@playwright/test';

type OfflineFixtures = {
  offline: void;
  slowNetwork: void;
  goOffline: () => Promise<void>;
  goOnline: () => Promise<void>;
};

export const test = base.extend<OfflineFixtures>({
  offline: async ({ context }, use) => {
    await context.setOffline(true);
    await use();
    await context.setOffline(false);
  },

  slowNetwork: async ({ context }, use) => {
    // Simulate slow 3G
    await context.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });
    await use();
  },

  goOffline: async ({ context }, use) => {
    const setOffline = async () => {
      await context.setOffline(true);
    };
    await use(setOffline);
  },

  goOnline: async ({ context }, use) => {
    const setOnline = async () => {
      await context.setOffline(false);
    };
    await use(setOnline);
  },
});
```

### 3.2 Test Suite 1: Queue Operations

**File**: `e2e/offline/queue-operations.spec.ts`

```typescript
import { test as authTest, expect } from '../fixtures/auth.fixture';
import { test as offlineTest } from '../fixtures/offline.fixture';

// Combine fixtures
const test = authTest.extend(offlineTest._extendTest);

test.describe('Offline Queue', () => {
  test('should queue workout save when offline', async ({ authenticatedPage, goOffline, goOnline }) => {
    const page = authenticatedPage;

    // 1. Create a workout while online
    await page.goto('/workout/new');
    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Squat');
    await page.click('[data-testid="exercise-result-Squat"]');
    await page.click('[data-testid="add-set"]');
    await page.fill('[data-testid="weight-input"]', '225');
    await page.fill('[data-testid="reps-input"]', '5');

    // 2. Go offline
    await goOffline();

    // 3. Save workout
    await page.click('[data-testid="save-workout"]');

    // 4. Verify "Queued" indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('text=Queued for sync')).toBeVisible();

    // 5. Verify localStorage queue
    const queueSize = await page.evaluate(() => {
      const queue = localStorage.getItem('offline_queue');
      return queue ? JSON.parse(queue).length : 0;
    });
    expect(queueSize).toBe(1);

    // 6. Go online
    await goOnline();

    // 7. Verify auto-sync (wait for sync indicator)
    await expect(page.locator('text=Synced')).toBeVisible({ timeout: 10000 });

    // 8. Check queue is empty
    const queueAfterSync = await page.evaluate(() => {
      const queue = localStorage.getItem('offline_queue');
      return queue ? JSON.parse(queue).length : 0;
    });
    expect(queueAfterSync).toBe(0);

    // 9. Verify workout in history
    await page.goto('/history');
    await expect(page.locator('[data-testid="workout-item"]')).toBeVisible();
  });

  test('should queue multiple operations', async ({ authenticatedPage, goOffline, goOnline }) => {
    const page = authenticatedPage;

    // Go offline immediately
    await goOffline();

    // 1. Create template
    await page.goto('/templates/new');
    await page.fill('[data-testid="template-name"]', 'Test Template');
    await page.click('[data-testid="save-template"]');
    await expect(page.locator('text=Queued for sync')).toBeVisible();

    // 2. Create workout
    await page.goto('/workout/new');
    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Deadlift');
    await page.click('[data-testid="exercise-result-Deadlift"]');
    await page.click('[data-testid="save-workout"]');

    // 3. Edit profile
    await page.goto('/settings/profile');
    await page.fill('[data-testid="display-name"]', 'Offline User');
    await page.click('[data-testid="save-profile"]');

    // Verify queue has 3 items
    const queueSize = await page.evaluate(() => {
      const queue = localStorage.getItem('offline_queue');
      return queue ? JSON.parse(queue).length : 0;
    });
    expect(queueSize).toBe(3);

    // Go online and verify sync
    await goOnline();
    await page.waitForTimeout(5000); // Wait for sync to complete

    const queueAfterSync = await page.evaluate(() => {
      const queue = localStorage.getItem('offline_queue');
      return queue ? JSON.parse(queue).length : 0;
    });
    expect(queueAfterSync).toBe(0);
  });

  test('should handle sync failure gracefully', async ({ authenticatedPage, goOffline, goOnline }) => {
    const page = authenticatedPage;

    await goOffline();

    // Create workout
    await page.goto('/workout/new');
    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Squat');
    await page.click('[data-testid="exercise-result-Squat"]');
    await page.click('[data-testid="save-workout"]');

    // Go online but intercept API to simulate server error
    await goOnline();
    await page.route('**/api/trpc/workouts.create', route => {
      route.fulfill({ status: 500, body: 'Server Error' });
    });

    // Wait for sync attempt
    await page.waitForTimeout(3000);

    // Verify data remains queued
    const queueSize = await page.evaluate(() => {
      const queue = localStorage.getItem('offline_queue');
      return queue ? JSON.parse(queue).length : 0;
    });
    expect(queueSize).toBe(1);

    // Verify error notification
    await expect(page.locator('text=Sync failed')).toBeVisible();
  });
});
```

### 3.3 Test Suite 2: Conflict Resolution

**File**: `e2e/offline/sync-conflict.spec.ts`

```typescript
import { test as base, expect, chromium, Browser } from '@playwright/test';

test.describe('Sync Conflicts', () => {
  test('should handle edit conflict with last write wins', async () => {
    // This test simulates two devices editing the same workout offline

    const browser = await chromium.launch();

    // Device 1
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    // Device 2
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    // Both devices authenticate as same user
    // TODO: Implement shared auth setup

    // Device 1: Create workout online
    await page1.goto('http://localhost:3000/workout/new');
    await page1.click('[data-testid="add-exercise"]');
    await page1.fill('[data-testid="exercise-search"]', 'Squat');
    await page1.click('[data-testid="exercise-result-Squat"]');
    await page1.click('[data-testid="add-set"]');
    await page1.fill('[data-testid="weight-input"]', '225');
    await page1.fill('[data-testid="reps-input"]', '5');
    await page1.click('[data-testid="save-workout"]');

    const workoutId = await page1.evaluate(() => {
      // Extract workout ID from URL or localStorage
      return new URLSearchParams(window.location.search).get('id');
    });

    // Device 2: Load same workout
    await page2.goto(`http://localhost:3000/workout/${workoutId}`);

    // Both devices go offline
    await context1.setOffline(true);
    await context2.setOffline(true);

    // Device 1: Edit workout (add set)
    await page1.click('[data-testid="add-set"]');
    await page1.fill('[data-testid="weight-input"]', '245');
    await page1.fill('[data-testid="reps-input"]', '5');
    await page1.click('[data-testid="save-workout"]');

    // Device 2: Edit workout (different set)
    await page2.click('[data-testid="add-set"]');
    await page2.fill('[data-testid="weight-input"]', '265');
    await page2.fill('[data-testid="reps-input"]', '3');
    await page2.click('[data-testid="save-workout"]');

    // Device 1 comes online first
    await context1.setOffline(false);
    await page1.waitForTimeout(3000); // Wait for sync

    // Device 2 comes online (should detect conflict)
    await context2.setOffline(false);
    await page2.waitForTimeout(3000);

    // Verify conflict resolution UI or behavior
    // TODO: Define conflict resolution strategy
    // - Last write wins?
    // - Merge sets?
    // - Show conflict modal?

    await browser.close();
  });

  test('should preserve offline data on page reload', async ({ page }) => {
    await page.goto('http://localhost:3000');
    // TODO: Authenticate

    // Go offline
    await page.context().setOffline(true);

    // Create workout
    await page.goto('/workout/new');
    await page.click('[data-testid="add-exercise"]');
    await page.fill('[data-testid="exercise-search"]', 'Bench Press');
    await page.click('[data-testid="exercise-result-Bench Press"]');
    await page.click('[data-testid="save-workout"]');

    // Verify queued
    const queueBeforeReload = await page.evaluate(() => {
      const queue = localStorage.getItem('offline_queue');
      return queue ? JSON.parse(queue) : [];
    });
    expect(queueBeforeReload.length).toBe(1);

    // Reload page
    await page.reload();

    // Verify queue persists
    const queueAfterReload = await page.evaluate(() => {
      const queue = localStorage.getItem('offline_queue');
      return queue ? JSON.parse(queue) : [];
    });
    expect(queueAfterReload.length).toBe(1);
    expect(queueAfterReload[0]).toEqual(queueBeforeReload[0]);
  });
});
```

## Phase 4: CI/CD Integration

### 4.1 Update GitHub Actions

**File**: `.github/workflows/deploy.yml`

Add E2E test job after unit tests:

```yaml
jobs:
  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.2.21
      - name: Cache Bun dependencies
        uses: actions/cache@v4
        with:
          path: ~/.bun/install/cache
          key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lockb') }}
          restore-keys: |
            ${{ runner.os }}-bun-
      - run: bun install --frozen-lockfile
      - run: bun run test

  test-e2e:
    runs-on: ubuntu-latest
    needs: test-unit
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.2.21

      - name: Cache Bun dependencies
        uses: actions/cache@v4
        with:
          path: ~/.bun/install/cache
          key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lockb') }}

      - run: bun install --frozen-lockfile

      - name: Install Playwright Browsers
        run: bunx playwright install --with-deps chromium

      - name: Run E2E Tests
        run: bun run test:e2e
        env:
          # Add necessary environment variables
          # These should be configured as GitHub secrets
          DATABASE_URL: ${{ secrets.TEST_D1_URL }}
          WORKOS_CLIENT_ID: ${{ secrets.TEST_WORKOS_CLIENT_ID }}
          WORKOS_API_KEY: ${{ secrets.TEST_WORKOS_API_KEY }}
          WORKOS_REDIRECT_URI: ${{ secrets.TEST_WORKOS_REDIRECT_URI }}

      - name: Upload Playwright Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      - name: Upload Test Results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-results
          path: test-results/
          retention-days: 30

  deploy:
    runs-on: ubuntu-latest
    needs: [test-unit, test-e2e]  # Add test-e2e as dependency
    # ... rest of deploy job
```

### 4.2 Optional: Create Separate E2E Workflow

**File**: `.github/workflows/e2e.yml`

For running E2E tests on-demand or on schedule:

```yaml
name: E2E Tests

on:
  workflow_dispatch:  # Manual trigger
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
  pull_request:
    paths:
      - 'src/app/**'
      - 'e2e/**'

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        project: [chromium, mobile]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bunx playwright install --with-deps ${{ matrix.project }}
      - run: bun run test:e2e --project=${{ matrix.project }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ matrix.project }}
          path: playwright-report/
```

## Phase 5: Playwright MCP Agent Workflow

### Overview

The Playwright MCP (Model Context Protocol) agent provides automated test maintenance by analyzing failures, suggesting fixes, and in many cases, applying fixes autonomously. It operates in three modes depending on the failure complexity.

### 5.1 Agent Modes

#### Mode 1: Autonomous Fix (Simple Failures)
**Use for:**
- Selector changes (e.g., `data-testid` renamed)
- Timing issues (missing `waitFor`)
- URL/route changes
- Text content updates

**Workflow:**
1. Detect test failure in CI or local run
2. Analyze failure screenshot + trace
3. Navigate to app with Playwright MCP
4. Identify root cause (e.g., selector changed)
5. Apply fix to test file
6. Re-run test to verify
7. Report success

**Example**:
```
Test failure: "Locator [data-testid='save-workout'] not found"

Agent actions:
1. mcp.browser_navigate('http://localhost:3000/workout/new')
2. mcp.browser_snapshot() → Finds button with [aria-label='Save workout']
3. Edit e2e/workout/create-workout.spec.ts:
   - Old: await page.click('[data-testid="save-workout"]')
   - New: await page.click('[aria-label="Save workout"]')
4. Bash: bun run test:e2e -- create-workout
5. Report: "Fixed selector change, test now passes"
```

#### Mode 2: Report & Suggest (Complex Failures)
**Use for:**
- Logic errors in test assertions
- Breaking API changes
- Database state issues
- Authentication failures

**Workflow:**
1. Analyze failure context
2. Check recent code changes (git log)
3. Navigate to app and reproduce
4. Generate fix suggestions with code diffs
5. Wait for user approval
6. Apply approved fix
7. Verify and report

**Example**:
```
Test failure: "Expected workout in history, found none"

Agent analysis:
- Workout save API changed endpoint from /workouts.create to /workouts.save
- tRPC router refactored
- Test expectations still valid, but implementation changed

Suggestion:
"API endpoint changed. Update mock/fixture to match new tRPC endpoint.
Diff:
- await page.route('**/api/trpc/workouts.create', ...)
+ await page.route('**/api/trpc/workouts.save', ...)

Approve fix? [y/n]"
```

#### Mode 3: Interactive Debug (Investigation Needed)
**Use for:**
- Flaky tests (intermittent failures)
- Performance issues
- Complex state management bugs
- Race conditions

**Workflow:**
1. Run test with Playwright Inspector
2. Pause at failure point
3. Use step-through debugging
4. Analyze network requests, console logs
5. Propose debugging strategies
6. Guide manual fixes

**Example**:
```
Test failure: "Workout save succeeds 80% of the time"

Agent investigation:
1. Run test 10 times with tracing
2. Analyze timing differences
3. Check network requests
4. Finding: Race condition between IndexedDB write and API call

Suggestion:
"Add explicit wait for IndexedDB transaction to complete before asserting:
await page.waitForFunction(() => {
  return window.indexedDB.databases().then(dbs => dbs.length > 0);
});

Would you like me to add this wait?"
```

### 5.2 Invoking the Agent

**After E2E Failure:**

```bash
# Run tests locally
bun run test:e2e

# Test fails - workout/create-workout.spec.ts

# Invoke Claude Code with Playwright MCP
# (Ensure Playwright MCP server is installed and configured)
```

In Claude Code session:
```
User: "Analyze the failed E2E test for workout creation and fix it"

Agent workflow:
1. Read test file: e2e/workout/create-workout.spec.ts
2. Read failure artifacts: playwright-report/index.html, screenshots, traces
3. Navigate to app: mcp.browser_navigate('http://localhost:3000')
4. Reproduce steps: mcp.browser_snapshot(), mcp.browser_click(), etc.
5. Identify issue: Compare expected vs actual DOM state
6. Apply fix: Edit test or source code
7. Verify: Bash('bun run test:e2e -- create-workout')
8. Report: "Test now passes. Changed selector from..."
```

### 5.3 Available MCP Tools for Agent

**Playwright MCP Tools:**
- `browser_navigate` - Load app pages
- `browser_snapshot` - Inspect accessibility tree/DOM
- `browser_click` - Reproduce user clicks
- `browser_type` - Test form inputs
- `browser_evaluate` - Check JavaScript state
- `browser_take_screenshot` - Capture visual state
- `browser_console_messages` - Debug JS errors
- `browser_network_requests` - Verify API calls
- `browser_wait_for` - Test timing/async behavior

**Integration with Claude Code Tools:**
- `Read` - Read test files and source code
- `Edit` - Fix test files or application code
- `Bash` - Re-run tests to verify fixes
- `Grep` - Search for selector patterns
- `Glob` - Find related test files

### 5.4 Agent Heuristics

**Auto-fix triggers:**
- Error message contains "Locator not found"
- Error message contains "timeout"
- Screenshot shows button/element exists but selector wrong
- Console shows no JavaScript errors

**Report & suggest triggers:**
- Error message contains "Expected X, received Y"
- Multiple test failures in same suite
- Recent commits modified tested code
- Network request failures (API changes)

**Interactive debug triggers:**
- Test passes sometimes, fails other times (flaky)
- Multiple attempted fixes don't resolve issue
- Complex error without clear root cause
- User explicitly requests investigation

### 5.5 Example Agent Session Transcript

```
User: The workout creation test is failing in CI. Can you investigate?

Agent:
Let me analyze the test failure.

[Reading e2e/workout/create-workout.spec.ts]
[Reading playwright-report/index.html]

The test "should create workout from template" failed with:
Error: Locator [data-testid="start-workout"] not found
Screenshot: playwright-report/test-failed-1.png

Let me navigate to the app and check the current state...

[Using mcp.browser_navigate('http://localhost:3000/templates')]
[Using mcp.browser_snapshot()]

I found the issue! The button selector changed:
- Old: [data-testid="start-workout"]
- New: [data-testid="begin-workout-session"]

This appears to be from commit bd0b66f "update test" which renamed the button.

I'll fix the test automatically since this is a simple selector change.

[Editing e2e/workout/create-workout.spec.ts]
[Running: bun run test:e2e -- create-workout]

✓ Test now passes!

Summary:
- Fixed selector in create-workout.spec.ts:17
- Changed data-testid from "start-workout" to "begin-workout-session"
- All assertions now pass
```

### 5.6 Setting Up Playwright MCP

**Installation** (if not already configured):

1. Install Playwright MCP server:
```bash
npm install -g @playwright/mcp-server
# or
bunx @playwright/mcp-server
```

2. Configure in Claude Code settings:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp-server"],
      "env": {
        "PLAYWRIGHT_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

3. Verify connection:
```
claude-code> Use Playwright MCP to navigate to http://localhost:3000
```

## Phase 6: Test Data Management

### 6.1 Reuse Existing Test Data Factories

**File**: `e2e/fixtures/db.fixture.ts`

```typescript
import { test as base } from '@playwright/test';
import { testData } from '@/__tests__/mocks/test-data';

type DbFixtures = {
  seededUser: ReturnType<typeof testData.createUser>;
  seededWorkout: ReturnType<typeof testData.createWorkoutSession>;
};

export const test = base.extend<DbFixtures>({
  seededUser: async ({ page }, use) => {
    // Use factory from existing unit tests
    const user = testData.createUser({
      email: 'e2e-test@example.com',
    });

    // Seed via tRPC (assuming test endpoint exists)
    await page.request.post('http://localhost:3000/api/trpc/test.seedUser', {
      data: { json: user },
    });

    await use(user);

    // Cleanup
    await page.request.post('http://localhost:3000/api/trpc/test.cleanupUser', {
      data: { json: { userId: user.id } },
    });
  },

  seededWorkout: async ({ page, seededUser }, use) => {
    const workout = testData.createWorkoutSession({
      userId: seededUser.id,
    });

    await page.request.post('http://localhost:3000/api/trpc/test.seedWorkout', {
      data: { json: workout },
    });

    await use(workout);
  },
});
```

**Benefits:**
- Consistent test data across unit and E2E tests
- Type-safe factories from `src/__tests__/mocks/test-data.ts`
- Realistic scenarios from `src/__tests__/mocks/mock-sets.ts`

### 6.2 Create Test tRPC Endpoints (Optional)

**File**: `src/server/api/routers/test.ts` (only enabled in test env)

```typescript
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';

export const testRouter = createTRPCRouter({
  seedUser: publicProcedure
    .input(z.object({
      id: z.string(),
      email: z.string(),
      // ... other user fields
    }))
    .mutation(async ({ ctx, input }) => {
      // Only allow in test environment
      if (process.env.NODE_ENV !== 'test') {
        throw new Error('Test endpoints only available in test environment');
      }

      return ctx.db.insert(users).values(input);
    }),

  cleanupUser: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (process.env.NODE_ENV !== 'test') {
        throw new Error('Test endpoints only available in test environment');
      }

      await ctx.db.delete(users).where(eq(users.id, input.userId));
    }),
});
```

## Implementation Timeline

### Week 1: Foundation & Authentication
**Goal**: Get Playwright running with auth tests passing

- [ ] Install Playwright (`bun add -D @playwright/test`)
- [ ] Create `playwright.config.ts`
- [ ] Set up directory structure (`e2e/auth/`, `e2e/fixtures/`, etc.)
- [ ] Add scripts to `package.json`
- [ ] Create auth fixture (`e2e/fixtures/auth.fixture.ts`)
- [ ] Write authentication test suite (`e2e/auth/login.spec.ts`)
  - [ ] Test: Redirect unauthenticated user
  - [ ] Test: Complete OAuth flow
  - [ ] Test: Logout
  - [ ] Test: Session persistence
  - [ ] Test: Invalid token handling
- [ ] Verify all auth tests pass: `bun run test:e2e`

**Deliverable**: 5 passing authentication tests with working auth fixture

**Critical**: Authentication must work before proceeding to Week 2

### Week 2: Template Creation & Exercise Linking
**Goal**: Validate template management flows

- [ ] Create template test suite (`e2e/templates/create-template.spec.ts`)
- [ ] Write test: Create empty template
- [ ] Write test: Add exercises to template
- [ ] Write test: Configure exercise details (sets, reps, rest)
- [ ] Write test: Reorder exercises in template
- [ ] Write test: Delete exercise from template
- [ ] Verify all template tests pass

**Deliverable**: 5 passing template creation tests

### Week 3: Workout Session Completion
**Goal**: Validate complete `/workout/session/[id]` flow

- [ ] Create session test suite (`e2e/workout/session-complete.spec.ts`)
- [ ] Write test: Start session from template and complete workout
- [ ] Write test: Auto-save progress during session
- [ ] Write test: Rest timer functionality
- [ ] Write test: Edit/delete sets during session
- [ ] Write test: Add exercise mid-session
- [ ] Write test: Discard session without saving
- [ ] Verify all session tests pass

**Deliverable**: 6 passing workout session tests

**Milestone**: Core user flows fully tested end-to-end

### Week 4: CI/CD Integration & Documentation
**Goal**: Automate E2E testing in deployment pipeline

- [ ] Update `.github/workflows/deploy.yml` to add E2E test job
- [ ] Configure test environment secrets in GitHub Actions
- [ ] Test CI pipeline on feature branch
- [ ] Verify E2E tests pass in CI environment
- [ ] Create Playwright MCP setup guide (for agent workflow)
- [ ] Document agent usage patterns
- [ ] Create runbook for debugging failed E2E tests
- [ ] Update project README with E2E testing info

**Deliverable**: E2E tests running automatically in CI on every PR

## Success Metrics

**Phase 1 Coverage Goals (Core Flows):**
- ✅ 3 critical user flows fully tested:
  1. Authentication (5 tests)
  2. Template creation & exercise linking (5 tests)
  3. Workout session completion (6 tests)
- ✅ 16 total E2E tests covering core functionality
- ✅ Local dev server integration working
- ✅ CI/CD pipeline validates E2E on every PR
- ✅ Test execution time < 3 minutes for core suite
- ✅ Flakiness rate < 5%

**Quality Gates:**
- All E2E tests must pass before merge to main
- Playwright report artifacts preserved for 30 days in CI
- Screenshots/videos captured on failures for debugging
- Agent can autonomously fix 70%+ of selector/timing failures

**Maintenance:**
- Agent reduces manual test maintenance by 50%+
- Failed tests analyzed within 1 hour (auto or manual)
- Test suite kept up-to-date with app changes

**Future Expansion:**
After core flows are stable, add:
- Offline functionality tests (queue operations, sync)
- Mobile UX tests (touch targets, gestures, swipes)
- WHOOP integration tests
- Performance/load testing

## Common Issues & Troubleshooting

### Issue: Tests timing out
**Solution**: Increase timeout in `playwright.config.ts`:
```typescript
use: {
  actionTimeout: 10000,
  navigationTimeout: 30000,
}
```

### Issue: Auth not working in E2E
**Solutions**:
- Mock WorkOS by setting localStorage tokens
- Use MSW handlers from `src/__tests__/mocks/workos-auth.ts`
- Create test WorkOS account with known credentials

### Issue: Database state bleeding between tests
**Solution**: Add cleanup in test fixtures:
```typescript
test.afterEach(async ({ page }) => {
  await page.request.post('/api/trpc/test.cleanup');
});
```

### Issue: Flaky tests
**Solutions**:
- Add explicit waits: `await page.waitForSelector('[data-testid="..."]')`
- Use `toBeVisible()` instead of checking DOM directly
- Increase retries: `retries: 2` in config
- Invoke agent in Mode 3 (Interactive Debug)

### Issue: Playwright MCP not connecting
**Solution**: Verify MCP server is running:
```bash
npx @playwright/mcp-server --version
# Check Claude Code MCP settings
```

## Additional Resources

### Documentation
- **Playwright Docs**: https://playwright.dev/docs/intro
- **Playwright Best Practices**: https://playwright.dev/docs/best-practices
- **Playwright MCP**: [Coming soon - check Anthropic docs]
- **Swole Tracker Testing**: `docs/testing-strategy.md`

### Existing Test Patterns
- **Mock Factories**: `src/__tests__/mocks/test-data.ts`
- **Mock Data Sets**: `src/__tests__/mocks/mock-sets.ts`
- **Unit Test Examples**: `src/__tests__/unit/`

### Related Files
- **tRPC Routers**: `src/server/api/routers/`
- **Database Schema**: `src/server/db/schema/`
- **App Pages**: `src/app/`

## Questions & Support

**Before starting:**
- Confirm authentication strategy (mock vs. real WorkOS)
- Decide on test database approach (remote D1 vs. dedicated test instance)
- Clarify conflict resolution strategy for offline tests

**During implementation:**
- Reach out if auth fixture needs help
- Ask about specific selector conventions (data-testid vs. aria-label)
- Request code review after each phase

**After completion:**
- Document any deviations from this plan
- Share lessons learned and agent success rate
- Propose additional test scenarios based on findings

---

**Ready to start?** Begin with Week 1 tasks and create a feature branch:
```bash
git checkout -b feature/playwright-e2e-tests
```

Good luck! 🚀
