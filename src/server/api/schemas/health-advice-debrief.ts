import { z } from "zod";

export const prHighlightSchema = z.object({
  exerciseName: z.string(),
  metric: z.enum(["weight", "volume", "reps", "streak", "consistency", "readiness", "other"]).default("other"),
  summary: z.string(),
  delta: z.number().optional(),
  unit: z.string().optional(),
  currentValue: z.union([z.number(), z.string()]).optional(),
  previousValue: z.union([z.number(), z.string()]).optional(),
  emoji: z.string().optional(),
});

export const focusAreaSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(["today", "upcoming", "longTerm"]).default("upcoming").optional(),
  actions: z.array(z.string()).default([]).optional(),
});

export const streakContextSchema = z.object({
  current: z.number().int().nonnegative(),
  longest: z.number().int().nonnegative().optional(),
  message: z.string(),
  status: z.enum(["building", "hot", "cooling", "reset"]).default("building").optional(),
});

export const overloadDigestSchema = z.object({
  readiness: z.number().min(0).max(1).optional(),
  recommendation: z.string().optional(),
  nextSteps: z.array(z.string()).default([]).optional(),
  cautionFlags: z.array(z.string()).default([]).optional(),
});

export const sessionDebriefContentSchema = z.object({
  summary: z.string(),
  prHighlights: z.array(prHighlightSchema).default([]),
  adherenceScore: z.number().min(0).max(100).nullable().optional(),
  focusAreas: z.array(focusAreaSchema).default([]),
  streakContext: streakContextSchema.nullable().optional(),
  overloadDigest: overloadDigestSchema.nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const sessionDebriefRecordSchema = sessionDebriefContentSchema.extend({
  id: z.number().int(),
  user_id: z.string(),
  sessionId: z.number().int(),
  version: z.number().int().positive(),
  parentDebriefId: z.number().int().nullable(),
  isActive: z.boolean(),
  regenerationCount: z.number().int().nonnegative(),
  viewedAt: z.date().nullable(),
  dismissedAt: z.date().nullable(),
  pinnedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});

export const sessionDebriefInteractionSchema = z.object({
  sessionId: z.number().int(),
  debriefId: z.number().int().optional(),
});

export type SessionDebriefContent = z.infer<typeof sessionDebriefContentSchema>;
export type SessionDebriefRecord = z.infer<typeof sessionDebriefRecordSchema>;
export type SessionDebriefInteraction = z.infer<typeof sessionDebriefInteractionSchema>;
