import type { Win, PerformanceCategory } from "@shared/schema";

// Get ISO week number for a date
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Calculate category statistics from wins
export function calculateCategoryStats(wins: Win[]): { category: PerformanceCategory; count: number; percentage: number; }[] {
  const categories: PerformanceCategory[] = [
    'Mission Execution',
    'Leading People', 
    'Improving Unit',
    'Managing Resources',
    'Personal Development'
  ];

  const categoryCounts = categories.map(category => {
    const count = wins.filter(win => win.category === category).length;
    return { category, count };
  });

  const total = Math.max(1, categoryCounts.reduce((sum, cat) => sum + cat.count, 0));

  return categoryCounts.map(cat => ({
    ...cat,
    percentage: Math.round((cat.count / total) * 100)
  }));
}

// Calculate weekly trend for last 6 weeks
export function calculateWeeklyTrend(wins: Win[]): { week: string; count: number; }[] {
  const weeks = [];
  const currentDate = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const weekDate = new Date(currentDate.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
    const weekNumber = getWeekNumber(weekDate);
    const weekWins = wins.filter(win => {
      if (!win.createdAt) return false;
      const winDate = new Date(win.createdAt);
      return getWeekNumber(winDate) === weekNumber && winDate.getFullYear() === weekDate.getFullYear();
    });
    
    weeks.push({
      week: `W${weekNumber}`,
      count: weekWins.length
    });
  }
  
  return weeks;
}

// Calculate simple streak based on weekly activity
export function calculateSimpleStreak(wins: Win[]): number {
  if (wins.length === 0) return 0;
  
  // Sort wins by date descending
  const validWins = wins.filter(win => win.createdAt);
  const sortedWins = validWins.sort((a, b) => {
    const dateA = new Date(a.createdAt!).getTime();
    const dateB = new Date(b.createdAt!).getTime();
    return dateB - dateA;
  });
  
  if (sortedWins.length === 0) return 0;
  
  let streak = 0;
  let currentWeek = getWeekNumber(new Date());
  const currentYear = new Date().getFullYear();
  
  // Group wins by week
  const weeklyWins = new Map<string, Win[]>();
  sortedWins.forEach(win => {
    if (!win.createdAt) return;
    const winDate = new Date(win.createdAt);
    const weekKey = `${winDate.getFullYear()}-${getWeekNumber(winDate)}`;
    if (!weeklyWins.has(weekKey)) {
      weeklyWins.set(weekKey, []);
    }
    weeklyWins.get(weekKey)!.push(win);
  });
  
  // Check consecutive weeks with wins
  let checkWeek = currentWeek;
  let checkYear = currentYear;
  
  while (true) {
    const weekKey = `${checkYear}-${checkWeek}`;
    if (weeklyWins.has(weekKey) && weeklyWins.get(weekKey)!.length > 0) {
      streak++;
      checkWeek--;
      if (checkWeek < 1) {
        checkWeek = 52; // Approximate, doesn't handle 53-week years perfectly
        checkYear--;
      }
    } else {
      break;
    }
    
    // Safety break to prevent infinite loops
    if (streak > 100) break;
  }
  
  return streak;
}

// Filter wins by date range
export function filterWinsByDateRange(wins: Win[], startDate: Date, endDate: Date): Win[] {
  return wins.filter(win => {
    if (!win.createdAt) return false;
    const winDate = new Date(win.createdAt);
    return winDate >= startDate && winDate <= endDate;
  });
}

// Get wins for current week
export function getWinsThisWeek(wins: Win[]): Win[] {
  const currentDate = new Date();
  const currentWeek = getWeekNumber(currentDate);
  const currentYear = currentDate.getFullYear();
  
  return wins.filter(win => {
    if (!win.createdAt) return false;
    const winDate = new Date(win.createdAt);
    return getWeekNumber(winDate) === currentWeek && winDate.getFullYear() === currentYear;
  });
}

// Get wins for current month
export function getWinsThisMonth(wins: Win[]): Win[] {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  return wins.filter(win => {
    if (!win.createdAt) return false;
    const winDate = new Date(win.createdAt);
    return winDate.getMonth() === currentMonth && winDate.getFullYear() === currentYear;
  });
}