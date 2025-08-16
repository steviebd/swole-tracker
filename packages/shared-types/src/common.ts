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
export type UnitPreference = z.infer<typeof unitPreferenceSchema>;
export type SortSchema = z.infer<typeof sortSchema>;
export type DateRangeSchema = z.infer<typeof dateRangeSchema>;
export type PaginationSchema = z.infer<typeof paginationSchema>;