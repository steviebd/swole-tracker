import { relations, sql } from "drizzle-orm";
import { index, pgTableCreator, primaryKey, decimal } from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `swole-tracker_${name}`);

// Workout Templates
export const workoutTemplates = createTable(
  "workout_template",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }).notNull(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("template_user_id_idx").on(t.userId),
    index("template_name_idx").on(t.name),
  ],
);

// Template Exercises
export const templateExercises = createTable(
  "template_exercise",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    templateId: d
      .integer()
      .notNull()
      .references(() => workoutTemplates.id, { onDelete: "cascade" }),
    exerciseName: d.varchar({ length: 256 }).notNull(),
    orderIndex: d.integer().notNull().default(0),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("template_exercise_template_id_idx").on(t.templateId),
    index("template_exercise_order_idx").on(t.templateId, t.orderIndex),
  ],
);

// Workout Sessions
export const workoutSessions = createTable(
  "workout_session",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    templateId: d
      .integer()
      .notNull()
      .references(() => workoutTemplates.id),
    workoutDate: d
      .timestamp({ withTimezone: true })
      .notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("session_user_id_idx").on(t.userId),
    index("session_template_id_idx").on(t.templateId),
    index("session_workout_date_idx").on(t.workoutDate),
  ],
);

// Session Exercises
export const sessionExercises = createTable(
  "session_exercise",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    sessionId: d
      .integer()
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    templateExerciseId: d
      .integer()
      .references(() => templateExercises.id),
    exerciseName: d.varchar({ length: 256 }).notNull(),
    weight: decimal("weight", { precision: 6, scale: 2 }),
    reps: d.integer(),
    sets: d.integer(),
    unit: d.varchar({ length: 10 }).notNull().default("kg"),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("session_exercise_session_id_idx").on(t.sessionId),
    index("session_exercise_template_exercise_id_idx").on(t.templateExerciseId),
    index("session_exercise_name_idx").on(t.exerciseName),
  ],
);

// User Preferences
export const userPreferences = createTable(
  "user_preferences",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    defaultWeightUnit: d.varchar({ length: 10 }).notNull().default("kg"),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("user_preferences_user_id_idx").on(t.userId),
  ],
);

export const users = createTable("user", (d) => ({
  id: d
    .varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.varchar({ length: 255 }),
  email: d.varchar({ length: 255 }).notNull(),
  emailVerified: d
    .timestamp({
      mode: "date",
      withTimezone: true,
    })
    .default(sql`CURRENT_TIMESTAMP`),
  image: d.varchar({ length: 255 }),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  workoutTemplates: many(workoutTemplates),
  workoutSessions: many(workoutSessions),
  preferences: one(userPreferences),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    type: d.varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: d.varchar({ length: 255 }).notNull(),
    providerAccountId: d.varchar({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.varchar({ length: 255 }),
    scope: d.varchar({ length: 255 }),
    id_token: d.text(),
    session_state: d.varchar({ length: 255 }),
  }),
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  (d) => ({
    sessionToken: d.varchar({ length: 255 }).notNull().primaryKey(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [index("t_user_id_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.varchar({ length: 255 }).notNull(),
    token: d.varchar({ length: 255 }).notNull(),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// Relations
export const workoutTemplatesRelations = relations(workoutTemplates, ({ one, many }) => ({
  user: one(users, { fields: [workoutTemplates.userId], references: [users.id] }),
  exercises: many(templateExercises),
  sessions: many(workoutSessions),
}));

export const templateExercisesRelations = relations(templateExercises, ({ one, many }) => ({
  template: one(workoutTemplates, { fields: [templateExercises.templateId], references: [workoutTemplates.id] }),
  sessionExercises: many(sessionExercises),
}));

export const workoutSessionsRelations = relations(workoutSessions, ({ one, many }) => ({
  user: one(users, { fields: [workoutSessions.userId], references: [users.id] }),
  template: one(workoutTemplates, { fields: [workoutSessions.templateId], references: [workoutTemplates.id] }),
  exercises: many(sessionExercises),
}));

export const sessionExercisesRelations = relations(sessionExercises, ({ one }) => ({
  session: one(workoutSessions, { fields: [sessionExercises.sessionId], references: [workoutSessions.id] }),
  templateExercise: one(templateExercises, { fields: [sessionExercises.templateExerciseId], references: [templateExercises.id] }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, { fields: [userPreferences.userId], references: [users.id] }),
}));
