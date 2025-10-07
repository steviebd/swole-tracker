import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { userPreferences } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { unitPreferenceSchema } from "~/server/api/schemas/common";
import { z } from "zod";

export const preferencesRouter = createTRPCRouter({
  // Get user preferences
  get: protectedProcedure.query(async ({ ctx }) => {
    const prefs = await ctx.db.query.userPreferences.findFirst({
      where: eq(userPreferences.user_id, ctx.user.id),
    });

    // Return full preferences row when found to satisfy integration tests,
    // otherwise return default shape with all expected properties.
    if (prefs) {
      return prefs;
    }
    return {
      defaultWeightUnit: "kg",
      predictive_defaults_enabled: false,
      right_swipe_action: "collapse_expand",
      enable_manual_wellness: false,
      progression_type: "adaptive",
      linear_progression_kg: "2.5",
      percentage_progression: "2.5",
    } as const;
  }),

  // Update user preferences
  update: protectedProcedure
    .input(
      // Support legacy string input e.g., 'lbs' by normalizing into object shape.
      z
        .union([
          unitPreferenceSchema, // 'kg' | 'lbs'
          z.object({
            defaultWeightUnit: unitPreferenceSchema.optional(),
            predictive_defaults_enabled: z.boolean().optional(),
            right_swipe_action: z.enum(["collapse_expand", "none"]).optional(),
            enable_manual_wellness: z.boolean().optional(),
            progression_type: z
              .enum(["linear", "percentage", "adaptive"])
              .optional(),
            linear_progression_kg: z.string().optional(),
            percentage_progression: z.string().optional(),
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
          };
        }),
    )
    .mutation(async ({ input, ctx }) => {
      // Load existing row (if any)
      const existing = await ctx.db.query.userPreferences.findFirst({
        where: eq(userPreferences.user_id, ctx.user.id),
      });

      const patch: {
        defaultWeightUnit?: "kg" | "lbs";
        predictive_defaults_enabled?: boolean;
        right_swipe_action?: "collapse_expand" | "none";
        enable_manual_wellness?: boolean;
        progression_type?: "linear" | "percentage" | "adaptive";
        linear_progression_kg?: number;
        percentage_progression?: number;
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

      if (existing) {
        // Update only provided fields
        if (Object.keys(patch).length > 0) {
          await ctx.db
            .update(userPreferences)
            .set(patch)
            .where(eq(userPreferences.user_id, ctx.user.id));
        }
      } else {
        // Create new preferences with safe defaults, then apply provided fields
        await ctx.db.insert(userPreferences).values({
          user_id: ctx.user.id,
          defaultWeightUnit: input.defaultWeightUnit ?? "kg",
          predictive_defaults_enabled:
            input.predictive_defaults_enabled ?? false,
          right_swipe_action: input.right_swipe_action ?? "collapse_expand",
          enable_manual_wellness: input.enable_manual_wellness ?? false,
          progression_type: input.progression_type ?? "adaptive",
          linear_progression_kg: input.linear_progression_kg
            ? parseFloat(input.linear_progression_kg)
            : 2.5,
          percentage_progression: input.percentage_progression
            ? parseFloat(input.percentage_progression)
            : 2.5,
        });
      }

      return { success: true };
    }),
});
