import { pgTable, index, unique, integer, varchar, timestamp, foreignKey, numeric, text } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const swoleTrackerUserPreferences = pgTable("swole-tracker_user_preferences", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: ""swole-tracker_user_preferences_id_seq"", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647 }),
	userId: varchar("user_id", { length: 256 }).notNull(),
	defaultWeightUnit: varchar({ length: 10 }).default('kg').notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	index("user_preferences_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	unique("swole-tracker_user_preferences_user_id_unique").on(table.userId),
]);

export const swoleTrackerWorkoutSession = pgTable("swole-tracker_workout_session", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: ""swole-tracker_workout_session_id_seq"", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647 }),
	userId: varchar("user_id", { length: 256 }).notNull(),
	templateId: integer().notNull(),
	workoutDate: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	index("session_template_id_idx").using("btree", table.templateId.asc().nullsLast().op("int4_ops")),
	index("session_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("session_workout_date_idx").using("btree", table.workoutDate.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [swoleTrackerWorkoutTemplate.id],
			name: "swole-tracker_workout_session_templateId_swole-tracker_workout_"
		}),
]);

export const swoleTrackerSessionExercise = pgTable("swole-tracker_session_exercise", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: ""swole-tracker_session_exercise_id_seq"", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647 }),
	userId: varchar("user_id", { length: 256 }).notNull(),
	sessionId: integer().notNull(),
	templateExerciseId: integer(),
	exerciseName: varchar({ length: 256 }).notNull(),
	weight: numeric({ precision: 6, scale:  2 }),
	reps: integer(),
	sets: integer(),
	unit: varchar({ length: 10 }).default('kg').notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("session_exercise_name_idx").using("btree", table.exerciseName.asc().nullsLast().op("text_ops")),
	index("session_exercise_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("int4_ops")),
	index("session_exercise_template_exercise_id_idx").using("btree", table.templateExerciseId.asc().nullsLast().op("int4_ops")),
	index("session_exercise_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [swoleTrackerWorkoutSession.id],
			name: "swole-tracker_session_exercise_sessionId_swole-tracker_workout_"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.templateExerciseId],
			foreignColumns: [swoleTrackerTemplateExercise.id],
			name: "swole-tracker_session_exercise_templateExerciseId_swole-tracker"
		}),
]);

export const swoleTrackerTemplateExercise = pgTable("swole-tracker_template_exercise", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: ""swole-tracker_template_exercise_id_seq"", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647 }),
	userId: varchar("user_id", { length: 256 }).notNull(),
	templateId: integer().notNull(),
	exerciseName: varchar({ length: 256 }).notNull(),
	orderIndex: integer().default(0).notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("template_exercise_order_idx").using("btree", table.templateId.asc().nullsLast().op("int4_ops"), table.orderIndex.asc().nullsLast().op("int4_ops")),
	index("template_exercise_template_id_idx").using("btree", table.templateId.asc().nullsLast().op("int4_ops")),
	index("template_exercise_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [swoleTrackerWorkoutTemplate.id],
			name: "swole-tracker_template_exercise_templateId_swole-tracker_workou"
		}).onDelete("cascade"),
]);

export const swoleTrackerWorkoutTemplate = pgTable("swole-tracker_workout_template", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: ""swole-tracker_workout_template_id_seq"", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647 }),
	name: varchar({ length: 256 }).notNull(),
	userId: varchar("user_id", { length: 256 }).notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	index("template_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("template_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const swoleTrackerDailyJoke = pgTable("swole-tracker_daily_joke", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: ""swole-tracker_daily_joke_id_seq"", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647 }),
	userId: varchar("user_id", { length: 256 }).notNull(),
	joke: text().notNull(),
	aiModel: varchar({ length: 100 }).notNull(),
	prompt: text().notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("daily_joke_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("daily_joke_user_date_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("daily_joke_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);
