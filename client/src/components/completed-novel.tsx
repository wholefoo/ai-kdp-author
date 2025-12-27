import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NovelDownloadOptions } from "./novel-download-options";
import type { Novel } from "@shared/schema";

interface CompletedNovelProps {
  novel: Novel;
  onDownload: (format?: 'md' | 'docx', preset?: 'kdp' | 'manuscript' | 'ebook' | 'createspace') => void;
  onGenerateAnother: () => void;
}

export default function CompletedNovel({ novel, onDownload, onGenerateAnother }: CompletedNovelProps) {
  const wordCount = novel.wordCount || 0;
  const chapterCount = novel.actualChapterCount || 0;
  const estimatedPages = Math.round(wordCount / 250);
  const readingTime = Math.round((wordCount / 250) / 60 * 10) / 10;

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-accent to-primary px-6 py-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Book Generation Complete!</h2>
            <p className="mt-2 opacity-90">Your book is ready for download and publishing</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold" data-testid="text-word-count">{wordCount.toLocaleString()}</div>
            <div className="text-sm opacity-90">words</div>
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        {/* Novel Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-900" data-testid="text-chapter-count">{chapterCount}</div>
            <div className="text-sm text-slate-600">Chapters</div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-900" data-testid="text-page-count">{estimatedPages}</div>
            <div className="text-sm text-slate-600">Pages (est.)</div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-900" data-testid="text-reading-time">{readingTime}</div>
            <div className="text-sm text-slate-600">Hours read time</div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-accent">KDP</div>
            <div className="text-sm text-slate-600">Ready</div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="mb-6">
          <h3 className="font-semibold text-slate-900 mb-3">Book Preview</h3>
          <ScrollArea className="bg-slate-50 rounded-lg p-4 max-h-64">
            <div className="font-mono text-sm text-slate-700">
              <h1 className="text-xl font-bold mb-4" data-testid="text-preview-title">{novel.title}</h1>
              
              {novel.manuscriptContent && (
                <div className="whitespace-pre-wrap" data-testid="text-preview-content">
                  {novel.manuscriptContent.slice(0, 1000)}...
                  <div className="text-center py-4 text-slate-500 italic">
                    ... continues for {wordCount.toLocaleString()} words ...
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Download Options */}
        <div className="space-y-4">
          <NovelDownloadOptions 
            onDownload={onDownload}
            isDownloading={false}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center mt-6 pt-6 border-t border-slate-200">
          <Button 
            onClick={onGenerateAnother}
            variant="outline"
            size="lg"
            data-testid="button-generate-another"
          >
            <i className="fas fa-plus mr-2"></i>
            Generate Another Book
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
