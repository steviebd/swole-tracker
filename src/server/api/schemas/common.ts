import { z } from "zod";

// Common, reusable Zod schemas for tRPC routers

export const idSchema = z.union([z.string().min(1), z.number()]);

export const userIdSchema = z.string().min(1, "userId is required");

export const paginationSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  cursor: z.union([z.string(), z.number()]).optional(),
});

export const dateRangeSchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .refine((v) => v.from <= v.to, { message: "from must be before to" });

export const booleanFlagSchema = z.coerce.boolean();

export const sortSchema = z.object({
  field: z.string(),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

// Preferences
export const unitPreferenceSchema = z.enum(["kg", "lbs"]);

export const updatePreferencesInput = z.object({
  unit: unitPreferenceSchema.optional(),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesInput>;

// Exercise progression schemas for Phase 3
export const timeRangeSchema = z
  .enum(["week", "month", "quarter", "year"])
  .default("quarter");

export const exerciseProgressInputSchema = z
  .object({
    exerciseName: z.string().min(1, "Exercise name is required").optional(),
    templateExerciseId: z.number().int().positive().optional(),
    timeRange: timeRangeSchema,
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    // Phase 2: Pagination support
    cursor: z.string().optional(),
    limit: z.number().int().positive().max(100).default(50),
  })
  .refine(
    (input) =>
      typeof input.templateExerciseId === "number" ||
      (typeof input.exerciseName === "string" && input.exerciseName.length > 0),
    {
      message: "Exercise selection is required",
      path: ["exerciseName"],
    },
  );

export const topExercisesInputSchema = z.object({
  timeRange: timeRangeSchema,
  limit: z.number().int().positive().max(50).default(10),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type ExerciseProgressInput = z.infer<typeof exerciseProgressInputSchema>;
export type TopExercisesInput = z.infer<typeof topExercisesInputSchema>;
