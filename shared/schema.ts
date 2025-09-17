import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  
  // Extended profile fields
  username: varchar("username"),
  rank: varchar("rank"), // E-1 through E-9
  afsc: varchar("afsc"), // Air Force Specialty Code
  shred: varchar("shred"), // AFSC shred (optional)
  skillLevel: varchar("skill_level"), // 3, 5, 7, 9 level
  
  // Performance tracking
  totalXP: integer("total_xp").default(0),
  level: integer("level").default(1),
  currentStreak: integer("current_streak").default(0),
  maxStreak: integer("max_streak").default(0),
  badges: text("badges").array().default([]),
  
  // Goals
  weeklyGoal: integer("weekly_goal").default(3),
  yearlyGoals: jsonb("yearly_goals"), // Store as JSON object
  
  // EPB/Due date settings
  useRankDefaultDue: boolean("use_rank_default_due").default(true),
  customDueDate: varchar("custom_due_date"), // ISO date string
  
  // Notification settings
  dailyReminderEnabled: boolean("daily_reminder_enabled").default(false),
  dailyReminderTime: varchar("daily_reminder_time").default("09:00"),
  dailyReminderDays: text("daily_reminder_days").array().default(["monday", "tuesday", "wednesday", "thursday", "friday"]),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Performance categories enum
export const performanceCategories = [
  "Mission Execution",
  "Leading People", 
  "Improving Unit",
  "Managing Resources",
  "Personal Development"
] as const;

// Wins table - stores raw AIR entries
export const wins = pgTable("wins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: varchar("category").notNull(),
  action: text("action").notNull(),
  impact: text("impact").notNull(),
  result: text("result").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Statements table - stores refined performance statements
export const statements = pgTable("statements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  category: varchar("category").notNull(),
  aiScore: integer("ai_score"), // 0-10 rating from AI
  isCompleted: boolean("is_completed").default(false), // completed refinement workflow
  sourceWinIds: text("source_win_ids").array(), // IDs of wins used to generate this statement
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Refinement sessions table - tracks the 5-step refinement process
export const refinementSessions = pgTable("refinement_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  statementId: varchar("statement_id").notNull().references(() => statements.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  currentStep: integer("current_step").default(1), // 1-5
  aiFeeds: jsonb("ai_feedback"), // AI feedback and scoring
  askBackAnswers: jsonb("ask_back_answers"), // User answers to ask-back questions
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  wins: many(wins),
  statements: many(statements),
  refinementSessions: many(refinementSessions),
}));

export const winsRelations = relations(wins, ({ one }) => ({
  user: one(users, {
    fields: [wins.userId],
    references: [users.id],
  }),
}));

export const statementsRelations = relations(statements, ({ one, many }) => ({
  user: one(users, {
    fields: [statements.userId],
    references: [users.id],
  }),
  refinementSessions: many(refinementSessions),
}));

export const refinementSessionsRelations = relations(refinementSessions, ({ one }) => ({
  statement: one(statements, {
    fields: [refinementSessions.statementId],
    references: [statements.id],
  }),
  user: one(users, {
    fields: [refinementSessions.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertWinSchema = createInsertSchema(wins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStatementSchema = createInsertSchema(statements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRefinementSessionSchema = createInsertSchema(refinementSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Extended insert and select schemas for users
export const insertUserProfileSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserProfileSchema = insertUserProfileSchema.partial();

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type InsertWin = z.infer<typeof insertWinSchema>;
export type Win = typeof wins.$inferSelect;
export type InsertStatement = z.infer<typeof insertStatementSchema>;
export type Statement = typeof statements.$inferSelect;
export type InsertRefinementSession = z.infer<typeof insertRefinementSessionSchema>;
export type RefinementSession = typeof refinementSessions.$inferSelect;
export type PerformanceCategory = typeof performanceCategories[number];

// Re-export types from shared/types.ts for convenience
export type { 
  UserProfile, 
  Rank, 
  DashboardStats, 
  CategoryStat, 
  WeeklyTrend,
  AFSC,
  DueDateStatus,
  Theme
} from "./types";
