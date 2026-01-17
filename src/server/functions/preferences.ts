import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { userPreferences } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { withAuth } from "./middleware";

const preferencesInputSchema = z
  .union([
    z.enum(["kg", "lbs"]),
    z.object({
      defaultWeightUnit: z.enum(["kg", "lbs"]).optional(),
      predictive_defaults_enabled: z.boolean().optional(),
      right_swipe_action: z.enum(["collapse_expand", "none"]).optional(),
      enable_manual_wellness: z.boolean().optional(),
      progression_type: z.enum(["linear", "percentage", "adaptive"]).optional(),
      linear_progression_kg: z.string().optional(),
      percentage_progression: z.string().optional(),
      targetWorkoutsPerWeek: z.union([z.number(), z.string()]).optional(),
    }),
  ])
  .transform((input) => {
    if (typeof input === "string") {
      return { defaultWeightUnit: input };
    }
    return {
      defaultWeightUnit: input.defaultWeightUnit,
      predictive_defaults_enabled: input.predictive_defaults_enabled,
      right_swipe_action: input.right_swipe_action,
      enable_manual_wellness: input.enable_manual_wellness,
      progression_type: input.progression_type,
      linear_progression_kg: input.linear_progression_kg,
      percentage_progression: input.percentage_progression,
      targetWorkoutsPerWeek: input.targetWorkoutsPerWeek,
    };
  });

// === GET USER PREFERENCES ===
export const getPreferences = createServerFn({ method: "GET" })
  .middleware([withAuth])
  .handler(async ({ context }) => {
    const { db, user } = context;

    const prefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.user_id, user.id),
    });

    return {
      targetWorkoutsPerWeek: prefs?.targetWorkoutsPerWeek ?? 3,
      defaultRestSeconds: 120,
      defaultUnit: prefs?.defaultWeightUnit ?? "kg",
      warmupEnabled: prefs?.warmupStrategy !== "none",
      autoIncrementWeight: false,
      weightIncrementAmount: prefs?.linear_progression_kg ?? 2.5,
      progressionType: prefs?.progression_type ?? "linear",
      rpeEnabled: false,
      enable_manual_wellness: prefs?.enable_manual_wellness ?? false,
    };
  });

// === UPDATE USER PREFERENCES ===
export const updatePreferences = createServerFn({ method: "POST" })
  .inputValidator(preferencesInputSchema)
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const input = data;

    const existing = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.user_id, user.id),
    });

    const patch: {
      defaultWeightUnit?: "kg" | "lbs";
      predictive_defaults_enabled?: boolean;
      right_swipe_action?: "collapse_expand" | "none";
      enable_manual_wellness?: boolean;
      progression_type?: "linear" | "percentage" | "adaptive";
      linear_progression_kg?: number;
      percentage_progression?: number;
      targetWorkoutsPerWeek?: number;
    } = {};

    if (typeof input.defaultWeightUnit !== "undefined") {
      patch.defaultWeightUnit = input.defaultWeightUnit;
    }
    if (typeof input.predictive_defaults_enabled !== "undefined") {
      patch.predictive_defaults_enabled = input.predictive_defaults_enabled;
    }
    if (typeof input.right_swipe_action !== "undefined") {
      patch.right_swipe_action = input.right_swipe_action;
    }
    if (typeof input.enable_manual_wellness !== "undefined") {
      patch.enable_manual_wellness = input.enable_manual_wellness;
    }
    if (typeof input.progression_type !== "undefined") {
      patch.progression_type = input.progression_type;
    }
    if (typeof input.linear_progression_kg !== "undefined") {
      patch.linear_progression_kg = parseFloat(input.linear_progression_kg);
    }
    if (typeof input.percentage_progression !== "undefined") {
      patch.percentage_progression = parseFloat(input.percentage_progression);
    }
    if (typeof input.targetWorkoutsPerWeek !== "undefined") {
      const parsed =
        typeof input.targetWorkoutsPerWeek === "string"
          ? parseFloat(input.targetWorkoutsPerWeek)
          : input.targetWorkoutsPerWeek;
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
        patch.targetWorkoutsPerWeek = Math.max(1, Math.min(14, parsed));
      }
    }

    if (existing) {
      if (Object.keys(patch).length > 0) {
        await db
          .update(userPreferences)
          .set(patch)
          .where(eq(userPreferences.user_id, user.id));
      }
    } else {
      await db.insert(userPreferences).values({
        user_id: user.id,
        defaultWeightUnit: input.defaultWeightUnit ?? "kg",
        predictive_defaults_enabled: input.predictive_defaults_enabled ?? false,
        right_swipe_action: input.right_swipe_action ?? "collapse_expand",
        enable_manual_wellness: input.enable_manual_wellness ?? false,
        progression_type: input.progression_type ?? "adaptive",
        linear_progression_kg: input.linear_progression_kg
          ? parseFloat(input.linear_progression_kg)
          : 2.5,
        percentage_progression: input.percentage_progression
          ? parseFloat(input.percentage_progression)
          : 2.5,
        targetWorkoutsPerWeek: (() => {
          if (typeof input.targetWorkoutsPerWeek === "number") {
            return Math.max(1, Math.min(14, input.targetWorkoutsPerWeek));
          }
          if (typeof input.targetWorkoutsPerWeek === "string") {
            const parsed = parseFloat(input.targetWorkoutsPerWeek);
            return Number.isFinite(parsed)
              ? Math.max(1, Math.min(14, parsed))
              : 3;
          }
          return 3;
        })(),
      });
    }

    return { success: true };
  });
