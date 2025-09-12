import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileDown, Calendar as CalendarIcon, Filter, Share2, Target, Users, TrendingUp, Zap, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PERFORMANCE_CATEGORIES } from "@/lib/constants";

const formats = [
  { value: 'PDF', label: 'PDF Report', description: 'Professional formatted document' },
  { value: 'DOCX', label: 'Word Document', description: 'Editable Microsoft Word format' },
  { value: 'CSV', label: 'Excel/CSV', description: 'Data spreadsheet format' },
] as const;

const views = [
  { value: 'Full Report', label: 'Full Report', description: 'Complete details with categories and entries' },
  { value: 'Category-only', label: 'Category Summary', description: 'Grouped by performance areas only' },
  { value: 'Timeline', label: 'Timeline View', description: 'Chronological order with dates' },
  { value: 'Statements Only', label: 'Statements Only', description: 'Refined performance statements' },
] as const;

// Category icons mapping
const categoryIcons = {
  'Mission Execution': Target,
  'Leading People': Users,
  'Improving Unit': TrendingUp,
  'Managing Resources': Zap,
  'Personal Development': User,
} as const;

function ExportScreen() {
  type ExportFormat = typeof formats[number]['value'];
  type ExportView = typeof views[number]['value'];
  
  const [exportOptions, setExportOptions] = useState<{
    format: ExportFormat;
    view: ExportView;
  }>({
    format: 'PDF',
    view: 'Full Report',
  });
  
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(PERFORMANCE_CATEGORIES));
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isExporting, setIsExporting] = useState(false);

  const handleCategoryToggle = (category: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(category)) {
      newSelected.delete(category);
    } else {
      newSelected.add(category);
    }
    setSelectedCategories(newSelected);
  };

  const handleSelectAllCategories = () => {
    if (selectedCategories.size === PERFORMANCE_CATEGORIES.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(PERFORMANCE_CATEGORIES));
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const exportData = {
        ...exportOptions,
        categories: Array.from(selectedCategories),
        dateRange: startDate && endDate ? { start: startDate, end: endDate } : undefined,
      };
      
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const filename = `af-performance-${exportOptions.format.toLowerCase()}-${new Date().toISOString().split('T')[0]}`;
      const extension = exportOptions.format === 'PDF' ? '.pdf' : exportOptions.format === 'DOCX' ? '.docx' : '.csv';
      a.download = filename + extension;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Export error:', error);
      // TODO: Show error toast
    } finally {
      setIsExporting(false);
    }
  };

  const canExport = selectedCategories.size > 0;

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Export Report</h1>
          <p className="text-sm text-muted-foreground">Generate and share your performance data</p>
        </div>

        {/* Export Format */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileDown className="w-4 h-4" />
              Export Format
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formats.map((format) => (
              <div 
                key={format.value}
                className={cn(
                  "flex items-center justify-between p-3 rounded-md border cursor-pointer transition-all",
                  exportOptions.format === format.value 
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950" 
                    : "border-border hover:bg-accent"
                )}
                onClick={() => setExportOptions(prev => ({ ...prev, format: format.value }))}
                data-testid={`format-${format.value.toLowerCase()}`}
              >
                <div>
                  <div className="font-medium text-sm">{format.label}</div>
                  <div className="text-xs text-muted-foreground">{format.description}</div>
                </div>
                <div className={cn(
                  "w-4 h-4 rounded-full border-2",
                  exportOptions.format === format.value
                    ? "border-blue-500 bg-blue-500"
                    : "border-muted-foreground"
                )} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Report View */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={exportOptions.view} 
              onValueChange={(value: any) => setExportOptions(prev => ({ ...prev, view: value }))}
            >
              <SelectTrigger data-testid="view-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {views.map((view) => (
                  <SelectItem key={view.value} value={view.value}>
                    <div>
                      <div className="font-medium">{view.label}</div>
                      <div className="text-xs text-muted-foreground">{view.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Date Range */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Date Range (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">From</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                      data-testid="date-start"
                    >
                      <CalendarIcon className="w-4 h-4" />
                      {startDate ? format(startDate, "MMM d") : "Start"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">To</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                      data-testid="date-end"
                    >
                      <CalendarIcon className="w-4 h-4" />
                      {endDate ? format(endDate, "MMM d") : "End"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Performance Areas
              </div>
              <Button variant="ghost" size="sm" onClick={handleSelectAllCategories} data-testid="toggle-all-categories">
                {selectedCategories.size === PERFORMANCE_CATEGORIES.length ? 'None' : 'All'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {PERFORMANCE_CATEGORIES.map((category) => {
              const Icon = categoryIcons[category as keyof typeof categoryIcons];
              return (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={category}
                    checked={selectedCategories.has(category)}
                    onCheckedChange={() => handleCategoryToggle(category)}
                    data-testid={`category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                  />
                  <label
                    htmlFor={category}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    {category}
                  </label>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Export Summary */}
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Format:</span>
                <span className="font-medium" data-testid="summary-format">{exportOptions.format}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">View:</span>
                <span className="font-medium" data-testid="summary-view">{exportOptions.view}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Categories:</span>
                <span className="font-medium" data-testid="summary-categories">{selectedCategories.size} selected</span>
              </div>
              {(startDate || endDate) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date Range:</span>
                  <span className="font-medium" data-testid="summary-dates">
                    {startDate ? format(startDate, "MMM d") : "Start"} - {endDate ? format(endDate, "MMM d") : "End"}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={!canExport || isExporting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6"
          data-testid="button-export"
        >
          {isExporting ? (
            <>Generating Report...</>
          ) : (
            <>
              <Share2 className="w-5 h-5 mr-2" />
              Export & Share Report
            </>
          )}
        </Button>

        {!canExport && (
          <p className="text-xs text-center text-muted-foreground">
            Select at least one performance area to export
          </p>
        )}
      </div>
    </div>
  );
}

export default ExportScreen;