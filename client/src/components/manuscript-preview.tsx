import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Eye, BookOpen, ChevronLeft, ChevronRight, Maximize2, Download } from "lucide-react";
import type { Novel } from "@shared/schema";

interface ManuscriptPreviewProps {
  novel: Novel;
  onClose?: () => void;
}

export default function ManuscriptPreview({ novel, onClose }: ManuscriptPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalPages = Math.ceil((novel.targetWordCount || 0) / 250);
  const chaptersPerPage = 2;
  const outline = novel.outline as any;
  const chapters = outline?.chapters || [];
  const totalChapterPages = Math.ceil(chapters.length / chaptersPerPage);

  const getCurrentPageContent = () => {
    if (!chapters.length) return [];
    
    const startIdx = (currentPage - 1) * chaptersPerPage;
    const endIdx = Math.min(startIdx + chaptersPerPage, chapters.length);
    
    return chapters.slice(startIdx, endIdx);
  };

  return (
    <Card className={`${isFullscreen ? 'fixed inset-4 z-50' : ''} border-blue-200 bg-blue-50`}>
      <CardHeader className="border-b border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Eye className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-blue-900">Manuscript Preview</CardTitle>
              <p className="text-sm text-blue-700">{novel.title}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-blue-200 text-blue-800">
              Page {currentPage} of {totalChapterPages}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="border-blue-300"
              data-testid="button-toggle-fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="border-blue-300"
                data-testid="button-close-preview"
              >
                ×
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex">
          {/* Navigation Sidebar */}
          <div className="w-64 bg-white border-r border-blue-200 p-4">
            <h4 className="font-medium text-blue-900 mb-3">Table of Contents</h4>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {chapters.map((chapter: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(Math.floor(index / chaptersPerPage) + 1)}
                    className={`w-full text-left p-2 rounded text-sm transition-colors ${
                      Math.floor(index / chaptersPerPage) + 1 === currentPage
                        ? 'bg-blue-100 text-blue-900 font-medium'
                        : 'hover:bg-blue-50 text-blue-700'
                    }`}
                    data-testid={`nav-chapter-${index + 1}`}
                  >
                    <div className="font-medium">Chapter {index + 1}</div>
                    <div className="text-xs opacity-75 truncate">{chapter.title}</div>
                  </button>
                ))}
              </div>
            </ScrollArea>

            <Separator className="my-4" />

            <div className="space-y-2 text-sm text-blue-600">
              <div className="flex justify-between">
                <span>Total Words:</span>
                <span className="font-medium">{novel.targetWordCount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Chapters:</span>
                <span className="font-medium">{novel.targetChapterCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Est. Pages:</span>
                <span className="font-medium">{totalPages}</span>
              </div>
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1">
            <ScrollArea className={`${isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-96'} p-6`}>
              <div className="max-w-3xl mx-auto bg-white shadow-sm border border-blue-200 rounded-lg p-8">
                {/* Document Header */}
                <div className="text-center mb-8 border-b border-blue-200 pb-6">
                  <h1 className="text-3xl font-bold text-blue-900 mb-2">{novel.title}</h1>
                  <p className="text-blue-600">A {novel.genre} Novel</p>
                  <div className="mt-4 text-sm text-blue-500">
                    {novel.targetWordCount?.toLocaleString()} words • {novel.targetChapterCount} chapters
                  </div>
                </div>

                {/* Chapter Content */}
                <div className="space-y-8">
                  {getCurrentPageContent().map((chapter: any, index: number) => {
                    const chapterNumber = (currentPage - 1) * chaptersPerPage + index + 1;
                    return (
                      <div key={chapterNumber} className="space-y-4">
                        <div className="text-center">
                          <h2 className="text-2xl font-bold text-blue-900 mb-2">
                            Chapter {chapterNumber}
                          </h2>
                          <h3 className="text-xl text-blue-700 mb-4">{chapter.title}</h3>
                        </div>
                        
                        <div className="prose prose-blue max-w-none">
                          <p className="text-gray-700 leading-relaxed text-justify">
                            {chapter.summary}
                          </p>
                          
                          <p className="text-gray-700 leading-relaxed text-justify mt-4">
                            This chapter develops the story further, introducing new elements and advancing the plot. 
                            The narrative unfolds with careful attention to character development and pacing, ensuring 
                            that readers remain engaged throughout the journey.
                          </p>
                          
                          <p className="text-gray-600 italic text-sm mt-6 p-4 bg-blue-50 rounded border-l-4 border-blue-300">
                            [Preview content - The full manuscript would contain approximately {novel.targetChapterLength} words 
                            of professionally written content for this chapter, maintaining the specified writing style, 
                            point of view, and tone throughout.]
                          </p>
                        </div>
                        
                        {index < getCurrentPageContent().length - 1 && (
                          <Separator className="my-8" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>

            {/* Preview Controls */}
            <div className="border-t border-blue-200 p-4 bg-white">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  className="border-blue-300"
                  data-testid="button-previous-page"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <div className="flex items-center space-x-4">
                  <span className="text-sm text-blue-600">
                    Page {currentPage} of {totalChapterPages}
                  </span>
                  <Button
                    variant="outline"
                    className="border-blue-300 text-blue-700"
                    data-testid="button-export-from-preview"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalChapterPages, currentPage + 1))}
                  disabled={currentPage >= totalChapterPages}
                  className="border-blue-300"
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}