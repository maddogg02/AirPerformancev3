import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERFORMANCE_CATEGORIES } from "../lib/constants";
import { Sparkles, Target, Users, TrendingUp, Zap, ArrowRight } from "lucide-react";

interface StatementsScreenProps {
  onStartRefinement: (statementId: string) => void;
}

export default function StatementsScreen({ onStartRefinement }: StatementsScreenProps) {
  const [selectedWins, setSelectedWins] = useState<string[]>([]);
  const [generationMode, setGenerationMode] = useState<'combine' | 'separate'>('combine');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { toast } = useToast();

  // Fetch wins
  const { data: wins = [], isLoading: winsLoading } = useQuery({
    queryKey: ["/api/wins"],
    retry: false,
  });

  const generateStatementMutation = useMutation({
    mutationFn: async (data: { winIds: string[], mode: 'combine' | 'separate' }) => {
      const response = await apiRequest("POST", "/api/statements/generate", data);
      return response.json();
    },
    onSuccess: (statement) => {
      toast({
        title: "Statement generated!",
        description: "Starting refinement process...",
      });
      onStartRefinement(statement.id);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to generate statement. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredWins = (wins as any[]).filter((win: any) => 
    categoryFilter === 'all' || win.category === categoryFilter
  );

  const handleWinToggle = (winId: string) => {
    setSelectedWins(prev => 
      prev.includes(winId) 
        ? prev.filter(id => id !== winId)
        : [...prev, winId]
    );
  };

  const handleGenerate = () => {
    if (selectedWins.length === 0) {
      toast({
        title: "No wins selected",
        description: "Please select at least one win to generate a statement.",
        variant: "destructive",
      });
      return;
    }

    generateStatementMutation.mutate({
      winIds: selectedWins,
      mode: generationMode,
    });
  };

  const categoryConfig = {
    'Mission Execution': {
      icon: Target,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      badgeColor: 'bg-primary text-primary-foreground'
    },
    'Leading People': {
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      badgeColor: 'bg-green-600 text-white'
    },
    'Improving Unit': {
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      badgeColor: 'bg-blue-600 text-white'
    },
    'Managing Resources': {
      icon: Zap,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      badgeColor: 'bg-purple-600 text-white'
    },
  } as const;

  const getCategoryConfig = (category: string) => {
    return categoryConfig[category as keyof typeof categoryConfig] || {
      icon: Target,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/10',
      badgeColor: 'bg-muted text-muted-foreground'
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return "1 week ago";
    return `${Math.ceil(diffDays / 7)} weeks ago`;
  };

  if (winsLoading) {
    return (
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-center py-8">
          <Sparkles className="h-8 w-8 animate-pulse text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Generate Statement</h2>
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <div className="w-2 h-2 rounded-full bg-muted" />
          <div className="w-2 h-2 rounded-full bg-muted" />
        </div>
        <p className="text-sm text-muted-foreground">Step 1: Select wins to transform</p>
      </div>


      {/* Win Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Select Wins ({selectedWins.length} selected)
            <span className="text-sm font-normal text-muted-foreground">AI-Powered</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Filter Dropdown */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Filter by Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger data-testid="category-filter">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {PERFORMANCE_CATEGORIES.map((category) => {
                  const config = getCategoryConfig(category);
                  const Icon = config.icon;
                  return (
                    <SelectItem key={category} value={category}>
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${config.color}`} />
                        {category}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            {filteredWins.length} of {(wins as any[]).length} {filteredWins.length === 1 ? 'win' : 'wins'} 
            {categoryFilter !== 'all' && ` in ${categoryFilter}`}
          </div>

          {/* Win Cards */}
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {filteredWins.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No wins found. Add some wins first!</p>
              </div>
            ) : (
              filteredWins.map((win: any) => {
                const config = getCategoryConfig(win.category);
                const Icon = config.icon;
                const isSelected = selectedWins.includes(win.id);
                return (
                  <Card 
                    key={win.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? `border-primary shadow-sm ${config.bgColor}` : ''
                    }`}
                    onClick={() => handleWinToggle(win.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          data-testid={`checkbox-win-${win.id}`}
                          checked={isSelected}
                          onCheckedChange={() => handleWinToggle(win.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium">ACTION</p>
                            <p className="text-sm text-foreground leading-relaxed">{win.action}</p>
                            <p className="text-xs text-muted-foreground font-medium">IMPACT</p>
                            <p className="text-sm text-foreground leading-relaxed">{win.impact}</p>
                            <p className="text-xs text-muted-foreground font-medium">RESULT</p>
                            <p className="text-sm text-foreground leading-relaxed">{win.result}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Icon className={`w-4 h-4 ${config.color}`} />
                            <Badge className={`text-xs ${config.badgeColor}`}>
                              {win.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(win.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generation Mode Options */}
      {selectedWins.length >= 2 && (
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">How would you like to process {selectedWins.length} wins?</h3>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="sm"
                  variant={generationMode === 'combine' ? 'default' : 'ghost'}
                  className="text-xs h-auto py-3 px-4"
                  onClick={() => setGenerationMode('combine')}
                  data-testid="mode-combine"
                >
                  <ArrowRight className="w-3 h-3 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Combine</div>
                    <div className="text-xs opacity-70">Into 1 statement</div>
                  </div>
                </Button>
                <Button
                  size="sm" 
                  variant={generationMode === 'separate' ? 'default' : 'ghost'}
                  className="text-xs h-auto py-3 px-4"
                  onClick={() => setGenerationMode('separate')}
                  data-testid="mode-separate"
                >
                  <Sparkles className="w-3 h-3 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Separate</div>
                    <div className="text-xs opacity-70">Multiple statements</div>
                  </div>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {generationMode === 'combine' 
                  ? 'Merge all selected wins into one comprehensive statement'
                  : 'Generate individual statements for each selected win'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Button */}
      <Button 
        className="w-full" 
        onClick={handleGenerate}
        disabled={selectedWins.length === 0 || generateStatementMutation.isPending}
        data-testid="button-generate"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {generateStatementMutation.isPending ? "Generating..." : "Generate First Draft"}
      </Button>
    </div>
  );
}
