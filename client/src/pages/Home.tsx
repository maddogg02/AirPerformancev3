import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import BottomNavigation from "../components/BottomNavigation";
import WinsScreen from "../components/WinsScreen";
import StatementsScreen from "../components/StatementsScreen";
import LibraryScreen from "../components/LibraryScreen";
import AccountScreen from "../components/AccountScreen";
import RefinementScreen from "../components/RefinementScreen";
import { Shield } from "lucide-react";

type Screen = 'wins' | 'statements' | 'library' | 'account' | 'refinement';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeScreen, setActiveScreen] = useState<Screen>('wins');
  const [refinementStatementId, setRefinementStatementId] = useState<string | null>(null);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="h-12 w-12 mx-auto text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleStartRefinement = (statementId: string) => {
    setRefinementStatementId(statementId);
    setActiveScreen('refinement');
  };

  const handleCompleteRefinement = () => {
    setRefinementStatementId(null);
    setActiveScreen('library');
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'wins':
        return <WinsScreen />;
      case 'statements':
        return <StatementsScreen onStartRefinement={handleStartRefinement} />;
      case 'library':
        return <LibraryScreen onNavigateToStatements={() => setActiveScreen('statements')} />;
      case 'account':
        return <AccountScreen />;
      case 'refinement':
        return (
          <RefinementScreen 
            statementId={refinementStatementId} 
            onComplete={handleCompleteRefinement}
          />
        );
      default:
        return <WinsScreen />;
    }
  };

  return (
    <div className="max-w-md mx-auto bg-card min-h-screen relative">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-6 w-6" />
          <h1 className="text-lg font-semibold">AF Performance Tracker</h1>
        </div>
      </header>

      {/* Content Area */}
      <div className="pb-20">
        {renderScreen()}
      </div>

      {/* Bottom Navigation */}
      {activeScreen !== 'refinement' && (
        <BottomNavigation 
          activeScreen={activeScreen} 
          onScreenChange={setActiveScreen} 
        />
      )}
    </div>
  );
}
