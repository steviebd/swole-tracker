import { expect } from "@playwright/test";
import { BasePage } from "./base-page";

export class AuthPage extends BasePage {
  // Selectors
  private readonly emailInput = 'input[type="email"]';
  private readonly passwordInput = 'input[type="password"]';
  private readonly submitButton = 'button[type="submit"]';
  private readonly loginLink = 'a[href*="/auth/login"]';
  private readonly registerLink = 'a[href*="/auth/register"]';
  private readonly googleSignInButton = 'button:has-text("Google")';
  private readonly errorMessage = '[data-testid="error-message"], .error, [role="alert"]';

  /**
   * Navigate to login page
   */
  async goToLogin() {
    await this.goto("/auth/login");
    await expect(this.page.locator(this.emailInput)).toBeVisible();
  }

  /**
   * Navigate to register page
   */
  async goToRegister() {
    await this.goto("/auth/register");
    await expect(this.page.locator(this.emailInput)).toBeVisible();
  }

  /**
   * Fill login form
   */
  async fillLoginForm(email: string, password: string) {
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.passwordInput, password);
  }

  /**
   * Fill registration form
   */
  async fillRegisterForm(email: string, password: string) {
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.passwordInput, password);
    
    // Check for confirm password field
    const confirmPasswordField = this.page.locator('input[name="confirmPassword"], input[name="confirm_password"]');
    if (await confirmPasswordField.isVisible().catch(() => false)) {
      await confirmPasswordField.fill(password);
    }
  }

  /**
   * Submit the form
   */
  async submitForm() {
    await this.clickElement(this.submitButton);
  }

  /**
   * Click Google sign in button
   */
  async clickGoogleSignIn() {
    await this.clickElement(this.googleSignInButton);
  }

  /**
   * Switch to register page from login
   */
  async switchToRegister() {
    await this.clickElement(this.registerLink);
    await expect(this.page.locator(this.emailInput)).toBeVisible();
  }

  /**
   * Switch to login page from register
   */
  async switchToLogin() {
    await this.clickElement(this.loginLink);
    await expect(this.page.locator(this.emailInput)).toBeVisible();
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    try {
      const errorElement = this.page.locator(this.errorMessage).first();
      await expect(errorElement).toBeVisible({ timeout: 5000 });
      return await errorElement.textContent() || "";
    } catch {
      return "";
    }
  }

  /**
   * Check if error message is displayed
   */
  async hasErrorMessage(): Promise<boolean> {
    return await this.isVisible(this.errorMessage);
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string) {
    await this.goToLogin();
    await this.fillLoginForm(email, password);
    await this.submitForm();
    
    // Wait for successful login (redirect)
    await this.waitForUrl(/\/$|\/dashboard/, 10000);
  }

  /**
   * Register new user
   */
  async register(email: string, password: string) {
    await this.goToRegister();
    await this.fillRegisterForm(email, password);
    await this.submitForm();
    
    // Wait for successful registration
    await this.waitForUrl(/\/$|\/dashboard|\/auth\/confirm/, 10000);
  }

  /**
   * Verify successful login by checking for user indicators
   */
  async verifyLoggedIn() {
    const authIndicators = [
      '[data-testid="user-menu"]',
      '.user-avatar',
      '[data-user-authenticated="true"]',
      'button:has-text("Sign out")',
    ];

    let found = false;
    for (const selector of authIndicators) {
      if (await this.isVisible(selector)) {
        found = true;
        break;
      }
    }

    expect(found).toBe(true);
  }

  /**
   * Verify we're on the login page
   */
  async verifyLoginPage() {
    await expect(this.page.locator(this.emailInput)).toBeVisible();
    await expect(this.page.locator(this.passwordInput)).toBeVisible();
    await expect(this.page.locator(this.submitButton)).toBeVisible();
  }

  /**
   * Verify we're on the register page
   */
  async verifyRegisterPage() {
    await expect(this.page.locator(this.emailInput)).toBeVisible();
    await expect(this.page.locator(this.passwordInput)).toBeVisible();
    await expect(this.page.locator(this.submitButton)).toBeVisible();
  }
}