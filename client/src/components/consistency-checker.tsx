import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  BarChart3, 
  FileText, 
  Zap, 
  Users, 
  Timer,
  MessageSquare,
  TrendingUp,
  Search
} from "lucide-react";
import type { Novel } from "@shared/schema";

interface ConsistencyAnalysis {
  overallScore: number;
  issues: ConsistencyIssue[];
  strengths: string[];
  recommendations: string[];
  categories: {
    style: ConsistencyCategory;
    tone: ConsistencyCategory;
    voice: ConsistencyCategory;
    pacing: ConsistencyCategory;
    characterization: ConsistencyCategory;
  };
}

interface ConsistencyIssue {
  type: 'style' | 'tone' | 'voice' | 'pacing' | 'characterization';
  severity: 'low' | 'medium' | 'high';
  location: string;
  description: string;
  suggestion: string;
  examples?: string[];
}

interface ConsistencyCategory {
  score: number;
  description: string;
  issues: number;
  improvements: string[];
}

interface ConsistencyCheckerProps {
  novel: Novel;
}

export default function ConsistencyChecker({ novel }: ConsistencyCheckerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: analysis, refetch, isLoading } = useQuery<ConsistencyAnalysis>({
    queryKey: ["/api/novels", novel.id, "consistency"],
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

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const categoryIcons = {
    style: FileText,
    tone: MessageSquare,
    voice: Users,
    pacing: Timer,
    characterization: TrendingUp
  };

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            <div>
              <CardTitle className="text-purple-900">Manuscript Consistency Checker</CardTitle>
              <p className="text-sm text-purple-700">Analyze style, tone, and narrative consistency</p>
            </div>
          </div>
          <Button
            onClick={handleStartAnalysis}
            disabled={isAnalyzing || isLoading || novel.status !== 'completed'}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            data-testid="button-start-analysis"
          >
            <Search className="h-4 w-4 mr-2" />
            {isAnalyzing || isLoading ? 'Analyzing...' : 'Analyze Manuscript'}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {novel.status !== 'completed' && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Manuscript must be completed before running consistency analysis.
            </AlertDescription>
          </Alert>
        )}

        {(isAnalyzing || isLoading) && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-3">
              <Zap className="h-5 w-5 text-purple-600 animate-pulse" />
              <span className="font-medium text-purple-900">Analyzing manuscript consistency...</span>
            </div>
            <Progress value={50} className="w-full" />
            <p className="text-sm text-purple-700">
              This comprehensive analysis examines style, tone, voice, pacing, and characterization across all chapters.
            </p>
          </div>
        )}

        {analysis && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="strengths">Strengths</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Overall Score */}
              <Card className="bg-white border-purple-200">
                <CardHeader className="text-center">
                  <div className="mx-auto w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                    <span className={`text-3xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                      {analysis.overallScore}
                    </span>
                  </div>
                  <CardTitle>Overall Consistency Score</CardTitle>
                  <p className="text-sm text-gray-600">
                    {analysis.overallScore >= 85 ? 'Excellent' : 
                     analysis.overallScore >= 70 ? 'Good' : 'Needs Improvement'}
                  </p>
                </CardHeader>
              </Card>

              {/* Category Scores */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.entries(analysis.categories).map(([key, category]) => {
                  const Icon = categoryIcons[key as keyof typeof categoryIcons];
                  return (
                    <Card key={key} className="bg-white border-purple-200">
                      <CardContent className="p-4 text-center">
                        <Icon className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                        <div className={`text-2xl font-bold ${getScoreColor(category.score)}`}>
                          {category.score}
                        </div>
                        <div className="text-sm text-gray-600 capitalize">{key}</div>
                        {category.issues > 0 && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {category.issues} issues
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-white border-purple-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {analysis.issues.filter(i => i.severity === 'high').length}
                    </div>
                    <div className="text-sm text-gray-600">High Priority</div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-purple-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {analysis.issues.filter(i => i.severity === 'medium').length}
                    </div>
                    <div className="text-sm text-gray-600">Medium Priority</div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-purple-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {analysis.issues.filter(i => i.severity === 'low').length}
                    </div>
                    <div className="text-sm text-gray-600">Low Priority</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="issues" className="space-y-4">
              <ScrollArea className="h-96">
                {analysis.issues.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Issues Found</h3>
                    <p className="text-gray-600">Your manuscript shows excellent consistency across all categories.</p>
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
                                <Badge variant="outline" className="capitalize">
                                  {issue.type}
                                </Badge>
                                <Badge variant="secondary" className={getSeverityColor(issue.severity)}>
                                  {issue.severity} severity
                                </Badge>
                              </div>
                              <h4 className="font-medium text-gray-900 mb-1">{issue.location}</h4>
                              <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                              <div className="bg-gray-50 rounded p-3">
                                <p className="text-sm font-medium text-gray-900 mb-1">Suggestion:</p>
                                <p className="text-sm text-gray-700">{issue.suggestion}</p>
                              </div>
                              {issue.examples && issue.examples.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-sm font-medium text-gray-900 mb-1">Examples:</p>
                                  <div className="space-y-1">
                                    {issue.examples.map((example, i) => (
                                      <p key={i} className="text-sm text-gray-600 italic">"{example}"</p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="categories" className="space-y-6">
              {Object.entries(analysis.categories).map(([key, category]) => {
                const Icon = categoryIcons[key as keyof typeof categoryIcons];
                return (
                  <Card key={key} className="bg-white border-purple-200">
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5 text-purple-600" />
                        <div>
                          <CardTitle className="capitalize">{key}</CardTitle>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`text-lg font-bold ${getScoreColor(category.score)}`}>
                              {category.score}/100
                            </span>
                            <Badge variant="secondary">
                              {category.issues} issues
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">{category.description}</p>
                      {category.improvements.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Improvement Suggestions:</h4>
                          <ul className="space-y-1">
                            {category.improvements.map((improvement, index) => (
                              <li key={index} className="text-sm text-gray-600 flex items-start">
                                <span className="text-purple-600 mr-2">•</span>
                                {improvement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="strengths" className="space-y-4">
              {analysis.strengths.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No specific strengths identified in this analysis.</p>
              ) : (
                <div className="space-y-3">
                  {analysis.strengths.map((strength, index) => (
                    <Card key={index} className="bg-green-50 border-green-200">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <p className="text-green-800">{strength}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              {analysis.recommendations.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Excellent Work!</h3>
                  <p className="text-gray-600">No specific recommendations needed. Your manuscript shows strong consistency.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {analysis.recommendations.map((recommendation, index) => (
                    <Card key={index} className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                          <p className="text-blue-800">{recommendation}</p>
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