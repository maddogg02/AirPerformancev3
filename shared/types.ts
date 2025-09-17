// Comprehensive TypeScript types for Air Force Performance Tracker

// Air Force Ranks
export type Rank = 'E-1' | 'E-2' | 'E-3' | 'E-4' | 'E-5' | 'E-6' | 'E-7' | 'E-8' | 'E-9';

// Performance Categories
export type PerformanceCategory = 
  | 'Mission Execution'
  | 'Leading People'
  | 'Improving Unit'
  | 'Managing Resources'  
  | 'Personal Development';

// Dashboard Statistics
export interface DashboardStats {
  totalWins: number;
  thisWeek: number;
  thisMonth: number;
  currentStreak: number;
  categoryStats: CategoryStat[];
  weeklyTrend: WeeklyTrend[];
  dutyCoverage: number;
}

export interface CategoryStat {
  category: PerformanceCategory;
  count: number;
  percentage: number;
}

export interface WeeklyTrend {
  week: string;
  count: number;
}

// Comprehensive User Profile
export interface UserProfile {
  // Basic Info
  id?: string;
  email: string;
  username: string;
  
  // Military Info  
  rank: Rank;
  afsc: string;
  shred?: string;
  skillLevel: '3' | '5' | '7' | '9';
  
  // Performance Tracking
  totalXP: number;
  level: number;
  currentStreak: number;
  maxStreak: number;
  badges: string[];
  
  // Goals
  weeklyGoal: number;
  yearlyGoals: {
    missionExecution: number;
    leadingPeople: number;
    improvingUnit: number;
    managingResources: number;
  };
  
  // EPB/Due Date Settings
  useRankDefaultDue: boolean;
  customDueDate?: string;
  
  // Notification Settings
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  dailyReminderDays: string[];
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

// AFSC (Air Force Specialty Code) Interface
export interface AFSC {
  code: string;
  title: string;
  prefix: string;
}

// Due date status for EPB tracking
export type DueDateStatus = 'urgent' | 'caution' | 'neutral';

// Theme types
export type Theme = 'light' | 'dark' | 'system';

// Notification preferences
export interface NotificationPreferences {
  dailyReminder: boolean;
  weeklyReport: boolean;
  dueDateAlerts: boolean;
  achievementNotifications: boolean;
}

// Export formats
export type ExportFormat = 'PDF' | 'DOCX' | 'CSV';
export type ExportView = 'Full Report' | 'Category-only' | 'Timeline' | 'Statements Only';

// Component Props Types
export interface ProfileSetupScreenProps {
  onProfileComplete: (profile: Partial<UserProfile>) => void;
}

export interface SettingsScreenProps {
  profile: UserProfile | null;
  onProfileUpdate: (profile: Partial<UserProfile>) => void;
}

export interface DashboardScreenProps {
  onAddWin: () => void;
  onOpenLibrary: (filter?: string) => void;
  onOpenDeadlines?: () => void;
  profile?: UserProfile | null;
}