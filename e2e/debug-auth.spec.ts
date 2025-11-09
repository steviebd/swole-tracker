import { test, expect } from "./fixtures/auth.fixture";

test("debug - check authenticated pages", async ({ authenticatedPage }) => {
  const page = authenticatedPage;

  // Check templates page with auth and bypass query param
  await page.goto("/templates?e2e-test=true");
  await page.screenshot({ path: "debug-templates-auth.png" });
  console.log("Templates page URL:", page.url());
  console.log("Templates page title:", await page.title());

  // Try to get page content
  const bodyContent = await page.locator("body").textContent();
  console.log(
    "Templates page content preview:",
    bodyContent?.substring(0, 500),
  );

  // Check new template page
  await page.goto("/templates/new?e2e-test=true");
  await page.screenshot({ path: "debug-new-template.png" });
  console.log("New template page URL:", page.url());
  console.log("New template page title:", await page.title());

  const newTemplateContent = await page.locator("body").textContent();
  console.log(
    "New template page content preview:",
    newTemplateContent?.substring(0, 500),
  );
});
