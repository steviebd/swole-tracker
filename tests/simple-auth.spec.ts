import { test, expect } from '@playwright/test';
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright';

test('simple auth test', async ({ page }) => {
  console.log('Starting test...');
  
  try {
    // Setup testing token
    await setupClerkTestingToken({ page });
    console.log('Testing token setup complete');
    
    // Navigate to homepage
    await page.goto('/');
    console.log('Navigated to homepage');
    
    // Try to sign in
    await clerk.signIn({
      page,
      signInParams: { 
        strategy: 'password', 
        identifier: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'testpassword123'
      },
    });
    console.log('Sign in completed');
    
    // Just check that we're on the page
    await expect(page).toHaveTitle(/Swole Tracker/);
    console.log('Test completed successfully');
    
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
});
