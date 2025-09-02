/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as constants from "../constants.js";
import type * as exercises from "../exercises.js";
import type * as healthAdvice from "../healthAdvice.js";
import type * as http from "../http.js";
import type * as insights from "../insights.js";
import type * as jokes from "../jokes.js";
import type * as preferences from "../preferences.js";
import type * as progress from "../progress.js";
import type * as suggestions from "../suggestions.js";
import type * as templates from "../templates.js";
import type * as users from "../users.js";
import type * as webhooks from "../webhooks.js";
import type * as wellness from "../wellness.js";
import type * as whoop from "../whoop.js";
import type * as workouts from "../workouts.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  constants: typeof constants;
  exercises: typeof exercises;
  healthAdvice: typeof healthAdvice;
  http: typeof http;
  insights: typeof insights;
  jokes: typeof jokes;
  preferences: typeof preferences;
  progress: typeof progress;
  suggestions: typeof suggestions;
  templates: typeof templates;
  users: typeof users;
  webhooks: typeof webhooks;
  wellness: typeof wellness;
  whoop: typeof whoop;
  workouts: typeof workouts;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
