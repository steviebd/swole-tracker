# E2E Workflow Testing Guide

## Overview

Interactive end-to-end test that walks through the complete user workflow:
1. **Real WorkOS login** with test credentials
2. Create a template with exercises (tests linking)
3. Start a workout using the template
4. View progress/analytics
5. Clean up by deleting the test template

## Prerequisites

### Required: E2E Test Credentials

You **must** add test user credentials to the local `.env` file before running E2E tests:

1. Create or edit the `.env` file in the project root
2. Add two variables:
   ```bash
   E2E_TEST_USERNAME=your-test-user@example.com
   E2E_TEST_PASSWORD=your-test-password
   ```

The test user should:
- Have an existing account in WorkOS
- Have some test data in the D1 database (templates, workouts, etc.)
- Use a dedicated test account (not a personal account)

**Important**:
- The `.env` file is gitignored and credentials are never committed to the repository
- These credentials are only loaded from environment variables (never hardcoded)

## Running the Tests

**All tests are now hands-off** - they automatically start and stop the dev server. No manual server setup needed!

### Option 1: Visual, Slow-Motion Test (Recommended for watching)
```bash
bun run test:e2e:flow
```
- Opens browser window
- Slows down actions by 500ms each
- Takes screenshots at each step
- Great for seeing what's happening

### Option 2: Playwright UI Mode (Best for debugging)
```bash
bun run test:e2e:flow:ui
```
- Opens Playwright UI
- Lets you step through test manually
- See all network requests
- Inspect DOM at any point

### Option 3: Debug Mode (Best for fixing issues)
```bash
bun run test:e2e:flow:debug
```
- Opens browser in debug mode
- Pauses at each step
- Use Playwright Inspector

### Option 4: Fast Mode (No slow-motion)
```bash
bun run test:e2e:flow:fast
```
- Runs at normal speed
- Still shows browser
- For quick verification

## Understanding the Test

The test uses **real WorkOS authentication** (see `e2e/fixtures/auth.fixture.ts`), which:
- Performs actual WorkOS OAuth login with test credentials
- Works with real data in your D1 database
- Tests the complete authentication flow

This means:
- ✅ Tests real authentication flow end-to-end
- ✅ Works with actual database data
- ✅ Validates the complete user experience
- ⚠️ May create/modify data in the database (uses test account)
- ⚠️ Requires valid test credentials in Infisical

## Test Output

### Screenshots
All screenshots are saved to `/test-screenshots/`:
- `01-templates-page.png` - Templates listing
- `02-template-form.png` - Create template dialog
- `03-exercise-added.png` - Exercise linked to template
- `04-workouts-page.png` - Workouts listing
- `05-workout-started.png` - Active workout
- `06-progress-page.png` - Progress/analytics view
- `07-final-state.png` - After cleanup

### Console Output
The test logs each step with:
- ✓ Success indicators
- ⚠️ Warnings if expected elements aren't found
- Step-by-step progress

## Troubleshooting

### Test hangs at start
- Check that port 8787 is not already in use: `lsof -ti:8787`
- If it is, kill the process: `lsof -ti:8787 | xargs kill -9`
- The test will automatically start its own dev server

### Elements not found
The test uses flexible selectors and gracefully skips if elements aren't found. Check:
- Are you on the right page?
- Do the UI elements match the selectors?
- Check the screenshots to see what actually rendered

### Modify the test
Edit `full-workout-flow.spec.ts` to:
- Change selectors if your UI is different
- Add more steps
- Customize the workflow
- Add more assertions

## Customization

### Adjust slow-motion speed
Edit `package.json`:
```json
"test:e2e:flow": "PLAYWRIGHT_SKIP_SERVER=1 SLOW_MO=1000 ..."  // 1 second per action
```

### Change viewport
In the test file:
```typescript
await page.setViewportSize({ width: 1920, height: 1080 });
```

### Add test data
Use your test user account to:
- Create templates in the app
- Add workout history
- Set up realistic test scenarios
All data will be stored in the D1 database and used by E2E tests

## CI/CD Integration

All e2e tests are ready for CI/CD:
```bash
bun run test:e2e
```

The `playwright.config.ts` webServer automatically:
- Starts the dev server before tests
- Waits for it to be ready (up to 2 minutes)
- Reuses existing server in local development
- Runs all tests
- Shuts down the server when done

In CI environments (when `CI=true`), it will:
- Always start a fresh server
- Never reuse existing servers
- Run with 2 retries for flaky tests
