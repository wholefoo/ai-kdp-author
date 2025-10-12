import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Target, 
  BarChart3, 
  Book, 
  Wand2,
  RefreshCw,
  Loader2,
  Eye,
  Settings,
  TrendingUp,
  FileCheck
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";

interface StyleAnalysis {
  overallScore: number;
  consistency: {
    voice: { score: number; issues: string[]; recommendations: string[] };
    tone: { score: number; issues: string[]; recommendations: string[] };
    style: { score: number; issues: string[]; recommendations: string[] };
    pov: { score: number; issues: string[]; recommendations: string[] };
  };
  writingMetrics: {
    averageSentenceLength: number;
    vocabularyLevel: string;
    readabilityScore: number;
    pacing: string;
  };
  styleSuggestions: Array<{
    type: "voice" | "tone" | "style" | "pov" | "pacing" | "vocabulary";
    severity: "low" | "medium" | "high";
    issue: string;
    suggestion: string;
    examples: string[];
  }>;
  strengthsAndWeaknesses: {
    strengths: string[];
    weaknesses: string[];
    improvementAreas: string[];
  };
}

interface ManuscriptSection {
  id: string;
  title: string;
  content: string;
  chapter?: number;
  wordCount: number;
}

interface StyleGuide {
  voice: {
    characteristics: string[];
    examples: string[];
    guidelines: string[];
  };
  tone: {
    primaryTone: string;
    secondaryTones: string[];
    moodGuidelines: string[];
  };
  style: {
    sentenceStructure: string;
    vocabularyLevel: string;
    descriptiveStyle: string;
    dialogueStyle: string;
  };
  consistency: {
    povGuidelines: string[];
    tenseForms: string[];
    characterVoiceNotes: string[];
  };
}

export default function StyleConsistencyChecker() {
  const [sections, setSections] = useState<ManuscriptSection[]>([]);
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  const [styleGuide, setStyleGuide] = useState<StyleGuide | null>(null);
  const [activeTab, setActiveTab] = useState("input");
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      voice: "",
      tone: "",
      pov: "",
      genre: "",
    }
  });

  const analyzeMutation = useMutation({
    mutationFn: async (data: { sections: ManuscriptSection[]; targetStyle?: any }) => {
      return apiRequest("/api/style-checker/analyze", "POST", data) as unknown as Promise<StyleAnalysis>;
    },
    onSuccess: (data: StyleAnalysis) => {
      setAnalysis(data);
      setActiveTab("analysis");
      toast({
        title: "Analysis Complete",
        description: "Your manuscript style has been analyzed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze manuscript style. Please try again.",
        variant: "destructive",
      });
    },
  });

  const styleGuideMutation = useMutation({
    mutationFn: async (data: { sections: ManuscriptSection[]; genre?: string }) => {
      return apiRequest("/api/style-checker/generate-guide", "POST", data) as unknown as Promise<StyleGuide>;
    },
    onSuccess: (data: StyleGuide) => {
      setStyleGuide(data);
      setActiveTab("guide");
      toast({
        title: "Style Guide Generated",
        description: "Your personalized style guide has been created.",
      });
    },
    onError: () => {
      toast({
        title: "Style Guide Failed",
        description: "Unable to generate style guide. Please try again.",
        variant: "destructive",
      });
    },
  });

  const improveMutation = useMutation({
    mutationFn: async (data: { text: string; targetStyle: any }) => {
      return apiRequest("/api/style-checker/improve", "POST", data);
    },
    onSuccess: (data) => {
      toast({
        title: "Improvements Suggested",
        description: "Style improvement suggestions generated.",
      });
      // Handle improvement display logic here
    },
    onError: () => {
      toast({
        title: "Improvement Failed",
        description: "Unable to generate style improvements.",
        variant: "destructive",
      });
    },
  });

  const handleAddSection = () => {
    const newSection: ManuscriptSection = {
      id: `section-${Date.now()}`,
      title: `Chapter ${sections.length + 1}`,
      content: "",
      chapter: sections.length + 1,
      wordCount: 0,
    };
    setSections([...sections, newSection]);
  };

  const updateSection = (id: string, updates: Partial<ManuscriptSection>) => {
    setSections(sections.map(section => 
      section.id === id 
        ? { 
            ...section, 
            ...updates,
            wordCount: updates.content ? updates.content.split(/\s+/).filter(w => w.length > 0).length : section.wordCount
          }
        : section
    ));
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(section => section.id !== id));
  };

  const handleAnalyze = () => {
    if (sections.length === 0 || sections.every(s => !s.content.trim())) {
      toast({
        title: "No Content",
        description: "Please add some manuscript content to analyze.",
        variant: "destructive",
      });
      return;
    }

    const targetStyle = form.getValues();
    analyzeMutation.mutate({ sections, targetStyle });
  };

  const handleGenerateStyleGuide = () => {
    if (sections.length === 0) {
      toast({
        title: "No Content",
        description: "Please add some manuscript content first.",
        variant: "destructive",
      });
      return;
    }

    const { genre } = form.getValues();
    styleGuideMutation.mutate({ sections, genre });
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600 bg-green-50";
    if (score >= 70) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getSeverityColor = (severity: string): "destructive" | "secondary" | "outline" | "default" => {
    switch (severity) {
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  const totalWords = sections.reduce((acc, section) => acc + section.wordCount, 0);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <FileCheck className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-xl">Manuscript Style & Tone Consistency Checker</CardTitle>
          </div>
          <p className="text-gray-600">
            Analyze your manuscript for consistent voice, tone, style, and narrative elements using AI-powered analysis.
          </p>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="input" data-testid="tab-input">
            <Settings className="h-4 w-4 mr-2" />
            Input & Setup
          </TabsTrigger>
          <TabsTrigger value="analysis" data-testid="tab-analysis">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analysis Results
          </TabsTrigger>
          <TabsTrigger value="guide" data-testid="tab-guide">
            <Book className="h-4 w-4 mr-2" />
            Style Guide
          </TabsTrigger>
          <TabsTrigger value="improvements" data-testid="tab-improvements">
            <Wand2 className="h-4 w-4 mr-2" />
            Improvements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-6">
          {/* Target Style Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Target Style Configuration</CardTitle>
              <p className="text-sm text-gray-600">
                Define your desired writing style parameters for consistency checking.
              </p>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="voice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Narrative Voice</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., conversational, formal, whimsical" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., humorous, serious, mysterious" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pov"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Point of View</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select POV" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="first-person">First Person</SelectItem>
                              <SelectItem value="second-person">Second Person</SelectItem>
                              <SelectItem value="third-person-limited">Third Person Limited</SelectItem>
                              <SelectItem value="third-person-omniscient">Third Person Omniscient</SelectItem>
                              <SelectItem value="multiple">Multiple POV</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="genre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Genre</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., fantasy, romance, thriller" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </Form>
            </CardContent>
          </Card>

          {/* Manuscript Sections */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">Manuscript Content</CardTitle>
                  <p className="text-sm text-gray-600">
                    Add your manuscript sections for analysis. Total: {totalWords} words
                  </p>
                </div>
                <Button onClick={handleAddSection} size="sm" data-testid="button-add-section">
                  <FileText className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <div className="space-y-4">
                  {sections.map((section, index) => (
                    <Card key={section.id} className="border-2 border-dashed border-gray-200">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <Input
                            value={section.title}
                            onChange={(e) => updateSection(section.id, { title: e.target.value })}
                            placeholder={`Chapter ${index + 1}`}
                            className="flex-1 mr-4"
                          />
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {section.wordCount} words
                            </Badge>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeSection(section.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                        <Textarea
                          value={section.content}
                          onChange={(e) => updateSection(section.id, { content: e.target.value })}
                          placeholder="Paste your manuscript content here..."
                          className="min-h-32"
                          data-testid={`textarea-section-${index}`}
                        />
                      </CardContent>
                    </Card>
                  ))}
                  {sections.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No sections added yet. Click "Add Section" to get started.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending || sections.length === 0}
              className="flex-1"
              data-testid="button-analyze-style"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Style...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analyze Style Consistency
                </>
              )}
            </Button>
            <Button
              onClick={handleGenerateStyleGuide}
              disabled={styleGuideMutation.isPending || sections.length === 0}
              variant="outline"
              className="flex-1"
              data-testid="button-generate-guide"
            >
              {styleGuideMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Guide...
                </>
              ) : (
                <>
                  <Book className="mr-2 h-4 w-4" />
                  Generate Style Guide
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {analysis ? (
            <>
              {/* Overall Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Overall Style Consistency</span>
                    <Badge className={getScoreColor(analysis.overallScore)}>
                      {analysis.overallScore}/100
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={analysis.overallScore} className="w-full h-3 mb-4" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(analysis.consistency).map(([key, data]) => (
                      <div key={key} className="text-center">
                        <div className={`text-lg font-bold ${getScoreColor(data.score)}`}>
                          {data.score}
                        </div>
                        <div className="text-sm text-gray-600 capitalize">{key}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Writing Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Writing Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-lg font-bold">{analysis.writingMetrics.averageSentenceLength}</div>
                      <div className="text-sm text-gray-600">Avg Sentence Length</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-lg font-bold capitalize">{analysis.writingMetrics.vocabularyLevel}</div>
                      <div className="text-sm text-gray-600">Vocabulary Level</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-lg font-bold">{analysis.writingMetrics.readabilityScore}</div>
                      <div className="text-sm text-gray-600">Readability Score</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-lg font-bold capitalize">{analysis.writingMetrics.pacing}</div>
                      <div className="text-sm text-gray-600">Pacing</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Analysis */}
              <Tabs defaultValue="voice" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="voice">Voice</TabsTrigger>
                  <TabsTrigger value="tone">Tone</TabsTrigger>
                  <TabsTrigger value="style">Style</TabsTrigger>
                  <TabsTrigger value="pov">POV</TabsTrigger>
                </TabsList>

                {Object.entries(analysis.consistency).map(([key, data]) => (
                  <TabsContent key={key} value={key} className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="capitalize flex items-center space-x-2">
                          <span>{key} Analysis</span>
                          <Badge className={getScoreColor(data.score)}>
                            {data.score}/100
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {data.issues.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                              Issues Found
                            </h4>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              {data.issues.map((issue, index) => (
                                <li key={index} className="text-gray-700">{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {data.recommendations.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center">
                              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                              Recommendations
                            </h4>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              {data.recommendations.map((rec, index) => (
                                <li key={index} className="text-gray-700">{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>

              {/* Style Suggestions */}
              <Card>
                <CardHeader>
                  <CardTitle>Style Suggestions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.styleSuggestions.map((suggestion, index) => (
                      <Card key={index} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant={getSeverityColor(suggestion.severity)}>
                                {suggestion.severity}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {suggestion.type}
                              </Badge>
                            </div>
                          </div>
                          <h4 className="font-medium text-sm mb-2">{suggestion.issue}</h4>
                          <p className="text-sm text-gray-700 mb-3">{suggestion.suggestion}</p>
                          {suggestion.examples.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Examples:</p>
                              <div className="space-y-1">
                                {suggestion.examples.map((example, exIndex) => (
                                  <p key={exIndex} className="text-xs bg-gray-100 p-2 rounded italic">
                                    "{example}"
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Strengths and Weaknesses */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-600">Strengths</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {analysis.strengthsAndWeaknesses.strengths.map((strength, index) => (
                        <li key={index}>{strength}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-orange-600">Weaknesses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {analysis.strengthsAndWeaknesses.weaknesses.map((weakness, index) => (
                        <li key={index}>{weakness}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-600">Focus Areas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {analysis.strengthsAndWeaknesses.improvementAreas.map((area, index) => (
                        <li key={index}>{area}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No analysis available. Run analysis first.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="guide" className="space-y-6">
          {styleGuide ? (
            <>
              {/* Voice Guidelines */}
              <Card>
                <CardHeader>
                  <CardTitle>Voice Guidelines</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Characteristics</h4>
                    <div className="flex flex-wrap gap-2">
                      {styleGuide.voice.characteristics.map((char, index) => (
                        <Badge key={index} variant="secondary">{char}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2">Guidelines</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {styleGuide.voice.guidelines.map((guideline, index) => (
                        <li key={index}>{guideline}</li>
                      ))}
                    </ul>
                  </div>

                  {styleGuide.voice.examples.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Examples</h4>
                      <div className="space-y-2">
                        {styleGuide.voice.examples.map((example, index) => (
                          <p key={index} className="text-sm bg-gray-100 p-3 rounded italic">
                            "{example}"
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tone Guidelines */}
              <Card>
                <CardHeader>
                  <CardTitle>Tone Guidelines</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Primary Tone</h4>
                    <Badge variant="default" className="text-sm">{styleGuide.tone.primaryTone}</Badge>
                  </div>

                  {styleGuide.tone.secondaryTones.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Secondary Tones</h4>
                      <div className="flex flex-wrap gap-2">
                        {styleGuide.tone.secondaryTones.map((tone, index) => (
                          <Badge key={index} variant="outline">{tone}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium text-sm mb-2">Mood Guidelines</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {styleGuide.tone.moodGuidelines.map((guideline, index) => (
                        <li key={index}>{guideline}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Style Guidelines */}
              <Card>
                <CardHeader>
                  <CardTitle>Style Guidelines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Sentence Structure</h4>
                      <p className="text-sm text-gray-700">{styleGuide.style.sentenceStructure}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Vocabulary Level</h4>
                      <p className="text-sm text-gray-700">{styleGuide.style.vocabularyLevel}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Descriptive Style</h4>
                      <p className="text-sm text-gray-700">{styleGuide.style.descriptiveStyle}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Dialogue Style</h4>
                      <p className="text-sm text-gray-700">{styleGuide.style.dialogueStyle}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Consistency Guidelines */}
              <Card>
                <CardHeader>
                  <CardTitle>Consistency Guidelines</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">POV Guidelines</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {styleGuide.consistency.povGuidelines.map((guideline, index) => (
                        <li key={index}>{guideline}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Tense Forms</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {styleGuide.consistency.tenseForms.map((form, index) => (
                        <li key={index}>{form}</li>
                      ))}
                    </ul>
                  </div>

                  {styleGuide.consistency.characterVoiceNotes.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Character Voice Notes</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {styleGuide.consistency.characterVoiceNotes.map((note, index) => (
                          <li key={index}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Book className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No style guide available. Generate one first.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="improvements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Style Improvement Tools</CardTitle>
              <p className="text-sm text-gray-600">
                Get AI-powered suggestions to improve specific sections of your manuscript.
              </p>
            </CardHeader>
            <CardContent>
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  This feature allows you to paste specific text sections and receive targeted style improvements 
                  based on your consistency analysis and target style parameters.
                </AlertDescription>
              </Alert>
              <div className="mt-4">
                <p className="text-sm text-gray-500">Coming in the next update: Section-by-section improvement suggestions.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}