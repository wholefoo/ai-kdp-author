import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  Cell
} from 'recharts';
import {
  TrendingUp,
  Activity,
  BarChart3,
  Zap,
  Heart,
  Sword,
  Users,
  Clock,
  Eye,
  RefreshCw,
  Download,
  Settings,
  Info,
  X
} from 'lucide-react';

interface ChapterAnalysis {
  chapterIndex: number;
  chapterTitle: string;
  wordCount: number;
  emotionalTone: number; // -100 to 100 (negative to positive)
  tension: number; // 0 to 100
  pacing: number; // 0 to 100 (slow to fast)
  dialogueRatio: number; // 0 to 100 percentage
  actionLevel: number; // 0 to 100
  characterFocus: string[]; // main characters in this chapter
  plotElements: {
    conflict: number;
    resolution: number;
    mystery: number;
    romance: number;
    action: number;
  };
  keyMoments: string[];
  readingTime: number; // estimated minutes
}

interface NarrativeArc {
  overallStructure: {
    exposition: number;
    risingAction: number;
    climax: number;
    fallingAction: number;
    resolution: number;
  };
  emotionalJourney: ChapterAnalysis[];
  pacing: {
    averagePacing: number;
    pacingVariance: number;
    slowChapters: number[];
    fastChapters: number[];
  };
  characterArcs: {
    [character: string]: {
      appearances: number[];
      development: number; // 0 to 100
      significance: number; // 0 to 100
    };
  };
  thematicElements: {
    [theme: string]: {
      strength: number;
      distribution: number[];
    };
  };
}

interface NarrativeVisualizationProps {
  novelId: string;
  onClose: () => void;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

export function NarrativeArcVisualization({ novelId, onClose }: NarrativeVisualizationProps) {
  const { toast } = useToast();
  const [analysisSettings, setAnalysisSettings] = useState({
    focusMetric: 'all',
    smoothing: 0.3,
    showTrendLines: true
  });

  const { data: narrativeArc, isLoading, refetch } = useQuery<NarrativeArc>({
    queryKey: ['/api/novels', novelId, 'narrative-arc'],
    queryFn: async () => {
      const response = await apiRequest(`/api/novels/${novelId}/narrative-arc`, "POST", {
        settings: analysisSettings
      });
      return response as NarrativeArc;
    },
    enabled: !!novelId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Analyzing Narrative Structure...</p>
          <p className="text-sm text-gray-600">This may take a moment for longer novels</p>
        </div>
      </div>
    );
  }

  if (!narrativeArc) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Unable to analyze narrative structure</p>
        <Button onClick={() => refetch()} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Analysis
        </Button>
      </div>
    );
  }

  const emotionalData = narrativeArc.emotionalJourney.map((chapter, index) => ({
    chapter: index + 1,
    title: chapter.chapterTitle,
    emotionalTone: chapter.emotionalTone,
    tension: chapter.tension,
    pacing: chapter.pacing,
    wordCount: chapter.wordCount,
    readingTime: chapter.readingTime
  }));

  const structureData = [
    { phase: 'Exposition', percentage: narrativeArc.overallStructure.exposition },
    { phase: 'Rising Action', percentage: narrativeArc.overallStructure.risingAction },
    { phase: 'Climax', percentage: narrativeArc.overallStructure.climax },
    { phase: 'Falling Action', percentage: narrativeArc.overallStructure.fallingAction },
    { phase: 'Resolution', percentage: narrativeArc.overallStructure.resolution }
  ];

  const plotElementsData = narrativeArc.emotionalJourney.map((chapter, index) => ({
    chapter: index + 1,
    ...chapter.plotElements
  }));

  const characterData = Object.entries(narrativeArc.characterArcs).map(([name, data]) => ({
    character: name,
    development: data.development,
    significance: data.significance,
    appearances: data.appearances.length
  }));

  return (
    <div className="w-full space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Narrative Arc Visualization</h2>
          <p className="text-gray-600">Interactive analysis of your story's structure and flow</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} data-testid="button-close-narrative-analysis">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Avg. Tension</p>
                <p className="text-2xl font-bold">
                  {Math.round(narrativeArc.emotionalJourney.reduce((sum, ch) => sum + ch.tension, 0) / narrativeArc.emotionalJourney.length)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Avg. Pacing</p>
                <p className="text-2xl font-bold">{Math.round(narrativeArc.pacing.averagePacing)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Emotional Range</p>
                <p className="text-2xl font-bold">
                  {Math.round(Math.max(...narrativeArc.emotionalJourney.map(ch => ch.emotionalTone)) - 
                             Math.min(...narrativeArc.emotionalJourney.map(ch => ch.emotionalTone)))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Main Characters</p>
                <p className="text-2xl font-bold">{Object.keys(narrativeArc.characterArcs).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="emotional-journey" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="emotional-journey" data-testid="tab-emotional">Emotional Journey</TabsTrigger>
          <TabsTrigger value="story-structure" data-testid="tab-structure">Story Structure</TabsTrigger>
          <TabsTrigger value="pacing-analysis" data-testid="tab-pacing">Pacing Analysis</TabsTrigger>
          <TabsTrigger value="character-arcs" data-testid="tab-characters">Character Arcs</TabsTrigger>
          <TabsTrigger value="plot-elements" data-testid="tab-plot">Plot Elements</TabsTrigger>
        </TabsList>

        <TabsContent value="emotional-journey" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="h-5 w-5 mr-2" />
                Emotional Journey
              </CardTitle>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <Badge variant="outline">Emotional Tone</Badge>
                <Badge variant="outline">Tension Level</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={emotionalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="chapter" 
                      label={{ value: 'Chapter', position: 'insideBottom', offset: -5 }} 
                    />
                    <YAxis 
                      label={{ value: 'Score', angle: -90, position: 'insideLeft' }} 
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        typeof value === 'number' ? Math.round(value) : value, 
                        name === 'emotionalTone' ? 'Emotional Tone' : 'Tension'
                      ]}
                      labelFormatter={(chapter) => `Chapter ${chapter}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="emotionalTone" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={{ fill: '#8884d8' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="tension" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      dot={{ fill: '#82ca9d' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="story-structure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Story Structure Analysis
              </CardTitle>
              <p className="text-sm text-gray-600">
                Based on traditional dramatic structure (Freytag's Pyramid)
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={structureData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="phase" />
                    <YAxis label={{ value: 'Percentage', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => [`${Math.round(Number(value))}%`, 'Percentage']} />
                    <Bar dataKey="percentage" fill="#8884d8">
                      {structureData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 grid grid-cols-5 gap-2">
                {structureData.map((phase, index) => (
                  <div key={phase.phase} className="text-center">
                    <div 
                      className="w-4 h-4 rounded mx-auto mb-1" 
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <p className="text-xs font-medium">{phase.phase}</p>
                    <p className="text-xs text-gray-600">{Math.round(phase.percentage)}%</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pacing-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Pacing Analysis
              </CardTitle>
              <div className="flex items-center space-x-4">
                <Badge variant={narrativeArc.pacing.pacingVariance > 30 ? "destructive" : "default"}>
                  Variance: {Math.round(narrativeArc.pacing.pacingVariance)}
                </Badge>
                <Badge variant="outline">
                  {narrativeArc.pacing.slowChapters.length} Slow Chapters
                </Badge>
                <Badge variant="outline">
                  {narrativeArc.pacing.fastChapters.length} Fast Chapters
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={emotionalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="chapter" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="pacing" 
                      stroke="#ffc658" 
                      fill="#ffc658" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Pacing Insights */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <span className="text-sm font-medium">Average Pacing</span>
                  <span className="text-sm">{Math.round(narrativeArc.pacing.averagePacing)}/100</span>
                </div>
                
                {narrativeArc.pacing.slowChapters.length > 0 && (
                  <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                    <span className="text-sm font-medium">Slowest Chapters</span>
                    <span className="text-sm">
                      {narrativeArc.pacing.slowChapters.map(ch => ch + 1).join(', ')}
                    </span>
                  </div>
                )}

                {narrativeArc.pacing.fastChapters.length > 0 && (
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span className="text-sm font-medium">Fastest Chapters</span>
                    <span className="text-sm">
                      {narrativeArc.pacing.fastChapters.map(ch => ch + 1).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="character-arcs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Character Development
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart data={characterData}>
                    <CartesianGrid />
                    <XAxis 
                      dataKey="development" 
                      domain={[0, 100]}
                      label={{ value: 'Character Development', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      dataKey="significance" 
                      domain={[0, 100]}
                      label={{ value: 'Story Significance', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value: any, name: any) => [
                        Math.round(Number(value)),
                        name === 'significance' ? 'Significance' : 'Development'
                      ]}
                      labelFormatter={(value: any, payload: any) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.character;
                        }
                        return '';
                      }}
                    />
                    <Scatter dataKey="significance" fill="#8884d8" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 space-y-2">
                {Object.entries(narrativeArc.characterArcs).map(([name, data], index) => (
                  <div key={name} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{name}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Development: {data.development}/100</span>
                      <span>Appears in {data.appearances.length} chapters</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plot-elements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sword className="h-5 w-5 mr-2" />
                Plot Elements Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={plotElementsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="chapter" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="conflict" stroke="#ff7c7c" strokeWidth={2} />
                    <Line type="monotone" dataKey="action" stroke="#82ca9d" strokeWidth={2} />
                    <Line type="monotone" dataKey="mystery" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="romance" stroke="#d084d0" strokeWidth={2} />
                    <Line type="monotone" dataKey="resolution" stroke="#ffc658" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 grid grid-cols-5 gap-2">
                {['conflict', 'action', 'mystery', 'romance', 'resolution'].map((element, index) => (
                  <div key={element} className="text-center">
                    <div 
                      className="w-4 h-4 rounded mx-auto mb-1" 
                      style={{ backgroundColor: ['#ff7c7c', '#82ca9d', '#8884d8', '#d084d0', '#ffc658'][index] }}
                    />
                    <p className="text-xs font-medium capitalize">{element}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Analysis Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Analysis Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Focus Metric</label>
              <Select 
                value={analysisSettings.focusMetric} 
                onValueChange={(value) => setAnalysisSettings(prev => ({ ...prev, focusMetric: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Metrics</SelectItem>
                  <SelectItem value="emotion">Emotional Focus</SelectItem>
                  <SelectItem value="pacing">Pacing Focus</SelectItem>
                  <SelectItem value="character">Character Focus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Smoothing: {analysisSettings.smoothing}</label>
              <Slider
                value={[analysisSettings.smoothing]}
                onValueChange={([value]) => setAnalysisSettings(prev => ({ ...prev, smoothing: value }))}
                max={1}
                min={0}
                step={0.1}
                className="mt-2"
              />
            </div>

            <div className="flex items-end">
              <Button onClick={() => refetch()} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reanalyze
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}