import { PlusCircle, Sparkles, Folder, User } from "lucide-react";

interface BottomNavigationProps {
  activeScreen: string;
  onScreenChange: (screen: 'wins' | 'statements' | 'library' | 'account') => void;
}

export default function BottomNavigation({ activeScreen, onScreenChange }: BottomNavigationProps) {
  const navItems = [
    { id: 'wins', icon: PlusCircle, label: 'Wins' },
    { id: 'statements', icon: Sparkles, label: 'Statements' },
    { id: 'library', icon: Folder, label: 'Library' },
    { id: 'account', icon: User, label: 'Account' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-card border-t border-border">
      <div className="flex">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            data-testid={`nav-${id}`}
            className={`flex-1 py-4 flex flex-col items-center space-y-1 ${
              activeScreen === id ? 'text-primary' : 'text-muted-foreground'
            }`}
            onClick={() => {
              window.location.hash = id;
              onScreenChange(id as any);
            }}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
