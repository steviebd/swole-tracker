# E2E Testing Setup

This directory contains the end-to-end (e2e) testing setup for the Swole Tracker application using Playwright with the Model Context Protocol (MCP) integration.

## Overview

The e2e test suite covers the critical user journeys:
- Authentication (login/logout/registration) 
- Template management (create/edit/delete templates)
- Workout session flow (start/log/finish workouts)
- Workout history and progress tracking

## Structure

```
src/__e2e__/
├── README.md                 # This file
├── auth.spec.ts             # Authentication flow tests
├── templates.spec.ts        # Template management tests
├── workouts.spec.ts         # Workout session tests
├── healthcheck.spec.ts      # Basic health check test
├── fixtures/
│   └── test-data.ts         # Test data and fixtures
├── pages/                   # Page Object Model classes
│   ├── base-page.ts         # Base page class
│   ├── auth-page.ts         # Authentication pages
│   ├── templates-page.ts    # Template management pages
│   └── workout-page.ts      # Workout session pages
├── setup/                   # Test setup and utilities
│   ├── global-setup.ts      # Global test setup
│   ├── global-teardown.ts   # Global test cleanup
│   └── test-database.ts     # Database utilities
├── storage/                 # Test storage (gitignored)
│   └── auth.json            # Authentication state
├── screenshots/             # Test screenshots (gitignored)
└── utils/
    └── auth-helpers.ts      # Authentication utilities
```

## Configuration

### Environment Setup

1. **Test Environment**: Copy `.env.example` to `.env.test` and configure:
   - Use separate test database 
   - Disable external services (PostHog, WHOOP, AI Gateway)
   - Use test Supabase project (recommended)

2. **Database**: Set up a separate test database to avoid conflicts:
   ```bash
   DATABASE_URL=postgresql://username:password@localhost:5432/swole_tracker_test
   ```

3. **Supabase**: Use a separate test project or ensure proper cleanup:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_test_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_test_service_role_key
   ```

### MCP Integration

The tests are configured to work with Playwright MCP server for enhanced browser automation:

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx -y @executeautomation/playwright-mcp-server",
      "args": [],
      "env": {}
    }
  }
}
```

## Running Tests

### Basic Commands

```bash
# Run all e2e tests
bun e2e

# Run with UI (interactive mode)  
bun test:e2e:ui

# Run specific test file
bun e2e auth.spec.ts

# Run tests in headed mode (see browser)
bun e2e --headed

# Run tests with debug
bun e2e --debug
```

### Advanced Commands

```bash
# Run tests in parallel
bun e2e --workers=4

# Generate test report
bun test:e2e:report

# Update snapshots (if using visual testing)
bun e2e --update-snapshots

# Run specific test
bun e2e -g "should login with valid credentials"
```

## Test Data Management

### User Management
- Tests use a global test user created during setup
- Each test suite can create additional users as needed
- All test users are cleaned up during teardown

### Database State
- Global setup creates clean test environment
- Each test can create specific test data using utilities
- Global teardown cleans up all test data

### Test Fixtures
- Common test data in `fixtures/test-data.ts`
- Reusable templates, exercises, and workout data
- Helper functions for generating test data

## Page Object Model

Tests use the Page Object Model pattern for maintainability:

```typescript
// Example usage
const authPage = new AuthPage(page);
await authPage.login(email, password);
await authPage.verifyLoggedIn();

const templatesPage = new TemplatesPage(page);  
await templatesPage.createTemplate("My Workout", exercises);
```

### Base Page
All page objects inherit from `BasePage` which provides:
- Common navigation methods
- Element interaction utilities  
- Wait helpers and error handling
- Screenshot capabilities

### Page-Specific Classes
- `AuthPage`: Login, logout, registration flows
- `TemplatesPage`: Template CRUD operations
- `WorkoutPage`: Workout session and history

## Authentication

### Auth Helpers
The `AuthHelpers` class provides:
- Login/logout functionality
- Session state management
- Protected route navigation
- Authentication state verification

### Session Management
- Global setup authenticates once and saves state
- Individual tests can create new sessions as needed
- Authentication state persists across test runs

## Best Practices

### Writing Tests
1. **Use Page Objects**: Always use page object methods instead of direct page interactions
2. **Clear Test Names**: Use descriptive test names that explain the scenario
3. **Independent Tests**: Each test should be independent and not rely on others
4. **Proper Cleanup**: Clean up any test data you create
5. **Wait Strategies**: Use appropriate waits (network idle, element visible, etc.)

### Test Data
1. **Unique Data**: Generate unique test data to avoid conflicts
2. **Minimal Data**: Create only the data needed for the test
3. **Realistic Data**: Use realistic data that matches production scenarios
4. **Cleanup**: Always clean up test data

### Error Handling
1. **Graceful Failures**: Tests should fail gracefully with clear error messages
2. **Screenshots**: Automatic screenshots on test failures
3. **Retry Logic**: Use retries for flaky interactions
4. **Timeout Management**: Set appropriate timeouts for different operations

## Debugging

### Debug Tools
1. **Playwright Inspector**: `bun e2e --debug`
2. **Headed Mode**: `bun e2e --headed` to see browser
3. **Slow Motion**: `bun e2e --slow-mo=1000` to slow down actions
4. **Screenshots**: Automatic screenshots on failures

### Common Issues
1. **Timing Issues**: Add proper waits instead of `setTimeout`
2. **Selector Problems**: Use stable selectors (data-testid preferred)
3. **Authentication**: Ensure test user is properly created
4. **Database State**: Check database cleanup between tests

### Logs and Artifacts
- Test results: `test-results/` directory
- Screenshots: `src/__e2e__/screenshots/` directory  
- Playwright report: `playwright-report/` directory
- Videos: Available in test results for failed tests

## CI/CD Integration

The tests are configured for CI/CD environments:

```yaml
# Example GitHub Actions workflow
- name: Run E2E Tests
  run: bun e2e
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
    # ... other test environment variables
```

### Environment Variables for CI
- Set test environment variables as secrets
- Use separate test database and Supabase project
- Configure proper cleanup and parallel execution

## Contributing

When adding new tests:

1. **Follow Patterns**: Use existing page objects and patterns
2. **Add Documentation**: Document new page methods and test scenarios  
3. **Test Coverage**: Ensure good coverage of happy path and edge cases
4. **Update README**: Update this README if adding new test categories

### Adding New Page Objects
1. Extend `BasePage`
2. Add selectors as private readonly properties
3. Implement page-specific methods
4. Add proper typing and documentation
5. Export from index file

### Adding New Test Suites
1. Follow naming convention: `feature.spec.ts`
2. Use proper test organization (describe blocks)
3. Add setup/teardown as needed
4. Update this README with new test coverage