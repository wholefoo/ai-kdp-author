import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  BookOpen, 
  FileText, 
  Zap, 
  BarChart3,
  Target,
  Clock,
  Eye,
  MessageSquare,
  TrendingUp,
  Search
} from "lucide-react";
import type { Novel } from "@shared/schema";

interface GrammarAnalysis {
  overallScore: number;
  issues: GrammarIssue[];
  suggestions: string[];
  readabilityMetrics: ReadabilityMetrics;
  styleAnalysis: StyleAnalysis;
  summary: string;
}

interface GrammarIssue {
  type: 'grammar' | 'spelling' | 'punctuation' | 'style' | 'clarity' | 'wordiness' | 'repetition';
  severity: 'low' | 'medium' | 'high';
  location: string;
  originalText: string;
  suggestion: string;
  explanation: string;
  rule?: string;
}

interface ReadabilityMetrics {
  fleschKincaidGrade: number;
  fleschReadingEase: number;
  averageSentenceLength: number;
  averageWordsPerSentence: number;
  complexWords: number;
  passiveVoicePercentage: number;
  readingTime: string;
}

interface StyleAnalysis {
  sentenceVariety: number;
  vocabularyDiversity: number;
  adverbUsage: number;
  showVsTell: number;
  dialogueBalance: number;
  paragraphStructure: number;
  transitions: number;
}

interface GrammarCheckerProps {
  novel: Novel;
}

export default function GrammarChecker({ novel }: GrammarCheckerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: analysis, refetch, isLoading } = useQuery<GrammarAnalysis>({
    queryKey: ["/api/novels", novel.id, "grammar"],
    enabled: false
  });

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      await refetch();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      default: return <CheckCircle2 className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'grammar': return <FileText className="h-4 w-4" />;
      case 'spelling': return <BookOpen className="h-4 w-4" />;
      case 'style': return <Eye className="h-4 w-4" />;
      case 'clarity': return <Target className="h-4 w-4" />;
      case 'wordiness': return <MessageSquare className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getReadabilityLevel = (grade: number) => {
    if (grade <= 6) return 'Elementary';
    if (grade <= 9) return 'Middle School';
    if (grade <= 12) return 'High School';
    if (grade <= 16) return 'College';
    return 'Graduate';
  };

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-5 w-5 text-green-600" />
            <div>
              <CardTitle className="text-green-900">Advanced Grammar & Style Checker</CardTitle>
              <p className="text-sm text-green-700">Professional proofreading and writing analysis</p>
            </div>
          </div>
          <Button
            onClick={handleStartAnalysis}
            disabled={isAnalyzing || isLoading || novel.status !== 'completed'}
            className="bg-green-600 hover:bg-green-700 text-white"
            data-testid="button-start-grammar-analysis"
          >
            <Search className="h-4 w-4 mr-2" />
            {isAnalyzing || isLoading ? 'Analyzing...' : 'Check Grammar & Style'}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {novel.status !== 'completed' && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Manuscript must be completed before running grammar and style analysis.
            </AlertDescription>
          </Alert>
        )}

        {(isAnalyzing || isLoading) && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-3">
              <Zap className="h-5 w-5 text-green-600 animate-pulse" />
              <span className="font-medium text-green-900">Analyzing grammar, style, and readability...</span>
            </div>
            <Progress value={65} className="w-full" />
            <p className="text-sm text-green-700">
              Performing comprehensive analysis including grammar checking, style evaluation, and readability metrics.
            </p>
          </div>
        )}

        {analysis && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="readability">Readability</TabsTrigger>
              <TabsTrigger value="style">Style</TabsTrigger>
              <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Overall Score */}
              <Card className="bg-white border-green-200">
                <CardHeader className="text-center">
                  <div className="mx-auto w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <span className={`text-3xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                      {analysis.overallScore}
                    </span>
                  </div>
                  <CardTitle>Overall Writing Quality</CardTitle>
                  <p className="text-sm text-gray-600">{analysis.summary}</p>
                </CardHeader>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white border-green-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {analysis.issues.filter(i => i.severity === 'high').length}
                    </div>
                    <div className="text-sm text-gray-600">High Priority</div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-green-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {analysis.issues.filter(i => i.severity === 'medium').length}
                    </div>
                    <div className="text-sm text-gray-600">Medium Priority</div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-green-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {analysis.issues.filter(i => i.severity === 'low').length}
                    </div>
                    <div className="text-sm text-gray-600">Low Priority</div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-green-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {analysis.readabilityMetrics.fleschKincaidGrade.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">Grade Level</div>
                  </CardContent>
                </Card>
              </div>

              {/* Issue Types Breakdown */}
              <Card className="bg-white border-green-200">
                <CardHeader>
                  <CardTitle>Issue Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['grammar', 'spelling', 'style', 'clarity'].map(type => {
                      const count = analysis.issues.filter(i => i.type === type).length;
                      return (
                        <div key={type} className="text-center">
                          <div className="flex items-center justify-center mb-2">
                            {getTypeIcon(type)}
                          </div>
                          <div className="text-lg font-bold">{count}</div>
                          <div className="text-sm text-gray-600 capitalize">{type}</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="issues" className="space-y-4">
              <ScrollArea className="h-96">
                {analysis.issues.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Issues Found</h3>
                    <p className="text-gray-600">Your manuscript shows excellent grammar and style quality.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analysis.issues.map((issue, index) => (
                      <Card key={index} className={`border ${getSeverityColor(issue.severity)}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            {getSeverityIcon(issue.severity)}
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  {getTypeIcon(issue.type)}
                                  <Badge variant="outline" className="capitalize">
                                    {issue.type}
                                  </Badge>
                                </div>
                                <Badge variant="secondary" className={getSeverityColor(issue.severity)}>
                                  {issue.severity} severity
                                </Badge>
                              </div>
                              <h4 className="font-medium text-gray-900 mb-1">{issue.location}</h4>
                              
                              {/* Original Text */}
                              <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                                <p className="text-sm font-medium text-red-900 mb-1">Original:</p>
                                <p className="text-sm text-red-800 italic">"{issue.originalText}"</p>
                              </div>

                              {/* Suggestion */}
                              <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
                                <p className="text-sm font-medium text-green-900 mb-1">Suggested:</p>
                                <p className="text-sm text-green-800 italic">"{issue.suggestion}"</p>
                              </div>

                              {/* Explanation */}
                              <div className="bg-gray-50 rounded p-3">
                                <p className="text-sm font-medium text-gray-900 mb-1">Explanation:</p>
                                <p className="text-sm text-gray-700">{issue.explanation}</p>
                                {issue.rule && (
                                  <p className="text-xs text-gray-500 mt-1">Rule: {issue.rule}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="readability" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-white border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-green-600" />
                      <span>Reading Level</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {getReadabilityLevel(analysis.readabilityMetrics.fleschKincaidGrade)}
                      </div>
                      <p className="text-gray-600">Grade {analysis.readabilityMetrics.fleschKincaidGrade.toFixed(1)}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Flesch Reading Ease:</span>
                        <span className="font-medium">{analysis.readabilityMetrics.fleschReadingEase}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Reading Time:</span>
                        <span className="font-medium">{analysis.readabilityMetrics.readingTime}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-green-600" />
                      <span>Sentence Metrics</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Avg. Sentence Length:</span>
                      <span className="font-medium">{analysis.readabilityMetrics.averageSentenceLength} words</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Complex Words:</span>
                      <span className="font-medium">{analysis.readabilityMetrics.complexWords}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Passive Voice:</span>
                      <span className="font-medium">{analysis.readabilityMetrics.passiveVoicePercentage}%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="style" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(analysis.styleAnalysis).map(([key, score]) => {
                  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                  return (
                    <Card key={key} className="bg-white border-green-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{label}</h4>
                          <span className={`text-lg font-bold ${getScoreColor(score)}`}>
                            {score}/100
                          </span>
                        </div>
                        <Progress value={score} className="w-full" />
                        <p className="text-xs text-gray-500 mt-1">
                          {score >= 90 ? 'Excellent' :
                           score >= 70 ? 'Good' :
                           score >= 50 ? 'Average' : 'Needs Work'}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="suggestions" className="space-y-4">
              {analysis.suggestions.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Excellent Work!</h3>
                  <p className="text-gray-600">No specific suggestions needed. Your writing quality is excellent.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {analysis.suggestions.map((suggestion, index) => (
                    <Card key={index} className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                          <p className="text-blue-800">{suggestion}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}