import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Headphones, Download, Play, Pause, Volume2, Clock, FileText, Music, CheckSquare, Square, BookOpen } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { VoicePreviewSelector } from '@/components/voice-preview-selector';

interface AudiobookGeneratorProps {
  novelId: string;
  novelTitle: string;
  onClose?: () => void;
}

interface Voice {
  voice: string;
  description: string;
  gender: string;
  recommended: boolean;
}

interface Audiobook {
  id: string;
  title: string;
  voice: string;
  model: string;
  speed: number;
  format: string;
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'partial_completed';
  progress: {
    currentChapter?: number;
    totalChapters?: number;
    completedChapters?: number;
    status?: string;
  };
  totalDuration: number;
  chapterCount: number;
  error?: string;
  createdAt: string;
}

export function AudiobookGenerator({ novelId, novelTitle, onClose }: AudiobookGeneratorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [selectedModel, setSelectedModel] = useState('tts-1');
  const [selectedSpeed, setSelectedSpeed] = useState(100);
  const [selectedFormat, setSelectedFormat] = useState('mp3');
  
  // Chapter selection state
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [showChapterSelection, setShowChapterSelection] = useState(false);
  
  // Background music settings
  const [backgroundMusicEnabled, setBackgroundMusicEnabled] = useState(false);
  const [selectedMusicType, setSelectedMusicType] = useState('ambient');
  const [musicVolume, setMusicVolume] = useState(20); // 20% volume

  // Fetch available voices
  const { data: voicesData } = useQuery({
    queryKey: ['/api/audiobook/voices'],
    queryFn: () => apiRequest('/api/audiobook/voices', 'GET'),
  });

  // Fetch available background music options
  const { data: musicOptionsData } = useQuery({
    queryKey: ['/api/audiobook/music-options'],
    queryFn: () => apiRequest('/api/audiobook/music-options', 'GET'),
  });

  // Fetch novel data to get chapters
  const { data: novelData } = useQuery({
    queryKey: ['/api/novels', novelId],
    queryFn: () => apiRequest(`/api/novels/${novelId}`, 'GET'),
  });

  // Fetch existing audiobooks for this novel
  const { data: audiobooksData, refetch: refetchAudiobooks } = useQuery({
    queryKey: ['/api/novel', novelId, 'audiobooks'],
    queryFn: () => apiRequest(`/api/novel/${novelId}/audiobooks`, 'GET'),
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache results (was cacheTime in v4, now gcTime in v5)
    refetchInterval: (query) => {
      // Poll every 3 seconds if any audiobook is generating
      const data = query.state.data;
      const audiobooks = data?.audiobooks || [];
      const hasGenerating = audiobooks.some((ab: any) => ab.status === 'generating');
      return hasGenerating ? 3000 : false;
    },
  });

  const voices: Voice[] = voicesData?.voices || [];
  const musicOptions = musicOptionsData?.musicOptions || [];
  const audiobooks: Audiobook[] = audiobooksData?.audiobooks || [];
  const novel = novelData;
  const chapters = Array.isArray(novel?.chapters) ? novel.chapters : [];

  // Stall detection: Track last progress and detect when generation is stuck
  const detectStallWarning = (audiobook: any) => {
    if (audiobook.status !== 'generating') return null;
    
    const now = new Date().getTime();
    const lastUpdated = new Date(audiobook.updatedAt).getTime();
    const stallThresholdMinutes = 10; // Consider stuck after 10 minutes
    const minutesSinceUpdate = (now - lastUpdated) / (1000 * 60);
    
    if (minutesSinceUpdate > stallThresholdMinutes) {
      return {
        isStalled: true,
        minutesStalled: Math.floor(minutesSinceUpdate),
        message: `Generation appears stuck for ${Math.floor(minutesSinceUpdate)} minutes. Consider using Resume Generation.`
      };
    }
    
    return null;
  };

  // Initialize all chapters as selected by default
  useEffect(() => {
    if (chapters.length > 0 && selectedChapters.length === 0) {
      setSelectedChapters(chapters.map((_: any, index: number) => index));
    }
  }, [chapters.length]);

  // Force refresh on mount to clear any stale cache
  useEffect(() => {
    // Invalidate the query cache and force refetch
    queryClient.invalidateQueries({ queryKey: ['/api/novel', novelId, 'audiobooks'] });
    refetchAudiobooks();
  }, [novelId, refetchAudiobooks]);
  
  // Get the actively generating audiobook for this novel
  const activeGeneratingAudiobook = audiobooks.find(ab => ab.status === 'generating');
  
  // Show completion notifications
  useEffect(() => {
    const completedAudiobooks = audiobooks.filter(ab => ab.status === 'completed');
    const failedAudiobooks = audiobooks.filter(ab => ab.status === 'failed');
    
    completedAudiobooks.forEach(audiobook => {
      toast({
        title: "Audiobook Complete!",
        description: `"${audiobook.title}" has been successfully converted to audiobook`,
        duration: 5000,
      });
    });
    
    failedAudiobooks.forEach(audiobook => {
      toast({
        title: "Audiobook Failed",
        description: `Failed to generate audiobook for "${audiobook.title}": ${audiobook.error || 'Unknown error'}`,
        variant: "destructive",
        duration: 8000,
      });
    });
  }, [audiobooks.length, toast]); // Only trigger when number of audiobooks changes

  const generateAudiobookMutation = useMutation({
    mutationFn: async (data: {
      novelId: string;
      voice: string;
      model: string;
      speed: number;
      format: string;
      selectedChapters?: number[];
      backgroundMusic?: {
        enabled: boolean;
        musicType: string;
        volume: number;
        fadeInOut: boolean;
      };
    }) => {
      return apiRequest('/api/audiobook/generate', 'POST', data);
    },
    onSuccess: (response) => {
      toast({
        title: "Audiobook Generation Started",
        description: `Creating audiobook for "${novelTitle}" with ${selectedVoice} voice.`,
      });
      refetchAudiobooks();
      queryClient.invalidateQueries({ queryKey: ['/api/audiobooks'] });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to start audiobook generation",
        variant: "destructive",
      });
    },
  });

  const handleGenerateAudiobook = () => {
    generateAudiobookMutation.mutate({
      novelId,
      voice: selectedVoice,
      model: selectedModel,
      speed: selectedSpeed,
      format: selectedFormat,
      selectedChapters: selectedChapters.length === chapters.length ? undefined : selectedChapters, // Only send selectedChapters if partial selection
      backgroundMusic: backgroundMusicEnabled ? {
        enabled: true,
        musicType: selectedMusicType,
        volume: musicVolume / 100, // Convert percentage to decimal
        fadeInOut: true,
      } : undefined,
    });
  };

  // Chapter selection functions
  const handleChapterToggle = (chapterIndex: number) => {
    setSelectedChapters(prev => 
      prev.includes(chapterIndex) 
        ? prev.filter(i => i !== chapterIndex)
        : [...prev, chapterIndex].sort((a, b) => a - b)
    );
  };

  const handleSelectAllChapters = () => {
    setSelectedChapters(chapters.map((_: any, index: number) => index));
  };

  const handleDeselectAllChapters = () => {
    setSelectedChapters([]);
  };

  const getChapterPreview = (chapter: any, maxLength: number = 100) => {
    const content = typeof chapter === 'string' ? chapter : chapter.content || '';
    const cleanContent = content.replace(/^Chapter\s+\d+\s*/i, '').trim();
    return cleanContent.length > maxLength 
      ? cleanContent.substring(0, maxLength) + '...' 
      : cleanContent;
  };

  const handleDownloadAudiobook = async (audiobookId: string, title: string) => {
    try {
      const response = await fetch(`/api/audiobook/${audiobookId}/download`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_audiobook.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download started",
        description: "Your audiobook ZIP file is downloading...",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download audiobook. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPartialAudiobook = async (audiobookId: string, title: string) => {
    try {
      toast({
        title: "Preparing download...",
        description: "Creating ZIP file with completed chapters. This may take several minutes for large files.",
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute timeout for large files
      
      const response = await fetch(`/api/audiobook/${audiobookId}/download-partial`, {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'Download failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || `Error ${response.status}`;
        } catch {
          errorMessage = `Download failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty - no completed chapters found');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_partial_audiobook.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download completed",
        description: "Your partial audiobook has been downloaded successfully!",
      });

    } catch (error: any) {
      let errorMessage = "Failed to download partial audiobook";
      if (error.name === 'AbortError') {
        errorMessage = "Download timed out. The file may be too large - try the chunked download instead.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('Partial download error:', error);
      toast({
        title: "Download failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDownloadSampleAudiobook = async (audiobookId: string, title: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minute timeout
      
      const response = await fetch(`/api/audiobook/${audiobookId}/download-sample`, {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sample download failed: ${response.status} - ${errorText}`);
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Downloaded sample file is empty');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_sample_10chapters.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Sample download completed",
        description: "Your first 10 audiobook chapters have been downloaded successfully!",
      });
    } catch (error: any) {
      let errorMessage = "Unknown error occurred";
      if (error.name === 'AbortError') {
        errorMessage = "Download timed out. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Sample download failed", 
        description: `Failed to download sample: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const handleResumeAudiobook = async (audiobookId: string, title: string) => {
    try {
      const response = await fetch(`/api/audiobook/${audiobookId}/resume`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Resume failed');
      }

      toast({
        title: "Resume started",
        description: `Audiobook generation for "${title}" has been resumed.`,
      });

      // Refresh audiobooks list
      refetchAudiobooks();
    } catch (error) {
      console.error('Resume error:', error);
      toast({
        title: "Resume failed",
        description: "Failed to resume audiobook generation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePreviewAudiobook = async (audiobookId: string) => {
    try {
      const url = `/api/audiobook/${audiobookId}/preview`;
      window.open(url, '_blank');
      
      toast({
        title: "Preview opened",
        description: "Chapter 1 is playing in a new tab",
      });
    } catch (error) {
      console.error('Preview error:', error);
      toast({
        title: "Preview failed",
        description: "Failed to preview audiobook. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'generating': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'partial_completed': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Queued';
      case 'generating': return 'Generating';
      case 'completed': return 'Ready';
      case 'failed': return 'Failed';
      case 'partial_completed': return 'Partial';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            Create Audiobook: {novelTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enhanced Voice Selection with Preview */}
          <VoicePreviewSelector
            selectedVoice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            selectedSpeed={selectedSpeed}
            onSpeedChange={setSelectedSpeed}
          />

          {/* Chapter Selection Section */}
          {chapters.length > 0 && (
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Chapter Selection</h3>
                  <Badge variant="outline">
                    {selectedChapters.length} of {chapters.length} selected
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChapterSelection(!showChapterSelection)}
                  data-testid="button-toggle-chapter-selection"
                >
                  {showChapterSelection ? 'Hide Chapters' : 'Select Chapters'}
                </Button>
              </div>

              {showChapterSelection && (
                <div className="space-y-4 p-4 border rounded-lg bg-accent/5">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllChapters}
                      data-testid="button-select-all-chapters"
                    >
                      <CheckSquare className="h-4 w-4 mr-1" />
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAllChapters}
                      data-testid="button-deselect-all-chapters"
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Deselect All
                    </Button>
                  </div>

                  <div className="grid gap-2 max-h-60 overflow-y-auto">
                    {chapters.map((chapter: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent/10 transition-colors"
                        data-testid={`chapter-${index}`}
                      >
                        <Checkbox
                          id={`chapter-${index}`}
                          checked={selectedChapters.includes(index)}
                          onCheckedChange={() => handleChapterToggle(index)}
                          data-testid={`checkbox-chapter-${index}`}
                        />
                        <div className="flex-1 min-w-0">
                          <Label 
                            htmlFor={`chapter-${index}`}
                            className="font-medium cursor-pointer"
                          >
                            Chapter {index + 1}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            {getChapterPreview(chapter, 150)}
                          </p>
                          <div className="text-xs text-muted-foreground mt-1">
                            ~{Math.ceil((typeof chapter === 'string' ? chapter : chapter.content || '').split(' ').length / 200)} min read
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedChapters.length === 0 && (
                    <div className="text-center p-4 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No chapters selected. Please select at least one chapter to generate an audiobook.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Settings Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Audiobook Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Quality Selection */}
            <div className="space-y-2">
              <Label htmlFor="model">Quality</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger data-testid="select-quality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tts-1">Standard Quality (Faster)</SelectItem>
                  <SelectItem value="tts-1-hd">High Definition (Slower, Better Quality)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Spacer - Speed is now in VoicePreviewSelector */}
            <div className="space-y-2">
              <Label htmlFor="spacer" className="text-transparent">Spacer</Label>
              <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
                Speed control moved to Voice Preview section above
              </div>
            </div>

            {/* Format Selection */}
            <div className="space-y-2">
              <Label htmlFor="format">Audio Format</Label>
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger data-testid="select-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp3">MP3 (Recommended for Audible)</SelectItem>
                  <SelectItem value="aac">AAC (High Quality)</SelectItem>
                  <SelectItem value="opus">OPUS (Smallest Size)</SelectItem>
                  <SelectItem value="flac">FLAC (Lossless)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Background Music */}
            <div className="space-y-4 p-4 border rounded-lg bg-accent/10">
              <div className="flex items-center space-x-2">
                <Music className="h-4 w-4 text-primary" />
                <Label htmlFor="background-music" className="text-sm font-medium">Background Music</Label>
                <Switch
                  id="background-music"
                  checked={backgroundMusicEnabled}
                  onCheckedChange={setBackgroundMusicEnabled}
                  data-testid="switch-background-music"
                />
              </div>
              
              {backgroundMusicEnabled && (
                <div className="space-y-4 ml-6">
                  <div className="space-y-2">
                    <Label htmlFor="music-type">Music Style</Label>
                    <Select value={selectedMusicType} onValueChange={setSelectedMusicType}>
                      <SelectTrigger data-testid="select-music-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {musicOptions.map((option: any) => (
                          <SelectItem key={option.type} value={option.type}>
                            <div className="flex items-center space-x-2">
                              <span>{option.name}</span>
                              {option.recommended && (
                                <Badge variant="secondary" className="text-xs">Recommended</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground">
                      {musicOptions.find((opt: any) => opt.type === selectedMusicType)?.description}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="music-volume">Music Volume: {musicVolume}%</Label>
                    <Slider
                      id="music-volume"
                      min={5}
                      max={50}
                      step={5}
                      value={[musicVolume]}
                      onValueChange={(value) => setMusicVolume(value[0])}
                      className="w-full"
                      data-testid="slider-music-volume"
                    />
                    <div className="text-xs text-muted-foreground">
                      Background music volume relative to narration (5-50%)
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>

          <Button 
            onClick={handleGenerateAudiobook}
            disabled={generateAudiobookMutation.isPending || !!activeGeneratingAudiobook || selectedChapters.length === 0}
            className="w-full"
            data-testid="button-generate-audiobook"
          >
            <Headphones className="h-4 w-4 mr-2" />
            {generateAudiobookMutation.isPending ? 'Starting Generation...' : 
             activeGeneratingAudiobook ? 'Generation in Progress...' : 
             selectedChapters.length === 0 ? 'Select Chapters to Generate' :
             selectedChapters.length === chapters.length ? 'Generate Full Audiobook' :
             `Generate Audiobook (${selectedChapters.length}/${chapters.length} chapters)`}
          </Button>
        </CardContent>
      </Card>

      {/* Active Generation Progress */}
      {activeGeneratingAudiobook && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Generating Audiobook
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>
                  {activeGeneratingAudiobook.progress?.completedChapters || 0} / {activeGeneratingAudiobook.progress?.totalChapters || 0} chapters
                </span>
              </div>
              <Progress 
                value={
                  activeGeneratingAudiobook.progress?.totalChapters 
                    ? ((activeGeneratingAudiobook.progress.completedChapters || 0) / activeGeneratingAudiobook.progress.totalChapters) * 100
                    : 0
                }
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Voice:</span> {activeGeneratingAudiobook.voice}
              </div>
              <div>
                <span className="text-gray-600">Quality:</span> {activeGeneratingAudiobook.model === 'tts-1-hd' ? 'HD' : 'Standard'}
              </div>
            </div>
            {activeGeneratingAudiobook.progress?.currentChapter && (
              <div className="text-sm text-blue-600">
                Currently processing: Chapter {activeGeneratingAudiobook.progress.currentChapter}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing Audiobooks */}
      {audiobooks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Your Audiobooks ({audiobooks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {audiobooks.map((audiobook) => (
                <div
                  key={audiobook.id}
                  className="border rounded-lg p-4 space-y-3"
                  data-testid={`audiobook-${audiobook.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(audiobook.status)}>
                        {getStatusText(audiobook.status)}
                      </Badge>
                      <div>
                        <h4 className="font-medium">{audiobook.title}</h4>
                        <p className="text-sm text-gray-500">
                          Voice: {audiobook.voice} • Quality: {audiobook.model} • Speed: {audiobook.speed/100}x
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      {audiobook.totalDuration > 0 ? formatDuration(audiobook.totalDuration) : 'Calculating...'}
                    </div>
                  </div>

                  {/* Progress Bar for Generating */}
                  {audiobook.status === 'generating' && audiobook.progress && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Generating chapters...</span>
                        <span>
                          {audiobook.progress.completedChapters || 0} / {audiobook.progress.totalChapters || 0} chapters
                        </span>
                      </div>
                      <Progress 
                        value={
                          audiobook.progress.totalChapters 
                            ? ((audiobook.progress.completedChapters || 0) / audiobook.progress.totalChapters) * 100
                            : 0
                        } 
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Stall Warning */}
                  {(() => {
                    const stallWarning = detectStallWarning(audiobook);
                    return stallWarning && (
                      <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                        <div className="flex items-start gap-2">
                          <div className="text-amber-600">⚠️</div>
                          <div>
                            <strong>Generation Stalled:</strong> {stallWarning.message}
                            <div className="mt-1 text-xs text-amber-600">
                              Last activity: {stallWarning.minutesStalled} minutes ago
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Error Message */}
                  {audiobook.status === 'failed' && audiobook.error && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                      <strong>Error:</strong> {audiobook.error}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {audiobook.status === 'completed' && (
                    <div className="flex flex-col gap-2">
                      {/* Primary Download Options */}
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDownloadAudiobook(audiobook.id, audiobook.title)}
                          data-testid={`button-download-${audiobook.id}`}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download Full (2.1GB)
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handlePreviewAudiobook(audiobook.id)}
                          data-testid={`button-preview-${audiobook.id}`}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                      
                      {/* Alternative Download Options (More Reliable) */}
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={() => handleDownloadPartialAudiobook(audiobook.id, audiobook.title)}
                          data-testid={`button-download-partial-completed-${audiobook.id}`}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download All ({audiobook.chapterCount} chapters)
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={() => handleDownloadSampleAudiobook(audiobook.id, audiobook.title)}
                          data-testid={`button-download-sample-completed-${audiobook.id}`}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Sample (10 chapters)
                        </Button>
                      </div>
                      
                      <div className="text-xs text-gray-600">
                        💡 If downloads fail in production, try the chunked downloads below
                      </div>
                      
                      {/* Production-Safe Chunked Downloads */}
                      <ChunkedDownloadOptions audiobook={audiobook} />
                    </div>
                  )}

                  {/* Partial Download and Resume Options */}
                  {(audiobook.status === 'failed' || audiobook.status === 'partial_completed' || audiobook.status === 'generating') && audiobook.progress?.completedChapters && audiobook.progress.completedChapters > 0 && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDownloadPartialAudiobook(audiobook.id, audiobook.title)}
                        data-testid={`button-download-partial-${audiobook.id}`}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download Partial ({audiobook.progress.completedChapters} chapters)
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => handleDownloadSampleAudiobook(audiobook.id, audiobook.title)}
                        data-testid={`button-download-sample-${audiobook.id}`}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Sample (10 chapters)
                      </Button>
                      {(audiobook.status === 'failed' || audiobook.status === 'partial_completed' || audiobook.status === 'generating') && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleResumeAudiobook(audiobook.id, audiobook.title)}
                          data-testid={`button-resume-${audiobook.id}`}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Resume Generation
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Production-safe chunked download component
function ChunkedDownloadOptions({ audiobook }: { audiobook: any }) {
  const { toast } = useToast();
  const [chunkInfo, setChunkInfo] = useState<any>(null);
  const [loadingChunks, setLoadingChunks] = useState(false);

  const loadChunkInfo = async () => {
    if (loadingChunks || chunkInfo) return;
    
    setLoadingChunks(true);
    try {
      console.log(`🔍 Loading chunk info for audiobook: ${audiobook.id}`);
      const response = await fetch(`/api/audiobook/${audiobook.id}/chunks?size=20`, {
        credentials: 'include',
      });
      
      console.log(`📊 Chunks API response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Loaded chunk data:`, data);
        setChunkInfo(data);
        
        toast({
          title: "Chunks loaded",
          description: `Ready to download ${data.totalChunks} parts`,
        });
      } else {
        const errorText = await response.text();
        console.error(`❌ Chunks API error: ${response.status}`, errorText);
        
        toast({
          title: "Failed to load chunks",
          description: `API error: ${response.status}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading chunk info:', error);
      toast({
        title: "Failed to load chunks",
        description: "Network error - please try again",
        variant: "destructive",
      });
    } finally {
      setLoadingChunks(false);
    }
  };

  const downloadChunk = async (chunkIndex: number, startChapter: number, endChapter: number) => {
    try {
      toast({
        title: "Downloading chunk...",
        description: `Downloading chapters ${startChapter}-${endChapter}`,
      });

      const downloadUrl = `/api/audiobook/${audiobook.id}/download-chunked?chunk=${chunkIndex}&size=20`;
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;
      a.download = `${audiobook.title.replace(/[^a-zA-Z0-9]/g, '_')}_part${chunkIndex + 1}.zip`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => {
        toast({
          title: "Download started",
          description: `Part ${chunkIndex + 1} should start downloading shortly`,
        });
      }, 1000);

    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download chunk. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!chunkInfo && !loadingChunks) {
    return (
      <div className="mt-2">
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={loadChunkInfo}
          data-testid={`button-show-chunks-${audiobook.id}`}
        >
          📦 Show Chunked Downloads (Production-Safe)
        </Button>
      </div>
    );
  }

  if (loadingChunks) {
    return (
      <div className="mt-2 text-sm text-gray-600">
        Loading chunk information...
      </div>
    );
  }

  if (!chunkInfo) return null;

  return (
    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="text-sm font-medium text-blue-800 mb-2">
        📦 Production-Safe Downloads ({chunkInfo.totalChunks} parts)
      </div>
      <div className="text-xs text-blue-600 mb-3">
        Download in smaller chunks to avoid production server limits
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {chunkInfo.chunks.map((chunk: any, index: number) => (
          <Button
            key={chunk.index}
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => downloadChunk(chunk.index, chunk.startChapter, chunk.endChapter)}
            data-testid={`button-download-chunk-${chunk.index}-${audiobook.id}`}
          >
            Part {chunk.index + 1}: Ch. {chunk.startChapter}-{chunk.endChapter} ({chunk.fileCount} files)
          </Button>
        ))}
      </div>
      
      <div className="text-xs text-blue-600 mt-2">
        💡 Each part is ~700MB-800MB and should download reliably in production
      </div>
    </div>
  );
}