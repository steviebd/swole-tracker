import { type Page, expect } from "@playwright/test";
import { getTestUser } from "../setup/test-database";

export class AuthHelpers {
  constructor(private page: Page) {}

  /**
   * Login using the test user credentials
   */
  async login(email?: string, password?: string) {
    const testUser = getTestUser();
    const loginEmail = email || testUser.email;
    const loginPassword = password || testUser.password;

    await this.page.goto("/auth/login");
    
    // Wait for login form to be visible
    await expect(this.page.locator('input[type="email"]')).toBeVisible();
    
    // Fill in credentials
    await this.page.fill('input[type="email"]', loginEmail);
    await this.page.fill('input[type="password"]', loginPassword);
    
    // Submit form
    await this.page.click('button[type="submit"]');
    
    // Wait for successful redirect
    await this.page.waitForURL(/\/$|\/dashboard/, { timeout: 10000 });
    
    // Verify we're logged in by checking for user-specific content
    await expect(this.page.locator('[data-testid="user-menu"], .user-avatar, [data-user-authenticated="true"]')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Logout the current user
   */
  async logout() {
    // Look for logout button/link - adjust selector based on your UI
    const logoutSelectors = [
      '[data-testid="logout-button"]',
      'button:has-text("Sign out")',
      'button:has-text("Logout")', 
      '[data-testid="user-menu"] button:has-text("Sign out")',
    ];

    let logoutButton = null;
    for (const selector of logoutSelectors) {
      logoutButton = this.page.locator(selector).first();
      if (await logoutButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        break;
      }
    }

    if (!logoutButton || !(await logoutButton.isVisible().catch(() => false))) {
      throw new Error("Logout button not found");
    }

    await logoutButton.click();
    
    // Wait for redirect to login page
    await this.page.waitForURL(/\/auth\/login/, { timeout: 10000 });
    
    // Verify we're logged out
    await expect(this.page.locator('input[type="email"]')).toBeVisible();
  }

  /**
   * Register a new user account
   */
  async register(email: string, password: string) {
    await this.page.goto("/auth/register");
    
    // Wait for register form
    await expect(this.page.locator('input[type="email"]')).toBeVisible();
    
    // Fill in registration form
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    
    // Look for confirm password field if it exists
    const confirmPasswordField = this.page.locator('input[name="confirmPassword"], input[name="confirm_password"]');
    if (await confirmPasswordField.isVisible().catch(() => false)) {
      await confirmPasswordField.fill(password);
    }
    
    // Submit registration
    await this.page.click('button[type="submit"]');
    
    // Wait for successful registration (could be confirmation page or direct login)
    await this.page.waitForURL(/\/$|\/dashboard|\/auth\/confirm/, { timeout: 10000 });
  }

  /**
   * Check if user is currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Check for authenticated user indicators
      const authIndicators = [
        '[data-testid="user-menu"]',
        '.user-avatar',
        '[data-user-authenticated="true"]',
        'button:has-text("Sign out")',
      ];

      for (const selector of authIndicators) {
        if (await this.page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false)) {
          return true;
        }
      }

      // Check current URL - if on protected route and not redirected to login, likely authenticated
      const currentUrl = this.page.url();
      if (currentUrl.includes('/workout') || currentUrl.includes('/templates') || currentUrl.includes('/workouts')) {
        // If we're on a protected route, check if we get redirected to login
        await this.page.waitForTimeout(1000);
        const newUrl = this.page.url();
        return !newUrl.includes('/auth/login');
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Ensure user is authenticated, login if not
   */
  async ensureAuthenticated() {
    if (!(await this.isAuthenticated())) {
      await this.login();
    }
  }

  /**
   * Visit a protected route (will auto-login if needed)
   */
  async visitProtectedRoute(route: string) {
    await this.page.goto(route);
    
    // If redirected to login, authenticate
    if (this.page.url().includes('/auth/login')) {
      await this.login();
      await this.page.goto(route);
    }
    
    // Wait for the route to load
    await this.page.waitForURL(new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
}