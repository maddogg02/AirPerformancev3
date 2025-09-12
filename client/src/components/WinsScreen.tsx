import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import CharacterCounter from "./ui/character-counter";
import { PERFORMANCE_CATEGORIES, ACTION_SUGGESTIONS, IMPACT_OPTIONS, CATEGORY_TIPS, RESULT_TEMPLATES } from "../lib/constants";
import { Save, Zap, Lightbulb, Target, Plus, X } from "lucide-react";

type PerformanceCategory = typeof PERFORMANCE_CATEGORIES[number];
type ActionVerb = typeof ACTION_SUGGESTIONS[number];

const winSchema = z.object({
  category: z.string().min(1, "Category is required"),
  action: z.string().min(10, "Action must be at least 10 characters").max(350, "Action cannot exceed 350 characters"),
  impact: z.string().min(10, "Impact must be at least 10 characters").max(350, "Impact cannot exceed 350 characters"),
  result: z.string().min(10, "Result must be at least 10 characters").max(350, "Result cannot exceed 350 characters"),
});

type WinFormData = z.infer<typeof winSchema>;

// Result wizard options
const BENEFICIARY_OPTIONS = ['Self', 'Team', 'Unit', 'Mission'];
const OUTCOME_OPTIONS = ['Readiness ↑', 'Efficiency ↑', 'Cost ↓', 'Risk ↓', 'Training ↑'];

export default function WinsScreen() {
  const [action, setAction] = useState("");
  const [impact, setImpact] = useState("");
  const [result, setResult] = useState("");
  const [category, setCategory] = useState<PerformanceCategory>('Mission Execution');
  const [showResultWizard, setShowResultWizard] = useState(false);
  const [wizardBeneficiary, setWizardBeneficiary] = useState("");
  const [wizardOutcome, setWizardOutcome] = useState("");
  const [showManualTemplates, setShowManualTemplates] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const actionRef = useRef<HTMLTextAreaElement>(null);
  const impactRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLTextAreaElement>(null);

  const form = useForm<WinFormData>({
    resolver: zodResolver(winSchema),
    defaultValues: {
      category: "",
      action: "",
      impact: "",
      result: "",
    },
  });

  // Fetch user's wins for stats
  const { data: wins = [] } = useQuery({
    queryKey: ["/api/wins"],
    retry: false,
  });

  const createWinMutation = useMutation({
    mutationFn: async (data: WinFormData) => {
      const response = await apiRequest("POST", "/api/wins", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Win saved!",
        description: "Your performance entry has been added to your library.",
      });
      
      // Reset form
      setAction("");
      setImpact("");
      setResult("");
      setCategory('Mission Execution');
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/wins"] });
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
        description: "Failed to save your entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleActionSelect = (verb: ActionVerb) => {
    const currentAction = action || "";
    const newAction = currentAction.length > 0 ? `${currentAction} ${verb}` : verb;
    setAction(newAction);
    form.setValue("action", newAction);
    actionRef.current?.focus();
  };

  const handleImpactSelect = (impactValue: string) => {
    const currentImpact = impact || "";
    const newImpact = currentImpact.length > 0 ? `${currentImpact} ${impactValue}` : impactValue;
    setImpact(newImpact);
    form.setValue("impact", newImpact);
    impactRef.current?.focus();
  };

  const handleResultTemplateSelect = (template: string) => {
    setResult(`…${template}`);
    form.setValue("result", `…${template}`);
    resultRef.current?.focus();
  };

  const generateWizardResult = () => {
    if (wizardBeneficiary && wizardOutcome) {
      const outcomeMap: Record<string, string> = {
        'Readiness ↑': 'improved readiness',
        'Efficiency ↑': 'boosted efficiency', 
        'Cost ↓': 'reduced costs',
        'Risk ↓': 'mitigated risks',
        'Training ↑': 'enhanced training'
      };
      const beneficiaryMap: Record<string, string> = {
        'Self': 'personal',
        'Team': 'team',
        'Unit': 'unit',
        'Mission': 'mission'
      };
      
      const resultText = `…${outcomeMap[wizardOutcome]} for ${beneficiaryMap[wizardBeneficiary]}`;
      setResult(resultText);
      form.setValue("result", resultText);
      setShowResultWizard(false);
      setWizardBeneficiary("");
      setWizardOutcome("");
      resultRef.current?.focus();
    }
  };

  const canSave = action.trim().length > 0 || impact.trim().length > 0;
  const hasCompleteAIR = action.trim() && impact.trim() && result.trim();

  // Visual stitching preview
  const getAIRPreview = () => {
    if (!action.trim() && !impact.trim() && !result.trim()) return null;
    
    const parts = [];
    if (action.trim()) parts.push(action.trim());
    if (impact.trim()) parts.push(impact.trim());
    if (result.trim()) parts.push(result.trim());
    
    return parts.join('; ');
  };

  const handleSave = async () => {
    if (!canSave) return;
    
    // If result is empty, show wizard
    if (!result.trim()) {
      setShowResultWizard(true);
      return;
    }
    
    try {
      await createWinMutation.mutateAsync({
        category,
        action,
        impact,
        result,
      });
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const totalWins = (wins as any[]).length;
  const thisWeekWins = (wins as any[]).filter((win: any) => {
    const winDate = new Date(win.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return winDate > weekAgo;
  }).length;

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Add Performance Win</h1>
          <p className="text-sm text-muted-foreground">Capture your Action-Impact-Result in under 20 seconds</p>
        </div>

        {/* Major Performance Area Selection */}
        <Card className="border-2 bg-gradient-to-br from-card to-card/80">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Major Performance Area
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={category} onValueChange={(value: PerformanceCategory) => setCategory(value)}>
              <SelectTrigger data-testid="select-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERFORMANCE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              {CATEGORY_TIPS[category as keyof typeof CATEGORY_TIPS]}
            </p>
          </CardContent>
        </Card>

        {/* AIR Form */}
        <Card className="border-2 bg-gradient-to-br from-card to-card/80">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Performance Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Action Input */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Action *</label>
              <Select onValueChange={(value: ActionVerb) => handleActionSelect(value)}>
                <SelectTrigger className="w-full" data-testid="select-action-verb">
                  <SelectValue placeholder="Select an action verb to insert" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_SUGGESTIONS.map((verb) => (
                    <SelectItem key={verb} value={verb}>
                      {verb}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Textarea
                  ref={actionRef}
                  value={action}
                  onChange={(e) => {
                    setAction(e.target.value);
                    form.setValue("action", e.target.value);
                  }}
                  placeholder="What did you do? Start with an action verb..."
                  className="min-h-[80px] resize-none"
                  data-testid="input-action"
                />
                <CharacterCounter current={action.length} max={350} />
              </div>
            </div>

            {/* Impact Input */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Impact *</label>
              <Select onValueChange={(value: string) => handleImpactSelect(value)}>
                <SelectTrigger className="w-full" data-testid="select-impact-type">
                  <SelectValue placeholder="Select an impact type to insert" />
                </SelectTrigger>
                <SelectContent>
                  {IMPACT_OPTIONS.map((category) => (
                    <SelectGroup key={category.category}>
                      <SelectLabel>{category.category}</SelectLabel>
                      {category.values.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Textarea
                  ref={impactRef}
                  value={impact}
                  onChange={(e) => {
                    setImpact(e.target.value);
                    form.setValue("impact", e.target.value);
                  }}
                  placeholder="What was the immediate effect? Include metrics..."
                  className="min-h-[80px] resize-none"
                  data-testid="input-impact"
                />
                <CharacterCounter current={impact.length} max={350} />
              </div>
            </div>

            {/* Result Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Result *</label>
                <div className="flex gap-2">
                  <Dialog open={showResultWizard} onOpenChange={setShowResultWizard}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-result-wizard">
                        <Lightbulb className="w-4 h-4 mr-1" />
                        Wizard
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Result Wizard</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Who benefited?</label>
                          <Select value={wizardBeneficiary} onValueChange={setWizardBeneficiary}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select beneficiary" />
                            </SelectTrigger>
                            <SelectContent>
                              {BENEFICIARY_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">What outcome?</label>
                          <Select value={wizardOutcome} onValueChange={setWizardOutcome}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select outcome" />
                            </SelectTrigger>
                            <SelectContent>
                              {OUTCOME_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          onClick={generateWizardResult}
                          disabled={!wizardBeneficiary || !wizardOutcome}
                          className="w-full"
                        >
                          Generate Result
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Dialog open={showManualTemplates} onOpenChange={setShowManualTemplates}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-manual-templates">
                        <Plus className="w-4 h-4 mr-1" />
                        Templates
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Result Templates</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        {RESULT_TEMPLATES[category as keyof typeof RESULT_TEMPLATES]?.map((template, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => {
                              handleResultTemplateSelect(template);
                              setShowManualTemplates(false);
                            }}
                          >
                            {template}
                          </Button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="relative">
                <Textarea
                  ref={resultRef}
                  value={result}
                  onChange={(e) => {
                    setResult(e.target.value);
                    form.setValue("result", e.target.value);
                  }}
                  placeholder="What was the broader outcome or strategic benefit?"
                  className="min-h-[80px] resize-none"
                  data-testid="input-result"
                />
                <CharacterCounter current={result.length} max={350} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {getAIRPreview() && (
          <Card className="bg-accent/10 border-accent/20">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-foreground mb-2">AIR Preview</h3>
              <p className="text-sm text-muted-foreground">{getAIRPreview()}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {getAIRPreview()?.length || 0}/350 characters
                </span>
                {hasCompleteAIR && (
                  <Badge variant="outline" className="text-xs">
                    Complete AIR
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <Button 
          onClick={handleSave}
          className="w-full" 
          size="lg"
          disabled={!canSave || createWinMutation.isPending}
          data-testid="button-save-win"
        >
          <Save className="mr-2 h-4 w-4" />
          {createWinMutation.isPending ? "Saving..." : "Save Performance Win"}
        </Button>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary" data-testid="text-total-wins">{totalWins}</div>
              <div className="text-sm text-muted-foreground">Total Wins</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-accent" data-testid="text-weekly-wins">{thisWeekWins}</div>
              <div className="text-sm text-muted-foreground">This Week</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}