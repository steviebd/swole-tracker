# UI Refactor and Migration Plan

This document outlines the plan to refactor the main application's UI to align with the cleaner and more modern design from the `/apps/template/` directory. The goal is to improve the user experience, streamline development, and create a more maintainable codebase.

## High-Level Plan

The refactoring will be done in several phases:

1.  **Setup the new design system**:
    *   Install `shadcn/ui` and its dependencies.
    *   Configure the theme provider and global styles to match the template.
    *   Create a new `tailwind.config.js` that aligns with the template's configuration.

2.  **Refactor the layout**:
    *   Create a new `layout.tsx` that is simpler and more aligned with the template's layout.
    *   Move the providers to a more appropriate location, such as a `providers` directory.
    *   Replace the mobile bottom tab bar with a more modern navigation component, such as a sidebar or a header with a dropdown menu.

3.  **Refactor the home page**:
    *   Break down the `page.tsx` into smaller, more manageable components, similar to the template's dashboard page.
    *   Create new components for the dashboard header, stats cards, quick actions, weekly progress, and recent workouts.
    *   Replace the existing UI components with the new components from the design system.

4.  **Refactor the existing components**:
    *   Audit the existing components in `src/app/_components/` and identify which ones can be replaced with the new design system components.
    *   Refactor the remaining components to use the new design system and styling conventions.

## Detailed Task Checklist

### Phase 1: Design System Setup

-   [ ] Install `shadcn/ui` and its dependencies:
    ```bash
    bun add shadcn-ui@latest radix-ui-themes @radix-ui/react-icons
    ```
-   [ ] Initialize `shadcn/ui`:
    ```bash
    bunx shadcn-ui@latest init
    ```
-   [ ] Configure `tailwind.config.js` to match the template's configuration.
-   [ ] Configure `globals.css` to match the template's global styles.
-   [ ] Configure the `ThemeProvider` from `next-themes`.

### Phase 2: Layout Refactor

-   [ ] Create a new `src/app/layout.tsx` that is simpler and more aligned with the template's layout.
-   [ ] Move the providers (`TRPCReactProvider`, `PostHogProvider`, `AuthProvider`, etc.) to a new `src/app/providers.tsx` file.
-   [ ] Replace the mobile bottom tab bar with a new navigation component.
-   [ ] Create a new header component that includes navigation and user authentication status.

### Phase 3: Home Page Refactor

-   [ ] Create a new `src/app/dashboard/page.tsx` to house the new dashboard.
-   [ ] Create the following new components in `src/app/dashboard/_components/`:
    -   [ ] `DashboardHeader`
    -   [ ] `StatsCards`
    -   [ ] `QuickActions`
    -   [ ] `WeeklyProgress`
    -   [ ] `RecentWorkouts`
-   [ ] Replace the content of `src/app/page.tsx` with a redirect to `/dashboard` for logged-in users.

### Phase 4: Component Refactor

-   [ ] Audit the components in `src/app/_components/` and create a list of components to be refactored or replaced.
-   [ ] Refactor the identified components to use the new design system.
-   [ ] Remove the old, unused components.

## Contributing

When contributing to this refactoring effort, please adhere to the following guidelines:

*   Create a new branch for each feature or component you are working on.
*   Follow the new design system and styling conventions.
*   Write unit tests for new components.
*   Ensure that the application is fully functional and free of regressions before submitting a pull request.

