import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Play, Square, Volume2, Loader2 } from 'lucide-react';

interface Voice {
  voice: string;
  name: string;
  description: string;
  gender: string;
  recommended: boolean;
  characteristics: string[];
  bestFor: string;
  provider: 'deepgram' | 'openai' | 'gemini';
}

interface SampleText {
  id: string;
  name: string;
  text: string;
  genre: string;
}

interface VoicePreviewSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  selectedSpeed: number;
  onSpeedChange: (speed: number) => void;
}

export function VoicePreviewSelector({
  selectedVoice,
  onVoiceChange,
  selectedSpeed,
  onSpeedChange
}: VoicePreviewSelectorProps) {
  const [selectedSampleText, setSelectedSampleText] = useState('general');
  const [customText, setCustomText] = useState('');
  const [useCustomText, setUseCustomText] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch available voices
  const { data: voicesData } = useQuery({
    queryKey: ['/api/audiobook/voices'],
    queryFn: () => apiRequest('/api/audiobook/voices', 'GET'),
  });

  // Fetch sample texts
  const { data: sampleTextsData } = useQuery({
    queryKey: ['/api/audiobook/sample-texts'],
    queryFn: () => apiRequest('/api/audiobook/sample-texts', 'GET'),
  });

  const voices: Voice[] = voicesData?.voices || [];
  const sampleTexts: SampleText[] = sampleTextsData?.sampleTexts || [];

  const getCurrentText = () => {
    if (useCustomText && customText.trim()) {
      return customText;
    }
    const selectedSample = sampleTexts.find(s => s.id === selectedSampleText);
    return selectedSample?.text || '';
  };

  const handlePlayPreview = async (voiceId: string) => {
    if (currentlyPlaying === voiceId) {
      // Stop current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setCurrentlyPlaying(null);
      return;
    }

    const text = getCurrentText();
    if (!text) {
      return;
    }

    setIsGeneratingPreview(true);
    setCurrentlyPlaying(voiceId);

    try {
      const response = await fetch('/api/audiobook/voice-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice: voiceId,
          sampleText: text,
          speed: selectedSpeed
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate voice preview');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.pause();
      }

      audioRef.current = new Audio(audioUrl);
      
      audioRef.current.onended = () => {
        setCurrentlyPlaying(null);
        URL.revokeObjectURL(audioUrl);
      };

      audioRef.current.onerror = () => {
        setCurrentlyPlaying(null);
        URL.revokeObjectURL(audioUrl);
      };

      await audioRef.current.play();
      
    } catch (error) {
      console.error('Failed to play preview:', error);
      setCurrentlyPlaying(null);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleStopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setCurrentlyPlaying(null);
  };

  return (
    <div className="space-y-6">
      {/* Voice Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Voice</h3>
        <RadioGroup value={selectedVoice} onValueChange={onVoiceChange}>
          <div className="grid gap-4 md:grid-cols-2">
            {voices.map((voice) => (
              <Card 
                key={voice.voice} 
                className={`cursor-pointer transition-all ${
                  selectedVoice === voice.voice 
                    ? 'ring-2 ring-blue-500 border-blue-500' 
                    : 'hover:border-gray-300'
                }`}
                onClick={() => onVoiceChange(voice.voice)}
                data-testid={`voice-card-${voice.voice}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={voice.voice} id={voice.voice} />
                      <div>
                        <Label htmlFor={voice.voice} className="text-base font-medium cursor-pointer">
                          {voice.name}
                          {voice.recommended && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Recommended
                            </Badge>
                          )}
                        </Label>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {voice.gender}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {voice.provider === 'deepgram' ? '🎧 Deepgram' : voice.provider === 'openai' ? '🎤 OpenAI' : '✨ Gemini'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayPreview(voice.voice);
                      }}
                      disabled={isGeneratingPreview && currentlyPlaying === voice.voice}
                      data-testid={`voice-preview-${voice.voice}`}
                    >
                      {isGeneratingPreview && currentlyPlaying === voice.voice ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : currentlyPlaying === voice.voice ? (
                        <Square className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="mb-3">
                    {voice.description}
                  </CardDescription>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {voice.characteristics.map((char) => (
                      <Badge key={char} variant="outline" className="text-xs">
                        {char}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <strong>Best for:</strong> {voice.bestFor}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </RadioGroup>
      </div>

      {/* Speed Control */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Speaking Speed</h3>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Speed: {selectedSpeed}%</Label>
                <Volume2 className="h-4 w-4" />
              </div>
              <Slider
                value={[selectedSpeed]}
                onValueChange={(value) => onSpeedChange(value[0])}
                min={25}
                max={200}
                step={5}
                className="w-full"
                data-testid="speed-slider"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Slower (25%)</span>
                <span>Normal (100%)</span>
                <span>Faster (200%)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sample Text Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Preview Text</h3>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="preset-text"
                  name="text-type"
                  checked={!useCustomText}
                  onChange={() => setUseCustomText(false)}
                  className="h-4 w-4"
                />
                <Label htmlFor="preset-text">Use sample text</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="custom-text"
                  name="text-type"
                  checked={useCustomText}
                  onChange={() => setUseCustomText(true)}
                  className="h-4 w-4"
                />
                <Label htmlFor="custom-text">Custom text</Label>
              </div>
            </div>

            {!useCustomText ? (
              <div>
                <Label htmlFor="sample-select">Choose sample text:</Label>
                <Select value={selectedSampleText} onValueChange={setSelectedSampleText}>
                  <SelectTrigger id="sample-select" data-testid="sample-text-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sampleTexts.map((sample) => (
                      <SelectItem key={sample.id} value={sample.id}>
                        {sample.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                  {getCurrentText()}
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="custom-textarea">Enter your text:</Label>
                <Textarea
                  id="custom-textarea"
                  placeholder="Enter text to preview with different voices..."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  rows={4}
                  maxLength={500}
                  data-testid="custom-text-input"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {customText.length}/500 characters
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Global Controls */}
      {currentlyPlaying && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleStopPreview}
            data-testid="stop-preview"
          >
            <Square className="h-4 w-4 mr-2" />
            Stop Preview
          </Button>
        </div>
      )}
    </div>
  );
}