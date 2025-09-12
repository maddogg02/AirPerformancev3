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
import { Check, Lock, Bot, CheckCircle, TriangleAlert, ArrowLeft } from "lucide-react";

interface RefinementScreenProps {
  statementId: string | null;
  onComplete: () => void;
}

export default function RefinementScreen({ statementId, onComplete }: RefinementScreenProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [statementContent, setStatementContent] = useState("");
  const [askBackAnswers, setAskBackAnswers] = useState<Record<string, string>>({});
  const [aiFeedback, setAiFeedback] = useState<any>(null);
  const [askBackQuestions, setAskBackQuestions] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch statement
  const { data: statement, isLoading: statementLoading } = useQuery({
    queryKey: ["/api/statements", statementId],
    enabled: !!statementId,
    retry: false,
  });

  useEffect(() => {
    if (statement) {
      setStatementContent((statement as any).content);
    }
  }, [statement]);

  // Generate AI feedback
  const generateFeedbackMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/refinement/${statementId}/feedback`);
      return response.json();
    },
    onSuccess: (feedback) => {
      setAiFeedback(feedback);
      setCurrentStep(2);
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
      setCurrentStep(3);
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
      setStatementContent(result.content);
      setCurrentStep(4);
      toast({
        title: "Statement improved!",
        description: "Your statement has been regenerated with the new details.",
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
        generateFeedbackMutation.mutate();
        break;
      case 2:
        generateAskBacksMutation.mutate();
        break;
      case 3:
        if (canProceedToRegenerate) {
          regenerateStatementMutation.mutate();
        }
        break;
      case 4:
        setCurrentStep(5);
        break;
      case 5:
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

      {/* Step 1: Generated Statement */}
      {currentStep >= 1 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-foreground">Generated Statement</Label>
            <CharacterCounter current={statementContent.length} max={350} />
          </div>
          <Textarea
            value={statementContent}
            onChange={(e) => setStatementContent(e.target.value)}
            className="resize-none h-32"
            data-testid="textarea-statement"
          />
        </div>
      )}

      {/* Step 2: AI Feedback */}
      {currentStep >= 2 && aiFeedback && (
        <Card className="bg-accent/10 border-accent/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-accent" />
              <h3 className="font-medium text-foreground">What the AI Noticed</h3>
              <div className="flex items-center space-x-1">
                <span className="text-lg font-bold text-accent">{aiFeedback.score}</span>
                <span className="text-xs text-accent">/10</span>
              </div>
            </div>
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
          </CardContent>
        </Card>
      )}

      {/* Step 3: Ask-Back Questions */}
      {currentStep >= 3 && askBackQuestions && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground">Help Improve This Statement</h3>
            <span className="text-xs text-muted-foreground">
              Answer {answeredQuestions} of 3 (2 required)
            </span>
          </div>
          
          <div className="space-y-4">
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
          </div>
        </div>
      )}

      {/* Step 4: Synonym Suggestions (Optional) */}
      {currentStep >= 4 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-foreground mb-2">Synonym Suggestions (Optional)</h3>
            <p className="text-sm text-muted-foreground">
              This step is optional. You can proceed to save your statement.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Save to Library */}
      {currentStep >= 5 && (
        <Card className="bg-accent/10 border-accent/20">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-accent mx-auto mb-2" />
            <h3 className="font-medium text-foreground">Ready to Save</h3>
            <p className="text-sm text-muted-foreground">
              Your refined statement is ready to be saved to your library.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Button */}
      <Button 
        className="w-full" 
        onClick={handleNext}
        disabled={
          (currentStep === 1 && generateFeedbackMutation.isPending) ||
          (currentStep === 2 && generateAskBacksMutation.isPending) ||
          (currentStep === 3 && (!canProceedToRegenerate || regenerateStatementMutation.isPending)) ||
          (currentStep === 5 && completeRefinementMutation.isPending)
        }
        data-testid="button-next-step"
      >
        {currentStep === 1 && generateFeedbackMutation.isPending && "Analyzing..."}
        {currentStep === 1 && !generateFeedbackMutation.isPending && "Get AI Feedback"}
        
        {currentStep === 2 && generateAskBacksMutation.isPending && "Generating Questions..."}
        {currentStep === 2 && !generateAskBacksMutation.isPending && "Get Improvement Questions"}
        
        {currentStep === 3 && !canProceedToRegenerate && (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Answer 2 Questions to Continue
          </>
        )}
        {currentStep === 3 && canProceedToRegenerate && !regenerateStatementMutation.isPending && "Regenerate Statement"}
        {currentStep === 3 && regenerateStatementMutation.isPending && "Regenerating..."}
        
        {currentStep === 4 && "Continue to Save"}
        
        {currentStep === 5 && !completeRefinementMutation.isPending && "Save to Library"}
        {currentStep === 5 && completeRefinementMutation.isPending && "Saving..."}
      </Button>
    </div>
  );
}
