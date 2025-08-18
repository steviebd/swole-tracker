import { expect } from "@playwright/test";
import { BasePage } from "./base-page";

export class TemplatesPage extends BasePage {
  // Selectors
  private readonly newTemplateButton = '[data-testid="new-template-button"], button:has-text("New Template")';
  private readonly templatesList = '[data-testid="templates-list"]';
  private readonly templateItem = '[data-testid^="template-item"]';
  private readonly templateName = '[data-testid="template-name"]';
  private readonly editTemplateButton = '[data-testid="edit-template"], button:has-text("Edit")';
  private readonly deleteTemplateButton = '[data-testid="delete-template"], button:has-text("Delete")';
  private readonly confirmDeleteButton = '[data-testid="confirm-delete"], button:has-text("Confirm")';
  private readonly searchInput = '[data-testid="template-search"], input[placeholder*="Search"]';

  // Template form selectors
  private readonly templateNameInput = '[data-testid="template-name-input"], input[name="name"]';
  private readonly addExerciseButton = '[data-testid="add-exercise"], button:has-text("Add Exercise")';
  private readonly exerciseNameInput = '[data-testid="exercise-name-input"]';
  private readonly exerciseTargetSets = '[data-testid="target-sets-input"]';
  private readonly exerciseTargetReps = '[data-testid="target-reps-input"]';
  private readonly exerciseRestPeriod = '[data-testid="rest-period-input"]';
  private readonly exerciseNotes = '[data-testid="exercise-notes-input"]';
  private readonly saveTemplateButton = '[data-testid="save-template"], button:has-text("Save")';
  private readonly cancelButton = '[data-testid="cancel"], button:has-text("Cancel")';
  private readonly removeExerciseButton = '[data-testid="remove-exercise"]';

  /**
   * Navigate to templates page
   */
  async goto() {
    await this.auth.visitProtectedRoute("/templates");
    await this.waitForLoad();
  }

  /**
   * Navigate to new template page
   */
  async goToNewTemplate() {
    await this.auth.visitProtectedRoute("/templates/new");
    await this.waitForLoad();
  }

  /**
   * Click new template button
   */
  async clickNewTemplate() {
    await this.clickElement(this.newTemplateButton);
    await this.waitForUrl(/\/templates\/new/);
  }

  /**
   * Create a new template
   */
  async createTemplate(name: string, exercises: Array<{
    name: string;
    sets?: number;
    reps?: string;
    rest?: number;
    notes?: string;
  }>) {
    await this.goToNewTemplate();
    
    // Fill template name
    await this.fillInput(this.templateNameInput, name);
    
    // Add exercises
    for (let i = 0; i < exercises.length; i++) {
      const exercise = exercises[i]!;
      
      if (i > 0) {
        // Click add exercise for additional exercises
        await this.clickElement(this.addExerciseButton);
      }
      
      // Fill exercise details
      const exerciseSection = this.page.locator(`[data-testid="exercise-${i}"]`);
      
      await exerciseSection.locator(this.exerciseNameInput).fill(exercise.name);
      
      if (exercise.sets) {
        await exerciseSection.locator(this.exerciseTargetSets).fill(exercise.sets.toString());
      }
      
      if (exercise.reps) {
        await exerciseSection.locator(this.exerciseTargetReps).fill(exercise.reps);
      }
      
      if (exercise.rest) {
        await exerciseSection.locator(this.exerciseRestPeriod).fill(exercise.rest.toString());
      }
      
      if (exercise.notes) {
        await exerciseSection.locator(this.exerciseNotes).fill(exercise.notes);
      }
    }
    
    // Save template
    await this.clickElement(this.saveTemplateButton);
    
    // Wait for redirect back to templates list
    await this.waitForUrl(/\/templates$/);
  }

  /**
   * Get list of template names
   */
  async getTemplateNames(): Promise<string[]> {
    await this.waitForElement(this.templatesList);
    const templateElements = await this.page.locator(this.templateName).all();
    return await Promise.all(templateElements.map(el => el.textContent().then(text => text || "")));
  }

  /**
   * Find template by name
   */
  async findTemplateByName(name: string) {
    const templateItems = await this.page.locator(this.templateItem).all();
    
    for (const item of templateItems) {
      const templateName = await item.locator(this.templateName).textContent();
      if (templateName?.includes(name)) {
        return item;
      }
    }
    
    throw new Error(`Template "${name}" not found`);
  }

  /**
   * Edit template by name
   */
  async editTemplate(name: string) {
    const template = await this.findTemplateByName(name);
    await template.locator(this.editTemplateButton).click();
    
    // Wait for edit page to load
    await this.waitForUrl(/\/templates\/.*\/edit/);
  }

  /**
   * Delete template by name
   */
  async deleteTemplate(name: string) {
    const template = await this.findTemplateByName(name);
    await template.locator(this.deleteTemplateButton).click();
    
    // Confirm deletion
    await this.clickElement(this.confirmDeleteButton);
    
    // Wait for template to be removed
    await this.page.waitForTimeout(1000);
  }

  /**
   * Search for templates
   */
  async searchTemplates(searchTerm: string) {
    await this.fillInput(this.searchInput, searchTerm);
    await this.page.waitForTimeout(500); // Wait for debounced search
  }

  /**
   * Verify template exists in list
   */
  async verifyTemplateExists(name: string): Promise<boolean> {
    try {
      await this.findTemplateByName(name);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get template count
   */
  async getTemplateCount(): Promise<number> {
    const templates = await this.page.locator(this.templateItem).all();
    return templates.length;
  }

  /**
   * Update template name
   */
  async updateTemplateName(newName: string) {
    await this.fillInput(this.templateNameInput, newName);
    await this.clickElement(this.saveTemplateButton);
    await this.waitForUrl(/\/templates$/);
  }

  /**
   * Add exercise to current template
   */
  async addExercise(exercise: {
    name: string;
    sets?: number;
    reps?: string;
    rest?: number;
    notes?: string;
  }) {
    await this.clickElement(this.addExerciseButton);
    
    // Get the last exercise form (newly added)
    const exerciseForms = await this.page.locator('[data-testid^="exercise-"]').all();
    const lastExercise = exerciseForms[exerciseForms.length - 1]!;
    
    await lastExercise.locator(this.exerciseNameInput).fill(exercise.name);
    
    if (exercise.sets) {
      await lastExercise.locator(this.exerciseTargetSets).fill(exercise.sets.toString());
    }
    
    if (exercise.reps) {
      await lastExercise.locator(this.exerciseTargetReps).fill(exercise.reps);
    }
    
    if (exercise.rest) {
      await lastExercise.locator(this.exerciseRestPeriod).fill(exercise.rest.toString());
    }
    
    if (exercise.notes) {
      await lastExercise.locator(this.exerciseNotes).fill(exercise.notes);
    }
  }

  /**
   * Remove exercise at index
   */
  async removeExercise(index: number) {
    const exerciseSection = this.page.locator(`[data-testid="exercise-${index}"]`);
    await exerciseSection.locator(this.removeExerciseButton).click();
  }

  /**
   * Verify we're on templates page
   */
  async verifyOnTemplatesPage() {
    await expect(this.page.locator(this.templatesList)).toBeVisible();
    expect(this.getCurrentUrl()).toContain("/templates");
  }

  /**
   * Verify we're on new template page
   */
  async verifyOnNewTemplatePage() {
    await expect(this.page.locator(this.templateNameInput)).toBeVisible();
    expect(this.getCurrentUrl()).toContain("/templates/new");
  }

  /**
   * Cancel template creation/edit
   */
  async cancel() {
    await this.clickElement(this.cancelButton);
    await this.waitForUrl(/\/templates$/);
  }
}