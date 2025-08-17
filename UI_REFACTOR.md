# UI Refactor and Migration Plan

This document outlines the plan to refactor the main application's UI to align with the cleaner and more modern design from the `/apps/template/` directory. The goal is to improve the user experience, streamline development, and create a more maintainable codebase.

## Analysis of Differences

A detailed analysis of the current application and the template application revealed the following key differences:

*   **Design System:** The template uses `shadcn/ui` and a modern, token-based design system with OKLCH colors, which is a significant improvement over the current project's custom and complex styling.
*   **Layout:** The template has a much simpler and cleaner layout, with a focus on a central `ThemeProvider`. The current project's layout is cluttered with numerous providers and a custom script to prevent theme flashing.
*   **Navigation:** The template suggests a header-based navigation, while the current project uses a mobile-first bottom tab bar.
*   **Componentization:** The template's pages are built from small, focused components, leading to better modularity and maintainability. The current project's pages are often monolithic components.
*   **Styling:** The template's `globals.css` is well-organized and uses modern CSS features like `@theme` and CSS variables. The current project's CSS is large, complex, and contains many custom styles.

## High-Level Plan

The refactoring will be done in several phases:

1.  **Setup the new design system and foundation**:
    *   Adopt `shadcn/ui` and its dependencies.
    *   Replace the current global styles with the template's styles.
    *   Update the application's fonts to match the template.
    *   Simplify the main layout and move providers to a separate file.

2.  **Refactor the navigation**:
    *   Replace the mobile bottom tab bar with a new header component that includes navigation and user authentication status.

3.  **Refactor the pages**:
    *   Refactor the home, progress, and workout pages to match the template's modular structure.
    *   Create a new dedicated login page.

4.  **Refactor the existing components**:
    *   Audit the existing components and replace them with `shadcn/ui` components wherever possible.
    *   Update the styling of the remaining components to use the new design system.

5.  **Verify Dark Mode**:
    *   Thoroughly test the dark mode implementation across all pages and components.

6.  **Refactor Authentication Pages**:
    *   Update authentication forms and messages to use `shadcn/ui` components.

7.  **Refactor Template Pages**:
    *   Replace custom components and styles with `shadcn/ui` equivalents.

8.  **Refactor Workout Pages**:
    *   Update workout history and start pages with `shadcn/ui` components.

9.  **Refactor Exercise Pages**:
    *   Restyle the exercise manager with `shadcn/ui` components.

10. **Refactor Connect Whoop Page**:
    *   Update the "Connect Whoop" page to use the new design system.

11. **Refactor Legal Pages**:
    *   Improve the readability of legal pages with `shadcn/ui` typography and layout.


## Detailed Task Checklist

### Phase 1: Design System and Foundation

-   [ ] **Adopt `shadcn/ui`**:
    -   [ ] Install `shadcn-ui` and its dependencies.
    -   [ ] Use the `apps/template` as a reference for which components to use.
    -   [ ] Remove the existing custom components in `src/app/_components/ui` and replace them with `shadcn/ui` components.
-   [ ] **Update Global Styles**:
    -   [ ] Replace the content of `src/styles/globals.css` with the content of `apps/template/styles/globals.css`.
    -   [ ] Update `DESIGN_SYSTEM.md` to reflect the new changes.
-   [ ] **Update Fonts**:
    -   [ ] In `src/app/layout.tsx`, replace `Geist`, `Inter`, and `Space_Grotesk` with `Open_Sans` and `Montserrat` from the template.
-   [ ] **Simplify Layout**:
    -   [ ] Refactor `src/app/layout.tsx` to be as simple as the template's `layout.tsx`.
    -   [ ] Move all the providers (`TRPCReactProvider`, `PostHogProvider`, `AuthProvider`, etc.) to a new `src/app/providers.tsx` file.
    -   [ ] Remove the `noFoucScript` and rely on the `next-themes` `ThemeProvider`.

### Phase 2: Navigation

-   [ ] **Replace Mobile Bottom Tab Bar**:
    -   [ ] Remove the mobile bottom tab bar from `src/app/layout.tsx`.
-   [ ] **Create a new Header Component**:
    -   [ ] Create a new `src/app/_components/header.tsx` component.
    *   [ ] The header should include the application logo, navigation links (e.g., "Dashboard", "Progress", "Workout", "Templates"), and a user menu with a sign-out button.
    *   [ ] The header should be responsive and adapt to different screen sizes.

### Phase 3: Page Refactoring

-   [ ] **Refactor the Home Page (`/`)**:
    -   [ ] Create the following new components in `src/app/_components/dashboard/`:
        -   [ ] `DashboardHeader`
        -   [ ] `StatsCards`
        -   [ ] `QuickActions`
        -   [ ] `WeeklyProgress`
        -   [ ] `RecentWorkouts`
    -   [ ] Replace the content of `src/app/page.tsx` with the new dashboard layout, composing it from the new components.
-   [ ] **Create a new Login Page (`/login`)**:
    -   [ ] Create a new `src/app/login/page.tsx` file.
    -   [ ] This page will contain the sign-in buttons.
    -   [ ] Redirect unauthenticated users from the home page to this page.
-   [ ] **Refactor the Progress Page (`/progress`)**:
    -   [ ] Create the following new components in `src/app/_components/progress/`:
        -   [ ] `ProgressStats`
        -   [ ] `StrengthChart`
        -   [ ] `ConsistencyTracker`
        -   [ ] `AchievementsBadges`
        -   [ ] `YourExercises`
        -   [ ] `PersonalRecords`
        -   [ ] `VolumeAnalysis`
        -   [ ] `TrainingAnalytics`
    -   [ ] Update `src/app/progress/page.tsx` to use these new components.
-   [ ] **Refactor the Workout Page (`/workout/session/[id]`)**:
    -   [ ] Create the following new components in `src/app/_components/workout/`:
        -   [ ] `WorkoutHeader` (with back button and workout details)
        -   [ ] `WorkoutIntelligence`
        -   [ ] `ExerciseLogger`
        -   [ ] `WorkoutControls`
    -   [ ] Update `src/app/workout/session/[id]/page.tsx` to use these new components.

### Phase 4: Component Refactoring

-   [ ] **Audit and Replace Existing Components**:
    -   [ ] Go through all the components in `src/app/_components/` and identify which ones can be replaced with `shadcn/ui` components or the new components we've created.
    -   [ ] Replace the existing `Card` component with the `shadcn/ui` `Card`.
-   [ ] **Update Styling**:
    -   [ ] During the component refactoring, ensure that all components use the new design tokens and utility classes from `globals.css`.
    -   [ ] Remove any inline styles or old CSS classes that are no longer needed.

### Phase 5: Dark Mode

-   [ ] **Verify Dark Mode**:
    -   [ ] The new `globals.css` from the template already includes a dark mode implementation using the `.dark` class.
    -   [ ] Ensure that the `ThemeProvider` is correctly configured to toggle the dark mode.
    -   [ ] Thoroughly test all pages and components in both light and dark modes to ensure that the UI is consistent and looks good.

### Phase 6: Authentication

-   [ ] **Goal:** Refactor the authentication pages to use the new design system.
-   [ ] **Pages:**
    -   [ ] `/auth/login`
    -   [ ] `/auth/register`
    -   [ ] `/auth/auth-code-error`
-   [ ] **Tasks:**
    -   [ ] Refactor the login and register forms to use `shadcn/ui` form components (`Input`, `Button`, `Label`, etc.).
    -   [ ] Replace the custom error and success message components with `shadcn/ui` `Alert` and `AlertDescription` components.
    -   [ ] Ensure the layout of the authentication pages is consistent with the new design system.
    -   [ ] Restyle the `GoogleAuthButton` to match the new design.

### Phase 7: Templates

-   [ ] **Goal:** Refactor the workout templates pages to use the new design system.
-   [ ] **Pages:**
    -   [ ] `/templates`
    -   [ ] `/templates/new`
    -   [ ] `/templates/[id]/edit`
-   [ ] **Tasks:**
    -   [ ] Replace the `GlassHeader` on the templates list page with a standard `shadcn/ui` header.
    -   [ ] Replace the `glass-surface` card with a `shadcn/ui` `Card`.
    -   [ ] Refactor the `TemplateForm` component to use `shadcn/ui` form components.
    -   [ ] Ensure the overall layout and styling of the templates pages are consistent with the new design system.

### Phase 8: Workouts

-   [ ] **Goal:** Refactor the remaining workout-related pages.
-   [ ] **Pages:**
    -   [ ] `/workouts`
    -   [ ] `/workout/start`
-   [ ] **Tasks:**
    -   [ ] Replace the `GlassHeader` on the workout history page with a standard `shadcn/ui` header.
    -   [ ] Restyle the `WorkoutHistory` component to use `shadcn/ui` components (e.g., `Table`, `Card`).
    -   [ ] Restyle the `WorkoutStarter` component on the `/workout/start` page to use `shadcn/ui` components.

### Phase 9: Exercises

-   [ ] **Goal:** Refactor the exercise management page.
-   [ ] **Page:** `/exercises`
-   [ ] **Tasks:**
    -   [ ] Restyle the `ExerciseManager` component to use `shadcn/ui` components (e.g., `Table`, `Dialog`, `Button`).
    -   [ ] Ensure the layout and styling of the exercise management page are consistent with the new design system.

### Phase 10: Connect Whoop

-   [ ] **Goal:** Refactor the "Connect Whoop" page.
-   [ ] **Page:** `/connect-whoop`
-   [ ] **Tasks:**
    -   [ ] Restyle the `WhoopWorkouts` component to use `shadcn/ui` components.
    -   [ ] Update the layout of the page to be consistent with the new design system.

### Phase 11: Legal Pages

-   [ ] **Goal:** Improve the styling of the legal pages.
-   [ ] **Pages:**
    -   [ ] `/privacy`
    -   [ ] `/terms`
-   [ ] **Tasks:**
    -   [ ] Create a new layout component for the legal pages that uses `shadcn/ui` typography and layout components to improve readability.
    -   [ ] Apply this new layout to the privacy and terms pages.

## Contributing

When contributing to this refactoring effort, please adhere to the following guidelines:

*   Create a new branch for each feature or component you are working on.
*   Follow the new design system and styling conventions.
*   Write unit tests for new components.
*   Ensure that the application is fully functional and free of regressions before submitting a pull request.
