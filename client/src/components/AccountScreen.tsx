import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, Download, Bell, HelpCircle, LogOut } from "lucide-react";

export default function AccountScreen() {
  const { user } = useAuth();
  
  // Fetch user stats
  const { data: wins = [] } = useQuery({
    queryKey: ["/api/wins"],
    retry: false,
  });

  const { data: statements = [] } = useQuery({
    queryKey: ["/api/statements"],
    retry: false,
  });

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "AF";
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  const handleSignOut = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Account</h2>
        <Settings className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* User Profile */}
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <Avatar className="w-20 h-20 mx-auto">
            <AvatarImage src={(user as any)?.profileImageUrl} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {getInitials((user as any)?.firstName, (user as any)?.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-foreground" data-testid="text-user-name">
              {(user as any)?.firstName || (user as any)?.lastName 
                ? `${(user as any)?.firstName || ""} ${(user as any)?.lastName || ""}`.trim()
                : "Air Force Member"
              }
            </h3>
            <p className="text-sm text-muted-foreground" data-testid="text-user-email">
              {(user as any)?.email || "No email provided"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-secondary-foreground" data-testid="text-total-wins">
              {(wins as any[]).length}
            </div>
            <div className="text-sm text-secondary-foreground">Total Wins</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-secondary-foreground" data-testid="text-total-statements">
              {(statements as any[]).length}
            </div>
            <div className="text-sm text-secondary-foreground">Statements</div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Options */}
      <div className="space-y-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Download className="h-5 w-5 text-muted-foreground" />
                <span className="text-foreground">Export Data</span>
              </div>
              <div className="text-muted-foreground">›</div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="text-foreground">Notifications</span>
              </div>
              <div className="text-muted-foreground">›</div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                <span className="text-foreground">Help & Support</span>
              </div>
              <div className="text-muted-foreground">›</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sign Out */}
      <Button 
        variant="destructive" 
        className="w-full" 
        onClick={handleSignOut}
        data-testid="button-sign-out"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
}
