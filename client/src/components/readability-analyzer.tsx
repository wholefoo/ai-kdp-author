import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BookOpen, Target, TrendingUp, Clock, AlertTriangle, CheckCircle, Lightbulb, Wand2, FileText, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReadabilityMetrics {
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  averageSentenceLength: number;
  averageWordsPerSentence: number;
  averageSyllablesPerWord: number;
  passiveVoicePercentage: number;
  adverbPercentage: number;
  complexWordsPercentage: number;
}

interface ReadabilityAnalysis {
  overallScore: number;
  metrics: ReadabilityMetrics;
  readingLevel: string;
  targetAudience: string;
  strengths: string[];
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
    examples?: string[];
  }>;
  aiSuggestions: string[];
  estimatedReadingTime: number;
  wordCount: number;
}

interface ReadabilityAnalyzerProps {
  initialText?: string;
  onTextImproved?: (improvedText: string) => void;
}

export function ReadabilityAnalyzer({ initialText = "", onTextImproved }: ReadabilityAnalyzerProps) {
  const [text, setText] = useState(initialText);
  const [analysis, setAnalysis] = useState<ReadabilityAnalysis | null>(null);
  const [improvedText, setImprovedText] = useState("");
  const [targetLevel, setTargetLevel] = useState<'elementary' | 'middle' | 'high' | 'college'>('high');
  const [inputMethod, setInputMethod] = useState<'text' | 'upload'>('text');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [manuscriptContent, setManuscriptContent] = useState('');
  const { toast } = useToast();

  const analyzeReadability = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("/api/readability/analyze", "POST", { text: content });
    },
    onSuccess: (data: ReadabilityAnalysis) => {
      setAnalysis(data);
      toast({
        title: "Analysis Complete",
        description: `Readability score: ${data.overallScore}/100`,
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: "Could not analyze text readability. Please try again.",
        variant: "destructive",
      });
    },
  });

  const improveReadability = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/readability/improve", "POST", { text, targetLevel });
    },
    onSuccess: (data: { improvedText: string }) => {
      setImprovedText(data.improvedText);
      onTextImproved?.(data.improvedText);
      toast({
        title: "Text Improved",
        description: "Your text has been optimized for better readability.",
      });
    },
    onError: (error) => {
      toast({
        title: "Improvement Failed",
        description: "Could not improve text readability. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadManuscriptMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('manuscript', file);
      console.log('Uploading file:', file.name, file.size);
      return await apiRequest('/api/readability/upload-manuscript', 'POST', formData);
    },
    onSuccess: (response) => {
      console.log('Upload successful:', response);
      setManuscriptContent(response.content);
      setText(response.content);
      toast({
        title: "Manuscript Uploaded",
        description: "Your manuscript has been processed and is ready for readability analysis.",
      });
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: `Failed to upload and process manuscript: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleManuscriptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      toast({
        title: "Invalid File",
        description: "Please upload a DOCX file.",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    uploadManuscriptMutation.mutate(file);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6" data-testid="readability-analyzer">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Manuscript Readability Analyzer
          </CardTitle>
          <CardDescription>
            Analyze and improve your manuscript's readability with AI-powered suggestions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={inputMethod} onValueChange={(value) => setInputMethod(value as 'text' | 'upload')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text" className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4" />
                <span>Text Input</span>
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Upload Manuscript</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="text-input" className="text-sm font-medium">
                  Text to Analyze
                </label>
                <Textarea
                  id="text-input"
                  placeholder="Paste your manuscript text here for analysis..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-[200px]"
                  data-testid="input-text"
                />
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Upload Your Manuscript</h3>
                    <p className="text-gray-600">Upload a DOCX file to analyze its readability</p>
                    <input
                      type="file"
                      accept=".docx"
                      onChange={handleManuscriptUpload}
                      className="hidden"
                      id="manuscript-upload"
                    />
                    <Button 
                      variant="outline" 
                      className="cursor-pointer" 
                      data-testid="upload-manuscript"
                      onClick={() => {
                        console.log('Readability analyzer upload button clicked');
                        const input = document.getElementById('manuscript-upload') as HTMLInputElement;
                        if (input) {
                          input.click();
                        } else {
                          console.error('Readability upload input not found');
                        }
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose DOCX File
                    </Button>
                  </div>
                </div>
                {manuscriptContent && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-green-800">
                      ✓ Manuscript uploaded successfully ({Math.floor(manuscriptContent.length / 5)} words)
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-4 items-center">
            <Button
              onClick={() => analyzeReadability.mutate(text)}
              disabled={!text.trim() || analyzeReadability.isPending || uploadManuscriptMutation.isPending}
              data-testid="button-analyze"
            >
              {analyzeReadability.isPending ? "Analyzing..." : "Analyze Readability"}
            </Button>

            {analysis && (
              <>
                <Select value={targetLevel} onValueChange={(value: any) => setTargetLevel(value)}>
                  <SelectTrigger className="w-48" data-testid="select-target-level">
                    <SelectValue placeholder="Target reading level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elementary">Elementary School</SelectItem>
                    <SelectItem value="middle">Middle School</SelectItem>
                    <SelectItem value="high">High School</SelectItem>
                    <SelectItem value="college">College Level</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => improveReadability.mutate()}
                  disabled={improveReadability.isPending}
                  variant="outline"
                  data-testid="button-improve"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  {improveReadability.isPending ? "Improving..." : "Auto-Improve"}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">Detailed Metrics</TabsTrigger>
            <TabsTrigger value="issues">Issues & Suggestions</TabsTrigger>
            <TabsTrigger value="improved">Improved Text</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                    {analysis.overallScore}/100
                  </div>
                  <Progress value={analysis.overallScore} className="mt-2" />
                  <p className="text-sm text-muted-foreground mt-1">
                    {analysis.readingLevel}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Target Audience
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">{analysis.targetAudience}</p>
                  <p className="text-sm text-muted-foreground">
                    Grade Level: {analysis.metrics.fleschKincaidGrade.toFixed(1)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Reading Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">{analysis.estimatedReadingTime} min</p>
                  <p className="text-sm text-muted-foreground">
                    {analysis.wordCount.toLocaleString()} words
                  </p>
                </CardContent>
              </Card>
            </div>

            {analysis.strengths.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {analysis.strengths.map((strength, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Reading Ease & Grade Level</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Flesch Reading Ease:</span>
                    <span className="font-semibold">{analysis.metrics.fleschReadingEase}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Flesch-Kincaid Grade:</span>
                    <span className="font-semibold">{analysis.metrics.fleschKincaidGrade}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Sentence Structure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Avg. Sentence Length:</span>
                    <span className="font-semibold">{analysis.metrics.averageSentenceLength} words</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg. Syllables/Word:</span>
                    <span className="font-semibold">{analysis.metrics.averageSyllablesPerWord}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Writing Style</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Passive Voice:</span>
                    <span className="font-semibold">{analysis.metrics.passiveVoicePercentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Adverb Usage:</span>
                    <span className="font-semibold">{analysis.metrics.adverbPercentage}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Vocabulary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Complex Words:</span>
                    <span className="font-semibold">{analysis.metrics.complexWordsPercentage}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="issues" className="space-y-4">
            {analysis.issues.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Issues & Recommendations</h3>
                {analysis.issues.map((issue, index) => (
                  <Alert key={index}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="flex items-center gap-2">
                      {issue.description}
                      <Badge variant={getSeverityColor(issue.severity)}>
                        {issue.severity}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription className="mt-2">
                      <p>{issue.suggestion}</p>
                      {issue.examples && issue.examples.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Examples:</p>
                          <ul className="text-sm list-disc list-inside mt-1">
                            {issue.examples.map((example, i) => (
                              <li key={i} className="text-muted-foreground">{example}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">No Major Issues Found</h3>
                    <p className="text-muted-foreground">Your text has good readability!</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {analysis.aiSuggestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    AI-Powered Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.aiSuggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="improved" className="space-y-4">
            {improvedText ? (
              <Card>
                <CardHeader>
                  <CardTitle>Improved Text</CardTitle>
                  <CardDescription>
                    AI-optimized version for better readability
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={improvedText}
                    onChange={(e) => setImprovedText(e.target.value)}
                    className="min-h-[300px]"
                    data-testid="improved-text"
                  />
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(improvedText);
                        toast({ title: "Copied", description: "Improved text copied to clipboard" });
                      }}
                      variant="outline"
                      data-testid="button-copy-improved"
                    >
                      Copy to Clipboard
                    </Button>
                    <Button
                      onClick={() => setText(improvedText)}
                      variant="outline"
                      data-testid="button-use-improved"
                    >
                      Use This Version
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Wand2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">No Improved Version Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Click "Auto-Improve" to generate an optimized version of your text
                    </p>
                    <Button
                      onClick={() => improveReadability.mutate()}
                      disabled={improveReadability.isPending}
                      data-testid="button-generate-improvement"
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      {improveReadability.isPending ? "Improving..." : "Generate Improved Version"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}