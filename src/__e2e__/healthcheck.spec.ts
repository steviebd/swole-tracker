import { test, expect } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");
  // Initial lenient title check; tweak to your app title later if desired
  await expect(page).toHaveTitle(/swole|tracker|workout/i);
  const heading = page.locator("h1, [data-testid=page-title]");
  await expect(heading).toBeVisible();
});
