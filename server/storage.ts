import {
  users,
  wins,
  statements,
  refinementSessions,
  type User,
  type UpsertUser,
  type Win,
  type InsertWin,
  type Statement,
  type InsertStatement,
  type RefinementSession,
  type InsertRefinementSession,
  type UpdateUserProfile,
  updateUserProfileSchema,
} from "@shared/schema";
import type { UserProfile } from "@shared/types";
import { db } from "./db";
import { eq, desc, and, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Profile operations
  getUserProfile(id: string): Promise<UserProfile | undefined>;
  updateUserProfile(id: string, profile: UpdateUserProfile): Promise<UserProfile>;
  
  // Win operations
  createWin(win: InsertWin): Promise<Win>;
  getWinsByUserId(userId: string): Promise<Win[]>;
  updateWin(id: string, updates: Partial<InsertWin>): Promise<Win>;
  deleteWin(id: string): Promise<void>;
  getWinById(id: string): Promise<Win | undefined>;
  
  // Statement operations
  createStatement(statement: InsertStatement): Promise<Statement>;
  getStatementsByUserId(userId: string): Promise<Statement[]>;
  updateStatement(id: string, updates: Partial<InsertStatement>): Promise<Statement>;
  deleteStatement(id: string): Promise<void>;
  getStatementById(id: string): Promise<Statement | undefined>;
  
  // Refinement session operations
  createRefinementSession(session: InsertRefinementSession): Promise<RefinementSession>;
  getRefinementSessionByStatementId(statementId: string): Promise<RefinementSession | undefined>;
  updateRefinementSession(id: string, updates: Partial<InsertRefinementSession>): Promise<RefinementSession>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Profile operations
  async getUserProfile(id: string): Promise<UserProfile | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    // Transform User to UserProfile format
    return {
      id: user.id,
      email: user.email || '',
      username: user.username || '',
      rank: user.rank as any,
      afsc: user.afsc || '',
      shred: user.shred || undefined,
      skillLevel: user.skillLevel as any,
      totalXP: user.totalXP || 0,
      level: user.level || 1,
      currentStreak: user.currentStreak || 0,
      maxStreak: user.maxStreak || 0,
      badges: user.badges || [],
      weeklyGoal: user.weeklyGoal || 3,
      yearlyGoals: (user.yearlyGoals as any) || {
        missionExecution: 0,
        leadingPeople: 0,
        improvingUnit: 0,
        managingResources: 0,
      },
      useRankDefaultDue: user.useRankDefaultDue ?? true,
      customDueDate: user.customDueDate || undefined,
      dailyReminderEnabled: user.dailyReminderEnabled ?? false,
      dailyReminderTime: user.dailyReminderTime || '09:00',
      dailyReminderDays: user.dailyReminderDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      createdAt: user.createdAt || undefined,
      updatedAt: user.updatedAt || undefined,
    };
  }

  async updateUserProfile(id: string, profileData: UpdateUserProfile): Promise<UserProfile> {
    // Validate the profile data using zod schema
    const validatedData = updateUserProfileSchema.parse(profileData);
    
    const [updatedUser] = await db
      .update(users)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error('User not found');
    }
    
    // Transform updated user to UserProfile format
    return {
      id: updatedUser.id,
      email: updatedUser.email || '',
      username: updatedUser.username || '',
      rank: updatedUser.rank as any,
      afsc: updatedUser.afsc || '',
      shred: updatedUser.shred || undefined,
      skillLevel: updatedUser.skillLevel as any,
      totalXP: updatedUser.totalXP || 0,
      level: updatedUser.level || 1,
      currentStreak: updatedUser.currentStreak || 0,
      maxStreak: updatedUser.maxStreak || 0,
      badges: updatedUser.badges || [],
      weeklyGoal: updatedUser.weeklyGoal || 3,
      yearlyGoals: (updatedUser.yearlyGoals as any) || {
        missionExecution: 0,
        leadingPeople: 0,
        improvingUnit: 0,
        managingResources: 0,
      },
      useRankDefaultDue: updatedUser.useRankDefaultDue ?? true,
      customDueDate: updatedUser.customDueDate || undefined,
      dailyReminderEnabled: updatedUser.dailyReminderEnabled ?? false,
      dailyReminderTime: updatedUser.dailyReminderTime || '09:00',
      dailyReminderDays: updatedUser.dailyReminderDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      createdAt: updatedUser.createdAt || undefined,
      updatedAt: updatedUser.updatedAt || undefined,
    };
  }

  // Win operations
  async createWin(win: InsertWin): Promise<Win> {
    const [newWin] = await db.insert(wins).values(win).returning();
    return newWin;
  }

  async getWinsByUserId(userId: string): Promise<Win[]> {
    return await db
      .select()
      .from(wins)
      .where(eq(wins.userId, userId))
      .orderBy(desc(wins.createdAt));
  }

  async updateWin(id: string, updates: Partial<InsertWin>): Promise<Win> {
    const [updatedWin] = await db
      .update(wins)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(wins.id, id))
      .returning();
    return updatedWin;
  }

  async deleteWin(id: string): Promise<void> {
    await db.delete(wins).where(eq(wins.id, id));
  }

  async getWinById(id: string): Promise<Win | undefined> {
    const [win] = await db.select().from(wins).where(eq(wins.id, id));
    return win;
  }

  // Statement operations
  async createStatement(statement: InsertStatement): Promise<Statement> {
    const [newStatement] = await db.insert(statements).values(statement).returning();
    return newStatement;
  }

  async getStatementsByUserId(userId: string): Promise<Statement[]> {
    return await db
      .select()
      .from(statements)
      .where(eq(statements.userId, userId))
      .orderBy(desc(statements.createdAt));
  }

  async updateStatement(id: string, updates: Partial<InsertStatement>): Promise<Statement> {
    const [updatedStatement] = await db
      .update(statements)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(statements.id, id))
      .returning();
    return updatedStatement;
  }

  async deleteStatement(id: string): Promise<void> {
    await db.delete(statements).where(eq(statements.id, id));
  }

  async getStatementById(id: string): Promise<Statement | undefined> {
    const [statement] = await db.select().from(statements).where(eq(statements.id, id));
    return statement;
  }

  // Refinement session operations
  async createRefinementSession(session: InsertRefinementSession): Promise<RefinementSession> {
    const [newSession] = await db.insert(refinementSessions).values(session).returning();
    return newSession;
  }

  async getRefinementSessionByStatementId(statementId: string): Promise<RefinementSession | undefined> {
    const [session] = await db
      .select()
      .from(refinementSessions)
      .where(eq(refinementSessions.statementId, statementId));
    return session;
  }

  async updateRefinementSession(id: string, updates: Partial<InsertRefinementSession>): Promise<RefinementSession> {
    const [updatedSession] = await db
      .update(refinementSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(refinementSessions.id, id))
      .returning();
    return updatedSession;
  }
}

export const storage = new DatabaseStorage();
