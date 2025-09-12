import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, PlusCircle, Sparkles, Edit, Download } from "lucide-react";

interface LibraryScreenProps {
  onNavigateToStatements: () => void;
}

export default function LibraryScreen({ onNavigateToStatements }: LibraryScreenProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("wins");

  // Fetch wins and statements
  const { data: wins = [], isLoading: winsLoading } = useQuery({
    queryKey: ["/api/wins"],
    retry: false,
  });

  const { data: statements = [], isLoading: statementsLoading } = useQuery({
    queryKey: ["/api/statements"],
    retry: false,
  });

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

  const filterItems = (items: any[]) => {
    if (!searchTerm) return items;
    return items.filter(item => 
      item.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.impact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.result?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredWins = filterItems(wins as any[]);
  const filteredStatements = filterItems(statements as any[]);

  const handleExportStatement = async (statementId: string) => {
    try {
      const response = await fetch(`/api/export/statement/${statementId}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `statement-${statementId}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Library</h2>
        <Search className="h-5 w-5 text-primary" />
      </div>

      {/* Search */}
      <div className="relative">
        <Input
          data-testid="input-search"
          className="pl-10"
          placeholder="Search wins and statements..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>

      {/* Collection Toggle */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="wins" data-testid="tab-wins">
            Wins ({(wins as any[]).length})
          </TabsTrigger>
          <TabsTrigger value="statements" data-testid="tab-statements">
            Statements ({(statements as any[]).length})
          </TabsTrigger>
        </TabsList>

        {/* Wins Tab */}
        <TabsContent value="wins" className="space-y-3">
          {winsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-muted-foreground">Loading wins...</div>
            </div>
          ) : filteredWins.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "No wins match your search." : "No wins yet. Start capturing your achievements!"}
                </p>
                {!searchTerm && (
                  <Button onClick={() => window.location.href = '/#wins'} data-testid="button-add-first-win">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Your First Win
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredWins.map((win: any) => (
              <Card key={win.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={`text-xs ${getCategoryColor(win.category)}`}>
                          {win.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(win.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mb-2 line-clamp-2">
                        {win.action}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Action • Impact • Result
                        </span>
                        <button 
                          className="text-primary text-xs hover:underline"
                          data-testid={`button-edit-win-${win.id}`}
                        >
                          <Edit className="mr-1 h-3 w-3 inline" />Edit
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Statements Tab */}
        <TabsContent value="statements" className="space-y-3">
          {statementsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-muted-foreground">Loading statements...</div>
            </div>
          ) : filteredStatements.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "No statements match your search." : "No statements yet. Generate your first one!"}
                </p>
                {!searchTerm && (
                  <Button onClick={onNavigateToStatements} data-testid="button-generate-first-statement">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Your First Statement
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredStatements.map((statement: any) => (
              <Card key={statement.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge className={`text-xs ${getCategoryColor(statement.category)}`}>
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
                        {statement.content.length}/350 characters
                      </span>
                      <div className="flex space-x-2">
                        <button 
                          className="text-primary text-xs hover:underline"
                          data-testid={`button-edit-statement-${statement.id}`}
                        >
                          <Edit className="mr-1 h-3 w-3 inline" />Edit
                        </button>
                        <button 
                          className="text-primary text-xs hover:underline"
                          onClick={() => handleExportStatement(statement.id)}
                          data-testid={`button-export-statement-${statement.id}`}
                        >
                          <Download className="mr-1 h-3 w-3 inline" />Export
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="flex space-x-3">
        <Button className="flex-1" onClick={() => window.location.href = '/#wins'} data-testid="button-add-win">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Win
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onNavigateToStatements} data-testid="button-generate-statement">
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Statement
        </Button>
      </div>
    </div>
  );
}
