import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle, CheckCircle2, XCircle, AlertCircle, TrendingUp, BookOpen, FileText, Users, Upload } from "lucide-react";

interface QualityIssue {
  type: 'formatting' | 'content' | 'structure' | 'consistency' | 'language';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  suggestion: string;
  count?: number;
}

interface ManuscriptQualityReport {
  overallScore: number;
  wordCount: number;
  chapterCount: number;
  issues: QualityIssue[];
  recommendations: string[];
  summary: {
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
}

const severityColors = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline"
} as const;

const severityIcons = {
  critical: XCircle,
  high: AlertTriangle,
  medium: AlertCircle,
  low: CheckCircle2
};

const typeIcons = {
  structure: BookOpen,
  formatting: FileText,
  content: TrendingUp,
  consistency: Users,
  language: FileText
};

export function ManuscriptQualityAnalyzer() {
  const [content, setContent] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<ManuscriptQualityReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeManuscript = async () => {
    if (!content.trim()) {
      setError("Please paste your manuscript content to analyze");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await apiRequest("/api/manuscript/analyze", {
        method: "POST",
        body: JSON.stringify({ content }),
      });

      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze manuscript");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setError("Please upload a DOCX file");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('manuscript', file);

      const response = await fetch('/api/manuscript/analyze-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      setReport(result);
      setContent("Document uploaded and analyzed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload and analyze document");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Good";
    if (score >= 70) return "Fair";
    if (score >= 60) return "Needs Work";
    return "Poor";
  };

  const groupedIssues = report?.issues.reduce((acc, issue) => {
    if (!acc[issue.type]) acc[issue.type] = [];
    acc[issue.type].push(issue);
    return acc;
  }, {} as Record<string, QualityIssue[]>) || {};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Manuscript Quality Analyzer
          </CardTitle>
          <CardDescription>
            Analyze your manuscript for quality issues and get actionable feedback to improve your writing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="paste" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paste">Paste Text</TabsTrigger>
              <TabsTrigger value="upload">Upload Document</TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="space-y-4">
              <div>
                <label htmlFor="content" className="text-sm font-medium mb-2 block">
                  Paste your manuscript content
                </label>
                <Textarea
                  id="content"
                  placeholder="Paste your manuscript text here for analysis..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[200px]"
                  data-testid="textarea-manuscript-content"
                />
              </div>

              <Button 
                onClick={analyzeManuscript}
                disabled={isAnalyzing || !content.trim()}
                className="w-full"
                data-testid="button-analyze-manuscript"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Manuscript Quality"}
              </Button>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div>
                <label htmlFor="file-upload" className="text-sm font-medium mb-2 block">
                  Upload DOCX document
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Input
                    ref={fileInputRef}
                    id="file-upload"
                    type="file"
                    accept=".docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    data-testid="input-file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2"
                    data-testid="button-upload-document"
                  >
                    <Upload className="h-4 w-4" />
                    {isUploading ? "Uploading..." : "Choose DOCX File"}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Upload a Microsoft Word document (.docx) for analysis
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {report && (
        <div className="space-y-6">
          {/* Overall Score */}
          <Card>
            <CardHeader>
              <CardTitle>Quality Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className={`text-3xl font-bold ${getScoreColor(report.overallScore)}`}>
                    {report.overallScore}/100
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getScoreLabel(report.overallScore)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Word Count</div>
                  <div className="text-xl font-semibold">{report.wordCount.toLocaleString()}</div>
                </div>
              </div>
              <Progress value={report.overallScore} className="h-2" />
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Issue Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{report.summary.criticalIssues}</div>
                  <div className="text-xs text-red-600">Critical</div>
                </div>
                <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{report.summary.highIssues}</div>
                  <div className="text-xs text-orange-600">High</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{report.summary.mediumIssues}</div>
                  <div className="text-xs text-yellow-600">Medium</div>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{report.summary.lowIssues}</div>
                  <div className="text-xs text-blue-600">Low</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Analysis */}
          <Tabs defaultValue="issues" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="issues" data-testid="tab-issues">Issues</TabsTrigger>
              <TabsTrigger value="recommendations" data-testid="tab-recommendations">Recommendations</TabsTrigger>
            </TabsList>

            <TabsContent value="issues" className="space-y-4">
              {Object.entries(groupedIssues).map(([type, issues]) => {
                const TypeIcon = typeIcons[type as keyof typeof typeIcons];
                return (
                  <Card key={type}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 capitalize">
                        <TypeIcon className="h-5 w-5" />
                        {type} Issues ({issues.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {issues.map((issue, index) => {
                        const SeverityIcon = severityIcons[issue.severity];
                        return (
                          <div key={index} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <SeverityIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-medium">{issue.description}</div>
                                  {issue.location && (
                                    <div className="text-sm text-muted-foreground">
                                      Location: {issue.location}
                                    </div>
                                  )}
                                  {issue.count && (
                                    <div className="text-sm text-muted-foreground">
                                      Occurrences: {issue.count}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Badge variant={severityColors[issue.severity]} className="ml-2">
                                {issue.severity}
                              </Badge>
                            </div>
                            <div className="text-sm bg-muted/50 p-3 rounded border-l-4 border-blue-500">
                              <strong>Suggestion:</strong> {issue.suggestion}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}

              {report.issues.length === 0 && (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      <h3 className="font-semibold text-lg">Great Job!</h3>
                      <p className="text-muted-foreground">No significant issues detected in your manuscript.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Actionable Recommendations</CardTitle>
                  <CardDescription>
                    Follow these suggestions to improve your manuscript quality.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {report.recommendations.length > 0 ? (
                    <div className="space-y-3">
                      {report.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="text-sm">{recommendation}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      <h3 className="font-semibold">No Additional Recommendations</h3>
                      <p className="text-muted-foreground">Your manuscript appears to be in good shape!</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Manuscript Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Word Count</div>
                      <div className="text-2xl font-bold">{report.wordCount.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Chapters</div>
                      <div className="text-2xl font-bold">{report.chapterCount}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Avg Words/Chapter</div>
                      <div className="text-2xl font-bold">
                        {report.chapterCount > 0 ? Math.round(report.wordCount / report.chapterCount).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}