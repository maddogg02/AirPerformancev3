import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, FileDown, Calendar, Edit2, Trash2, MessageSquare, ChevronDown, ChevronRight, FileText, Plus, Sparkles, PlusCircle } from "lucide-react";
import { PERFORMANCE_CATEGORIES } from "../lib/constants";

interface LibraryScreenProps {
  onNavigateToStatements?: () => void;
}

export default function LibraryScreen({ onNavigateToStatements }: LibraryScreenProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("entries");
  const [searchQuery, setSearchQuery] = useState("");
  const [statementSearchQuery, setStatementSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatementCategory, setSelectedStatementCategory] = useState<string>("all");
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  
  // Entry editing state
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editAction, setEditAction] = useState("");
  const [editImpact, setEditImpact] = useState("");
  const [editResult, setEditResult] = useState("");
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  
  // Statement editing state
  const [editingStatement, setEditingStatement] = useState<any>(null);
  const [editStatementText, setEditStatementText] = useState("");
  const [writingStatementForEntry, setWritingStatementForEntry] = useState<string | null>(null);
  const [newStatementText, setNewStatementText] = useState("");

  // Fetch wins and statements
  const { data: wins = [], isLoading: winsLoading } = useQuery({
    queryKey: ["/api/wins"],
    retry: false,
  });

  const { data: statements = [], isLoading: statementsLoading } = useQuery({
    queryKey: ["/api/statements"],
    retry: false,
  });

  // Create statement mutation
  const createStatementMutation = useMutation({
    mutationFn: async (data: { content: string; winId: string }) => {
      const response = await apiRequest("POST", "/api/statements", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Statement saved!",
        description: "Your statement has been added to your library.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/statements"] });
      setNewStatementText("");
      setWritingStatementForEntry(null);
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
        description: "Failed to save statement. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update entry mutation
  const updateEntryMutation = useMutation({
    mutationFn: async (data: { id: string; action: string; impact: string; result: string }) => {
      const response = await apiRequest("PUT", `/api/wins/${data.id}`, {
        action: data.action,
        impact: data.impact,
        result: data.result,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Entry updated!",
        description: "Your changes have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/wins"] });
      setEditingEntry(null);
      setEditAction("");
      setEditImpact("");
      setEditResult("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await apiRequest("DELETE", `/api/wins/${entryId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Entry deleted",
        description: "Performance entry has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/wins"] });
      setDeletingEntryId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update statement mutation
  const updateStatementMutation = useMutation({
    mutationFn: async (data: { id: string; content: string }) => {
      const response = await apiRequest("PUT", `/api/statements/${data.id}`, {
        content: data.content,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Statement updated!",
        description: "Your changes have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/statements"] });
      setEditingStatement(null);
      setEditStatementText("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update statement. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete statement mutation
  const deleteStatementMutation = useMutation({
    mutationFn: async (statementId: string) => {
      const response = await apiRequest("DELETE", `/api/statements/${statementId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Statement deleted",
        description: "Statement has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/statements"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete statement. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter entries based on search and category
  const filteredEntries = (wins as any[]).filter(entry => {
    const matchesSearch = !searchQuery || 
      entry.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.impact?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.result?.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = selectedCategory === "all" || entry.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Filter statements based on search and category
  const filteredStatements = (statements as any[]).filter(statement => {
    const matchesSearch = !statementSearchQuery || 
      statement.content?.toLowerCase().includes(statementSearchQuery.toLowerCase());
    const matchesCategory = selectedStatementCategory === "all" || statement.category === selectedStatementCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleEntryExpansion = (entryId: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: '2-digit'
    });
  };

  const handleEditEntry = (entry: any) => {
    setEditingEntry(entry);
    setEditAction(entry.action);
    setEditImpact(entry.impact);
    setEditResult(entry.result);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    
    await updateEntryMutation.mutateAsync({
      id: editingEntry.id,
      action: editAction,
      impact: editImpact,
      result: editResult,
    });
  };

  const handleDeleteEntry = async (entryId: string) => {
    await deleteEntryMutation.mutateAsync(entryId);
  };

  const handleEditStatement = (statement: any) => {
    setEditingStatement(statement);
    setEditStatementText(statement.content);
  };

  const handleSaveStatementEdit = async () => {
    if (!editingStatement) return;
    
    await updateStatementMutation.mutateAsync({
      id: editingStatement.id,
      content: editStatementText,
    });
  };

  const handleDeleteStatement = async (statementId: string) => {
    await deleteStatementMutation.mutateAsync(statementId);
  };

  const handleAddStatement = async (entryId: string) => {
    if (!newStatementText.trim()) {
      toast({
        title: "Empty Statement",
        description: "Please enter a statement before saving.",
        variant: "destructive",
      });
      return;
    }

    await createStatementMutation.mutateAsync({
      content: newStatementText.trim(),
      winId: entryId,
    });
  };

  const handleGenerateStatement = (entry: any) => {
    // Navigate to statements screen with the entry data
    if (onNavigateToStatements) {
      onNavigateToStatements();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Performance Library</h1>
            <p className="text-sm text-muted-foreground">Manage your wins and statements</p>
          </div>
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entries" className="flex items-center gap-2" data-testid="tab-entries">
                <FileDown className="w-4 h-4" />
                Entries ({filteredEntries.length})
              </TabsTrigger>
              <TabsTrigger value="statements" className="flex items-center gap-2" data-testid="tab-statements">
                <MessageSquare className="w-4 h-4" />
                Statements ({filteredStatements.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="entries" className="space-y-4 mt-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your wins..."
                  className="pl-10"
                  data-testid="input-search-entries"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="flex-1" data-testid="select-category-filter">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {PERFORMANCE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Results Count */}
              <div className="text-sm text-muted-foreground text-center">
                {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
              </div>

              {/* Entries List */}
              {winsLoading ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-muted-foreground">Loading your performance entries...</p>
                </div>
              ) : filteredEntries.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground mb-4">
                      {searchQuery ? "No entries match your search." : "No entries yet. Start capturing your achievements!"}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => window.location.href = '/#wins'} data-testid="button-add-first-entry">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Your First Entry
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredEntries.map((entry) => {
                    const relatedStatements = (statements as any[]).filter(s => s.winId === entry.id);
                    const hasStatements = relatedStatements.length > 0;
                    const isExpanded = expandedEntries.has(entry.id);
                    
                    return (
                      <Card 
                        key={entry.id}
                        className="transition-all hover:shadow-md"
                        data-testid={`card-entry-${entry.id}`}
                      >
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {entry.category}
                                </Badge>
                                {hasStatements && (
                                  <Badge variant="outline" className="text-xs">
                                    {relatedStatements.length} statement{relatedStatements.length !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {formatDate(entry.createdAt)}
                              </div>
                            </div>

                            {/* Performance Details */}
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs text-muted-foreground font-medium">ACTION</p>
                                <p className="text-sm text-foreground">
                                  {entry.action}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground font-medium">IMPACT</p>
                                <p className="text-sm text-foreground">
                                  {entry.impact}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground font-medium">RESULT</p>
                                <p className="text-sm text-foreground">
                                  {entry.result}
                                </p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-muted/20">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditEntry(entry);
                                  }}
                                  className="h-8 px-2 text-xs"
                                  data-testid={`button-edit-entry-${entry.id}`}
                                >
                                  <Edit2 className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingEntryId(entry.id);
                                  }}
                                  className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                                  data-testid={`button-delete-entry-${entry.id}`}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Delete
                                </Button>
                              </div>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGenerateStatement(entry);
                                }}
                                className="h-8 px-3 text-xs"
                                data-testid={`button-generate-statement-${entry.id}`}
                              >
                                <Sparkles className="w-3 h-3 mr-1" />
                                Generate Statement
                              </Button>
                            </div>

                            {/* Manual Statement Writing */}
                            <div className="space-y-2 pt-2 border-t border-muted/20">
                              <details className="group">
                                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                                  <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                                  <span>Write manual statement</span>
                                  {hasStatements && (
                                    <Badge variant="outline" className="text-xs">
                                      {relatedStatements.length} saved
                                    </Badge>
                                  )}
                                </summary>
                                
                                <div className="mt-2 space-y-2">
                                  {hasStatements && (
                                    <div className="space-y-2">
                                      {relatedStatements.map((statement) => (
                                        <div key={statement.id} className="p-2 border rounded text-xs bg-muted/10">
                                          <div className="flex items-start justify-between gap-2 mb-1">
                                            <p className="text-xs text-muted-foreground">
                                              {formatDate(statement.createdAt)}
                                            </p>
                                            <div className="flex gap-1">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleEditStatement(statement);
                                                }}
                                                className="h-6 w-6 p-0"
                                              >
                                                <Edit2 className="w-3 h-3" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteStatement(statement.id);
                                                }}
                                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>
                                          <p className="text-xs">{statement.content}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {writingStatementForEntry === entry.id ? (
                                    <div className="space-y-2">
                                      <Textarea
                                        value={newStatementText}
                                        onChange={(e) => setNewStatementText(e.target.value)}
                                        placeholder="Write your statement here..."
                                        className="text-xs"
                                        rows={3}
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => handleAddStatement(entry.id)}
                                          disabled={createStatementMutation.isPending}
                                          className="text-xs"
                                        >
                                          Save Statement
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setWritingStatementForEntry(null);
                                            setNewStatementText("");
                                          }}
                                          className="text-xs"
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setWritingStatementForEntry(entry.id)}
                                      className="w-full text-xs"
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add Statement
                                    </Button>
                                  )}
                                </div>
                              </details>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Statements Tab */}
            <TabsContent value="statements" className="space-y-4 mt-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  value={statementSearchQuery}
                  onChange={(e) => setStatementSearchQuery(e.target.value)}
                  placeholder="Search your statements..."
                  className="pl-10"
                  data-testid="input-search-statements"
                />
              </div>

              {/* Category Filter */}
              <div className="flex gap-2">
                <Select value={selectedStatementCategory} onValueChange={setSelectedStatementCategory}>
                  <SelectTrigger className="flex-1" data-testid="select-statement-category-filter">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {PERFORMANCE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Results Count */}
              <div className="text-sm text-muted-foreground text-center">
                {filteredStatements.length} {filteredStatements.length === 1 ? 'statement' : 'statements'}
              </div>

              {/* Statements List */}
              {statementsLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading your statements...</p>
                </div>
              ) : filteredStatements.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground mb-4">
                      {statementSearchQuery ? "No statements match your search." : "No statements yet. Generate your first one!"}
                    </p>
                    {!statementSearchQuery && onNavigateToStatements && (
                      <Button onClick={onNavigateToStatements} data-testid="button-generate-first-statement">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Your First Statement
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredStatements.map((statement) => (
                    <Card key={statement.id} data-testid={`card-statement-${statement.id}`}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="text-xs">
                                {statement.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(statement.createdAt)}
                              </span>
                              {statement.isCompleted && (
                                <Badge variant="outline" className="text-xs">
                                  Complete
                                </Badge>
                              )}
                            </div>
                            {statement.aiScore && (
                              <div className="flex items-center space-x-1">
                                <span className="text-sm font-bold text-accent">{statement.aiScore}</span>
                                <span className="text-xs text-accent">/10</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-foreground line-clamp-3">
                            {statement.content}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {statement.content?.length || 0} characters
                            </span>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditStatement(statement)}
                                data-testid={`button-edit-statement-${statement.id}`}
                              >
                                <Edit2 className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteStatement(statement.id)}
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-statement-${statement.id}`}
                              >
                                <Trash2 className="mr-1 h-3 w-3" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-3">
          <Button className="flex-1" onClick={() => window.location.href = '/#wins'} data-testid="button-add-win">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Win
          </Button>
          {onNavigateToStatements && (
            <Button variant="secondary" className="flex-1" onClick={onNavigateToStatements} data-testid="button-generate-statement">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Statement
            </Button>
          )}
        </div>

        {/* Edit Entry Dialog */}
        <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Performance Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-action">Action</Label>
                <Textarea
                  id="edit-action"
                  value={editAction}
                  onChange={(e) => setEditAction(e.target.value)}
                  placeholder="What did you do?"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-impact">Impact</Label>
                <Textarea
                  id="edit-impact"
                  value={editImpact}
                  onChange={(e) => setEditImpact(e.target.value)}
                  placeholder="What was the immediate effect?"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-result">Result</Label>
                <Textarea
                  id="edit-result"
                  value={editResult}
                  onChange={(e) => setEditResult(e.target.value)}
                  placeholder="What was the broader outcome?"
                  className="mt-1"
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleSaveEdit} disabled={updateEntryMutation.isPending}>
                  {updateEntryMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => setEditingEntry(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Statement Dialog */}
        <Dialog open={!!editingStatement} onOpenChange={() => setEditingStatement(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Statement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-statement">Statement</Label>
                <Textarea
                  id="edit-statement"
                  value={editStatementText}
                  onChange={(e) => setEditStatementText(e.target.value)}
                  placeholder="Edit your statement..."
                  className="mt-1"
                  rows={4}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleSaveStatementEdit} disabled={updateStatementMutation.isPending}>
                  {updateStatementMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => setEditingStatement(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Entry Confirmation Dialog */}
        <Dialog open={!!deletingEntryId} onOpenChange={() => setDeletingEntryId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Entry</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this performance entry? This action cannot be undone.
            </p>
            <div className="flex space-x-2">
              <Button 
                variant="destructive" 
                onClick={() => deletingEntryId && handleDeleteEntry(deletingEntryId)}
                disabled={deleteEntryMutation.isPending}
              >
                {deleteEntryMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
              <Button variant="outline" onClick={() => setDeletingEntryId(null)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}