import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import AdvancedSettings from "./advanced-settings";
import type { NovelGenerationRequest } from "@shared/schema";

interface NovelGeneratorProps {
  onStartGeneration: (request: NovelGenerationRequest) => void;
  isGenerating: boolean;
}

export default function NovelGenerator({ onStartGeneration, isGenerating }: NovelGeneratorProps) {
  const [formData, setFormData] = useState<NovelGenerationRequest>({
    genre: "Fantasy",
    title: "",
    plotIdea: "",
    targetWordCount: 65000,
    targetChapterCount: 25,
    targetChapterLength: 2600,
    writingStyle: "balanced",
    pointOfView: "third-person-limited",
    toneAndMood: "adventurous",
    contentRating: "pg-13",
    customInstructions: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartGeneration(formData);
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Step Progress Indicator */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <span className="font-medium text-slate-900">Input Parameters</span>
            </div>
            <div className="w-16 h-0.5 bg-slate-300"></div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-slate-300 text-slate-600 rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <span className="text-slate-600">Generate Outline</span>
            </div>
            <div className="w-16 h-0.5 bg-slate-300"></div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-slate-300 text-slate-600 rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <span className="text-slate-600">Generate Chapters</span>
            </div>
            <div className="w-16 h-0.5 bg-slate-300"></div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-slate-300 text-slate-600 rounded-full flex items-center justify-center text-sm font-medium">
                4
              </div>
              <span className="text-slate-600">Complete</span>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Novel Parameters</h2>
          <p className="text-slate-600">Enter your novel details below. Leave fields empty to use intelligent defaults.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* API Key Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
              <div>
                <h3 className="text-sm font-medium text-blue-900">API Configuration</h3>
                <p className="text-sm text-blue-700 mt-1">OpenAI API integration is configured server-side for security. No API key input required.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Genre Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Genre</label>
              <Select value={formData.genre} onValueChange={(value) => setFormData({...formData, genre: value})}>
                <SelectTrigger data-testid="select-genre">
                  <SelectValue placeholder="Select genre or use default (Fantasy)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fantasy">Fantasy</SelectItem>
                  <SelectItem value="Science Fiction">Science Fiction</SelectItem>
                  <SelectItem value="Romance">Romance</SelectItem>
                  <SelectItem value="Mystery">Mystery</SelectItem>
                  <SelectItem value="Thriller">Thriller</SelectItem>
                  <SelectItem value="Horror">Horror</SelectItem>
                  <SelectItem value="Historical Fiction">Historical Fiction</SelectItem>
                  <SelectItem value="Contemporary Fiction">Contemporary Fiction</SelectItem>
                  <SelectItem value="Young Adult">Young Adult</SelectItem>
                  <SelectItem value="Adventure">Adventure</SelectItem>
                </SelectContent>
              </Select>

            </div>

            {/* Title Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Novel Title</label>
              <Input
                type="text"
                placeholder="Enter your novel title..."
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                data-testid="input-title"
              />

            </div>
          </div>

          {/* Plot Idea Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Plot Idea</label>
            <Textarea
              rows={4}
              placeholder="Describe your basic plot idea..."
              value={formData.plotIdea}
              onChange={(e) => setFormData({...formData, plotIdea: e.target.value})}
              className="resize-none"
              data-testid="textarea-plot-idea"
            />

          </div>

          {/* Writing Style & Customization */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900">Writing Style & Customization</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Writing Style */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Writing Style</label>
                <Select value={formData.writingStyle} onValueChange={(value) => setFormData({...formData, writingStyle: value as any})}>
                  <SelectTrigger data-testid="select-writing-style">
                    <SelectValue placeholder="Select writing style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balanced">Balanced - Equal mix of narrative, dialogue, and description</SelectItem>
                    <SelectItem value="narrative">Narrative - Focus on storytelling and action</SelectItem>
                    <SelectItem value="descriptive">Descriptive - Rich details and atmospheric writing</SelectItem>
                    <SelectItem value="dialogue-heavy">Dialogue-Heavy - Character conversations drive the story</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Point of View */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Point of View</label>
                <Select value={formData.pointOfView} onValueChange={(value) => setFormData({...formData, pointOfView: value as any})}>
                  <SelectTrigger data-testid="select-point-of-view">
                    <SelectValue placeholder="Select point of view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first-person">First Person - "I" perspective, intimate and personal</SelectItem>
                    <SelectItem value="third-person-limited">Third Person Limited - "He/She", single character focus</SelectItem>
                    <SelectItem value="third-person-omniscient">Third Person Omniscient - "He/She", multiple perspectives</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tone and Mood */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Tone & Mood</label>
                <Select value={formData.toneAndMood} onValueChange={(value) => setFormData({...formData, toneAndMood: value as any})}>
                  <SelectTrigger data-testid="select-tone-mood">
                    <SelectValue placeholder="Select tone and mood" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adventurous">Adventurous - Exciting and thrilling</SelectItem>
                    <SelectItem value="dark">Dark - Serious and intense</SelectItem>
                    <SelectItem value="light">Light - Upbeat and optimistic</SelectItem>
                    <SelectItem value="humorous">Humorous - Funny and entertaining</SelectItem>
                    <SelectItem value="serious">Serious - Thoughtful and dramatic</SelectItem>
                    <SelectItem value="romantic">Romantic - Emotional and heartfelt</SelectItem>
                    <SelectItem value="mysterious">Mysterious - Suspenseful and enigmatic</SelectItem>
                    <SelectItem value="epic">Epic - Grand and heroic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Content Rating */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Content Rating</label>
                <Select value={formData.contentRating} onValueChange={(value) => setFormData({...formData, contentRating: value as any})}>
                  <SelectTrigger data-testid="select-content-rating">
                    <SelectValue placeholder="Select content rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">G - General Audiences (All ages)</SelectItem>
                    <SelectItem value="pg">PG - Parental Guidance (Some material may not be suitable for children)</SelectItem>
                    <SelectItem value="pg-13">PG-13 - Parents Strongly Cautioned (Inappropriate for children under 13)</SelectItem>
                    <SelectItem value="r">R - Restricted (Adult themes and content)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Instructions */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Custom Instructions (Optional)</label>
              <Textarea
                rows={3}
                placeholder="Add any specific requirements, themes, or writing instructions for your novel..."
                value={formData.customInstructions || ""}
                onChange={(e) => setFormData({...formData, customInstructions: e.target.value})}
                className="resize-none"
                data-testid="textarea-custom-instructions"
              />
              <p className="text-xs text-slate-500">Examples: "Include strong female characters", "Focus on environmental themes", "Avoid graphic violence"</p>
            </div>
          </div>

          {/* Manuscript Specifications */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900">Manuscript Specifications</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Target Word Count */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Target Word Count</label>
                <Input
                  type="number"
                  min="30000"
                  max="120000"
                  step="1000"
                  value={formData.targetWordCount}
                  onChange={(e) => setFormData({...formData, targetWordCount: parseInt(e.target.value) || 65000})}
                  data-testid="input-target-word-count"
                />
                <p className="text-xs text-slate-500">Range: 30,000 - 120,000 words</p>
              </div>

              {/* Chapter Count */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Number of Chapters</label>
                <Input
                  type="number"
                  min="10"
                  max="50"
                  value={formData.targetChapterCount}
                  onChange={(e) => setFormData({...formData, targetChapterCount: parseInt(e.target.value) || 25})}
                  data-testid="input-chapter-count"
                />
                <p className="text-xs text-slate-500">Range: 10 - 50 chapters</p>
              </div>

              {/* Chapter Length */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Words per Chapter</label>
                <Input
                  type="number"
                  min="1500"
                  max="5000"
                  step="100"
                  value={formData.targetChapterLength}
                  onChange={(e) => setFormData({...formData, targetChapterLength: parseInt(e.target.value) || 2600})}
                  data-testid="input-chapter-length"
                />
                <p className="text-xs text-slate-500">Range: 1,500 - 5,000 words</p>
              </div>
            </div>

            {/* Real-time Calculations */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <i className="fas fa-calculator text-blue-500 mt-0.5"></i>
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Calculated Specifications</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                    <div>
                      <span className="text-blue-700">Estimated Pages:</span>
                      <div className="font-medium text-blue-900">{Math.round(formData.targetWordCount / 250)}</div>
                    </div>
                    <div>
                      <span className="text-blue-700">Reading Time:</span>
                      <div className="font-medium text-blue-900">{Math.round((formData.targetWordCount / 250) / 60 * 10) / 10}h</div>
                    </div>
                    <div>
                      <span className="text-blue-700">Avg. Chapter:</span>
                      <div className="font-medium text-blue-900">{Math.round(formData.targetWordCount / formData.targetChapterCount)} words</div>
                    </div>
                    <div>
                      <span className="text-blue-700">Format:</span>
                      <div className="font-medium text-blue-900">KDP Ready</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <i className="fas fa-exclamation-triangle text-amber-500 mt-0.5"></i>
                <div>
                  <h4 className="text-sm font-medium text-amber-900">Strict Compliance Mode</h4>
                  <p className="text-sm text-amber-700 mt-1">The AI will strictly adhere to these specifications. Each chapter will be approximately {formData.targetChapterLength} words, and the total manuscript will target exactly {formData.targetWordCount.toLocaleString()} words across {formData.targetChapterCount} chapters.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <AdvancedSettings />

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="text-sm text-slate-600">
              <i className="fas fa-clock mr-1"></i>
              Estimated time: {Math.round(formData.targetChapterCount * 2)} - {Math.round(formData.targetChapterCount * 3)} minutes
            </div>
            <Button 
              type="submit" 
              disabled={isGenerating}
              className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-start-generation"
            >
              <i className="fas fa-magic mr-2"></i>
              Start Novel Generation
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
