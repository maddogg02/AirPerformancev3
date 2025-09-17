import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import CharacterCounter from "./ui/character-counter";
import { Check, Lock, Bot, CheckCircle, TriangleAlert, ArrowLeft, ChevronDown, ChevronUp, Sparkles, RotateCcw, Save, Trophy } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface RefinementScreenProps {
  statementId: string | null;
  onComplete: () => void;
}

export default function RefinementScreen({ statementId, onComplete }: RefinementScreenProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [originalStatementContent, setOriginalStatementContent] = useState(""); // First draft
  const [improvedStatementContent, setImprovedStatementContent] = useState(""); // After askbacks
  const [askBackAnswers, setAskBackAnswers] = useState<Record<string, string>>({});
  const [aiFeedback, setAiFeedback] = useState<any>(null);
  const [askBackQuestions, setAskBackQuestions] = useState<any>(null);
  const [winData, setWinData] = useState<any>(null);
  const [refinementCount, setRefinementCount] = useState(0);
  const [aiFeedbackCollapsed, setAiFeedbackCollapsed] = useState(false);
  const [helpSectionCollapsed, setHelpSectionCollapsed] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Safe diff highlighting React components (prevents XSS)
  const renderDiffHighlights = (original: string, improved: string, type: 'original' | 'improved') => {
    // Split on spaces but preserve spacing
    const originalWords = original.split(/( )/); // Split on spaces, preserve spaces
    const improvedWords = improved.split(/( )/);
    const maxLength = Math.max(originalWords.length, improvedWords.length);
    
    const elements = [];
    
    for (let i = 0; i < maxLength; i++) {
      const origWord = originalWords[i] || '';
      const impWord = improvedWords[i] || '';
      const key = `${type}-${i}`;
      
      // Handle whitespace tokens
      if (origWord === ' ' || impWord === ' ') {
        elements.push(<span key={key}> </span>);
        continue;
      }
      
      if (origWord !== impWord) {
        if (origWord && !impWord) {
          // Word removed (show as strikethrough in original, skip in improved)
          if (type === 'original') {
            elements.push(
              <span key={key} className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 line-through px-1 rounded">
                {origWord}
              </span>
            );
          }
        } else if (!origWord && impWord) {
          // Word added (skip in original, show as highlight in improved)
          if (type === 'improved') {
            elements.push(
              <span key={key} className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1 rounded font-medium">
                {impWord}
              </span>
            );
          }
        } else {
          // Word changed (show strikethrough in original, highlight in improved)
          if (type === 'original') {
            elements.push(
              <span key={key} className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 line-through px-1 rounded">
                {origWord}
              </span>
            );
          } else {
            elements.push(
              <span key={key} className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1 rounded font-medium">
                {impWord}
              </span>
            );
          }
        }
      } else {
        // Word unchanged
        const word = type === 'original' ? origWord : impWord;
        if (word) {
          elements.push(<span key={key}>{word}</span>);
        }
      }
    }
    
    return elements;
  };

  // Fetch statement
  const { data: statement, isLoading: statementLoading } = useQuery({
    queryKey: ["/api/statements", statementId],
    enabled: !!statementId,
    retry: false,
  });

  // Fetch original win data for showing AIR fields
  const { data: wins } = useQuery({
    queryKey: ["/api/wins"],
    enabled: !!statement,
    retry: false,
  });

  useEffect(() => {
    if (statement) {
      setOriginalStatementContent((statement as any).content);
      
      // Find the original win data from sourceWinIds
      if (wins && (statement as any).sourceWinIds) {
        const sourceWins = (wins as any[]).filter(win => 
          (statement as any).sourceWinIds.includes(win.id)
        );
        if (sourceWins.length > 0) {
          setWinData(sourceWins);
        }
      }
    }
  }, [statement, wins]);

  // Generate AI feedback (now happens after seeing improvement)
  const generateFeedbackMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/refinement/${statementId}/feedback`);
      return response.json();
    },
    onSuccess: (feedback) => {
      setAiFeedback(feedback);
      setCurrentStep(4); // AI feedback comes after comparison
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
        description: "Failed to generate feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate ask-back questions
  const generateAskBacksMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/refinement/${statementId}/askbacks`);
      return response.json();
    },
    onSuccess: (questions) => {
      setAskBackQuestions(questions);
      setCurrentStep(2);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Regenerate statement
  const regenerateStatementMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/refinement/${statementId}/regenerate`, {
        askBackAnswers,
      });
      return response.json();
    },
    onSuccess: (result) => {
      setImprovedStatementContent(result.content);
      setCurrentStep(3); // Move to Before/After comparison
      toast({
        title: "Statement dramatically improved!",
        description: "See the amazing transformation below!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to regenerate statement. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Complete refinement
  const completeRefinementMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/refinement/${statementId}/complete`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Refinement complete!",
        description: "Your statement has been saved to the library.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/statements"] });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to complete refinement. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStepIcon = (step: number) => {
    if (step < currentStep) return <Check className="h-4 w-4" />;
    return step;
  };

  const getStepClass = (step: number) => {
    if (step < currentStep) return "step-completed bg-accent text-accent-foreground";
    if (step === currentStep) return "step-active bg-primary text-primary-foreground";
    return "bg-muted text-muted-foreground";
  };

  const answeredQuestions = Object.values(askBackAnswers).filter(answer => answer.trim()).length;
  const canProceedToRegenerate = answeredQuestions >= 2;

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setAskBackAnswers(prev => ({
      ...prev,
      [questionIndex]: answer,
    }));
  };

  const handleNext = () => {
    switch (currentStep) {
      case 1:
        // Step 1 -> 2: Generate ask-back questions
        generateAskBacksMutation.mutate();
        break;
      case 2:
        // Step 2 -> 3: Regenerate statement (shows before/after comparison)
        if (canProceedToRegenerate) {
          regenerateStatementMutation.mutate();
        }
        break;
      case 3:
        // Step 3 -> 4: Generate AI feedback (after seeing improvement)
        generateFeedbackMutation.mutate();
        break;
      case 4:
        // Step 4 -> 5: Move to save/refinement options
        setCurrentStep(5);
        break;
      case 5:
        // Step 5: Save to library (handled by buttons in UI)
        completeRefinementMutation.mutate();
        break;
    }
  };

  if (statementLoading || !statement) {
    return (
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse text-muted-foreground">Loading statement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button onClick={onComplete} data-testid="button-back">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <h2 className="text-xl font-semibold text-foreground">Refine Statement</h2>
        </div>
        <span className="text-sm text-muted-foreground">Step {currentStep} of 5</span>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${getStepClass(step)}`}>
                  {getStepIcon(step)}
                </div>
                {index < 4 && <div className="w-8 border-t border-border mx-2"></div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: First Draft + AIR Fields */}
      {currentStep >= 1 && (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground">First Draft from Win Data</Label>
              <CharacterCounter current={originalStatementContent.length} max={350} />
            </div>
            <Textarea
              value={originalStatementContent}
              onChange={(e) => setOriginalStatementContent(e.target.value)}
              className="resize-none h-32"
              data-testid="textarea-original-statement"
            />
          </div>
          
          {/* Show original AIR fields for transparency */}
          {winData && winData.length > 0 && (
            <Card className="bg-muted/20 border-muted/40">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Original Win Data</h4>
                  <Badge variant="outline" className="text-xs">For Transparency</Badge>
                </div>
                <div className="space-y-3 text-xs">
                  {winData.map((win: any, index: number) => (
                    <div key={win.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{win.category}</Badge>
                        {winData.length > 1 && <span className="text-muted-foreground">Win #{index + 1}</span>}
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <div><span className="font-medium text-blue-600">ACTION:</span> {win.action}</div>
                        <div><span className="font-medium text-green-600">IMPACT:</span> {win.impact}</div>
                        <div><span className="font-medium text-purple-600">RESULT:</span> {win.result}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 2: Ask-Back Questions */}
      {currentStep >= 2 && askBackQuestions && (
        <Collapsible open={!helpSectionCollapsed} onOpenChange={setHelpSectionCollapsed}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger className="flex items-center gap-2 text-left">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-medium text-foreground">Help Improve This Statement</h3>
                </div>
                {helpSectionCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </CollapsibleTrigger>
              <span className="text-xs text-muted-foreground">
                Answer {Object.values(askBackAnswers).filter(answer => answer.trim()).length} of 3 (2 required)
              </span>
            </div>
            
            <CollapsibleContent className="space-y-4">
              {askBackQuestions.questions?.map((q: any, index: number) => (
                <Card key={index}>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">{q.question}</p>
                    <Input
                      value={askBackAnswers[index] || ""}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      placeholder={q.example}
                      data-testid={`input-askback-${index}`}
                    />
                    <p className="text-xs text-muted-foreground">Example: {q.example}</p>
                  </CardContent>
                </Card>
              ))}
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {/* Step 3: Before/After Comparison - The WOW Moment! */}
      {currentStep >= 3 && improvedStatementContent && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-foreground">Amazing Improvement!</h3>
              <Badge variant="secondary" className="bg-green-100 text-green-800">Before → After</Badge>
            </div>
            
            {/* Desktop: Side by side, Mobile: Stacked */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* BEFORE */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">BEFORE</Badge>
                  <span className="text-xs text-muted-foreground">Original Draft</span>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-foreground leading-relaxed">
                    {renderDiffHighlights(originalStatementContent, improvedStatementContent, 'original')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">{originalStatementContent.length}/350 characters</p>
                </div>
              </div>
              
              {/* AFTER */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="text-xs bg-green-600">AFTER</Badge>
                  <span className="text-xs text-green-600 font-medium">Dramatically Improved!</span>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-foreground leading-relaxed font-medium">
                    {renderDiffHighlights(originalStatementContent, improvedStatementContent, 'improved')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">{improvedStatementContent.length}/350 characters</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium text-center">
                ✨ This is what answering those questions accomplished! Much more professional and impactful.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: AI Feedback (Now comes AFTER seeing improvement) */}
      {currentStep >= 4 && aiFeedback && (
        <Collapsible open={!aiFeedbackCollapsed} onOpenChange={setAiFeedbackCollapsed}>
          <Card className="bg-accent/10 border-accent/20">
            <CardContent className="p-4">
              <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
                <div className="flex items-center space-x-2">
                  <Bot className="h-5 w-5 text-accent" />
                  <h3 className="font-medium text-foreground">What the AI Noticed</h3>
                  <div className="flex items-center space-x-1">
                    <span className="text-lg font-bold text-accent">{aiFeedback.score}</span>
                    <span className="text-xs text-accent">/10</span>
                  </div>
                </div>
                {aiFeedbackCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="space-y-2 text-sm">
                  {aiFeedback.strengths?.map((strength: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-accent" />
                      <span>{strength}</span>
                    </div>
                  ))}
                  {aiFeedback.improvements?.map((improvement: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <TriangleAlert className="h-4 w-4 text-yellow-500" />
                      <span>{improvement}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </CardContent>
          </Card>
        </Collapsible>
      )}

      {/* Step 5: Save or Refinement Loop */}
      {currentStep >= 5 && (
        <Card className={refinementCount >= 2 ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" : "bg-accent/10 border-accent/20"}>
          <CardContent className="p-4 text-center space-y-3">
            <CheckCircle className="h-8 w-8 text-accent mx-auto mb-2" />
            <h3 className="font-medium text-foreground">
              {refinementCount >= 2 ? "Looking great!" : "Ready to Save or Keep Refining"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {refinementCount >= 2 
                ? "You've refined this statement multiple times. It looks solid! Save to your library, or keep refining if you'd like."
                : "Your statement is ready to be saved, or you can refine it further with more questions."
              }
            </p>
            
            {refinementCount < 3 && (
              <div className="flex gap-2 justify-center mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Update original content to show progress in next comparison
                    setOriginalStatementContent(improvedStatementContent);
                    setCurrentStep(2);
                    setRefinementCount(prev => prev + 1);
                    setAskBackAnswers({});
                    setAiFeedback(null);
                    setImprovedStatementContent("");
                  }}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Refine Again
                </Button>
                <Button 
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => completeRefinementMutation.mutate()}
                  disabled={completeRefinementMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                  {completeRefinementMutation.isPending ? "Saving..." : "Save to Library"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Button - Only show when needed */}
      {currentStep < 5 && (
        <Button 
          className="w-full" 
          onClick={handleNext}
          disabled={
            (currentStep === 1 && generateAskBacksMutation.isPending) ||
            (currentStep === 2 && (!canProceedToRegenerate || regenerateStatementMutation.isPending)) ||
            (currentStep === 3 && generateFeedbackMutation.isPending)
          }
          data-testid="button-next-step"
        >
          {currentStep === 1 && generateAskBacksMutation.isPending && "Generating Questions..."}
          {currentStep === 1 && !generateAskBacksMutation.isPending && "Get Improvement Questions"}
          
          {currentStep === 2 && !canProceedToRegenerate && (
            <>
              <Lock className="mr-2 h-4 w-4" />
              Answer 2 Questions to Continue
            </>
          )}
          {currentStep === 2 && canProceedToRegenerate && !regenerateStatementMutation.isPending && (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Show Me the Improvement!
            </>
          )}
          {currentStep === 2 && regenerateStatementMutation.isPending && "Creating Amazing Improvement..."}
          
          {currentStep === 3 && generateFeedbackMutation.isPending && "Getting AI Analysis..."}
          {currentStep === 3 && !generateFeedbackMutation.isPending && "Get AI Feedback"}
          
          {currentStep === 4 && "View Save Options"}
        </Button>
      )}
    </div>
  );
}
