// Re-export all shared types for the mobile app
export * from '@swole-tracker/shared-types';

// Define the AppRouter type from the web app's tRPC router
// This should match the exact type from the web app's src/server/api/root.ts
export type AppRouter = {
  post: any; // Post router
  templates: any; // Templates router  
  workouts: any; // Workouts router
  preferences: any; // Preferences router
  jokes: any; // Jokes router
  whoop: any; // WHOOP integration router
  webhooks: any; // Webhooks router
  exercises: any; // Exercises router
  insights: any; // Insights router
  progress: any; // Progress router
  healthAdvice: any; // Health advice router
  wellness: any; // Wellness router
  suggestions: any; // Suggestions router
};

// Note: In a real implementation, you would import the actual AppRouter type 
// from the web app. For now, we're using 'any' as placeholders since we can't
// directly import from the web app due to different environments.
// 
// Ideally, this would be:
// import type { AppRouter } from '../../src/server/api/root';
// 
// But since the mobile app is in a different package, you might need to:
// 1. Export AppRouter from the shared-types package
// 2. Or create a separate API types package
// 3. Or use module federation/workspace imports