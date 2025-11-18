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
  const routeHandler = async (route: any) => {
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
  };

  // Set up routes for page context (intercepts fetch/XHR requests from the page)
  await page.context().route('**/api.whoop.com/**', routeHandler);
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