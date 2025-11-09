import { test as base, expect, type Page } from "@playwright/test";

// Test credentials for WorkOS - these should be configured in your test environment
const TEST_CREDENTIALS = {
  email: process.env.TEST_WORKOS_EMAIL || "test@swole-tracker.com",
  password: process.env.TEST_WORKOS_PASSWORD || "test-password-123",
};

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Intercept all navigation and prevent redirects to login
    await page.route("**/*", async (route, request) => {
      const url = new URL(request.url());

      // If this is a redirect to login, instead continue to the original page
      if (
        url.pathname === "/auth/login" &&
        url.searchParams.has("redirectTo")
      ) {
        const redirectTo = url.searchParams.get("redirectTo");
        if (redirectTo) {
          console.log("Preventing login redirect, going to:", redirectTo);
          await route.fulfill({
            status: 200,
            contentType: "text/html",
            body: `
              <html>
                <head><title>E2E Test Bypass</title></head>
                <body>
                  <div id="e2e-test-container">
                    <h1>E2E Test Page</h1>
                    <p>This is a mock page for E2E testing</p>
                    <p data-testid="original-path">${redirectTo}</p>
                  </div>
                </body>
              </html>
            `,
          });
          return;
        }
      }

      // Add E2E test header to all requests
      const headers = {
        ...request.headers(),
        "x-e2e-test": "true",
      };

      await route.continue({ headers });
    });

    // Intercept all API routes that check authentication
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "test-user-id",
            email: TEST_CREDENTIALS.email,
            firstName: "Test",
            lastName: "User",
          },
        }),
      });
    });

    // Mock logout endpoint
    await page.route("**/api/auth/logout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    // Intercept templates API to return mock data
    await page.route("**/api/trpc/templates.getAll*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            data: [],
            json: [],
          },
        }),
      });
    });

    // Mock user preferences
    await page.route("**/api/trpc/userPreferences.get*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            data: {
              id: "test-pref-id",
              userId: "test-user-id",
              theme: "system",
              units: "metric",
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
            },
            json: {
              id: "test-pref-id",
              userId: "test-user-id",
              theme: "system",
              units: "metric",
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
            },
          },
        }),
      });
    });

    // Mock master exercises
    await page.route("**/api/trpc/masterExercises.search*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            data: [
              {
                id: "ex-1",
                name: "Bench Press",
                category: "strength",
                muscleGroups: ["chest", "shoulders", "triceps"],
              },
              {
                id: "ex-2",
                name: "Squat",
                category: "strength",
                muscleGroups: ["quadriceps", "glutes", "hamstrings"],
              },
            ],
            json: [
              {
                id: "ex-1",
                name: "Bench Press",
                category: "strength",
                muscleGroups: ["chest", "shoulders", "triceps"],
              },
              {
                id: "ex-2",
                name: "Squat",
                category: "strength",
                muscleGroups: ["quadriceps", "glutes", "hamstrings"],
              },
            ],
          },
        }),
      });
    });

    // Set cookies that will bypass middleware checks
    const sessionId = "test-session-" + Math.random().toString(36).substring(2);
    const signature =
      "test-signature-" + Math.random().toString(36).substring(2);
    const signedSession = `${sessionId}.${signature}`;

    await page.context().addCookies([
      {
        name: "e2e-test",
        value: "true",
        domain: "localhost",
        path: "/",
        httpOnly: false,
        sameSite: "Lax" as const,
      },
      {
        name: "workos_session",
        value: signedSession,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax" as const,
      },
    ]);

    await use(page);

    // Cleanup after test
    await page.context().clearCookies();
  },
});

export { expect };
