import { test, expect } from "@playwright/test";
import { AuthPage } from "./pages/auth-page";
import { getTestUser } from "./setup/test-database";

test.describe("Authentication Flow", () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
  });

  test.describe("Login", () => {
    test("should login with valid credentials", async () => {
      const testUser = getTestUser();
      
      await authPage.login(testUser.email, testUser.password);
      
      // Verify successful login
      await authPage.verifyLoggedIn();
      
      // Verify redirect to dashboard/home
      expect(authPage.getCurrentUrl()).toMatch(/\/$|\/dashboard/);
    });

    test("should show error with invalid credentials", async () => {
      await authPage.goToLogin();
      await authPage.fillLoginForm("invalid@email.com", "wrongpassword");
      await authPage.submitForm();
      
      // Should stay on login page with error
      await authPage.verifyLoginPage();
      
      // Check for error message
      const hasError = await authPage.hasErrorMessage();
      expect(hasError).toBe(true);
    });

    test("should show error with empty fields", async () => {
      await authPage.goToLogin();
      await authPage.submitForm();
      
      // Should stay on login page
      await authPage.verifyLoginPage();
      
      // Form validation should prevent submission or show error
      const currentUrl = authPage.getCurrentUrl();
      expect(currentUrl).toContain("/auth/login");
    });

    test("should redirect to login when accessing protected route while unauthenticated", async ({ page }) => {
      // Try to access protected route without authentication
      await page.goto("/templates");
      
      // Should be redirected to login
      await page.waitForURL(/\/auth\/login/);
      expect(page.url()).toContain("/auth/login");
    });
  });

  test.describe("Navigation", () => {
    test("should switch between login and register pages", async () => {
      await authPage.goToLogin();
      await authPage.verifyLoginPage();
      
      // Switch to register
      await authPage.switchToRegister();
      await authPage.verifyRegisterPage();
      
      // Switch back to login
      await authPage.switchToLogin();
      await authPage.verifyLoginPage();
    });

    test("should access login page directly", async () => {
      await authPage.goToLogin();
      await authPage.verifyLoginPage();
    });

    test("should access register page directly", async () => {
      await authPage.goToRegister();
      await authPage.verifyRegisterPage();
    });
  });

  test.describe("Session Management", () => {
    test("should maintain session across page reloads", async ({ page }) => {
      const testUser = getTestUser();
      
      // Login
      await authPage.login(testUser.email, testUser.password);
      await authPage.verifyLoggedIn();
      
      // Reload page
      await page.reload();
      await page.waitForLoadState("networkidle");
      
      // Should still be logged in
      await authPage.verifyLoggedIn();
    });

    test("should logout successfully", async ({ page }) => {
      const testUser = getTestUser();
      
      // Login first
      await authPage.login(testUser.email, testUser.password);
      await authPage.verifyLoggedIn();
      
      // Logout
      await authPage.auth.logout();
      
      // Verify redirect to login page
      await page.waitForURL(/\/auth\/login/);
      await authPage.verifyLoginPage();
      
      // Verify cannot access protected route after logout
      await page.goto("/templates");
      await page.waitForURL(/\/auth\/login/);
    });
  });

  test.describe("Protected Routes", () => {
    test("should access protected routes when authenticated", async ({ page }) => {
      const testUser = getTestUser();
      
      // Login
      await authPage.login(testUser.email, testUser.password);
      
      // Test accessing various protected routes
      const protectedRoutes = [
        "/templates",
        "/workout/start",
        "/workouts",
      ];
      
      for (const route of protectedRoutes) {
        await page.goto(route);
        
        // Should not be redirected to login
        await page.waitForTimeout(1000);
        expect(page.url()).not.toContain("/auth/login");
        expect(page.url()).toContain(route);
      }
    });

    test("should redirect to login for all protected routes when unauthenticated", async ({ page }) => {
      const protectedRoutes = [
        "/templates",
        "/templates/new",
        "/workout/start",
        "/workouts",
      ];
      
      for (const route of protectedRoutes) {
        await page.goto(route);
        
        // Should be redirected to login
        await page.waitForURL(/\/auth\/login/, { timeout: 10000 });
        expect(page.url()).toContain("/auth/login");
      }
    });
  });

  test.describe("Form Validation", () => {
    test("should validate email format on login", async () => {
      await authPage.goToLogin();
      await authPage.fillLoginForm("invalid-email", "password123");
      await authPage.submitForm();
      
      // Should show validation error or prevent submission
      await authPage.verifyLoginPage();
    });

    test("should require both email and password", async () => {
      await authPage.goToLogin();
      
      // Try with only email
      await authPage.fillLoginForm("test@example.com", "");
      await authPage.submitForm();
      await authPage.verifyLoginPage();
      
      // Try with only password
      await authPage.fillLoginForm("", "password123");
      await authPage.submitForm();
      await authPage.verifyLoginPage();
    });
  });

  test.describe("User Registration", () => {
    test("should register new user successfully", async ({ page }) => {
      const timestamp = Date.now();
      const newUser = {
        email: `newuser-${timestamp}@swole-tracker-test.com`,
        password: "NewPassword123!",
      };
      
      await authPage.register(newUser.email, newUser.password);
      
      // Should be logged in after registration or on confirmation page
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/$|\/dashboard|\/auth\/confirm/);
      
      // If redirected to confirmation page, we can't test login immediately
      // If logged in, verify auth state
      if (currentUrl.match(/\/$|\/dashboard/)) {
        await authPage.verifyLoggedIn();
      }
    });

    test("should show error when registering with existing email", async () => {
      const testUser = getTestUser();
      
      await authPage.goToRegister();
      await authPage.fillRegisterForm(testUser.email, "password123");
      await authPage.submitForm();
      
      // Should show error message
      const hasError = await authPage.hasErrorMessage();
      expect(hasError).toBe(true);
    });

    test("should validate password requirements", async () => {
      await authPage.goToRegister();
      
      // Try with weak password
      await authPage.fillRegisterForm("test@example.com", "123");
      await authPage.submitForm();
      
      // Should show validation error or stay on register page
      await authPage.verifyRegisterPage();
    });
  });
});