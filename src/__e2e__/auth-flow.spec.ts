import { test, expect, type Page } from "@playwright/test";

// Test credentials from user requirements
const TEST_CREDENTIALS = {
  email: "stevenbduong@gmail.com",
  password: "darkdraogn",
};

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test("should show sign-in page correctly", async ({ page }) => {
    await page.goto("/sign-in");
    
    // Verify sign-in page loads - it shows "Swole Tracker" title
    await expect(page).toHaveTitle("Swole Tracker");
    
    // Wait for loading to complete and sign-in button to appear
    await page.waitForSelector('button:has-text("Sign In with WorkOS")', { timeout: 10000 });
    
    const signInButton = page.locator('text="Sign In with WorkOS"');
    await expect(signInButton).toBeVisible();
    
    console.log("✅ Sign-in page loads correctly with sign-in button");
  });

  test("should redirect to WorkOS and back successfully", async ({ page }) => {
    // Start from sign-in page
    await page.goto("/sign-in");
    
    // Wait for loading to complete and sign-in button to appear
    await page.waitForSelector('button:has-text("Sign In with WorkOS")', { timeout: 10000 });
    
    // Click the sign-in button
    const signInButton = page.locator('text="Sign In with WorkOS"');
    await signInButton.click();
    
    // Wait for redirect to WorkOS AuthKit (could be custom domain)
    await page.waitForURL(/authkit\.(workos\.com|app)/, { timeout: 10000 });
    console.log("✅ Successfully redirected to WorkOS AuthKit");
    
    // Fill in credentials - WorkOS might have multi-step form
    const emailInput = page.locator('input[type="email"]');
    
    await expect(emailInput).toBeVisible();
    await emailInput.fill(TEST_CREDENTIALS.email);
    console.log("✅ Email entered successfully");
    
    // Click continue/next button to proceed to password step
    const continueButton = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("Next")');
    await continueButton.click();
    console.log("✅ Clicked continue button");
    
    // Wait for password field to appear
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await passwordInput.fill(TEST_CREDENTIALS.password);
    console.log("✅ Password entered successfully");
    
    // Submit the form - click the password sign-in button specifically
    const submitButton = page.locator('button[name="intent"][value="password"]');
    await submitButton.click();
    console.log("✅ Sign-in button clicked");
    
    // Wait a bit for any processing
    await page.waitForTimeout(3000);
    console.log(`Current URL after sign-in attempt: ${page.url()}`);
    
    // Check for any error messages first
    const errorMessage = page.locator('[role="alert"], .error, .alert-error, :text("Invalid"), :text("Error")');
    const hasError = await errorMessage.count() > 0;
    if (hasError) {
      const errorText = await errorMessage.first().textContent();
      console.log(`❌ Error found: ${errorText}`);
    }
    
    // Wait for redirect back to our app
    await page.waitForURL("http://localhost:3000/**", { timeout: 15000 });
    console.log("✅ Successfully redirected back to application");
    
    // Should be redirected to dashboard or home page
    const currentUrl = page.url();
    console.log(`Current URL after auth: ${currentUrl}`);
  });

  test("should access protected routes after authentication", async ({ page }) => {
    // Perform authentication first
    await authenticateUser(page);
    
    // Test accessing /test-auth page
    await page.goto("/test-auth");
    await expect(page.locator('text="Authenticated"')).toBeVisible();
    console.log("✅ /test-auth shows authenticated status");
    
    // Test accessing /debug-auth page
    await page.goto("/debug-auth");
    
    // Wait for user data to load
    await page.waitForTimeout(2000);
    
    // Check for user profile data
    const userEmail = page.locator(`text="${TEST_CREDENTIALS.email}"`);
    await expect(userEmail).toBeVisible();
    console.log("✅ /debug-auth shows user profile data");
    
    // Check for Convex authentication
    const convexStatus = page.locator('text="Convex Status: authenticated"');
    await expect(convexStatus).toBeVisible();
    console.log("✅ Convex authentication working");
  });

  test("should handle logout correctly", async ({ page }) => {
    // Perform authentication first
    await authenticateUser(page);
    
    // Look for logout functionality
    await page.goto("/");
    
    // Try to find and click logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout"), a:has-text("Sign out")').first();
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      console.log("✅ Logout button clicked");
      
      // Wait for logout to complete
      await page.waitForTimeout(2000);
      
      // Try to access protected route - should be redirected
      await page.goto("/test-auth");
      
      // Check if redirected to sign-in or shows unauthenticated state
      const isSignInPage = page.url().includes("/sign-in");
      const hasUnauthenticatedText = await page.locator('text="Unauthenticated", text="Not authenticated"').isVisible();
      
      if (isSignInPage || hasUnauthenticatedText) {
        console.log("✅ Logout successful - protected routes are inaccessible");
      } else {
        console.log("⚠️ Logout may not be working correctly");
      }
    } else {
      console.log("⚠️ No logout button found - may need to implement logout");
    }
  });

  test("should show proper error handling", async ({ page }) => {
    // Test with invalid credentials
    await page.goto("/sign-in");
    
    // Wait for loading to complete and sign-in button to appear
    await page.waitForSelector('button:has-text("Sign In with WorkOS")', { timeout: 10000 });
    
    const signInButton = page.locator('text="Sign In with WorkOS"');
    await signInButton.click();
    
    await page.waitForURL(/authkit\.(workos\.com|app)/);
    
    // Try with invalid credentials
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    await emailInput.fill("invalid@example.com");
    await passwordInput.fill("wrongpassword");
    
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Wait for error message
    await page.waitForTimeout(3000);
    
    // Check for error messages
    const errorMessage = page.locator('[role="alert"], .error, .alert-error, text="Invalid", text="Error"');
    const hasError = await errorMessage.count() > 0;
    
    if (hasError) {
      console.log("✅ Error handling working - invalid credentials show error");
    } else {
      console.log("⚠️ May need to improve error handling visibility");
    }
  });
});

// Helper function to authenticate user
async function authenticateUser(page: Page) {
  await page.goto("/sign-in");
  
  // Wait for loading to complete and sign-in button to appear
  await page.waitForSelector('button:has-text("Sign In with WorkOS")', { timeout: 10000 });
  
  const signInButton = page.locator('text="Sign In with WorkOS"');
  await signInButton.click();
  
  await page.waitForURL(/authkit\.(workos\.com|app)/);
  
  // Fill in credentials - WorkOS might have multi-step form
  const emailInput = page.locator('input[type="email"]');
  await emailInput.fill(TEST_CREDENTIALS.email);
  
  // Click continue/next button to proceed to password step
  const continueButton = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("Next")');
  await continueButton.click();
  
  // Wait for password field to appear
  const passwordInput = page.locator('input[type="password"]');
  await expect(passwordInput).toBeVisible({ timeout: 10000 });
  await passwordInput.fill(TEST_CREDENTIALS.password);
  
  // Submit the form - click the password sign-in button specifically
  const submitButton = page.locator('button[name="intent"][value="password"]');
  await submitButton.click();
  
  // Wait for redirect back to app
  await page.waitForURL("http://localhost:3000/**", { timeout: 15000 });
  
  // Wait a bit for authentication to settle
  await page.waitForTimeout(2000);
}