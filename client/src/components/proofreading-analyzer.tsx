import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  Download,
  Lightbulb,
  BookOpen,
  Eye,
  BarChart3,
  Target,
  Zap,
  Save,
  LibraryBig,
  ArrowLeft
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ProofreadingIssue {
  id: string;
  type: 'spelling' | 'grammar' | 'punctuation' | 'flow' | 'cohesion' | 'readability' | 'style' | 'consistency' | 'structure';
  severity: 'critical' | 'high' | 'medium' | 'low';
  position: {
    line: number;
    column: number;
    length: number;
  };
  originalText: string;
  suggestedText: string;
  explanation: string;
  rule?: string;
}

interface ProofreadingReport {
  overallScore: number;
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
  issues: ProofreadingIssue[];
  spellingAndGrammar: {
    score: number;
    errors: number;
    commonMistakes: string[];
  };
  flowAndCohesion: {
    flowAnalysis: {
      overallScore: number;
      pacing: { score: number; issues: string[]; recommendations: string[]; };
      rhythm: { score: number; variability: string; issues: string[]; };
      transitions: { score: number; weakTransitions: any[]; };
    };
    cohesionAnalysis: {
      score: number;
      issues: any[];
      strengths: string[];
      recommendations: string[];
    };
  };
  readabilityAnalysis: {
    score: number;
    gradeLevel: number;
    targetAudience: string;
    improvements: string[];
  };
  styleConsistency: {
    score: number;
    voice: { score: number; issues: string[]; };
    tone: { score: number; issues: string[]; };
    pov: { score: number; issues: string[]; };
  };
  structuralAnalysis: {
    score: number;
    chapterStructure: string;
    paragraphFlow: string;
    dialogueQuality: string;
  };
  recommendations: {
    immediate: string[];
    important: string[];
    suggestions: string[];
  };
  processedText?: string;
}

export function ProofreadingAnalyzer() {
  const [inputText, setInputText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisMode, setAnalysisMode] = useState<"text" | "upload">("text");
  const [report, setReport] = useState<ProofreadingReport | null>(null);
  const [originalTitle, setOriginalTitle] = useState("");
  const [options, setOptions] = useState({
    includeProcessedText: false,
    targetAudience: "general",
    genre: "general",
    focusAreas: [] as string[]
  });

  const { toast } = useToast();

  const analyzeTextMutation = useMutation({
    mutationFn: async ({ content, analysisOptions }: { content: string; analysisOptions: any }) => {
      return apiRequest("/api/proofreading/analyze", "POST", {
        content,
        options: analysisOptions
      });
    },
    onSuccess: (data) => {
      setReport(data);
      toast({
        title: "Analysis Complete",
        description: `Proofreading analysis completed with an overall score of ${data.overallScore}/100`,
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze text",
        variant: "destructive",
      });
    },
  });

  const analyzeUploadMutation = useMutation({
    mutationFn: async ({ file, analysisOptions }: { file: File; analysisOptions: any }) => {
      const formData = new FormData();
      formData.append("manuscript", file);
      formData.append("options", JSON.stringify(analysisOptions));

      const response = await fetch("/api/proofreading/analyze-upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Upload analysis failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setReport(data);
      toast({
        title: "Analysis Complete",
        description: `Document analysis completed with an overall score of ${data.overallScore}/100`,
      });
    },
    onError: (error) => {
      toast({
        title: "Upload Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze uploaded document",
        variant: "destructive",
      });
    },
  });

  const saveToLibraryMutation = useMutation({
    mutationFn: async ({ correctedText, title, analysisReport }: { 
      correctedText: string; 
      title: string; 
      analysisReport: ProofreadingReport 
    }) => {
      return apiRequest("/api/proofreading/save-to-library", "POST", {
        correctedText,
        originalTitle: title,
        analysisReport
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Saved to Library",
        description: `Corrected manuscript "${data.manuscript.title}" saved successfully with ${data.manuscript.wordCount} words`,
      });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save to library",
        variant: "destructive",
      });
    },
  });

  const downloadDocxMutation = useMutation({
    mutationFn: async ({ correctedText, title, formatOptions }: { 
      correctedText: string; 
      title: string;
      formatOptions?: any;
    }) => {
      const response = await fetch("/api/proofreading/download-docx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          correctedText,
          title,
          formatOptions
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Download failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9-_\s]/g, '') || 'corrected-manuscript'}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Download Complete",
        description: "Formatted DOCX file downloaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download DOCX",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (analysisMode === "text") {
      if (!inputText.trim() || inputText.trim().length < 100) {
        toast({
          title: "Input Required",
          description: "Please enter at least 100 characters of text to analyze",
          variant: "destructive",
        });
        return;
      }
      analyzeTextMutation.mutate({ content: inputText, analysisOptions: options });
    } else {
      if (!uploadedFile) {
        toast({
          title: "File Required",
          description: "Please select a DOCX file to analyze",
          variant: "destructive",
        });
        return;
      }
      analyzeUploadMutation.mutate({ file: uploadedFile, analysisOptions: options });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        toast({
          title: "Invalid File Type",
          description: "Please select a DOCX file",
          variant: "destructive",
        });
        return;
      }
      setUploadedFile(file);
    }
  };

  const handleFocusAreaChange = (area: string, checked: boolean) => {
    setOptions(prev => ({
      ...prev,
      focusAreas: checked 
        ? [...prev.focusAreas, area]
        : prev.focusAreas.filter(a => a !== area)
    }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 85) return "bg-green-100 text-green-800";
    if (score >= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Info className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const downloadCorrectedText = () => {
    if (!report?.processedText) return;
    
    const blob = new Blob([report.processedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proofread-text.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const saveToLibrary = () => {
    if (!report?.processedText) {
      toast({
        title: "No Content",
        description: "No corrected text available to save. Enable 'Include corrected text' option and re-analyze.",
        variant: "destructive",
      });
      return;
    }

    const title = originalTitle || (uploadedFile?.name.replace('.docx', '')) || 'Proofread Manuscript';
    saveToLibraryMutation.mutate({
      correctedText: report.processedText,
      title,
      analysisReport: report
    });
  };

  const downloadDocx = () => {
    if (!report?.processedText) {
      toast({
        title: "No Content",
        description: "No corrected text available to download. Enable 'Include corrected text' option and re-analyze.",
        variant: "destructive",
      });
      return;
    }

    const title = originalTitle || (uploadedFile?.name.replace('.docx', '')) || 'Corrected Manuscript';
    downloadDocxMutation.mutate({
      correctedText: report.processedText,
      title,
      formatOptions: {
        format: 'kdp',
        font: 'Aptos',
        fontSize: 12,
        margins: 'normal',
        includePageNumbers: true,
        includeTitle: true
      }
    });
  };

  const isAnalyzing = analyzeTextMutation.isPending || analyzeUploadMutation.isPending;

  return (
    <div className="space-y-6" data-testid="proofreading-analyzer">
      {/* Back Navigation */}
      <div className="flex items-center justify-start">
        <Button
          variant="outline"
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-2"
          data-testid="button-back-home"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Generator
        </Button>
      </div>
      
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Manuscript Proofreading</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Comprehensive analysis of your manuscript for grammar, spelling, flow, cohesion, readability, and style consistency.
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Input Your Content
          </CardTitle>
          <CardDescription>
            Choose how to provide your manuscript for analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Analysis Mode Toggle */}
          <div className="flex gap-4">
            <Button
              variant={analysisMode === "text" ? "default" : "outline"}
              onClick={() => setAnalysisMode("text")}
              data-testid="button-text-mode"
            >
              <FileText className="h-4 w-4 mr-2" />
              Text Input
            </Button>
            <Button
              variant={analysisMode === "upload" ? "default" : "outline"}
              onClick={() => setAnalysisMode("upload")}
              data-testid="button-upload-mode"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload DOCX
            </Button>
          </div>

          {/* Text Input */}
          {analysisMode === "text" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manuscript-title">Title (Optional)</Label>
                <Input
                  id="manuscript-title"
                  placeholder="Enter manuscript title..."
                  value={originalTitle}
                  onChange={(e) => setOriginalTitle(e.target.value)}
                  data-testid="input-manuscript-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manuscript-text">Manuscript Text</Label>
                <Textarea
                  id="manuscript-text"
                  placeholder="Paste your manuscript text here (minimum 100 characters)..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="min-h-[200px]"
                  data-testid="textarea-manuscript"
                />
                <p className="text-sm text-slate-500">
                  Characters: {inputText.length} (minimum 100 required)
                </p>
              </div>
            </div>
          )}

          {/* File Upload */}
          {analysisMode === "upload" && (
            <div className="space-y-2">
              <Label htmlFor="manuscript-file">Upload Manuscript</Label>
              <Input
                id="manuscript-file"
                type="file"
                accept=".docx"
                onChange={handleFileChange}
                data-testid="input-file-upload"
              />
              {uploadedFile && (
                <p className="text-sm text-green-600">
                  Selected: {uploadedFile.name}
                </p>
              )}
            </div>
          )}

          {/* Analysis Options */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">Analysis Options</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target-audience">Target Audience</Label>
                <Select value={options.targetAudience} onValueChange={(value) => 
                  setOptions(prev => ({ ...prev, targetAudience: value }))
                }>
                  <SelectTrigger data-testid="select-target-audience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Audience</SelectItem>
                    <SelectItem value="children">Children</SelectItem>
                    <SelectItem value="young-adult">Young Adult</SelectItem>
                    <SelectItem value="adult">Adult</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <Select value={options.genre} onValueChange={(value) => 
                  setOptions(prev => ({ ...prev, genre: value }))
                }>
                  <SelectTrigger data-testid="select-genre">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="fiction">Fiction</SelectItem>
                    <SelectItem value="fantasy">Fantasy</SelectItem>
                    <SelectItem value="romance">Romance</SelectItem>
                    <SelectItem value="mystery">Mystery</SelectItem>
                    <SelectItem value="sci-fi">Science Fiction</SelectItem>
                    <SelectItem value="non-fiction">Non-Fiction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Focus Areas (Optional)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { id: 'spelling', label: 'Spelling' },
                  { id: 'grammar', label: 'Grammar' },
                  { id: 'flow', label: 'Flow' },
                  { id: 'cohesion', label: 'Cohesion' },
                  { id: 'readability', label: 'Readability' },
                  { id: 'style', label: 'Style' }
                ].map(area => (
                  <div key={area.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={area.id}
                      checked={options.focusAreas.includes(area.id)}
                      onCheckedChange={(checked) => 
                        handleFocusAreaChange(area.id, checked as boolean)
                      }
                      data-testid={`checkbox-${area.id}`}
                    />
                    <Label htmlFor={area.id} className="text-sm">{area.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-corrected"
                checked={options.includeProcessedText}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeProcessedText: checked as boolean }))
                }
                data-testid="checkbox-include-corrected"
              />
              <Label htmlFor="include-corrected" className="text-sm">
                Include corrected text in results
              </Label>
            </div>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full"
            data-testid="button-analyze"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Start Proofreading Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {report && (
        <div className="space-y-6">
          {/* Overall Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Overall Analysis Score
                </span>
                <Badge className={getScoreBadgeColor(report.overallScore)}>
                  {report.overallScore}/100
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={report.overallScore} className="h-3" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-red-600">{report.summary.criticalIssues}</p>
                    <p className="text-sm text-slate-600">Critical</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-orange-600">{report.summary.highIssues}</p>
                    <p className="text-sm text-slate-600">High</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-yellow-600">{report.summary.mediumIssues}</p>
                    <p className="text-sm text-slate-600">Medium</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-blue-600">{report.summary.lowIssues}</p>
                    <p className="text-sm text-slate-600">Low</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="issues" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="issues">Issues</TabsTrigger>
                  <TabsTrigger value="scores">Scores</TabsTrigger>
                  <TabsTrigger value="readability">Readability</TabsTrigger>
                  <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                  <TabsTrigger value="corrected">Corrected</TabsTrigger>
                </TabsList>

                <TabsContent value="issues" className="space-y-4">
                  <ScrollArea className="h-[400px]">
                    {report.issues.length > 0 ? (
                      <div className="space-y-3">
                        {report.issues.map((issue, index) => (
                          <Card key={issue.id} className="p-4">
                            <div className="flex items-start gap-3">
                              {getSeverityIcon(issue.severity)}
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline">{issue.type}</Badge>
                                  <Badge variant="secondary">{issue.severity}</Badge>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm text-slate-600">
                                    <span className="font-medium">Original:</span> "{issue.originalText}"
                                  </p>
                                  <p className="text-sm text-green-700">
                                    <span className="font-medium">Suggested:</span> "{issue.suggestedText}"
                                  </p>
                                  <p className="text-sm text-slate-700">{issue.explanation}</p>
                                  {issue.rule && (
                                    <p className="text-xs text-slate-500">Rule: {issue.rule}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                        <p className="text-slate-600">No issues found! Your text looks great.</p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="scores" className="space-y-4">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="p-4">
                        <h4 className="font-medium mb-2">Grammar & Spelling</h4>
                        <div className="flex items-center justify-between">
                          <span className={getScoreColor(report.spellingAndGrammar.score)}>
                            {report.spellingAndGrammar.score}/100
                          </span>
                          <span className="text-sm text-slate-600">
                            {report.spellingAndGrammar.errors} errors
                          </span>
                        </div>
                      </Card>

                      <Card className="p-4">
                        <h4 className="font-medium mb-2">Readability</h4>
                        <div className="flex items-center justify-between">
                          <span className={getScoreColor(report.readabilityAnalysis.score)}>
                            {report.readabilityAnalysis.score}/100
                          </span>
                          <span className="text-sm text-slate-600">
                            Grade {report.readabilityAnalysis.gradeLevel}
                          </span>
                        </div>
                      </Card>

                      <Card className="p-4">
                        <h4 className="font-medium mb-2">Style Consistency</h4>
                        <div className="flex items-center justify-between">
                          <span className={getScoreColor(report.styleConsistency.score)}>
                            {report.styleConsistency.score}/100
                          </span>
                          <span className="text-sm text-slate-600">
                            Voice: {report.styleConsistency.voice.score}
                          </span>
                        </div>
                      </Card>

                      <Card className="p-4">
                        <h4 className="font-medium mb-2">Structure</h4>
                        <div className="flex items-center justify-between">
                          <span className={getScoreColor(report.structuralAnalysis.score)}>
                            {report.structuralAnalysis.score}/100
                          </span>
                          <span className="text-sm text-slate-600">
                            Organization
                          </span>
                        </div>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="readability" className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="p-4 text-center">
                        <h4 className="font-medium mb-2">Readability Score</h4>
                        <p className={`text-2xl font-bold ${getScoreColor(report.readabilityAnalysis.score)}`}>
                          {report.readabilityAnalysis.score}/100
                        </p>
                      </Card>
                      <Card className="p-4 text-center">
                        <h4 className="font-medium mb-2">Grade Level</h4>
                        <p className="text-2xl font-bold text-slate-700">
                          {report.readabilityAnalysis.gradeLevel}
                        </p>
                      </Card>
                      <Card className="p-4 text-center">
                        <h4 className="font-medium mb-2">Target Audience</h4>
                        <p className="text-lg font-medium text-slate-700">
                          {report.readabilityAnalysis.targetAudience}
                        </p>
                      </Card>
                    </div>

                    {report.readabilityAnalysis.improvements.length > 0 && (
                      <Card className="p-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Readability Improvements
                        </h4>
                        <ul className="space-y-2">
                          {report.readabilityAnalysis.improvements.map((improvement, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{improvement}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="recommendations" className="space-y-4">
                  <div className="space-y-4">
                    {report.recommendations.immediate.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Immediate Actions Required:</strong>
                          <ul className="mt-2 space-y-1">
                            {report.recommendations.immediate.map((rec, index) => (
                              <li key={index} className="ml-4">• {rec}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {report.recommendations.important.length > 0 && (
                      <Card className="p-4">
                        <h4 className="font-medium mb-2 text-orange-700">Important Improvements</h4>
                        <ul className="space-y-1">
                          {report.recommendations.important.map((rec, index) => (
                            <li key={index} className="text-sm">• {rec}</li>
                          ))}
                        </ul>
                      </Card>
                    )}

                    {report.recommendations.suggestions.length > 0 && (
                      <Card className="p-4">
                        <h4 className="font-medium mb-2 text-blue-700">Additional Suggestions</h4>
                        <ul className="space-y-1">
                          {report.recommendations.suggestions.map((rec, index) => (
                            <li key={index} className="text-sm">• {rec}</li>
                          ))}
                        </ul>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="corrected" className="space-y-4">
                  {report.processedText ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Corrected Text</h4>
                        <div className="flex gap-2">
                          <Button 
                            onClick={downloadCorrectedText}
                            size="sm"
                            variant="outline"
                            data-testid="button-download-txt"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download TXT
                          </Button>
                          <Button 
                            onClick={downloadDocx}
                            size="sm"
                            variant="outline"
                            disabled={downloadDocxMutation.isPending}
                            data-testid="button-download-docx"
                          >
                            {downloadDocxMutation.isPending ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600 mr-2" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <FileText className="h-4 w-4 mr-2" />
                                Download DOCX
                              </>
                            )}
                          </Button>
                          <Button 
                            onClick={saveToLibrary}
                            size="sm"
                            disabled={saveToLibraryMutation.isPending}
                            data-testid="button-save-library"
                          >
                            {saveToLibraryMutation.isPending ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save to Library
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      <Card className="p-4">
                        <ScrollArea className="h-[400px]">
                          <pre className="whitespace-pre-wrap text-sm">{report.processedText}</pre>
                        </ScrollArea>
                      </Card>
                      
                      <Alert>
                        <LibraryBig className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Pro tip:</strong> Save to Library to keep your corrected manuscript for future use, or download as DOCX for immediate publishing. The DOCX format includes professional formatting suitable for Amazon KDP.
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Info className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600">
                        Corrected text not generated. Enable "Include corrected text" option for next analysis.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}