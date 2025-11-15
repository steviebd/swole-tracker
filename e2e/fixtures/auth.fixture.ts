import { test as base, expect, type Page } from "@playwright/test";

// Test credentials for WorkOS - from .env file
const TEST_CREDENTIALS = {
  email: process.env["E2E_TEST_USERNAME"] || "stevio.wonder@gmail.com",
  password: process.env["E2E_TEST_PASSWORD"] || "darkdragon",
};

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    console.log(
      "Setting up authenticated session for:",
      TEST_CREDENTIALS.email,
    );

    // Mock the authentication session API endpoints
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "e2e-user-id",
            email: TEST_CREDENTIALS.email,
            firstName: "Steven",
            lastName: "Wonder",
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

    // Mock user preferences
    await page.route("**/api/trpc/userPreferences.get*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            data: {
              id: "e2e-pref-id",
              userId: "e2e-user-id",
              theme: "system",
              units: "metric",
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
            },
            json: {
              id: "e2e-pref-id",
              userId: "e2e-user-id",
              theme: "system",
              units: "metric",
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
            },
          },
        }),
      });
    });

    // Mock templates API
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

    // Set authentication cookies to simulate logged-in state
    await page.context().addCookies([
      {
        name: "e2e-test",
        value: "true",
        domain: "localhost",
        path: "/",
        httpOnly: false,
        sameSite: "Lax" as const,
      },
    ]);

    await use(page);

    // Cleanup after test
    await page.context().clearCookies();
  },
});

export { expect };
