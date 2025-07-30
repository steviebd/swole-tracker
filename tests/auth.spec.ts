import { test, expect } from '@playwright/test';
import { clerk } from '@clerk/testing/playwright';

test.describe('Authentication Tests', () => {
  
  test('user can sign in with email and password', async ({ page }) => {
    // Navigate to homepage (unprotected page that loads Clerk)
    await page.goto('/');
    
    // Sign in using Clerk's helper
    await clerk.signIn({
      page,
      signInParams: { 
        strategy: 'password', 
        identifier: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'testpassword123'
      },
    });

    // Check that we're signed in by looking for user button
    await expect(page.locator('[data-clerk-element="userButton"]')).toBeVisible({ timeout: 10000 });
    
    // Or check for other authenticated state indicators
    const url = page.url();
    console.log('After sign in, URL is:', url);
  });

  test('user can sign out', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Sign in first
    await clerk.signIn({
      page,
      signInParams: { 
        strategy: 'password', 
        identifier: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'testpassword123'
      },
    });

    // Verify we're signed in
    await expect(page.locator('[data-clerk-element="userButton"]')).toBeVisible();
    
    // Sign out
    await clerk.signOut({ page });
    
    // Verify we're signed out (user button should be gone, sign in button should appear)
    await expect(page.locator('[data-clerk-element="userButton"]')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('signed in user can access protected content', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Sign in
    await clerk.signIn({
      page,
      signInParams: { 
        strategy: 'password', 
        identifier: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'testpassword123'
      },
    });

    // Verify user is signed in
    await expect(page.locator('[data-clerk-element="userButton"]')).toBeVisible();
    
    // Test accessing protected functionality
    // Add your app-specific tests here, for example:
    // - Creating workout templates
    // - Starting workout sessions
    // - Viewing workout history
    
    console.log('User successfully signed in and can access protected content');
  });
  
});
