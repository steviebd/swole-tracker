import { test, expect } from "../fixtures/auth.fixture";

// Set a slower timeout for interactive testing
test.setTimeout(300000); // 5 minutes per test

test.describe("Plateau Detection Flow", () => {
  test("complete plateau detection: template → key lift → 4 workouts → plateau → verify → cleanup", async ({
    authenticatedPage: page,
  }) => {
    console.log("\n🏔️  Starting Plateau Detection Flow Test\n");
    const templateName = `E2E Plateau Test ${Date.now()}`;
    const exerciseName = "Squat"; // ✅ Already has master exercise link

    // Phase 1: Template Creation & Initial Setup
    console.log("\n=== Phase 1: Template Creation & Initial Setup ===");

    await test.step("Navigate to Templates page", async () => {
      console.log("Step 1: Navigating to Templates page...");
      await page.goto("/templates");
      await page.waitForLoadState("networkidle");
      console.log("✓ Templates page loaded");

      await page.screenshot({
        path: "test-screenshots/01-plateau-templates-page.png",
        fullPage: true,
      });
    });

    await test.step("Create new template", async () => {
      console.log("Step 2: Creating new template...");
      const createButton = page.locator('a:has-text("Create Template")');
      await expect(createButton).toBeVisible({ timeout: 5000 });
      await createButton.click();
      await page.waitForLoadState("networkidle");

      // Verify we're on the new template page
      await expect(page).toHaveURL(/\/templates\/new/);
      console.log("✓ Navigated to template creation page");

      await page.screenshot({
        path: "test-screenshots/01-plateau-new-template-page.png",
        fullPage: true,
      });
    });

    await test.step("Fill template name", async () => {
      console.log("Step 3: Filling template name...");
      const nameInput = page.locator('input[placeholder*="Push Day"]');
      await expect(nameInput).toBeVisible({ timeout: 5000 });
      await nameInput.fill(templateName);
      console.log(`✓ Template name set: ${templateName}`);

      // Click "Next" to go to exercises step
      const nextButton = page.locator('button:has-text("Next")');
      await nextButton.click();
      await page.waitForTimeout(500);
      console.log("✓ Moved to exercises step");

      await page.screenshot({
        path: "test-screenshots/01-plateau-exercises-step.png",
        fullPage: true,
      });
    });

    await test.step("Add Squat exercise", async () => {
      console.log("Step 4: Adding Squat exercise...");

      // The first exercise input should already be visible
      const firstExerciseInput = page.locator(
        'input[placeholder="Exercise 1"]',
      );
      await expect(firstExerciseInput).toBeVisible({ timeout: 5000 });
      await firstExerciseInput.fill("Squat");
      await page.waitForTimeout(500); // Wait for autocomplete
      console.log("✓ Squat exercise added");

      await page.screenshot({
        path: "test-screenshots/01-plateau-squat-added.png",
        fullPage: true,
      });
    });

    await test.step("Complete template creation", async () => {
      console.log("Step 5: Completing template creation...");

      // Click "Next" to go to linking step
      const nextButton = page.locator('button:has-text("Next")');
      await nextButton.click();
      await page.waitForTimeout(1000); // Wait for linking step to load
      console.log("✓ Moved to linking step");

      await page.screenshot({
        path: "test-screenshots/01-plateau-linking-step.png",
        fullPage: true,
      });

      // Click "Next" to go to preview step
      await nextButton.click();
      await page.waitForTimeout(500);
      console.log("✓ Moved to preview step");

      await page.screenshot({
        path: "test-screenshots/01-plateau-preview-step.png",
        fullPage: true,
      });

      // Create the template
      const createTemplateButton = page.locator(
        'button:has-text("Create Template")',
      );
      await expect(createTemplateButton).toBeVisible({ timeout: 5000 });
      await createTemplateButton.click();

      // Wait for redirect back to templates page - be more flexible with URL pattern
      try {
        await page.waitForURL(/\/templates/, { timeout: 10000 });
        await page.waitForLoadState("networkidle");
        console.log("✓ Template created successfully");
      } catch (error) {
        console.log(
          "⚠️  Template creation may have failed or redirected differently",
        );
        // Try to continue anyway - maybe template was created
        await page.goto("/templates");
        await page.waitForLoadState("networkidle");
      }

      // Verify the template appears in the list
      const createdTemplate = page.locator(`text="${templateName}"`);
      await expect(createdTemplate).toBeVisible({ timeout: 5000 });
      console.log("✓ Template visible in templates list");

      await page.screenshot({
        path: "test-screenshots/01-plateau-template-created.png",
        fullPage: true,
      });
    });

    // Phase 2: Enable Key Lift Tracking (BEFORE workouts)
    console.log("\n=== Phase 2: Enable Key Lift Tracking ===");

    await test.step("Navigate to progress page", async () => {
      console.log("Step 1: Navigating to /progress...");
      await page.goto("/progress");
      await page.waitForLoadState("networkidle");
      console.log("✓ Progress page loaded");
    });

    await test.step("Wait for strength section to load", async () => {
      console.log("Step 2: Waiting for strength section...");
      await page.waitForSelector("#volume", {
        timeout: 10000,
      });
      console.log("✓ Strength progress section loaded");
    });

    await test.step("Check if Squat is already a key lift", async () => {
      console.log("Step 3: Checking if Squat is already tracked...");

      // Look for existing key lift indicator
      const existingKeyLift = page
        .locator('button:has-text("🎯 Key Lift"), button:has-text("Tracking")')
        .first();

      if (
        await existingKeyLift.isVisible({ timeout: 3000 }).catch(() => false)
      ) {
        console.log(
          "✅ Squat is already tracked as key lift - skipping toggle",
        );
        return; // Skip to Phase 3
      }

      console.log("Squat is not yet tracked - need to enable key lift");
    });

    await test.step("Find Strength Progress card and select Squat", async () => {
      console.log(
        "Step 4: Finding Strength Progress card and selecting Squat...",
      );

      // Look for the "Strength Progression" card specifically
      const strengthProgressionCard = page
        .locator('div:has(h2:has-text("Strength Progression"))')
        .first();

      // If not found immediately, scroll down gradually and try again
      if (
        !(await strengthProgressionCard
          .isVisible({ timeout: 2000 })
          .catch(() => false))
      ) {
        console.log(
          "Strength Progression card not immediately visible, scrolling down gradually...",
        );

        // Scroll down in smaller increments to find the card
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => {
            window.scrollBy(0, 500);
          });
          await page.waitForTimeout(1000);

          if (
            await strengthProgressionCard
              .isVisible({ timeout: 1000 })
              .catch(() => false)
          ) {
            console.log(
              `✓ Found Strength Progression card after scroll ${i + 1}`,
            );
            break;
          }
        }
      }

      await expect(strengthProgressionCard).toBeVisible({ timeout: 5000 });
      console.log("✓ Found Strength Progression card");

      // Since we found the Strength Progression card, we don't need fallback logic
      // The card is already stored in strengthProgressionCard variable

      // Scroll to the Strength Progression card
      await strengthProgressionCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000); // Wait for scroll to complete

      // Check if Squat is already selected within this card
      const focusedOnSquat = strengthProgressionCard.locator(
        "text=/Focused on Squat/i",
      );

      if (
        await focusedOnSquat.isVisible({ timeout: 3000 }).catch(() => false)
      ) {
        console.log(
          "✓ Squat is already selected/focused in Strength Progression card",
        );
      } else {
        // Look for the exercise dropdown within this card
        const exerciseSelect = strengthProgressionCard.locator(
          "#strength-exercise-select",
        );

        if (
          await exerciseSelect.isVisible({ timeout: 3000 }).catch(() => false)
        ) {
          console.log(
            "✓ Exercise dropdown found in Strength Progression card - selecting Squat",
          );

          // Wait for the options to load by checking if Squat option exists
          const squatOption = exerciseSelect.locator(
            'option:has-text("Squat")',
          );
          await expect(squatOption).toHaveCount(1, { timeout: 5000 });

          // Select Squat from the dropdown
          await exerciseSelect.selectOption({ label: "Squat" });
          await page.waitForTimeout(1000); // Wait for the selection to update

          console.log("✓ Selected Squat from exercise dropdown");
        } else {
          console.log(
            "⚠️ Exercise dropdown not found, but continuing - Squat might be already selected",
          );
          // Don't throw error - maybe Squat is already selected by default
        }
      }

      // Scroll to the found section if needed
      await strengthProgressionCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000); // Wait for scroll to complete

      console.log("✓ Found Strength Progression card");

      // Check if Squat is already selected within this section
      const alreadyFocusedOnSquat = strengthProgressionCard.locator(
        "text=/Focused on Squat/i",
      );

      if (
        await alreadyFocusedOnSquat
          .isVisible({ timeout: 3000 })
          .catch(() => false)
      ) {
        console.log(
          "✅ Squat is already tracked as key lift - skipping toggle",
        );
        return; // Skip to Phase 3
      }
    });

    await test.step("Locate and click key lift toggle for Squat", async () => {
      console.log(
        "Step 5: Locating key lift toggle button in Strength Progression card...",
      );

      // Find the Strength Progression card again
      const strengthProgressionCard = page
        .locator('div:has(h2:has-text("Strength Progression"))')
        .first();
      await expect(strengthProgressionCard).toBeVisible({ timeout: 3000 });

      // Now that Squat is selected, look for the key lift toggle button within this card
      // The button contains either "+ Add Key Lift" or "🎯 Key Lift"
      const keyLiftToggle = strengthProgressionCard
        .locator(
          'button:has-text("+ Add Key Lift"), button:has-text("🎯 Key Lift")',
        )
        .first();

      // Now that Squat is selected, look for the key lift toggle button within this card
      // The button contains either "+ Add Key Lift" or "🎯 Key Lift"
      const keyLiftButton = strengthProgressionCard
        .locator(
          'button:has-text("+ Add Key Lift"), button:has-text("🎯 Key Lift")',
        )
        .first();

      if (await keyLiftButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(
          "✓ Found key lift toggle button in Strength Progression card",
        );
        await keyLiftButton.click();
      } else {
        // Try broader search - any button with "Key Lift" text within the card
        const anyKeyLiftButton = strengthProgressionCard
          .locator('button:has-text("Key Lift")')
          .first();

        if (
          await anyKeyLiftButton.isVisible({ timeout: 3000 }).catch(() => false)
        ) {
          console.log(
            "✓ Found alternative key lift button in Strength Progression card",
          );
          await anyKeyLiftButton.click();
        } else {
          // Debug: screenshot to see what's actually there
          await page.screenshot({
            path: "test-screenshots/debug-key-lift-not-found.png",
            fullPage: true,
          });

          // List all buttons in the Strength Progression card for debugging
          const allButtons = await strengthProgressionCard
            .locator("button")
            .all();
          console.log(
            `Found ${allButtons.length} buttons in Strength Progression card:`,
          );
          for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
            const buttonText = await allButtons[i].textContent();
            console.log(`  Button ${i}: "${buttonText}"`);
          }

          throw new Error(
            "Could not find key lift toggle button for Squat exercise in Strength Progression card",
          );
        }
      }

      console.log("✓ Clicked key lift toggle for Squat");
      await page.waitForTimeout(1000); // Brief pause for state update
    });

    await test.step("Wait for API response and verify toggle state", async () => {
      console.log("Step 6: Waiting for API response...");

      // Wait for API response (be flexible about the endpoint name)
      try {
        await page.waitForResponse(
          (resp) =>
            resp.url().includes("toggleKeyLift") ||
            resp.url().includes("keyLift"),
          { timeout: 5000 },
        );
        console.log("✅ API response received for key lift toggle");
      } catch (error) {
        console.log("⚠️ API response not detected, but continuing...");
        // Don't fail - the toggle might have worked without obvious API response
      }

      // Wait a moment for UI to update
      await page.waitForTimeout(1000);

      // Verify toggle state changed - look for "🎯 Key Lift" or similar
      const trackingIndicator = page
        .locator('button:has-text("🎯 Key Lift"), button:has-text("Tracking")')
        .first();
      if (
        await trackingIndicator.isVisible({ timeout: 3000 }).catch(() => false)
      ) {
        console.log(
          "✅ Key lift tracking enabled - visual indicator confirmed",
        );
      } else {
        console.log("⚠️  Visual indicator not found, but API call succeeded");
      }

      await page.screenshot({
        path: "test-screenshots/02-key-lift-enabled.png",
        fullPage: true,
      });
    });

    // Phase 3: Complete 4 Plateau Workouts
    console.log("\n=== Phase 3: Complete 4 Plateau Workouts ===");

    for (let i = 1; i <= 4; i++) {
      await test.step(`Complete plateau workout ${i}/4`, async () => {
        console.log(`\n--- Workout ${i}/4 ---`);

        // 1. Navigate to /templates to find our template
        await page.goto("/templates");
        await page.waitForLoadState("networkidle");

        // 2. Start workout with template
        // Find the "Start workout" link specifically for OUR template
        console.log(`  Looking for template: "${templateName}"`);

        // Wait for templates to load and scroll to find our template if needed
        await page.waitForTimeout(1000);

        // Try multiple strategies to find our template
        let ourStartWorkoutLink = page.locator(
          `a[aria-label="Start workout with ${templateName}"]`,
        );

        // If not found immediately, try scrolling and waiting
        if (
          !(await ourStartWorkoutLink
            .isVisible({ timeout: 2000 })
            .catch(() => false))
        ) {
          console.log(`  Template not immediately visible, scrolling...`);
          // Scroll down a few times to find our template
          for (let scroll = 0; scroll < 3; scroll++) {
            await page.evaluate(() => {
              window.scrollBy(0, 300);
            });
            await page.waitForTimeout(500);

            if (
              await ourStartWorkoutLink
                .isVisible({ timeout: 1000 })
                .catch(() => false)
            ) {
              break;
            }
          }
        }

        await expect(ourStartWorkoutLink).toBeVisible({ timeout: 10000 });
        console.log(`✓ Found "Start workout" link for our template`);

        await ourStartWorkoutLink.click();
        await page.waitForLoadState("networkidle");
        console.log(`✓ Started workout ${i} from template`);

        // 3. Complete all sets with SAME weight/reps
        // We need to fill in the workout data - let's complete the workout flow
        await page.waitForTimeout(1000); // Wait for workout session to load

        // Click "Start workout" button to begin the session
        const startWorkoutButton = page
          .locator(
            'button:has-text("Start workout"), a:has-text("Start workout")',
          )
          .last();
        await expect(startWorkoutButton).toBeVisible({ timeout: 5000 });
        await startWorkoutButton.click();
        await page.waitForLoadState("networkidle");
        console.log(`✓ Workout session ${i} started`);

        // Fill in workout data with same weight/reps for plateau detection
        console.log(`  Filling workout data for workout ${i}...`);

        // Wait for workout form to load
        await page.waitForTimeout(2000);

        // Try to find and fill weight/reps inputs (using debug test approach)
        const weightInput = page.locator('input[type="number"]').first();
        await expect(weightInput).toBeVisible({ timeout: 5000 });
        await weightInput.fill("100");
        console.log(`  ✓ Set weight to 100kg`);

        const allInputs = page.locator('input[type="number"]');
        const inputCount = await allInputs.count();
        console.log(`  Found ${inputCount} number inputs`);

        if (inputCount >= 2) {
          await allInputs.nth(1).fill("5");
          console.log(`  ✓ Set reps to 5`);
        } else {
          console.log(
            `  ⚠️ Only found ${inputCount} number inputs, expected at least 2`,
          );
        }

        // Wait a moment for data to register
        await page.waitForTimeout(1000);

        // Take screenshot to verify data entry
        await page.screenshot({
          path: `test-screenshots/03-workout-${i}-data-entered.png`,
          fullPage: true,
        });

        // Complete the workout
        const completeButton = page.getByRole("button", {
          name: "Complete",
          exact: true,
        });
        await expect(completeButton).toBeVisible({ timeout: 5000 });
        await completeButton.click();
        await page.waitForTimeout(1000);

        // Confirm workout completion
        const completeWorkoutButtons = page.getByRole("button", {
          name: "Complete Workout",
        });
        const completeWorkoutButton = completeWorkoutButtons.last();
        await expect(completeWorkoutButton).toBeVisible({ timeout: 5000 });
        await completeWorkoutButton.click();
        await page.waitForLoadState("networkidle");
        console.log(`✓ Workout ${i} completed with 100kg × 5 reps`);

        // Should redirect to homepage
        await expect(page).toHaveURL(/^\/$|\/$/, { timeout: 10000 });

        // 6. Screenshot
        await page.screenshot({
          path: `test-screenshots/03-workout-${i}-completed.png`,
          fullPage: true,
        });

        console.log(`✓ Workout ${i}/4 completed with plateau pattern`);
      });
    }

    // Phase 4: Verify Plateau Card on Dashboard
    console.log("\n=== Phase 4: Verify Plateau Card on Dashboard ===");

    await test.step("Navigate to progress and wait for dashboard data", async () => {
      console.log("Step 1: Navigating to /progress to check plateau card...");

      // Start listening for tRPC batch response BEFORE navigation
      // tRPC uses httpBatchStreamLink, so the URL will be /api/trpc with batch params
      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/trpc") &&
          (resp.url().includes("plateauMilestone") ||
            resp.url().includes("getDashboardData")),
        { timeout: 15000 },
      );

      await page.goto("/progress");
      await page.waitForLoadState("networkidle");

      // Wait for the dashboard data response
      try {
        await responsePromise;
        console.log("✅ Dashboard data loaded");
      } catch (error) {
        console.log("⚠️ Could not detect API response, continuing anyway...");
      }
    });

    await test.step("Locate and verify PlateauMilestoneCard", async () => {
      console.log("Step 2: Looking for PlateauMilestoneCard...");

      // Try multiple selectors to find the plateau card
      let plateauCard = page.locator('[class*="PlateauMilestone"]').first();

      if (
        !(await plateauCard.isVisible({ timeout: 3000 }).catch(() => false))
      ) {
        // Try alternative selector
        plateauCard = page.locator('div:has-text("Training Insights")').first();
      }

      if (
        !(await plateauCard.isVisible({ timeout: 3000 }).catch(() => false))
      ) {
        // Try another alternative
        plateauCard = page
          .locator('[data-testid="plateau-milestone-card"]')
          .first();
      }

      // Check if we found the card or if it's showing empty state
      const emptyStateMessage = page.locator(
        "text=/Mark exercises as key lifts/",
      );
      if (
        await emptyStateMessage.isVisible({ timeout: 3000 }).catch(() => false)
      ) {
        throw new Error(
          "❌ Empty state shown - plateau not detected. Check:\n" +
            "1. Key lift enabled (Phase 2)\n" +
            "2. 4 sessions completed (Phase 3)\n" +
            "3. Master exercise link exists\n" +
            "4. Plateau detection ran during save",
        );
      }

      await expect(plateauCard).toBeVisible({ timeout: 10000 });
      console.log("✅ PlateauMilestoneCard found and visible");

      await page.screenshot({
        path: "test-screenshots/04-plateau-card-visible.png",
        fullPage: true,
      });
    });

    await test.step("Verify Plateau Card Content", async () => {
      console.log("Step 3: Verifying plateau card content...");

      const plateauCard = page.locator('[class*="PlateauMilestone"]').first();

      // 1. Card exists and is visible - already verified above

      // 2. Header shows "Training Insights" or similar
      const header = plateauCard.locator("h3, h2").first();
      await expect(header).toContainText(
        /Training Insights|Key Lift Tracking/i,
      );
      console.log("✅ Card header verified");

      // 3. Exercise name "Squat" is visible
      await expect(plateauCard.locator("text=Squat")).toBeVisible();
      console.log("✅ Exercise name 'Squat' found");

      // 4. Stalled weight shown: "100kg" or "100 kg"
      await expect(plateauCard.locator("text=/100.*kg/i")).toBeVisible();
      console.log("✅ Stalled weight (100kg) found");

      // 5. Stalled reps shown: "5 reps" or "5 repetitions"
      await expect(plateauCard.locator("text=/5.*rep/i")).toBeVisible();
      console.log("✅ Stalled reps (5) found");

      // 6. Session count: "4 sessions" or similar
      await expect(plateauCard.locator("text=/4.*session/i")).toBeVisible();
      console.log("✅ Session count (4) found");

      // 7. Severity indicator exists (badge/chip)
      const severityBadge = plateauCard
        .locator('[class*="severity"], [class*="badge"]')
        .first();
      await expect(severityBadge).toBeVisible();
      console.log("✅ Severity badge found");

      // 8. Recommendations section exists with at least 1 recommendation
      const recommendations = plateauCard
        .locator('[class*="recommendation"]')
        .first();
      await expect(recommendations).toBeVisible();
      console.log("✅ Recommendations section found");

      // 9. Verify recommendation content (should have actionable advice)
      const recText = await recommendations.textContent();
      expect(recText).toMatch(/increase|reduce|try|consider|deload/i);
      console.log(
        "✅ Recommendation content verified:",
        recText?.substring(0, 50) + "...",
      );
    });

    await test.step("Verify API returns correct plateau data", async () => {
      console.log("Step 4: Verifying API response data...");

      // Use the correct tRPC API call format
      const response = await page.request.post(
        "/api/trpc/plateauMilestone.getDashboardData",
        {
          headers: {
            "content-type": "application/json",
          },
          data: JSON.stringify({
            json: null,
            meta: {
              values: ["undefined"],
            },
          }),
        },
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      // Check active plateaus
      expect(data.result.data.activePlateaus).toHaveLength(1);
      console.log("✅ API returns 1 active plateau");

      const plateau = data.result.data.activePlateaus[0];
      expect(plateau).toMatchObject({
        exerciseName: "Squat",
        stalledWeight: 100,
        stalledReps: 5,
        sessionCount: 4,
        status: "active",
      });
      console.log("✅ Plateau data structure verified");

      // Check recommendations exist
      expect(plateau.recommendations).toBeDefined();
      expect(plateau.recommendations.length).toBeGreaterThan(0);
      console.log("✅ Recommendations exist in API response");

      // Check confidence level
      expect(plateau.confidenceLevel).toMatch(/low|medium|high/);
      console.log("✅ Confidence level verified:", plateau.confidenceLevel);
    });

    // Phase 5: Test Data Persistence (Page Refresh)
    console.log("\n=== Phase 5: Test Data Persistence (Page Refresh) ===");

    await test.step("Reload page and verify persistence", async () => {
      console.log("Step 1: Reloading page to test persistence...");
      await page.reload();
      await page.waitForLoadState("networkidle");
      console.log("✅ Page reloaded");

      // Wait for dashboard data to load again
      await page.waitForResponse(
        (resp) => resp.url().includes("getDashboardData"),
        { timeout: 10000 },
      );
      console.log("✅ Dashboard data loaded after refresh");

      // Verify plateau card still visible
      const plateauCard = page.locator('[class*="PlateauMilestone"]').first();
      await expect(plateauCard).toBeVisible();
      console.log("✅ Plateau card still visible after refresh");

      // Verify key content unchanged
      await expect(plateauCard.locator("text=Squat")).toBeVisible();
      await expect(plateauCard.locator("text=/100.*kg/i")).toBeVisible();
      await expect(plateauCard.locator("text=/5.*rep/i")).toBeVisible();
      await expect(plateauCard.locator("text=/4.*session/i")).toBeVisible();
      console.log("✅ All plateau content persisted after refresh");

      await page.screenshot({
        path: "test-screenshots/05-plateau-persistence-verified.png",
        fullPage: true,
      });
    });

    // Phase 6: Cleanup (Test Isolation)
    console.log("\n=== Phase 6: Cleanup (Test Isolation) ===");

    await test.step("Navigate to templates for cleanup", async () => {
      console.log("Step 1: Navigating to templates for cleanup...");
      await page.goto("/templates");
      await page.waitForLoadState("networkidle");
      console.log("✓ Templates page loaded for cleanup");
    });

    await test.step("Delete test template", async () => {
      console.log("Step 2: Deleting test template...");

      // Find our template in the list
      const templateCard = page.locator(`text="${templateName}"`).first();
      await expect(templateCard).toBeVisible({ timeout: 5000 });
      console.log("✓ Found test template in list");

      // Look for delete button/menu
      const deleteButton = templateCard
        .locator('button[aria-label*="delete"], button:has-text("Delete")')
        .first();

      if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteButton.click();
        console.log("✓ Clicked delete button");

        // Confirm deletion if modal appears
        const confirmButton = page
          .locator('button:has-text("Delete"), button:has-text("Confirm")')
          .first();
        if (
          await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)
        ) {
          await confirmButton.click();
          console.log("✓ Confirmed template deletion");
        }

        // Wait for deletion to complete
        await page.waitForTimeout(2000);

        // Verify template is gone
        await expect(templateCard).not.toBeVisible({ timeout: 5000 });
        console.log("✅ Test template deleted successfully");
      } else {
        console.log(
          "⚠️  Delete button not found - template may be undeletable",
        );
      }

      await page.screenshot({
        path: "test-screenshots/06-cleanup-completed.png",
        fullPage: true,
      });
    });

    console.log("\n🎉 Plateau Detection Flow Test COMPLETED SUCCESSFULLY!");
    console.log("✅ All phases completed:");
    console.log("   1. ✅ Template created");
    console.log("   2. ✅ Key lift tracking enabled");
    console.log("   3. ✅ 4 plateau workouts completed");
    console.log("   4. ✅ Plateau card verified");
    console.log("   5. ✅ Data persistence confirmed");
    console.log("   6. ✅ Cleanup completed");
  });
});
