import { test, expect } from "./fixtures/auth.fixture";

test("check templates page content", async ({ authenticatedPage }) => {
  const page = authenticatedPage;

  await page.goto("/templates");
  await page.waitForLoadState("networkidle");

  // Get page text
  const text = await page.textContent("body");
  console.log(
    "Templates page text (first 300 chars):",
    text?.substring(0, 300),
  );

  // Look for headings
  const h1 = page.locator("h1").first();
  if (await h1.isVisible()) {
    console.log("H1 text:", await h1.textContent());
  }

  // Look for any text containing "Template"
  const templateText = page.locator("text=/Template/i");
  const count = await templateText.count();
  console.log("Text matching 'Template':", count);

  for (let i = 0; i < Math.min(count, 5); i++) {
    console.log(`  - "${await templateText.nth(i).textContent()}"`);
  }
});
