import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { PERFORMANCE_CATEGORIES } from "../lib/constants";
import { Sparkles, Check } from "lucide-react";

interface StatementsScreenProps {
  onStartRefinement: (statementId: string) => void;
}

export default function StatementsScreen({ onStartRefinement }: StatementsScreenProps) {
  const [selectedWins, setSelectedWins] = useState<string[]>([]);
  const [generationMode, setGenerationMode] = useState<'combine' | 'separate'>('combine');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
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
    categoryFilter === 'All' || win.category === categoryFilter
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Mission Execution": return "bg-primary text-primary-foreground";
      case "Leading People": return "bg-accent text-accent-foreground";
      case "Improving Unit": return "bg-secondary text-secondary-foreground";
      case "Managing Resources": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Generate Statement</h2>
        <span className="text-sm text-muted-foreground">AI-Powered</span>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                1
              </div>
              <span className="text-sm font-medium">First Draft</span>
            </div>
            <div className="w-8 border-t border-border"></div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-medium">
                2
              </div>
              <span className="text-sm text-muted-foreground">AI Feedback</span>
            </div>
            <div className="w-8 border-t border-border"></div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-medium">
                3
              </div>
              <span className="text-sm text-muted-foreground">Improve</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Win Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Select Wins to Transform</Label>
        
        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button 
            data-testid="filter-all"
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
              categoryFilter === 'All' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}
            onClick={() => setCategoryFilter('All')}
          >
            All
          </button>
          {PERFORMANCE_CATEGORIES.map((category) => (
            <button
              key={category}
              data-testid={`filter-${category.toLowerCase().replace(/\s+/g, '-')}`}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                categoryFilter === category 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}
              onClick={() => setCategoryFilter(category)}
            >
              {category.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Win Cards */}
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {filteredWins.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No wins found. Add some wins first!</p>
              </CardContent>
            </Card>
          ) : (
            filteredWins.map((win: any) => (
              <Card key={win.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      data-testid={`checkbox-win-${win.id}`}
                      checked={selectedWins.includes(win.id)}
                      onCheckedChange={() => handleWinToggle(win.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={`text-xs ${getCategoryColor(win.category)}`}>
                          {win.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(win.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">
                        {win.action.substring(0, 60)}...
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Generation Options */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Generation Mode</Label>
        <RadioGroup value={generationMode} onValueChange={(value: any) => setGenerationMode(value)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="combine" id="combine" data-testid="radio-combine" />
            <Label htmlFor="combine" className="text-sm">Combine into 1 statement</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="separate" id="separate" data-testid="radio-separate" />
            <Label htmlFor="separate" className="text-sm">Generate separate statements</Label>
          </div>
        </RadioGroup>
      </div>

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
