import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Eye,
  Zap,
  Target
} from 'lucide-react';

interface CharacterInconsistency {
  characterName: string;
  type: 'physical_description' | 'personality' | 'background' | 'relationships' | 'name_variation' | 'behavioral';
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  locations: {
    chapter: number;
    context: string;
  }[];
  suggestion: string;
}

interface CharacterConsistencyReport {
  totalCharacters: number;
  inconsistenciesFound: number;
  characters: {
    name: string;
    appearances: number;
    firstAppearance: number;
    lastAppearance: number;
    inconsistencies: CharacterInconsistency[];
  }[];
  overallScore: number;
  recommendations: string[];
}

interface CharacterConsistencyAnalyzerProps {
  novelId: string;
  onClose?: () => void;
}

export function CharacterConsistencyAnalyzer({ novelId, onClose }: CharacterConsistencyAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<CharacterConsistencyReport | null>(null);
  const queryClient = useQueryClient();

  // Get novel details
  const { data: novel } = useQuery<any>({
    queryKey: ['/api/novels', novelId],
    enabled: !!novelId
  });

  const analyzeConsistencyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/novels/${novelId}/character-consistency`, 'POST');
      return response;
    },
    onSuccess: (data) => {
      setReport(data);
      setIsAnalyzing(false);
    },
    onError: (error) => {
      console.error('Character consistency analysis failed:', error);
      setIsAnalyzing(false);
    }
  });

  const handleStartAnalysis = () => {
    setIsAnalyzing(true);
    setReport(null);
    analyzeConsistencyMutation.mutate();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'major': return 'destructive';
      case 'moderate': return 'destructive'; // Using destructive since warning doesn't exist
      case 'minor': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'major': return <AlertTriangle className="h-4 w-4" />;
      case 'moderate': return <Clock className="h-4 w-4" />;
      case 'minor': return <Eye className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'physical_description': return 'Physical Description';
      case 'personality': return 'Personality';
      case 'background': return 'Background';
      case 'relationships': return 'Relationships';
      case 'name_variation': return 'Name Variation';
      case 'behavioral': return 'Behavioral';
      default: return type;
    }
  };

  if (!novel) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Loading novel details...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Character Consistency Analyzer
              </CardTitle>
              <CardDescription>
                Analyze your novel for character consistency issues and get detailed recommendations
              </CardDescription>
            </div>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{novel?.title || 'Novel'}</h3>
                <p className="text-sm text-gray-600">
                  {novel?.chapters?.length || 0} chapters • {novel?.wordCount?.toLocaleString() || 0} words
                </p>
              </div>
              <Button
                onClick={handleStartAnalysis}
                disabled={isAnalyzing || analyzeConsistencyMutation.isPending}
                className="min-w-[140px]"
                data-testid="start-analysis"
              >
                {isAnalyzing ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Start Analysis
                  </>
                )}
              </Button>
            </div>

            {isAnalyzing && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Analysis in Progress</AlertTitle>
                <AlertDescription>
                  Analyzing character consistency across all chapters. This may take a few minutes...
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {report && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Characters</p>
                    <p className="text-2xl font-bold">{report.totalCharacters}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Issues Found</p>
                    <p className="text-2xl font-bold">{report.inconsistenciesFound}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Consistency Score</p>
                    <p className="text-2xl font-bold">{report.overallScore}%</p>
                  </div>
                  <Target className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Quality</p>
                    <p className="text-lg font-bold">
                      {report.overallScore >= 90 ? 'Excellent' :
                       report.overallScore >= 75 ? 'Good' :
                       report.overallScore >= 60 ? 'Fair' : 'Needs Work'}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Score Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Consistency Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Character Consistency</span>
                  <span>{report.overallScore}%</span>
                </div>
                <Progress value={report.overallScore} className="h-3" />
                <p className="text-sm text-gray-600">
                  {report.overallScore >= 90 ? 'Outstanding character consistency throughout your novel!' :
                   report.overallScore >= 75 ? 'Good consistency with minor issues to address.' :
                   report.overallScore >= 60 ? 'Moderate consistency issues that should be reviewed.' :
                   'Significant consistency issues that need immediate attention.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <Tabs defaultValue="characters" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="characters">Characters</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            {/* Characters Tab */}
            <TabsContent value="characters" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Character Overview</CardTitle>
                  <CardDescription>
                    All characters found in your novel with their appearance frequency and consistency status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.characters.map((character, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-lg">{character.name}</h4>
                            <p className="text-sm text-gray-600">
                              {character.appearances} appearances • Chapters {character.firstAppearance}-{character.lastAppearance}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {character.inconsistencies.length === 0 ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Consistent
                              </Badge>
                            ) : (
                              <Badge variant={getSeverityColor(character.inconsistencies[0]?.severity || 'minor')}>
                                {character.inconsistencies.length} issue{character.inconsistencies.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {character.inconsistencies.length > 0 && (
                          <div className="space-y-2">
                            {character.inconsistencies.slice(0, 2).map((issue, issueIndex) => (
                              <div key={issueIndex} className="bg-gray-50 p-3 rounded text-sm">
                                <div className="flex items-center gap-2 mb-1">
                                  {getSeverityIcon(issue.severity)}
                                  <span className="font-medium">{getTypeLabel(issue.type)}</span>
                                  <Badge variant={getSeverityColor(issue.severity)} className="text-xs">
                                    {issue.severity}
                                  </Badge>
                                </div>
                                <p className="text-gray-700 mb-2">{issue.description}</p>
                                <p className="text-xs text-gray-600">
                                  Found in chapters: {issue.locations.map(l => l.chapter).join(', ')}
                                </p>
                              </div>
                            ))}
                            {character.inconsistencies.length > 2 && (
                              <p className="text-sm text-gray-500">
                                +{character.inconsistencies.length - 2} more issues
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Issues Tab */}
            <TabsContent value="issues" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>All Consistency Issues</CardTitle>
                  <CardDescription>
                    Detailed list of all character consistency issues found in your novel
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.inconsistenciesFound === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-green-800">No Issues Found!</h3>
                        <p className="text-gray-600">Your novel maintains excellent character consistency.</p>
                      </div>
                    ) : (
                      report.characters
                        .flatMap(char => char.inconsistencies.map(issue => ({ ...issue, characterName: char.name })))
                        .sort((a, b) => {
                          const severityOrder = { major: 3, moderate: 2, minor: 1 };
                          return severityOrder[b.severity] - severityOrder[a.severity];
                        })
                        .map((issue, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-1">
                                {getSeverityIcon(issue.severity)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold">{issue.characterName}</h4>
                                  <Badge variant={getSeverityColor(issue.severity)}>
                                    {issue.severity}
                                  </Badge>
                                  <Badge variant="outline">
                                    {getTypeLabel(issue.type)}
                                  </Badge>
                                </div>
                                <p className="text-gray-700 mb-3">{issue.description}</p>
                                <div className="bg-blue-50 p-3 rounded mb-3">
                                  <p className="text-sm text-blue-800">
                                    <strong>Suggestion:</strong> {issue.suggestion}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-gray-600">Locations:</p>
                                  {issue.locations.map((location, locIndex) => (
                                    <div key={locIndex} className="text-xs bg-gray-100 p-2 rounded">
                                      <strong>Chapter {location.chapter}:</strong> {location.context}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Improvement Recommendations</CardTitle>
                  <CardDescription>
                    Actionable suggestions to improve character consistency in your novel
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-blue-800">{recommendation}</p>
                      </div>
                    ))}
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