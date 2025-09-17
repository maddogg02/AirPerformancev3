import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Settings, Calendar, User, Bell, Clock, Sun, Moon, Monitor, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Rank, UserProfile } from "@shared/types";
import { format } from "date-fns";
import { useAfscs } from "@/hooks/useAfscs";
import { getDaysUntilDue, getDueDateStatus, calculateDueDate, getDueDateProgress, formatDueDate } from "@/lib/profile";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SettingsScreenProps {
  profile?: UserProfile | null;
  onProfileUpdate?: (profile: Partial<UserProfile>) => void;
}

export default function AccountScreen({ profile, onProfileUpdate }: SettingsScreenProps = {}) {
  const [dueDate, setDueDate] = useState("");
  const [afscPrefix, setAfscPrefix] = useState("");
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const { getFilteredAfscs, loading: afscLoading } = useAfscs();
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch profile data from backend
  const { data: profileData, isLoading: profileLoading, error: profileError } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    retry: false,
  });

  // Profile update mutation
  const profileMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      return response.json();
    },
    onSuccess: (updatedProfile: UserProfile) => {
      // Invalidate and refetch profile data
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      
      toast({
        title: "Success",
        description: "Profile updated successfully!",
        variant: "default"
      });
      
      // Call the optional onProfileUpdate callback if provided
      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }
    },
    onError: (error) => {
      console.error("Profile update error:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    },
  });

  // Use profile data from API, fallback to props for compatibility
  const currentProfile: Partial<UserProfile> = profileData || profile || {};

  // Fetch user stats for basic display
  const { data: wins = [] } = useQuery({
    queryKey: ["/api/wins"],
    retry: false,
  });

  const { data: statements = [] } = useQuery({
    queryKey: ["/api/statements"],
    retry: false,
  });

  const ranks: Rank[] = ['E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6', 'E-7', 'E-8', 'E-9'];
  
  // AFSC prefix options
  const afscPrefixes = [
    { value: "1XXXX", label: "1XXXX - Operations" },
    { value: "2XXXX", label: "2XXXX - Logistics" },
    { value: "3XXXX", label: "3XXXX - Support" },
    { value: "4XXXX", label: "4XXXX - Medical" },
    { value: "5XXXX", label: "5XXXX - Professional" },
    { value: "6XXXX", label: "6XXXX - Contracting and Financial" },
    { value: "7XXXX", label: "7XXXX - Special Investigations" },
    { value: "8XXXX", label: "8XXXX - Special Duty Identifiers (SDI)" },
    { value: "9XXXX", label: "9XXXX" }
  ];
  
  const daysOfWeek = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  useEffect(() => {
    const profileToUse = profileData || profile;
    if (profileToUse) {
      if (profileToUse.customDueDate) {
        setDueDate(profileToUse.customDueDate);
      }
      // Set AFSC prefix based on current AFSC
      if (profileToUse.afsc) {
        const firstChar = profileToUse.afsc.charAt(0);
        const matchingPrefix = afscPrefixes.find(p => p.value.startsWith(firstChar));
        if (matchingPrefix) {
          setAfscPrefix(matchingPrefix.value);
        }
      }
    }
  }, [profileData, profile]);

  const handleProfileUpdate = (updates: Partial<UserProfile>) => {
    profileMutation.mutate(updates);
  };

  const handleReminderDayToggle = (day: string, checked: boolean) => {
    const currentDays = currentProfile.dailyReminderDays || [];
    const newDays = checked 
      ? [...currentDays, day]
      : currentDays.filter(d => d !== day);
    handleProfileUpdate({ dailyReminderDays: newDays });
  };

  const handleDueDateChange = (date: string) => {
    setDueDate(date);
    handleProfileUpdate({ customDueDate: date });
  };

  const getCurrentDueDate = () => {
    if (currentProfile && !currentProfile.useRankDefaultDue && currentProfile.customDueDate) {
      return format(new Date(currentProfile.customDueDate), 'MMM dd, yyyy');
    }
    // Default fallback
    return "Mar 31, 2025";
  };

  // Show loading state
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 px-4 pt-6">
        <div className="max-w-md mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-20 bg-muted rounded-lg"></div>
            <div className="h-40 bg-muted rounded-lg"></div>
            <div className="h-60 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (profileError) {
    return (
      <div className="min-h-screen bg-background pb-20 px-4 pt-6">
        <div className="max-w-md mx-auto text-center space-y-4">
          <Settings className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-semibold">Unable to load profile</h1>
          <p className="text-muted-foreground">There was an error loading your profile data.</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/profile"] })}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const handleSignOut = () => {
    window.location.href = "/api/logout";
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "AF";
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="relative text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure your preferences</p>
        </div>

        {/* Basic Stats Overview - Legacy Support */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="text-base">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground" data-testid="text-total-wins">
                  {(wins as any[]).length}
                </div>
                <div className="text-sm text-muted-foreground">Total Wins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground" data-testid="text-total-statements">
                  {(statements as any[]).length}
                </div>
                <div className="text-sm text-muted-foreground">Statements</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Settings */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-primary" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="your.email@mail.mil"
                value={currentProfile.email || (user as any)?.email || ""}
                onChange={(e) => handleProfileUpdate({ email: e.target.value })}
                data-testid="input-email"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  type="text"
                  placeholder="Choose a username"
                  value={currentProfile.username || ""}
                  onChange={(e) => handleProfileUpdate({ username: e.target.value })}
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <Label>Rank</Label>
                <Select 
                  value={currentProfile.rank} 
                  onValueChange={(value) => handleProfileUpdate({ rank: value as Rank })}
                >
                  <SelectTrigger data-testid="select-rank">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    {ranks.map((rank) => (
                      <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* AFSC Prefix */}
            <div className="space-y-2">
              <Label htmlFor="afsc-prefix">AFSC Prefix</Label>  
              <Select value={afscPrefix} onValueChange={setAfscPrefix}>
                <SelectTrigger data-testid="select-afsc-prefix">
                  <SelectValue placeholder="Select AFSC category" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  {afscPrefixes.map((prefix) => (
                    <SelectItem key={prefix.value} value={prefix.value}>
                      {prefix.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>AFSC</Label>
                <Select 
                  value={currentProfile.afsc || ""} 
                  onValueChange={(value) => handleProfileUpdate({ afsc: value })}
                  disabled={afscLoading || !afscPrefix || getFilteredAfscs(afscPrefix).length === 0}
                >
                  <SelectTrigger data-testid="select-afsc">
                    <SelectValue placeholder={
                      afscLoading 
                        ? "Loading AFSCs..." 
                        : afscPrefix 
                          ? `Select AFSC ${afscPrefix.charAt(0)}XXXX` 
                          : "Select AFSC prefix first"
                    } />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    {getFilteredAfscs(afscPrefix).map((afscOption) => (
                      <SelectItem key={afscOption.code} value={afscOption.code}>
                        {afscOption.code} - {afscOption.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {afscPrefix && getFilteredAfscs(afscPrefix).length === 0 && !afscLoading && (
                  <p className="text-xs text-muted-foreground">
                    No AFSCs found for prefix {afscPrefix.charAt(0)}XXXX
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Shred</Label>
                <Input
                  type="text"
                  placeholder="A"
                  maxLength={1}
                  value={currentProfile.shred || ""}
                  onChange={(e) => handleProfileUpdate({ shred: e.target.value.toUpperCase() })}
                  data-testid="input-shred"
                />
              </div>
            </div>

            {/* Skill Level */}
            <div className="space-y-2">
              <Label>Skill Level</Label>
              <Select 
                value={currentProfile.skillLevel || ""} 
                onValueChange={(value) => handleProfileUpdate({ skillLevel: value as '3' | '5' | '7' | '9' })}
              >
                <SelectTrigger data-testid="select-skill-level">
                  <SelectValue placeholder="Select skill level" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  <SelectItem value="3">3-Level</SelectItem>
                  <SelectItem value="5">5-Level</SelectItem>
                  <SelectItem value="7">7-Level</SelectItem>
                  <SelectItem value="9">9-Level</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Goals Settings */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-primary" />
              Performance Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Weekly Goal</Label>
              <Input
                type="number"
                placeholder="3"
                min="1"
                max="10"
                value={currentProfile.weeklyGoal || 3}
                onChange={(e) => handleProfileUpdate({ weeklyGoal: parseInt(e.target.value) || 3 })}
                data-testid="input-weekly-goal"
              />
              <p className="text-xs text-muted-foreground">Performance entries per week</p>
            </div>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sun className="w-5 h-5 text-primary" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  className="flex items-center gap-2 justify-start"
                  data-testid="button-theme-light"
                >
                  <Sun className="w-4 h-4" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className="flex items-center gap-2 justify-start"
                  data-testid="button-theme-dark"
                >
                  <Moon className="w-4 h-4" />
                  Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("system")}
                  className="flex items-center gap-2 justify-start"
                  data-testid="button-theme-system"
                >
                  <Monitor className="w-4 h-4" />
                  System
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5 text-primary" />
              Daily Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enable Daily Reminders */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable daily reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Get reminded to log performance bullets
                </p>
              </div>
              <Switch
                checked={currentProfile.dailyReminderEnabled ?? false}
                onCheckedChange={(checked) => handleProfileUpdate({ dailyReminderEnabled: checked })}
                data-testid="switch-daily-reminders"
              />
            </div>

            {currentProfile.dailyReminderEnabled && (
              <>
                <Separator />
                
                {/* Reminder Time */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Reminder Time
                  </Label>
                  <Input
                    type="time"
                    value={currentProfile.dailyReminderTime || "09:00"}
                    onChange={(e) => handleProfileUpdate({ dailyReminderTime: e.target.value })}
                    data-testid="input-reminder-time"
                  />
                </div>

                <Separator />

                {/* Days Selection */}
                <div className="space-y-3">
                  <Label>Reminder Days</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {daysOfWeek.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={day.value}
                          checked={(currentProfile.dailyReminderDays || []).includes(day.value)}
                          onCheckedChange={(checked) => handleReminderDayToggle(day.value, checked as boolean)}
                          data-testid={`checkbox-${day.value}`}
                        />
                        <Label htmlFor={day.value} className="text-sm font-normal">
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="gradient-card border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <User className="w-5 h-5" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user ? (
              <div className="space-y-2">
                <Label>Signed in as</Label>
                <div className="text-sm font-medium text-foreground" data-testid="text-user-name">
                  {((user as any)?.firstName || (user as any)?.lastName) 
                    ? `${(user as any)?.firstName || ""} ${(user as any)?.lastName || ""}`.trim()
                    : "Air Force Member"
                  }
                </div>
                <div className="text-sm text-muted-foreground" data-testid="text-user-email">
                  {(user as any)?.email || "No email provided"}
                </div>
              </div>
            ) : null}
            
            <Separator />
            
            <Button 
              variant="destructive" 
              onClick={handleSignOut} 
              className="w-full"
              data-testid="button-sign-out"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
