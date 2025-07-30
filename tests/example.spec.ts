import { test, expect } from '@playwright/test';
import { setupClerkTestingToken } from '@clerk/testing/playwright';

test('homepage loads correctly', async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto('/');

  // Check that the page loads and has expected content
  await expect(page).toHaveTitle(/Swole Tracker/);
});

test('can navigate to sign in', async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto('/');

  // Look for sign in button/link and click it
  const signInButton = page.getByRole('link', { name: /sign in/i }).or(page.getByRole('button', { name: /sign in/i }));
  
  if (await signInButton.isVisible()) {
    await signInButton.click();
    // Should redirect to Clerk sign-in page or show sign-in form
    await expect(page.url()).toContain('sign');
  }
});
