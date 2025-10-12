import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Download, 
  Trash2, 
  Calendar, 
  FileIcon,
  HardDrive,
  BookOpen,
  Wand2,
  TrendingUp,
  Book,
  Layers
} from 'lucide-react';
import { ManuscriptFormattingWizard } from './manuscript-formatting-wizard';
import { ChapterRevisionTool } from './chapter-revision-tool';
import { NarrativeArcVisualization } from './narrative-arc-visualization';
import { formatDistanceToNow } from 'date-fns';

interface Manuscript {
  id: string;
  title: string;
  originalWordCount: number;
  cleanedWordCount: number;
  fileSize: number;
  createdAt: string | null;
  updatedAt: string | null;
}

interface Novel {
  id: string;
  title: string;
  status: string;
  chapters: any[];
  target_chapter_count?: number;
  targetChapterCount?: number;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
  genre?: string;
}

export function ManuscriptLibrary() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formattingManuscript, setFormattingManuscript] = useState<Manuscript | null>(null);
  const [revisionNovel, setRevisionNovel] = useState<Novel | null>(null);
  const [narrativeVisualizationNovel, setNarrativeVisualizationNovel] = useState<Novel | null>(null);
  const [convertingManuscript, setConvertingManuscript] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'novels' | 'manuscripts'>('all');

  const { data: manuscripts = [], isLoading: manuscriptsLoading } = useQuery<Manuscript[]>({
    queryKey: ['/api/manuscripts'],
    retry: false,
  });

  const { data: novels = [], isLoading: novelsLoading } = useQuery<Novel[]>({
    queryKey: ['/api/novels'],
    retry: false,
  });

  const deleteManuscriptMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/manuscripts/${id}`, "DELETE"),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Manuscript deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/manuscripts'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteNovelMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/novels/${id}`, "DELETE"),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Novel deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/novels'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const convertToNovelMutation = useMutation({
    mutationFn: async (manuscriptId: string) => {
      setConvertingManuscript(manuscriptId);
      return await apiRequest(`/api/manuscripts/${manuscriptId}/convert-to-novel`, "POST");
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/novels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/manuscripts'] });
      setConvertingManuscript(null);
      toast({
        title: "Conversion Complete",
        description: `Manuscript converted to novel successfully.`,
      });
    },
    onError: (error) => {
      setConvertingManuscript(null);
      toast({
        title: "Conversion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDownload = async (manuscript: Manuscript, format: 'docx' | 'txt' | 'md') => {
    try {
      const response = await fetch(`/api/manuscripts/${manuscript.id}/download?format=${format}`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${manuscript.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: `Downloaded ${manuscript.title} as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download manuscript",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getWordCountChange = (original: number, cleaned: number) => {
    const change = cleaned - original;
    const changeText = change > 0 ? `+${change}` : change.toString();
    const changeClass = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600';
    return { changeText, changeClass };
  };

  const isLoading = manuscriptsLoading || novelsLoading;
  const totalItems = manuscripts.length + novels.length;

  const filteredItems = (() => {
    switch (viewMode) {
      case 'novels': return novels.map((n: Novel) => ({ ...n, type: 'novel' as const }));
      case 'manuscripts': return manuscripts.map((m: Manuscript) => ({ ...m, type: 'manuscript' as const }));
      default: return [
        ...novels.map((n: Novel) => ({ ...n, type: 'novel' as const })),
        ...manuscripts.map((m: Manuscript) => ({ ...m, type: 'manuscript' as const }))
      ].sort((a: any, b: any) => {
        const aDate = a.updated_at || a.updatedAt || a.created_at || a.createdAt;
        const bDate = b.updated_at || b.updatedAt || b.created_at || b.createdAt;
        
        if (!aDate || !bDate) return 0;
        
        const aTime = new Date(aDate).getTime();
        const bTime = new Date(bDate).getTime();
        
        if (isNaN(aTime) || isNaN(bTime)) return 0;
        
        return bTime - aTime;
      });
    }
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="library-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading library...</span>
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="text-center py-12" data-testid="library-empty">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No items yet</h3>
        <p className="text-gray-600">
          Generate novels or upload manuscripts to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="unified-library">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Library</h2>
          <p className="text-gray-600">Your novels and manuscripts with download and management options</p>
        </div>
        <div className="flex items-center gap-4">
          {/* View Mode Filter */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('all')}
              data-testid="filter-all"
            >
              All ({totalItems})
            </Button>
            <Button
              variant={viewMode === 'novels' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('novels')}
              data-testid="filter-novels"
            >
              Novels ({novels.length})
            </Button>
            <Button
              variant={viewMode === 'manuscripts' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('manuscripts')}
              data-testid="filter-manuscripts"
            >
              Manuscripts ({manuscripts.length})
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item: (Novel & { type: 'novel' }) | (Manuscript & { type: 'manuscript' })) => {
          // Handle different item types
          if (item.type === 'novel') {
            // Novel card
            return (
              <Card key={item.id} className="hover:shadow-lg transition-shadow" data-testid={`novel-${item.id}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start justify-between">
                    <span className="text-lg font-semibold text-gray-900 line-clamp-2" title={item.title}>
                      {item.title}
                    </span>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">Novel</Badge>
                      <Wand2 className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Novel Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-gray-600">Status</p>
                      <p className="font-semibold capitalize" data-testid="novel-status">{item.status}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-gray-600">Chapters</p>
                      <p className="font-semibold" data-testid="novel-chapters">
                        {item.chapters?.length || 0} / {item.targetChapterCount || item.target_chapter_count || 0}
                      </p>
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span data-testid="novel-created-at" title={(item.createdAt || item.created_at) ? new Date(item.createdAt || item.created_at!).toLocaleString() : 'No date'}>
                          {(item.createdAt || item.created_at) ? formatDistanceToNow(new Date(item.createdAt || item.created_at!), { addSuffix: true }) : 'No date'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Novel Action Buttons */}
                  <div className="space-y-3 pt-4 border-t">
                    {/* First Row of Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-1 flex-wrap">
                        {(item.status === 'completed' || item.status === 'batch_completed') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/novels/${item.id}/download?format=docx&preset=kdp`);
                                if (!response.ok) throw new Error('Download failed');
                                
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${item.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}.docx`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                                
                                toast({
                                  title: "Success",
                                  description: `Downloaded ${item.title} as DOCX`,
                                });
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to download novel",
                                  variant: "destructive",
                                });
                              }
                            }}
                            data-testid="download-novel-docx"
                            className="text-xs px-2"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            DOCX
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/library?novel=${item.id}`, '_blank')}
                          data-testid="view-novel"
                          className="text-xs px-2"
                        >
                          <BookOpen className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteNovelMutation.mutate(item.id)}
                        disabled={deleteNovelMutation.isPending}
                        data-testid="delete-novel"
                        className="text-xs px-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* Second Row of Buttons */}
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRevisionNovel(item)}
                        disabled={!item.chapters || item.chapters.length === 0}
                        data-testid="revise-chapters"
                        className="text-xs px-2 flex-1"
                      >
                        <Wand2 className="h-3 w-3 mr-1" />
                        Revise
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setNarrativeVisualizationNovel(item)}
                        disabled={!item.chapters || item.chapters.length === 0}
                        data-testid="analyze-narrative"
                        className="text-xs px-2 flex-1"
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Analyze
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          } else {
            // Manuscript card (existing logic)
            const { changeText, changeClass } = getWordCountChange(
              item.originalWordCount, 
              item.cleanedWordCount
            );

            return (
              <Card key={item.id} className="hover:shadow-lg transition-shadow" data-testid={`manuscript-${item.id}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start justify-between">
                    <span className="text-lg font-semibold text-gray-900 line-clamp-2" title={item.title}>
                      {item.title}
                    </span>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">Manuscript</Badge>
                      <BookOpen className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </CardTitle>
                </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Word Count Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-gray-600">Original</p>
                      <p className="font-semibold" data-testid="original-word-count">{item.originalWordCount.toLocaleString()} words</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-gray-600">Cleaned</p>
                      <p className="font-semibold" data-testid="cleaned-word-count">
                        {item.cleanedWordCount.toLocaleString()} words
                        <span className={`ml-2 text-xs ${changeClass}`} data-testid="word-count-change">
                          ({changeText})
                        </span>
                      </p>
                    </div>
                </div>

                {/* File Info */}
                <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <HardDrive className="h-4 w-4 mr-1" />
                      <span data-testid="file-size">{formatFileSize(item.fileSize)}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span data-testid="created-at" title={item.createdAt ? new Date(item.createdAt).toLocaleString() : 'No date'}>
                        {item.createdAt ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : 'No date'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(item, 'txt')}
                        data-testid="download-txt"
                      >
                        <FileIcon className="h-4 w-4 mr-1" />
                        TXT
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(item, 'md')}
                        data-testid="download-md"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        MD
                      </Button>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteManuscriptMutation.mutate(item.id)}
                      disabled={deleteManuscriptMutation.isPending}
                      data-testid="delete-manuscript"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Convert to Novel Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mb-2"
                    onClick={() => convertToNovelMutation.mutate(item.id)}
                    disabled={convertToNovelMutation.isPending || convertingManuscript === item.id}
                    data-testid="convert-to-novel"
                  >
                    {convertingManuscript === item.id ? (
                      <>
                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Converting...
                      </>
                    ) : (
                      <>
                        <Book className="h-4 w-4 mr-2" />
                        Convert to Novel
                      </>
                    )}
                  </Button>
                  
                  {/* Formatting Wizard Button */}
                  <Button
                    size="sm"
                    variant="default"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    onClick={() => setFormattingManuscript(item)}
                    data-testid="format-wizard"
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Professional Formatting Wizard
                  </Button>
                </div>
              </CardContent>
            </Card>
            );
          }
        })}
      </div>

      {/* Formatting Wizard Dialog */}
      <Dialog open={!!formattingManuscript} onOpenChange={() => setFormattingManuscript(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="formatting-wizard-description">
          <DialogHeader>
            <DialogTitle>Professional Manuscript Formatting</DialogTitle>
            <div id="formatting-wizard-description" className="sr-only">
              Format your manuscript with professional presets for different publishing platforms including Amazon KDP, traditional publishing, and web publication.
            </div>
          </DialogHeader>
          {formattingManuscript && (
            <ManuscriptFormattingWizard
              manuscriptId={formattingManuscript.id}
              manuscriptTitle={formattingManuscript.title}
              wordCount={formattingManuscript.cleanedWordCount}
              onClose={() => setFormattingManuscript(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Chapter Revision Tool Dialog */}
      <Dialog open={!!revisionNovel} onOpenChange={() => setRevisionNovel(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" aria-describedby="chapter-revision-description">
          <DialogHeader>
            <DialogTitle>AI Chapter Revision Tool</DialogTitle>
            <div id="chapter-revision-description" className="sr-only">
              Use AI to revise and improve specific chapters in your novel. Select chapters, choose revision types, and compare original vs revised text before applying changes.
            </div>
          </DialogHeader>
          {revisionNovel && (
            <ChapterRevisionTool
              novelId={revisionNovel.id}
              onClose={() => setRevisionNovel(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Narrative Arc Visualization Dialog */}
      <Dialog open={!!narrativeVisualizationNovel} onOpenChange={() => setNarrativeVisualizationNovel(null)}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto" aria-describedby="narrative-visualization-description">
          <DialogHeader>
            <DialogTitle>Narrative Arc Visualization</DialogTitle>
            <div id="narrative-visualization-description" className="sr-only">
              Interactive visualization of your story's emotional journey, character arcs, pacing analysis, and narrative structure with detailed charts and insights.
            </div>
          </DialogHeader>
          {narrativeVisualizationNovel && (
            <NarrativeArcVisualization
              novelId={narrativeVisualizationNovel.id}
              onClose={() => setNarrativeVisualizationNovel(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}