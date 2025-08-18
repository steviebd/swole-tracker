⏺ User approved Claude's plan:
  ⎿  E2E Testing Setup Plan for Swole Tracker

     Phase 1: Foundation Setup (Critical)

     1. Authentication Test Infrastructure
       - Set up test user creation/cleanup utilities
       - Configure Supabase test environment
       - Create auth helpers for login/logout flows
     2. Database Test Management
       - Create test database setup/teardown
       - Seed data utilities for templates and exercises
       - User isolation and cleanup between tests
     3. Core Workflow Tests
       - Auth flow: register → login → logout → protected routes
       - Template CRUD: create → edit → delete templates
       - Workout session: start → log sets → save workout

     Phase 2: Page Object Model & Utilities (Medium)

     4. Test Architecture
       - Page Object Model for key pages (auth, templates, workouts)
       - Reusable test utilities and fixtures
       - API helpers for data setup/verification
     5. Extended Test Coverage
       - Exercise management and linking
       - Workout history and progress tracking
       - User preferences and settings

     Phase 3: Advanced & Integration (Low)

     6. Integration Features
       - WHOOP OAuth flow testing
       - AI health advice interactions
       - Offline functionality testing
     7. CI/CD Integration
       - GitHub Actions workflow for e2e tests
       - Parallel test execution
       - Test reporting and artifact management

     Priority: Focus on auth + core workout flow first, then expand coverage incrementally.