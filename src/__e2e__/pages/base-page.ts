import { type Page, type Locator, expect } from "@playwright/test";
import { AuthHelpers } from "../utils/auth-helpers";

export class BasePage {
  protected page: Page;
  protected auth: AuthHelpers;

  constructor(page: Page) {
    this.page = page;
    this.auth = new AuthHelpers(page);
  }

  /**
   * Navigate to a specific URL
   */
  async goto(url: string) {
    await this.page.goto(url);
  }

  /**
   * Wait for page to load completely
   */
  async waitForLoad() {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    try {
      return await this.page.locator(selector).isVisible({ timeout: 5000 });
    } catch {
      return false;
    }
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string, timeout = 10000): Promise<Locator> {
    const element = this.page.locator(selector);
    await expect(element).toBeVisible({ timeout });
    return element;
  }

  /**
   * Click element with retry logic
   */
  async clickElement(selector: string) {
    const element = await this.waitForElement(selector);
    await element.click();
  }

  /**
   * Fill input field
   */
  async fillInput(selector: string, value: string) {
    const element = await this.waitForElement(selector);
    await element.fill(value);
  }

  /**
   * Get text content of element
   */
  async getTextContent(selector: string): Promise<string> {
    const element = await this.waitForElement(selector);
    return (await element.textContent()) || "";
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `src/__e2e__/screenshots/${name}.png` });
  }

  /**
   * Scroll element into view
   */
  async scrollToElement(selector: string) {
    const element = this.page.locator(selector);
    await element.scrollIntoViewIfNeeded();
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation() {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Wait for specific URL pattern
   */
  async waitForUrl(pattern: string | RegExp, timeout = 10000) {
    await this.page.waitForURL(pattern, { timeout });
  }
}