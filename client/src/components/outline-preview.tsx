import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Novel, Outline } from "@shared/schema";

interface OutlinePreviewProps {
  novel: Novel;
  onProceedToChapters: () => void;
  onEdit: () => void;
}

export default function OutlinePreview({ novel, onProceedToChapters, onEdit }: OutlinePreviewProps) {
  const outline = novel.outline as Outline;

  if (!outline) {
    return (
      <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
        <CardContent className="p-6">
          <p className="text-slate-600">No outline available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Generated Outline</h2>
            <p className="text-slate-600 mt-1">Review your story structure before chapter generation</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="ghost"
              onClick={onEdit}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm transition-colors"
              data-testid="button-edit-outline"
            >
              <i className="fas fa-edit mr-2"></i>
              Edit Outline
            </Button>
            <Button 
              onClick={onProceedToChapters}
              className="px-4 py-2 bg-primary text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition-colors"
              data-testid="button-proceed-chapters"
            >
              <i className="fas fa-arrow-right mr-2"></i>
              Proceed to Chapters
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        <ScrollArea className="max-h-96 pr-4">
          <div className="space-y-6">
          {/* Story Overview */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Story Overview</h3>
            <div className="text-slate-700 space-y-2">
              <p><strong>Title:</strong> <span data-testid="text-outline-title">{outline.title}</span></p>
              <p><strong>Genre:</strong> <span data-testid="text-outline-genre">{outline.genre}</span></p>
              <p><strong>Target Length:</strong> <span data-testid="text-outline-length">{outline.length}</span></p>
            </div>
          </div>

          {/* Plot Summary */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Plot Summary</h3>
            <p className="text-slate-700" data-testid="text-outline-summary">{outline.summary}</p>
          </div>

          {/* Main Characters */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Main Characters</h3>
            <div className="space-y-3">
              {outline.characters.map((character, index) => (
                <div key={index} className="bg-slate-50 rounded-lg p-3" data-testid={`card-character-${index}`}>
                  <h4 className="font-medium text-slate-900">{character.name}</h4>
                  <p className="text-sm text-slate-600 mt-1">{character.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chapter Breakdown */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Chapter Breakdown</h3>
            <div className="space-y-2">
              {outline.chapters.slice(0, 3).map((chapter, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg" data-testid={`card-chapter-${index}`}>
                  <span className="text-sm font-medium text-slate-600 mt-0.5">Ch. {chapter.number}</span>
                  <div>
                    <h4 className="font-medium text-slate-900">{chapter.title}</h4>
                    <p className="text-sm text-slate-600 mt-1">{chapter.summary}</p>
                  </div>
                </div>
              ))}
              {outline.chapters.length > 3 && (
                <div className="flex items-center justify-center py-4">
                  <span className="text-slate-400 text-sm">... and {outline.chapters.length - 3} more chapters</span>
                </div>
              )}
            </div>
          </div>

          {/* Themes */}
          {outline.themes && outline.themes.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Themes</h3>
              <div className="flex flex-wrap gap-2">
                {outline.themes.map((theme, index) => (
                  <span key={index} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
