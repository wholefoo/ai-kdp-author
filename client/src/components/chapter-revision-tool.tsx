import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, 
  Eye, 
  Check, 
  X, 
  MessageCircle, 
  Palette, 
  Zap, 
  Target,
  BookOpen,
  Wand2,
  ArrowLeftRight
} from 'lucide-react';

interface Novel {
  id: string;
  title: string;
  chapters: string[];
  genre?: string;
}

interface RevisionOptions {
  type: 'dialogue' | 'descriptions' | 'pacing' | 'plot_holes' | 'general';
  intensity: 'light' | 'moderate' | 'heavy';
  focusAreas: string[];
  customInstructions?: string;
}

interface RevisionResult {
  originalText: string;
  revisedText: string;
  changes: string[];
  suggestions: string[];
  confidence: number;
}

interface ChapterRevisionToolProps {
  novelId: string;
  onClose: () => void;
}

export function ChapterRevisionTool({ novelId, onClose }: ChapterRevisionToolProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [revisionOptions, setRevisionOptions] = useState<RevisionOptions>({
    type: 'general',
    intensity: 'moderate',
    focusAreas: []
  });
  const [revisionResult, setRevisionResult] = useState<RevisionResult | null>(null);
  const [activeTab, setActiveTab] = useState('select');
  const [customInstructions, setCustomInstructions] = useState('');

  const { data: novel } = useQuery<Novel>({
    queryKey: ['/api/novels', novelId],
    enabled: !!novelId
  });

  const revisionMutation = useMutation({
    mutationFn: async ({ chapterIndex, options }: { chapterIndex: number, options: RevisionOptions }) => {
      const response = await apiRequest(`/api/novels/${novelId}/chapters/${chapterIndex}/revise`, "POST", {
        options
      });
      return response as RevisionResult;
    },
    onSuccess: (result) => {
      setRevisionResult(result);
      setActiveTab('compare');
      toast({
        title: "Chapter Revised Successfully",
        description: "Review the changes and decide whether to accept them.",
      });
    },
    onError: (error) => {
      toast({
        title: "Revision Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const applyRevisionMutation = useMutation({
    mutationFn: async ({ chapterIndex, revisedText }: { chapterIndex: number, revisedText: string }) => {
      return await apiRequest(`/api/novels/${novelId}/chapters/${chapterIndex}`, "PUT", {
        content: revisedText
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/novels', novelId] });
      toast({
        title: "Chapter Updated",
        description: "The revised chapter has been saved to your novel.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRevisionTypeChange = (type: string) => {
    setRevisionOptions(prev => ({ ...prev, type: type as RevisionOptions['type'] }));
  };

  const handleFocusAreaToggle = (area: string, checked: boolean) => {
    setRevisionOptions(prev => ({
      ...prev,
      focusAreas: checked 
        ? [...prev.focusAreas, area]
        : prev.focusAreas.filter(a => a !== area)
    }));
  };

  const startRevision = () => {
    if (selectedChapter === null) {
      toast({
        title: "No Chapter Selected",
        description: "Please select a chapter to revise.",
        variant: "destructive",
      });
      return;
    }

    const finalOptions = {
      ...revisionOptions,
      customInstructions: customInstructions.trim() || undefined
    };

    revisionMutation.mutate({ chapterIndex: selectedChapter, options: finalOptions });
  };

  const applyRevision = () => {
    if (!revisionResult || selectedChapter === null) return;
    
    applyRevisionMutation.mutate({ 
      chapterIndex: selectedChapter, 
      revisedText: revisionResult.revisedText 
    });
  };

  const focusAreaOptions = [
    { id: 'character-voice', label: 'Character Voice', icon: MessageCircle },
    { id: 'scene-setting', label: 'Scene Setting', icon: Palette },
    { id: 'action-sequences', label: 'Action Sequences', icon: Zap },
    { id: 'emotional-depth', label: 'Emotional Depth', icon: Target },
  ];

  const revisionTypes = [
    { value: 'dialogue', label: 'Improve Dialogue', description: 'Enhance character conversations and speech patterns' },
    { value: 'descriptions', label: 'Enhance Descriptions', description: 'Improve scene setting and character descriptions' },
    { value: 'pacing', label: 'Adjust Pacing', description: 'Balance action, dialogue, and narrative flow' },
    { value: 'plot_holes', label: 'Fix Plot Issues', description: 'Address inconsistencies and plot holes' },
    { value: 'general', label: 'General Improvement', description: 'Overall writing quality enhancement' },
  ];

  if (!novel) {
    return <div>Loading novel...</div>;
  }

  return (
    <div className="w-full h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="select" data-testid="tab-select">Select Chapter</TabsTrigger>
          <TabsTrigger value="options" data-testid="tab-options">Revision Options</TabsTrigger>
          <TabsTrigger value="compare" disabled={!revisionResult} data-testid="tab-compare">
            Compare Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="select" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Chapter to Revise</h3>
            <div className="grid gap-2 max-h-96 overflow-y-auto">
              {novel.chapters.map((chapter, index) => {
                const preview = chapter.substring(0, 150) + (chapter.length > 150 ? '...' : '');
                const wordCount = chapter.split(/\s+/).filter(word => word.length > 0).length;
                
                return (
                  <Card 
                    key={index}
                    className={`cursor-pointer transition-colors ${
                      selectedChapter === index ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedChapter(index)}
                    data-testid={`chapter-${index}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-4 w-4" />
                          <span className="font-medium">Chapter {index + 1}</span>
                          {selectedChapter === index && <Check className="h-4 w-4 text-blue-600" />}
                        </div>
                        <Badge variant="secondary">{wordCount} words</Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{preview}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {selectedChapter !== null && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="font-medium">Selected: Chapter {selectedChapter + 1}</p>
                <Button 
                  onClick={() => setActiveTab('options')} 
                  className="mt-2"
                  data-testid="continue-to-options"
                >
                  Continue to Options
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="options" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Revision Settings</h3>
            
            {/* Revision Type */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Revision Type</label>
              <Select value={revisionOptions.type} onValueChange={handleRevisionTypeChange}>
                <SelectTrigger data-testid="revision-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {revisionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Intensity */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Revision Intensity</label>
              <Select 
                value={revisionOptions.intensity} 
                onValueChange={(value) => setRevisionOptions(prev => ({ 
                  ...prev, 
                  intensity: value as RevisionOptions['intensity'] 
                }))}
              >
                <SelectTrigger data-testid="intensity-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light - Minor improvements</SelectItem>
                  <SelectItem value="moderate">Moderate - Balanced changes</SelectItem>
                  <SelectItem value="heavy">Heavy - Significant revisions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Focus Areas */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Focus Areas (Optional)</label>
              <div className="grid grid-cols-2 gap-3">
                {focusAreaOptions.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.id}
                      checked={revisionOptions.focusAreas.includes(option.id)}
                      onCheckedChange={(checked) => handleFocusAreaToggle(option.id, !!checked)}
                      data-testid={`focus-${option.id}`}
                    />
                    <label 
                      htmlFor={option.id}
                      className="text-sm flex items-center space-x-2 cursor-pointer"
                    >
                      <option.icon className="h-4 w-4" />
                      <span>{option.label}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Instructions */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Custom Instructions (Optional)</label>
              <Textarea
                placeholder="Provide specific guidance for the revision..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="min-h-20"
                data-testid="custom-instructions"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button 
                onClick={() => setActiveTab('select')} 
                variant="outline"
                data-testid="back-to-select"
              >
                Back to Selection
              </Button>
              <Button 
                onClick={startRevision}
                disabled={revisionMutation.isPending || selectedChapter === null}
                data-testid="start-revision"
              >
                {revisionMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Revising Chapter...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Start Revision
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="compare" className="space-y-4">
          {revisionResult && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Revision Results</h3>
                <div className="flex items-center space-x-2">
                  <Badge variant={revisionResult.confidence > 80 ? "default" : "secondary"}>
                    {revisionResult.confidence}% Confidence
                  </Badge>
                </div>
              </div>

              {/* Changes Summary */}
              {revisionResult.changes.length > 0 && (
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-base">Changes Made</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {revisionResult.changes.map((change, index) => (
                        <li key={index} className="text-sm flex items-start space-x-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Side-by-side comparison */}
              <div className="grid grid-cols-2 gap-4 h-96">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <Eye className="h-4 w-4 mr-2" />
                      Original Chapter
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72 overflow-y-auto text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">
                      {revisionResult.originalText}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <ArrowLeftRight className="h-4 w-4 mr-2" />
                      Revised Chapter
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72 overflow-y-auto text-sm whitespace-pre-wrap bg-green-50 p-3 rounded">
                      {revisionResult.revisedText}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Suggestions */}
              {revisionResult.suggestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Additional Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {revisionResult.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm flex items-start space-x-2">
                          <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button 
                  onClick={() => setActiveTab('options')} 
                  variant="outline"
                  data-testid="revise-again"
                >
                  Revise Again
                </Button>
                <Button 
                  onClick={() => setRevisionResult(null)}
                  variant="outline"
                  data-testid="discard-changes"
                >
                  <X className="h-4 w-4 mr-2" />
                  Discard Changes
                </Button>
                <Button 
                  onClick={applyRevision}
                  disabled={applyRevisionMutation.isPending}
                  data-testid="apply-revision"
                >
                  {applyRevisionMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Apply Revision
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}