import { relations } from "drizzle-orm/relations";
import { swoleTrackerWorkoutTemplate, swoleTrackerWorkoutSession, swoleTrackerSessionExercise, swoleTrackerTemplateExercise } from "./schema";

export const swoleTrackerWorkoutSessionRelations = relations(swoleTrackerWorkoutSession, ({one, many}) => ({
	swoleTrackerWorkoutTemplate: one(swoleTrackerWorkoutTemplate, {
		fields: [swoleTrackerWorkoutSession.templateId],
		references: [swoleTrackerWorkoutTemplate.id]
	}),
	swoleTrackerSessionExercises: many(swoleTrackerSessionExercise),
}));

export const swoleTrackerWorkoutTemplateRelations = relations(swoleTrackerWorkoutTemplate, ({many}) => ({
	swoleTrackerWorkoutSessions: many(swoleTrackerWorkoutSession),
	swoleTrackerTemplateExercises: many(swoleTrackerTemplateExercise),
}));

export const swoleTrackerSessionExerciseRelations = relations(swoleTrackerSessionExercise, ({one}) => ({
	swoleTrackerWorkoutSession: one(swoleTrackerWorkoutSession, {
		fields: [swoleTrackerSessionExercise.sessionId],
		references: [swoleTrackerWorkoutSession.id]
	}),
	swoleTrackerTemplateExercise: one(swoleTrackerTemplateExercise, {
		fields: [swoleTrackerSessionExercise.templateExerciseId],
		references: [swoleTrackerTemplateExercise.id]
	}),
}));

export const swoleTrackerTemplateExerciseRelations = relations(swoleTrackerTemplateExercise, ({one, many}) => ({
	swoleTrackerSessionExercises: many(swoleTrackerSessionExercise),
	swoleTrackerWorkoutTemplate: one(swoleTrackerWorkoutTemplate, {
		fields: [swoleTrackerTemplateExercise.templateId],
		references: [swoleTrackerWorkoutTemplate.id]
	}),
}));