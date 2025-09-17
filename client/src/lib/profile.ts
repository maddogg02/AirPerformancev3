import { differenceInDays, addYears, parseISO, format } from 'date-fns';
import type { UserProfile, Rank, DueDateStatus } from '@shared/types';

// Get rank name with full title
export function getRankName(rank: Rank): string {
  const rankNames: Record<Rank, string> = {
    'E-1': 'Airman Basic',
    'E-2': 'Airman',
    'E-3': 'Airman First Class',
    'E-4': 'Senior Airman',
    'E-5': 'Staff Sergeant',
    'E-6': 'Technical Sergeant',
    'E-7': 'Master Sergeant',
    'E-8': 'Senior Master Sergeant',
    'E-9': 'Chief Master Sergeant',
  };
  return rankNames[rank] || rank;
}

// Calculate EPB due date based on rank defaults or custom date
export function calculateDueDate(profile: UserProfile): Date {
  if (!profile.useRankDefaultDue && profile.customDueDate) {
    return parseISO(profile.customDueDate);
  }
  
  // Default EPB due dates based on rank (simplified example)
  // In reality, this would be more complex based on promotion cycles
  const currentYear = new Date().getFullYear();
  const rankDueDates: Record<Rank, Date> = {
    'E-1': new Date(currentYear + 1, 2, 31), // March 31
    'E-2': new Date(currentYear + 1, 2, 31), // March 31
    'E-3': new Date(currentYear + 1, 2, 31), // March 31
    'E-4': new Date(currentYear + 1, 2, 31), // March 31
    'E-5': new Date(currentYear + 1, 1, 28), // February 28
    'E-6': new Date(currentYear + 1, 1, 28), // February 28
    'E-7': new Date(currentYear + 1, 0, 31), // January 31
    'E-8': new Date(currentYear + 1, 0, 31), // January 31
    'E-9': new Date(currentYear + 1, 0, 31), // January 31
  };
  
  return rankDueDates[profile.rank] || new Date(currentYear + 1, 2, 31);
}

// Get days until due date
export function getDaysUntilDue(profile: UserProfile): number {
  const dueDate = calculateDueDate(profile);
  const today = new Date();
  return differenceInDays(dueDate, today);
}

// Get due date status for color coding
export function getDueDateStatus(daysLeft: number): DueDateStatus {
  if (daysLeft < 30) return 'urgent';
  if (daysLeft < 90) return 'caution';
  return 'neutral';
}

// Calculate progress percentage to due date (0-100%)
export function getDueDateProgress(profile: UserProfile): number {
  const dueDate = calculateDueDate(profile);
  const today = new Date();
  
  // Calculate from one year ago to due date for 100% scale
  const yearAgo = addYears(dueDate, -1);
  const totalDays = differenceInDays(dueDate, yearAgo);
  const daysPassed = differenceInDays(today, yearAgo);
  
  const progress = Math.max(0, Math.min(100, (daysPassed / totalDays) * 100));
  return Math.round(progress);
}

// Calculate user level based on XP
export function calculateLevel(totalXP: number): number {
  // Simple level calculation: 100 XP per level
  return Math.floor(totalXP / 100) + 1;
}

// Calculate XP needed for next level
export function getXPForNextLevel(totalXP: number, currentLevel: number): number {
  const nextLevelXP = currentLevel * 100;
  return Math.max(0, nextLevelXP - totalXP);
}

// Get progress toward next level (0-100%)
export function getLevelProgress(totalXP: number, currentLevel: number): number {
  const currentLevelBaseXP = (currentLevel - 1) * 100;
  const currentLevelXP = totalXP - currentLevelBaseXP;
  return Math.min(100, (currentLevelXP / 100) * 100);
}

// Format due date for display
export function formatDueDate(profile: UserProfile): string {
  const dueDate = calculateDueDate(profile);
  return format(dueDate, 'MMM dd, yyyy');
}

// Calculate weekly goal progress
export function getWeeklyGoalProgress(winsThisWeek: number, weeklyGoal: number): number {
  return Math.min(100, (winsThisWeek / weeklyGoal) * 100);
}

// Calculate streak information
export interface StreakInfo {
  current: number;
  max: number;
  isOnStreak: boolean;
  daysToMaintain: number;
}

export function calculateStreakInfo(profile: UserProfile, lastWinDate?: Date): StreakInfo {
  const today = new Date();
  const daysSinceLastWin = lastWinDate ? differenceInDays(today, lastWinDate) : Infinity;
  
  // Streak is broken if more than 7 days since last win
  const isOnStreak = daysSinceLastWin <= 7;
  const daysToMaintain = isOnStreak ? 7 - daysSinceLastWin : 0;
  
  return {
    current: isOnStreak ? profile.currentStreak : 0,
    max: profile.maxStreak,
    isOnStreak,
    daysToMaintain: Math.max(0, daysToMaintain),
  };
}

// Validate profile completeness
export function isProfileComplete(profile: Partial<UserProfile>): boolean {
  const requiredFields: (keyof UserProfile)[] = [
    'username', 
    'rank', 
    'afsc', 
    'skillLevel',
    'email'
  ];
  
  return requiredFields.every(field => 
    profile[field] !== undefined && 
    profile[field] !== null && 
    profile[field] !== ''
  );
}

// Get profile completion percentage
export function getProfileCompletionPercentage(profile: Partial<UserProfile>): number {
  const allFields: (keyof UserProfile)[] = [
    'username', 'email', 'rank', 'afsc', 'skillLevel', 
    'weeklyGoal', 'yearlyGoals', 'dailyReminderEnabled'
  ];
  
  const completedFields = allFields.filter(field => {
    const value = profile[field];
    return value !== undefined && value !== null && value !== '';
  }).length;
  
  return Math.round((completedFields / allFields.length) * 100);
}