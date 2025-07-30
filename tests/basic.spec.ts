import { test, expect } from '@playwright/test';

test('basic test', async ({ page }) => {
  console.log('Starting basic test...');
  await page.goto('https://playwright.dev/');
  await expect(page).toHaveTitle(/Playwright/);
  console.log('Basic test completed');
});
