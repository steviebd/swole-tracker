import { test } from "@playwright/test";

test.setTimeout(0); // Disable timeout

test("manual login - keep browser open", async ({ page }) => {
  // Go to the homepage
  await page.goto("http://localhost:8787");

  // Wait for page to load
  await page.waitForLoadState("networkidle");

  console.log("Browser is open at http://localhost:8787");
  console.log("You can now manually log in to WorkOS");
  console.log("The browser will stay open for you to test");
  console.log("Close the browser window when you're done");

  // Keep the browser open for manual testing
  // Take a screenshot to confirm it's working
  await page.screenshot({ path: "manual-login-start.png" });

  // Wait indefinitely - you'll need to close the browser manually
  await new Promise(() => {}); // Never resolves
});
