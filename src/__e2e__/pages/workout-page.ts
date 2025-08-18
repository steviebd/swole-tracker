import { expect } from "@playwright/test";
import { BasePage } from "./base-page";

export class WorkoutPage extends BasePage {
  // Workout start page selectors
  private readonly startWorkoutButton = '[data-testid="start-workout"], button:has-text("Start Workout")';
  private readonly templateSelector = '[data-testid="template-selector"]';
  private readonly templateOption = '[data-testid^="template-option"]';
  private readonly quickStartButton = '[data-testid="quick-start"], button:has-text("Quick Start")';

  // Workout session selectors
  private readonly exerciseList = '[data-testid="exercise-list"]';
  private readonly exerciseItem = '[data-testid^="exercise-item"]';
  private readonly exerciseName = '[data-testid="exercise-name"]';
  private readonly addSetButton = '[data-testid="add-set"], button:has-text("Add Set")';
  private readonly setInput = '[data-testid^="set-input"]';
  private readonly weightInput = '[data-testid="weight-input"]';
  private readonly repsInput = '[data-testid="reps-input"]';
  private readonly rpeInput = '[data-testid="rpe-input"]';
  private readonly completeSetButton = '[data-testid="complete-set"]';
  private readonly finishWorkoutButton = '[data-testid="finish-workout"], button:has-text("Finish")';
  private readonly saveWorkoutButton = '[data-testid="save-workout"], button:has-text("Save")';
  private readonly discardWorkoutButton = '[data-testid="discard-workout"], button:has-text("Discard")';
  
  // Workout session info
  private readonly workoutTimer = '[data-testid="workout-timer"]';
  private readonly currentExercise = '[data-testid="current-exercise"]';
  private readonly setCounter = '[data-testid="set-counter"]';
  private readonly restTimer = '[data-testid="rest-timer"]';

  // Workout history selectors
  private readonly workoutsList = '[data-testid="workouts-list"]';
  private readonly workoutItem = '[data-testid^="workout-item"]';
  private readonly workoutDate = '[data-testid="workout-date"]';
  private readonly workoutName = '[data-testid="workout-name"]';
  private readonly workoutDuration = '[data-testid="workout-duration"]';

  /**
   * Navigate to start workout page
   */
  async goToStartWorkout() {
    await this.auth.visitProtectedRoute("/workout/start");
    await this.waitForLoad();
  }

  /**
   * Navigate to workouts history
   */
  async goToWorkoutsHistory() {
    await this.auth.visitProtectedRoute("/workouts");
    await this.waitForLoad();
  }

  /**
   * Start workout from template
   */
  async startWorkoutFromTemplate(templateName: string) {
    await this.goToStartWorkout();
    
    // Select template
    await this.clickElement(this.templateSelector);
    
    const templateOptions = await this.page.locator(this.templateOption).all();
    for (const option of templateOptions) {
      const optionText = await option.textContent();
      if (optionText?.includes(templateName)) {
        await option.click();
        break;
      }
    }
    
    // Start the workout
    await this.clickElement(this.startWorkoutButton);
    
    // Wait for workout session to load
    await this.waitForUrl(/\/workout\/session/);
  }

  /**
   * Start quick workout (no template)
   */
  async startQuickWorkout() {
    await this.goToStartWorkout();
    await this.clickElement(this.quickStartButton);
    await this.waitForUrl(/\/workout\/session/);
  }

  /**
   * Log a set for an exercise
   */
  async logSet(exerciseIndex: number, weight: number, reps: number, rpe?: number) {
    const exercise = this.page.locator(this.exerciseItem).nth(exerciseIndex);
    
    // Click add set if needed
    const addSetBtn = exercise.locator(this.addSetButton);
    if (await addSetBtn.isVisible().catch(() => false)) {
      await addSetBtn.click();
    }
    
    // Find the current set input (last one)
    const setInputs = await exercise.locator(this.setInput).all();
    const currentSet = setInputs[setInputs.length - 1]!;
    
    // Fill set data
    await currentSet.locator(this.weightInput).fill(weight.toString());
    await currentSet.locator(this.repsInput).fill(reps.toString());
    
    if (rpe && await currentSet.locator(this.rpeInput).isVisible().catch(() => false)) {
      await currentSet.locator(this.rpeInput).fill(rpe.toString());
    }
    
    // Complete the set
    await currentSet.locator(this.completeSetButton).click();
  }

  /**
   * Log multiple sets for an exercise
   */
  async logSets(exerciseIndex: number, sets: Array<{weight: number, reps: number, rpe?: number}>) {
    for (const set of sets) {
      await this.logSet(exerciseIndex, set.weight, set.reps, set.rpe);
    }
  }

  /**
   * Finish and save the current workout
   */
  async finishWorkout() {
    await this.clickElement(this.finishWorkoutButton);
    
    // Confirm save if modal appears
    if (await this.isVisible(this.saveWorkoutButton)) {
      await this.clickElement(this.saveWorkoutButton);
    }
    
    // Wait for redirect to workouts history or dashboard
    await this.waitForUrl(/\/workouts|\/$/);
  }

  /**
   * Discard the current workout
   */
  async discardWorkout() {
    await this.clickElement(this.discardWorkoutButton);
    
    // Confirm discard if modal appears
    const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Discard")');
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
    }
    
    await this.waitForUrl(/\/workout\/start|\/$/);
  }

  /**
   * Get current workout timer
   */
  async getWorkoutTimer(): Promise<string> {
    const timer = await this.page.locator(this.workoutTimer).textContent();
    return timer || "00:00";
  }

  /**
   * Get current exercise name
   */
  async getCurrentExercise(): Promise<string> {
    const exercise = await this.page.locator(this.currentExercise).textContent();
    return exercise || "";
  }

  /**
   * Get exercise names in workout
   */
  async getExerciseNames(): Promise<string[]> {
    const exercises = await this.page.locator(this.exerciseName).all();
    return await Promise.all(exercises.map(el => el.textContent().then(text => text || "")));
  }

  /**
   * Check if we're in an active workout session
   */
  async isInWorkoutSession(): Promise<boolean> {
    return this.getCurrentUrl().includes("/workout/session");
  }

  /**
   * Get workout history items
   */
  async getWorkoutHistoryItems() {
    await this.waitForElement(this.workoutsList);
    const workouts = await this.page.locator(this.workoutItem).all();
    
    const workoutData = [];
    for (const workout of workouts) {
      const date = await workout.locator(this.workoutDate).textContent();
      const name = await workout.locator(this.workoutName).textContent();
      const duration = await workout.locator(this.workoutDuration).textContent();
      
      workoutData.push({
        date: date || "",
        name: name || "",
        duration: duration || "",
      });
    }
    
    return workoutData;
  }

  /**
   * Find workout in history by name
   */
  async findWorkoutInHistory(workoutName: string) {
    const workouts = await this.page.locator(this.workoutItem).all();
    
    for (const workout of workouts) {
      const name = await workout.locator(this.workoutName).textContent();
      if (name?.includes(workoutName)) {
        return workout;
      }
    }
    
    throw new Error(`Workout "${workoutName}" not found in history`);
  }

  /**
   * Click on workout in history
   */
  async viewWorkoutDetails(workoutName: string) {
    const workout = await this.findWorkoutInHistory(workoutName);
    await workout.click();
    
    // Wait for workout details to load
    await this.waitForUrl(/\/workouts\//);
  }

  /**
   * Add exercise to current workout
   */
  async addExerciseToWorkout(exerciseName: string) {
    const addExerciseButton = '[data-testid="add-exercise-to-workout"], button:has-text("Add Exercise")';
    await this.clickElement(addExerciseButton);
    
    // Fill exercise name in modal/form
    const exerciseInput = '[data-testid="exercise-search"], input[placeholder*="exercise"]';
    await this.fillInput(exerciseInput, exerciseName);
    
    // Select exercise from dropdown or confirm
    const confirmButton = '[data-testid="confirm-add-exercise"], button:has-text("Add")';
    await this.clickElement(confirmButton);
  }

  /**
   * Verify we're on workout start page
   */
  async verifyOnStartWorkoutPage() {
    await expect(this.page.locator(this.templateSelector)).toBeVisible();
    expect(this.getCurrentUrl()).toContain("/workout/start");
  }

  /**
   * Verify we're in workout session
   */
  async verifyInWorkoutSession() {
    await expect(this.page.locator(this.exerciseList)).toBeVisible();
    expect(this.getCurrentUrl()).toMatch(/\/workout\/session/);
  }

  /**
   * Verify we're on workouts history page
   */
  async verifyOnWorkoutsHistoryPage() {
    await expect(this.page.locator(this.workoutsList)).toBeVisible();
    expect(this.getCurrentUrl()).toContain("/workouts");
  }

  /**
   * Wait for rest timer to appear
   */
  async waitForRestTimer() {
    await this.waitForElement(this.restTimer);
  }

  /**
   * Skip rest timer
   */
  async skipRest() {
    const skipButton = '[data-testid="skip-rest"], button:has-text("Skip")';
    if (await this.isVisible(skipButton)) {
      await this.clickElement(skipButton);
    }
  }
}