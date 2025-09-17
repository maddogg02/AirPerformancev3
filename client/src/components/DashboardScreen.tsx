import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, Calendar, Zap, Trophy, Clock, BookOpen, Plus, Crown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { DashboardStats, PerformanceCategory, UserProfile } from "@shared/types";
import type { Win } from "@shared/schema";
import { getDaysUntilDue, getDueDateStatus, calculateDueDate, getDueDateProgress, getRankName } from "@/lib/profile";
import { getWeekNumber, calculateCategoryStats, calculateWeeklyTrend, calculateSimpleStreak, getWinsThisWeek, getWinsThisMonth } from "@/lib/metrics";
import { format } from "date-fns";

interface DashboardScreenProps {
  onAddWin: () => void;
  onOpenLibrary: (filter?: string) => void;
  onOpenDeadlines?: () => void;
  profile?: UserProfile | null;
}

export const DashboardScreen = ({ onAddWin, onOpenLibrary, onOpenDeadlines, profile }: DashboardScreenProps) => {
  // Fetch performance data
  const { data: wins = [] } = useQuery<Win[]>({
    queryKey: ["/api/wins"],
    retry: false,
  });

  const { data: statements = [] } = useQuery({
    queryKey: ["/api/statements"],
    retry: false,
  });

  // Calculate stats from real data using typed wins
  const winsArray = wins || [];
  const thisWeekWins = getWinsThisWeek(winsArray);
  const thisMonthWins = getWinsThisMonth(winsArray);

  // Calculate category stats
  const categoryStats = calculateCategoryStats(winsArray);

  // Calculate current streak (simplified - just based on recent activity)
  const currentStreak = profile?.currentStreak || calculateSimpleStreak(winsArray);

  // Create dashboard stats from real data
  const dashboardStats: DashboardStats = {
    totalWins: winsArray.length,
    thisWeek: thisWeekWins.length,
    thisMonth: thisMonthWins.length,
    currentStreak,
    categoryStats,
    weeklyTrend: calculateWeeklyTrend(winsArray),
    dutyCoverage: Math.round((winsArray.length / Math.max(1, (profile?.yearlyGoals?.missionExecution || 20) + 
      (profile?.yearlyGoals?.leadingPeople || 15) + 
      (profile?.yearlyGoals?.improvingUnit || 10) + 
      (profile?.yearlyGoals?.managingResources || 10))) * 100)
  };

  const weeklyGoal = profile?.weeklyGoal || 3;
  const weeklyProgress = (dashboardStats.thisWeek / weeklyGoal) * 100;
  const daysUntilDue = profile ? getDaysUntilDue(profile) : null;
  const dueDateProgress = profile ? getDueDateProgress(profile) : 0;
  const dueDateStatus = daysUntilDue !== null ? getDueDateStatus(daysUntilDue) : 'neutral';
  const dueDate = profile ? calculateDueDate(profile) : null;

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header with Pro Button */}
        <div className="relative text-center">
          <h1 className="text-xl font-bold text-foreground">Performance Dashboard</h1>
          <div className="absolute right-0 top-0">
            <Button 
              variant="default" 
              size="sm" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
              data-testid="button-pro-upgrade"
            >
              <Crown className="w-4 h-4 mr-1" />
              Pro
            </Button>
          </div>
        </div>

        {/* EPB Due Date - only show if profile exists */}
        {profile && (
          <Card 
            className={cn(
              "gradient-card cursor-pointer transition-all",
              dueDateStatus === 'urgent' && "border-destructive",
              dueDateStatus === 'caution' && "border-warning"
            )}
            onClick={onOpenDeadlines}
            data-testid="card-epb-due-date"
          >
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    dueDateStatus === 'urgent' && "bg-destructive/10",
                    dueDateStatus === 'caution' && "bg-warning/10",
                    dueDateStatus === 'neutral' && "bg-primary/10"
                  )}>
                    <Clock className={cn(
                      "w-4 h-4",
                      dueDateStatus === 'urgent' && "text-destructive",
                      dueDateStatus === 'caution' && "text-warning",
                      dueDateStatus === 'neutral' && "text-primary"
                    )} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {profile.rank ? `${getRankName(profile.rank)} EPB Due Date` : 'EPB Due Date'}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p className={cn(
                        "text-2xl font-bold",
                        dueDateStatus === 'urgent' && "text-destructive",
                        dueDateStatus === 'caution' && "text-warning",
                        dueDateStatus === 'neutral' && "text-foreground"
                      )} data-testid="text-due-date-progress">
                        {dueDateProgress}%
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid="text-days-left">
                        {daysUntilDue} days left
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Progress 
                    value={dueDateProgress} 
                    className={cn(
                      "h-3",
                      dueDateStatus === 'urgent' && "[&>div]:bg-destructive",
                      dueDateStatus === 'caution' && "[&>div]:bg-warning"
                    )}
                  />
                  {dueDate && (
                    <p className="text-xs text-muted-foreground text-center">
                      Due {format(dueDate, 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Streak */}
        <Card className="gradient-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-current-streak">
                  {dashboardStats.currentStreak} weeks
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="gradient-card cursor-pointer" onClick={() => onOpenLibrary()} data-testid="card-total-wins">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Wins</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-total-wins">
                    {dashboardStats.totalWins}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card cursor-pointer" onClick={() => onOpenLibrary('thisweek')} data-testid="card-this-week">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-this-week">
                    {dashboardStats.thisWeek}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card cursor-pointer" onClick={() => onOpenLibrary('thismonth')} data-testid="card-this-month">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-this-month">
                    {dashboardStats.thisMonth}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Goal Progress */}
        <Card className="gradient-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Weekly Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {dashboardStats.thisWeek} of {weeklyGoal} wins this week
                </span>
                <span className="font-medium" data-testid="text-weekly-progress">
                  {Math.round(weeklyProgress)}%
                </span>
              </div>
              <Progress value={weeklyProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card className="gradient-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Performance Areas
              <Badge variant="secondary" className="text-xs">Yearly</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardStats.categoryStats.map((stat) => (
                <div 
                  key={stat.category}
                  className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md p-2 -m-2 transition-all"
                  onClick={() => onOpenLibrary(stat.category)}
                  data-testid={`category-${stat.category.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                      <div className="w-4 h-4 rounded-full bg-primary" style={{
                        background: `conic-gradient(hsl(var(--primary)) ${stat.percentage}%, hsl(var(--muted)) ${stat.percentage}%)`
                      }} />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{stat.category}</div>
                      <div className="text-xs text-muted-foreground">{stat.count} entries</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {stat.percentage}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            onClick={onAddWin} 
            variant="default" 
            size="lg" 
            className="w-full"
            data-testid="button-add-win"
          >
            <Plus className="w-5 h-5" />
            Add Win
          </Button>
          <Button 
            onClick={() => onOpenLibrary()} 
            variant="outline" 
            size="lg" 
            className="w-full"
            data-testid="button-view-library"
          >
            <BookOpen className="w-5 h-5" />
            View Library
          </Button>
        </div>
      </div>
    </div>
  );
};

// Helper functions are now imported from @/lib/metrics

export default DashboardScreen;