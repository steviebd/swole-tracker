import { test, expect } from "@playwright/test";

test("debug - check what pages look like", async ({ page }) => {
  // Check home page
  await page.goto("/");
  await page.screenshot({ path: "debug-home.png" });
  console.log("Home page URL:", page.url());
  console.log("Home page title:", await page.title());

  // Check templates page without auth
  await page.goto("/templates");
  await page.screenshot({ path: "debug-templates.png" });
  console.log("Templates page URL:", page.url());
  console.log("Templates page title:", await page.title());

  // Check login page
  await page.goto("/auth/login");
  await page.screenshot({ path: "debug-login.png" });
  console.log("Login page URL:", page.url());
  console.log("Login page title:", await page.title());

  // Try to get page content
  const bodyContent = await page.locator("body").textContent();
  console.log("Page content preview:", bodyContent?.substring(0, 200));
});
