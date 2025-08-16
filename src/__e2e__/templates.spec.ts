import { test, expect } from "@playwright/test";
import { TemplatesPage } from "./pages/templates-page";
import { createTestTemplate, createTestMasterExercises, getTestUser } from "./setup/test-database";

test.describe("Template Management", () => {
  let templatesPage: TemplatesPage;

  test.beforeEach(async ({ page }) => {
    templatesPage = new TemplatesPage(page);
    // Ensure we're authenticated for all tests
    await templatesPage.auth.ensureAuthenticated();
  });

  test.describe("Template List", () => {
    test("should display templates page", async () => {
      await templatesPage.goto();
      await templatesPage.verifyOnTemplatesPage();
    });

    test("should show new template button", async () => {
      await templatesPage.goto();
      
      const newTemplateButton = templatesPage.page.locator('[data-testid="new-template-button"], button:has-text("New Template")');
      await expect(newTemplateButton).toBeVisible();
    });

    test("should navigate to new template page", async () => {
      await templatesPage.goto();
      await templatesPage.clickNewTemplate();
      await templatesPage.verifyOnNewTemplatePage();
    });
  });

  test.describe("Template Creation", () => {
    test("should create a basic template", async () => {
      const templateName = "Basic Push Workout";
      const exercises = [
        { name: "Bench Press", sets: 3, reps: "8-10", rest: 120 },
        { name: "Push-ups", sets: 2, reps: "12-15", rest: 60 },
      ];

      await templatesPage.createTemplate(templateName, exercises);
      
      // Verify we're back on templates list
      await templatesPage.verifyOnTemplatesPage();
      
      // Verify template appears in list
      const templateExists = await templatesPage.verifyTemplateExists(templateName);
      expect(templateExists).toBe(true);
    });

    test("should create template with detailed exercise info", async () => {
      const templateName = "Detailed Leg Workout";
      const exercises = [
        {
          name: "Squats",
          sets: 4,
          reps: "6-8",
          rest: 180,
          notes: "Focus on depth and control",
        },
        {
          name: "Romanian Deadlifts",
          sets: 3,
          reps: "10-12",
          rest: 120,
          notes: "Keep back straight",
        },
      ];

      await templatesPage.createTemplate(templateName, exercises);
      
      // Verify template creation
      const templateExists = await templatesPage.verifyTemplateExists(templateName);
      expect(templateExists).toBe(true);
    });

    test("should require template name", async () => {
      await templatesPage.goToNewTemplate();
      
      // Try to save without name
      const saveButton = templatesPage.page.locator('[data-testid="save-template"], button:has-text("Save")');
      await saveButton.click();
      
      // Should stay on new template page or show validation error
      await templatesPage.verifyOnNewTemplatePage();
    });

    test("should add multiple exercises", async () => {
      const templateName = "Full Body Circuit";
      const exercises = [
        { name: "Push-ups", sets: 2, reps: "10" },
        { name: "Squats", sets: 2, reps: "15" },
        { name: "Pull-ups", sets: 2, reps: "5" },
        { name: "Lunges", sets: 2, reps: "12" },
      ];

      await templatesPage.createTemplate(templateName, exercises);
      
      // Verify template with multiple exercises
      const templateExists = await templatesPage.verifyTemplateExists(templateName);
      expect(templateExists).toBe(true);
    });
  });

  test.describe("Template Editing", () => {
    test("should edit template name", async () => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "Original Name");
      
      await templatesPage.goto();
      await templatesPage.editTemplate("Original Name");
      
      // Update name
      const newName = "Updated Template Name";
      await templatesPage.updateTemplateName(newName);
      
      // Verify name change
      const templateExists = await templatesPage.verifyTemplateExists(newName);
      expect(templateExists).toBe(true);
      
      const oldExists = await templatesPage.verifyTemplateExists("Original Name");
      expect(oldExists).toBe(false);
    });

    test("should add exercise to existing template", async () => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "Expandable Workout");
      
      await templatesPage.goto();
      await templatesPage.editTemplate("Expandable Workout");
      
      // Add new exercise
      await templatesPage.addExercise({
        name: "New Exercise",
        sets: 3,
        reps: "8-10",
        rest: 90,
      });
      
      // Save changes
      const saveButton = templatesPage.page.locator('[data-testid="save-template"], button:has-text("Save")');
      await saveButton.click();
      
      await templatesPage.verifyOnTemplatesPage();
    });

    test("should remove exercise from template", async () => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "Removable Exercise Workout");
      
      await templatesPage.goto();
      await templatesPage.editTemplate("Removable Exercise Workout");
      
      // Remove first exercise (index 0)
      await templatesPage.removeExercise(0);
      
      // Save changes
      const saveButton = templatesPage.page.locator('[data-testid="save-template"], button:has-text("Save")');
      await saveButton.click();
      
      await templatesPage.verifyOnTemplatesPage();
    });

    test("should cancel template editing", async () => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "Cancel Test Template");
      
      await templatesPage.goto();
      await templatesPage.editTemplate("Cancel Test Template");
      
      // Make some changes
      await templatesPage.fillInput('[data-testid="template-name-input"]', "Changed Name");
      
      // Cancel instead of saving
      await templatesPage.cancel();
      
      // Verify we're back on templates page
      await templatesPage.verifyOnTemplatesPage();
      
      // Verify original name is preserved
      const originalExists = await templatesPage.verifyTemplateExists("Cancel Test Template");
      expect(originalExists).toBe(true);
    });
  });

  test.describe("Template Deletion", () => {
    test("should delete template", async () => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "Template To Delete");
      
      await templatesPage.goto();
      
      // Verify template exists before deletion
      let templateExists = await templatesPage.verifyTemplateExists("Template To Delete");
      expect(templateExists).toBe(true);
      
      // Delete template
      await templatesPage.deleteTemplate("Template To Delete");
      
      // Verify template is gone
      templateExists = await templatesPage.verifyTemplateExists("Template To Delete");
      expect(templateExists).toBe(false);
    });

    test("should confirm deletion in modal", async () => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "Confirm Delete Template");
      
      await templatesPage.goto();
      
      const templateElement = await templatesPage.findTemplateByName("Confirm Delete Template");
      const deleteButton = templateElement.locator('[data-testid="delete-template"], button:has-text("Delete")');
      await deleteButton.click();
      
      // Should show confirmation modal
      const confirmButton = templatesPage.page.locator('[data-testid="confirm-delete"], button:has-text("Confirm")');
      await expect(confirmButton).toBeVisible();
      
      // Cancel first
      const cancelButton = templatesPage.page.locator('button:has-text("Cancel")');
      if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click();
        
        // Template should still exist
        const stillExists = await templatesPage.verifyTemplateExists("Confirm Delete Template");
        expect(stillExists).toBe(true);
      }
    });
  });

  test.describe("Template Search", () => {
    test("should search templates by name", async () => {
      const testUser = getTestUser();
      
      // Create multiple templates
      await createTestTemplate(testUser.id, "Push Day Workout");
      await createTestTemplate(testUser.id, "Pull Day Workout");
      await createTestTemplate(testUser.id, "Leg Day Workout");
      
      await templatesPage.goto();
      
      // Search for "Push"
      await templatesPage.searchTemplates("Push");
      
      // Should show only push-related templates
      const templateNames = await templatesPage.getTemplateNames();
      const pushTemplates = templateNames.filter(name => name.includes("Push"));
      expect(pushTemplates.length).toBeGreaterThan(0);
    });

    test("should show no results for invalid search", async () => {
      await templatesPage.goto();
      
      await templatesPage.searchTemplates("NonExistentTemplate");
      
      // Should show no templates or empty state
      const templateCount = await templatesPage.getTemplateCount();
      expect(templateCount).toBe(0);
    });

    test("should clear search and show all templates", async () => {
      const testUser = getTestUser();
      await createTestTemplate(testUser.id, "Searchable Template");
      
      await templatesPage.goto();
      
      const initialCount = await templatesPage.getTemplateCount();
      
      // Search for something
      await templatesPage.searchTemplates("Searchable");
      
      // Clear search
      await templatesPage.searchTemplates("");
      
      // Should show all templates again
      const finalCount = await templatesPage.getTemplateCount();
      expect(finalCount).toBe(initialCount);
    });
  });

  test.describe("Template Validation", () => {
    test("should validate required fields", async () => {
      await templatesPage.goToNewTemplate();
      
      // Try to save without any data
      const saveButton = templatesPage.page.locator('[data-testid="save-template"], button:has-text("Save")');
      await saveButton.click();
      
      // Should stay on new template page
      await templatesPage.verifyOnNewTemplatePage();
    });

    test("should validate exercise data", async () => {
      await templatesPage.goToNewTemplate();
      
      // Fill template name
      await templatesPage.fillInput('[data-testid="template-name-input"]', "Validation Test");
      
      // Add exercise with invalid data
      await templatesPage.addExercise({
        name: "", // Empty name
        sets: 0,  // Invalid sets
        reps: "", // Empty reps
      });
      
      const saveButton = templatesPage.page.locator('[data-testid="save-template"], button:has-text("Save")');
      await saveButton.click();
      
      // Should show validation errors or stay on page
      await templatesPage.verifyOnNewTemplatePage();
    });
  });
});