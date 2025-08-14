  Phase 2: Create Comprehensive Sync System

  Phase 2A: New Comprehensive Sync Endpoint
  - Create /api/whoop/sync-all/route.ts that syncs all 5 data types
  - Add functions to fetch: Cycles, Sleep, Recovery, Profile, Body Measurements
  - Each function gets the last 25 items and stores them in respective database tables

  Phase 2B: Automatic Initial Sync
  - Modify WHOOP OAuth callback to trigger comprehensive sync on first connection
  - Add logic to detect "first connection" vs existing integration

  Phase 2C: Manual Sync Button
  - Add manual sync button to connect-whoop page for subsequent syncs
  - Show sync status/progress during manual sync

  Phase 3: Enhanced Sync Features

  Phase 3A: Proper Data Fetching
  - Implement last 25 items limit for each endpoint
  - Handle pagination where needed
  - Proper data transformation and storage

  Phase 3B: Error Handling & Rate Limiting
  - Add comprehensive error handling for each data type
  - Implement rate limiting (WHOOP has specific limits)
  - Token refresh handling for long-running syncs

  Phase 4: Data Display Components

  Phase 4A: Recovery, Sleep, Cycles Display
  - Create WhoopRecovery component (HRV, RHR, recovery scores)
  - Create WhoopSleep component (sleep performance, duration)
  - Create WhoopCycles component (strain, heart rate data)

  Phase 4B: Profile & Body Measurements Display
  - Create WhoopProfile component (user info)
  - Create WhoopBodyMeasurements component (weight, height tracking)

  Phase 4C: Update Connect-Whoop Page
  - Add tabs or sections for each data type
  - Show data below "Your Workouts" section as requested
  - Add loading states and error handling

  Phase 5: Testing & Refinement

  - Test complete sync flow (initial + manual)
  - Verify all 5 data types sync and display correctly
  - Performance testing with 25 items per type