import { test, expect } from "@playwright/test";
import { setupWhoopMocks, mockWhoopData, mockWhoopErrors } from "./whoop-api.mock";

test.describe("WHOOP API Mock Service", () => {
  test("should return valid recovery data for success scenario", async ({ page }) => {
    await setupWhoopMocks(page, 'success');

    const result = await page.evaluate(async () => {
      const response = await fetch('https://api.whoop.com/v1/recovery');
      return {
        status: response.status,
        data: await response.json()
      };
    });

    expect(result.status).toBe(200);
    expect(result.data.score).toBe(mockWhoopData.recovery.score);
    expect(result.data.resting_heart_rate).toBe(mockWhoopData.recovery.resting_heart_rate);
    expect(result.data.score_state).toBe("SCORED");
  });

  test("should return valid sleep data for success scenario", async ({ page }) => {
    await setupWhoopMocks(page, 'success');

    const result = await page.evaluate(async () => {
      const response = await fetch('https://api.whoop.com/v1/sleep');
      return {
        status: response.status,
        data: await response.json()
      };
    });

    expect(result.status).toBe(200);
    expect(result.data.score).toBe(mockWhoopData.sleep.score);
    expect(result.data.stage_summary.total_in_bed_time_milli).toBe(mockWhoopData.sleep.stage_summary.total_in_bed_time_milli);
  });

  test("should return valid cycle data for success scenario", async ({ page }) => {
    await setupWhoopMocks(page, 'success');

    const result = await page.evaluate(async () => {
      const response = await fetch('https://api.whoop.com/v1/cycle');
      return {
        status: response.status,
        data: await response.json()
      };
    });

    expect(result.status).toBe(200);
    expect(result.data.score.strain).toBe(mockWhoopData.cycle.score.strain);
    expect(result.data.score.kilojoule).toBe(mockWhoopData.cycle.score.kilojoule);
  });

  test("should return valid profile data for success scenario", async ({ page }) => {
    await setupWhoopMocks(page, 'success');

    const result = await page.evaluate(async () => {
      const response = await fetch('https://api.whoop.com/v1/user/profile');
      return {
        status: response.status,
        data: await response.json()
      };
    });

    expect(result.status).toBe(200);
    expect(result.data.email).toBe(mockWhoopData.profile.email);
    expect(result.data.first_name).toBe(mockWhoopData.profile.first_name);
  });

  test("should return rate limit error for rateLimit scenario", async ({ page }) => {
    await setupWhoopMocks(page, 'rateLimit');

    const result = await page.evaluate(async () => {
      const response = await fetch('https://api.whoop.com/v1/recovery');
      return {
        status: response.status,
        data: await response.json()
      };
    });

    expect(result.status).toBe(429);
    expect(result.data.error).toBe("Rate limit exceeded. Try again in 60 seconds.");
  });

  test("should return unauthorized error for unauthorized scenario", async ({ page }) => {
    await setupWhoopMocks(page, 'unauthorized');

    const result = await page.evaluate(async () => {
      const response = await fetch('https://api.whoop.com/v1/recovery');
      return {
        status: response.status,
        data: await response.json()
      };
    });

    expect(result.status).toBe(401);
    expect(result.data.error).toBe("Unauthorized. Token expired or invalid.");
  });

  test("should return server error for error scenario", async ({ page }) => {
    await setupWhoopMocks(page, 'error');

    const result = await page.evaluate(async () => {
      const response = await fetch('https://api.whoop.com/v1/recovery');
      return {
        status: response.status,
        data: await response.json()
      };
    });

    expect(result.status).toBe(500);
    expect(result.data.error).toBe("Internal server error");
  });

  test("should default to success scenario when no scenario specified", async ({ page }) => {
    await setupWhoopMocks(page);

    const result = await page.evaluate(async () => {
      const response = await fetch('https://api.whoop.com/v1/recovery');
      return {
        status: response.status,
        data: await response.json()
      };
    });

    expect(result.status).toBe(200);
    expect(result.data.score).toBe(mockWhoopData.recovery.score);
  });
});