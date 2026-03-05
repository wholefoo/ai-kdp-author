import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Download, Search, Calendar, FileText, Eye, Trash2, Filter, Users, TrendingUp, Headphones, Upload, Plus, Zap, Video, Copy, Clock, Music, Mic, Monitor, ChevronRight } from "lucide-react";
import { Novel } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CharacterConsistencyAnalyzer } from "@/components/character-consistency-analyzer";
import { NarrativeArcVisualization } from "@/components/narrative-arc-visualization";
import { AudiobookGenerator } from "@/components/audiobook-generator";

function useIsAdmin() {
  const { data } = useQuery<any>({ queryKey: ['/api/subscription/status'] });
  return data?.isAdmin === true;
}

export default function Library() {
  const isAdmin = useIsAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const [showDownload, setShowDownload] = useState(false);
  const [showCharacterConsistency, setShowCharacterConsistency] = useState(false);
  const [showNarrativeAnalysis, setShowNarrativeAnalysis] = useState(false);
  const [showAudiobookGenerator, setShowAudiobookGenerator] = useState(false);
  const [analysisNovelId, setAnalysisNovelId] = useState<string | null>(null);
  const [audiobookNovelId, setAudiobookNovelId] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showVideoScript, setShowVideoScript] = useState(false);
  const [videoScriptNovel, setVideoScriptNovel] = useState<Novel | null>(null);
  const [videoScript, setVideoScript] = useState<any | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: novels = [], isLoading } = useQuery<Novel[]>({
    queryKey: ["/api/novels"],
  });

  // Real-time polling for generating novels
  useEffect(() => {
    const generatingNovels = novels.filter(n => n.status.includes("generating"));
    if (generatingNovels.length === 0) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/novels"] });
    }, 2000); // Refresh every 2 seconds during generation

    return () => clearInterval(interval);
  }, [novels, queryClient]);

  const deleteNovelMutation = useMutation({
    mutationFn: async (novelId: string) => {
      return apiRequest(`/api/novels/${novelId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Novel Deleted",
        description: "The novel has been removed from your library.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/novels"] });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the novel. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadDocxMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      setUploadProgress(0);
      
      const formData = new FormData();
      formData.append('docx', file);
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      try {
        const result = await apiRequest("/api/novels/upload-docx", "POST", formData);
        setUploadProgress(100);
        clearInterval(progressInterval);
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Upload Successful",
        description: `"${data.novel.title}" has been added to your library.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/novels"] });
      setShowUploadDialog(false);
      setIsUploading(false);
      setUploadProgress(0);
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload the DOCX file. Please try again.",
        variant: "destructive",
      });
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a DOCX file.",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 50MB.",
        variant: "destructive",
      });
      return;
    }
    
    uploadDocxMutation.mutate(file);
  };

  const filteredNovels = novels.filter(novel => {
    const matchesSearch = novel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         novel.genre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || novel.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "batch_completed": return "bg-green-100 text-green-800";
      case "generating_chapters": case "generating_chapters_batch": return "bg-blue-100 text-blue-800";
      case "outline_generated": return "bg-yellow-100 text-yellow-800";
      case "error": case "quota_exceeded": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "Complete";
      case "generating_chapters": return "Generating";
      case "generating_chapters_batch": return "Batch Generation";
      case "outline_generated": return "Outline Ready";
      case "quota_exceeded": return "Quota Exceeded";
      case "batch_completed": return "Batch Complete";
      case "error": return "Error";
      default: return status;
    }
  };

  const handleDownload = (novel: Novel, format?: 'md' | 'docx', preset?: 'kdp' | 'manuscript' | 'ebook' | 'createspace') => {
    if (novel.status !== "completed" && novel.status !== "batch_completed") {
      toast({
        title: "Download Unavailable",
        description: "Novel must be completed before downloading.",
        variant: "destructive",
      });
      return;
    }

    const params = new URLSearchParams();
    if (format) params.append('format', format);
    if (preset) params.append('preset', preset);
    
    const url = `/api/novels/${novel.id}/download?${params.toString()}`;
    window.open(url, '_blank');
    
    setShowDownload(false);
    toast({
      title: "Download Started",
      description: `Downloading ${novel.title} as ${format?.toUpperCase() || 'MD'}`,
    });
  };

  const generateVideoScript = async (novel: Novel) => {
    setVideoScriptNovel(novel);
    setVideoScript(null);
    setShowVideoScript(true);
    setIsGeneratingScript(true);
    try {
      const result = await apiRequest(`/api/novels/${novel.id}/video-script`, "POST");
      setVideoScript(result.script);
    } catch (err: any) {
      toast({
        title: "Script Generation Failed",
        description: err.message || "Failed to generate video script. Please try again.",
        variant: "destructive",
      });
      setShowVideoScript(false);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const copyScriptToClipboard = () => {
    if (!videoScript) return;
    const lines: string[] = [
      `BOOK TRAILER SCRIPT: ${videoScript.title}`,
      `Total Duration: ${videoScript.totalDuration}`,
      `Tone: ${videoScript.tone}`,
      `Music Direction: ${videoScript.musicDirection}`,
      `Voiceover Style: ${videoScript.voiceoverStyle}`,
      "",
      "--- SCENES ---",
      "",
    ];
    videoScript.scenes?.forEach((scene: any) => {
      lines.push(`SCENE ${scene.sceneNumber} — ${scene.type} [${scene.duration}]`);
      lines.push(`VISUAL: ${scene.visualDescription}`);
      lines.push(`VOICEOVER: ${scene.voiceover}`);
      lines.push(`ON-SCREEN TEXT: ${scene.onScreenText}`);
      lines.push(`SOUND: ${scene.soundDirection}`);
      lines.push("");
    });
    if (videoScript.callToAction) {
      lines.push("--- CALL TO ACTION ---");
      lines.push(`VISUAL: ${videoScript.callToAction.visualDescription}`);
      lines.push(`ON-SCREEN TEXT: ${videoScript.callToAction.onScreenText}`);
      lines.push(`DURATION: ${videoScript.callToAction.duration}`);
      lines.push("");
    }
    if (videoScript.productionNotes) {
      lines.push("--- PRODUCTION NOTES ---");
      lines.push(videoScript.productionNotes);
    }
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      toast({ title: "Copied!", description: "Script copied to clipboard." });
    });
  };

  const uniqueStatuses = Array.from(new Set(novels.map(n => n.status)));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading your manuscript library...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Manuscript Library</h1>
              <p className="text-slate-600">Manage and access all your generated novels</p>
            </div>
            
            {/* Upload Button */}
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="button-upload-docx">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload DOCX
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload DOCX Manuscript</DialogTitle>
                  <DialogDescription>
                    Upload an existing DOCX manuscript to add it to your library.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {isUploading ? (
                    <div className="space-y-3">
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 text-blue-600 animate-pulse" />
                        <p className="mt-2 text-sm text-gray-600">Processing your manuscript...</p>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                      <p className="text-xs text-center text-gray-500">{uploadProgress}% complete</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".docx"
                        onChange={handleFileUpload}
                        className="hidden"
                        data-testid="input-file-upload"
                      />
                      
                      <div 
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                          Click to select a DOCX file or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Maximum file size: 50MB
                        </p>
                      </div>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>• Only DOCX files are supported</p>
                        <p>• The file will be processed to extract chapters and content</p>
                        <p>• Large files may take a few minutes to process</p>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search novels by title or genre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-novels"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md bg-white text-slate-700"
              data-testid="select-status-filter"
            >
              <option value="all">All Status</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{getStatusText(status)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Library Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Novels</p>
                  <p className="text-2xl font-bold text-slate-900">{novels.length}</p>
                </div>
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {novels.filter(n => n.status === "completed").length}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {novels.filter(n => n.status.includes("generating")).length}
                  </p>
                </div>
                <Eye className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Words</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {novels.reduce((sum, n) => sum + (n.wordCount || 0), 0).toLocaleString()}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Novels Grid */}
        {filteredNovels.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-600 mb-2">
              {searchTerm || statusFilter !== "all" ? "No novels match your filters" : "No novels in library"}
            </h3>
            <p className="text-slate-500">
              {searchTerm || statusFilter !== "all" 
                ? "Try adjusting your search or filter criteria" 
                : "Start creating your first novel to see it here"
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNovels.map((novel) => (
              <Card key={novel.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-slate-900 mb-1" data-testid={`text-novel-title-${novel.id}`}>
                        {novel.title}
                      </CardTitle>
                      <CardDescription className="text-slate-600">{novel.genre}</CardDescription>
                    </div>
                    <Badge className={`ml-2 ${getStatusColor(novel.status)}`} data-testid={`badge-status-${novel.id}`}>
                      {getStatusText(novel.status)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    {/* Progress Bar for Generating Novels */}
                    {(novel.status.includes("generating") || novel.status === "batch_completed") && (
                      <div className="space-y-2 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="h-3 w-3 text-blue-600 animate-pulse" />
                          <span className="text-xs font-medium text-blue-900">Generating in progress...</span>
                        </div>
                        
                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                          <span>Overall Progress</span>
                          <span className="font-semibold">{typeof (novel.progress as any)?.overall === 'number' ? (novel.progress as any).overall : 0}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                            style={{ width: `${typeof (novel.progress as any)?.overall === 'number' ? (novel.progress as any).overall : 0}%` }}
                          ></div>
                        </div>
                        
                        {/* Step Details */}
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                          <div>
                            <p className="text-slate-500">Outline</p>
                            <p className="font-medium text-slate-700">{typeof (novel.progress as any)?.step1 === 'number' ? (novel.progress as any).step1 : 0}%</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Chapters</p>
                            <p className="font-medium text-slate-700">{typeof (novel.progress as any)?.step2 === 'number' ? (novel.progress as any).step2 : 0}%</p>
                          </div>
                        </div>

                        {typeof (novel.progress as any)?.currentStatus === 'string' && (novel.progress as any).currentStatus && (
                          <p className="text-xs text-slate-600 italic mt-2">📝 {(novel.progress as any).currentStatus}</p>
                        )}
                        
                        {typeof (novel.progress as any)?.currentChapter === 'number' && (novel.progress as any).currentChapter && (
                          <p className="text-xs text-slate-600">
                            Chapter {(novel.progress as any).currentChapter} of {typeof (novel.progress as any)?.totalChapters === 'number' ? (novel.progress as any).totalChapters : novel.targetChapterCount}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Novel Stats */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Chapters</p>
                        <p className="font-medium" data-testid={`text-chapters-${novel.id}`}>
                          {novel.actualChapterCount || (Array.isArray(novel.chapters) ? novel.chapters.filter(ch => ch?.trim()).length : 0)}
                          {novel.targetChapterCount ? ` / ${novel.targetChapterCount}` : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Words</p>
                        <p className="font-medium" data-testid={`text-words-${novel.id}`}>
                          {novel.wordCount ? novel.wordCount.toLocaleString() : '0'}
                        </p>
                      </div>
                    </div>

                    {/* Plot Preview */}
                    {novel.plotIdea && (
                      <div>
                        <p className="text-slate-500 text-sm mb-1">Plot</p>
                        <ScrollArea className="h-16">
                          <p className="text-xs text-slate-700" data-testid={`text-plot-${novel.id}`}>
                            {novel.plotIdea}
                          </p>
                        </ScrollArea>
                      </div>
                    )}

                    {/* Creation Date */}
                    <div className="flex items-center text-xs text-slate-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {novel.createdAt ? new Date(novel.createdAt).toLocaleDateString() : 'Unknown'}
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <div className="flex gap-1 flex-wrap">
                        {(novel.status === "completed" || novel.status === "batch_completed") && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedNovel(novel);
                              setShowDownload(true);
                            }}
                            className="min-w-0 flex-shrink-0"
                            data-testid={`button-download-${novel.id}`}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedNovel(novel);
                            setShowDownload(true);
                          }}
                          className="min-w-0 flex-shrink-0"
                          data-testid={`button-view-${novel.id}`}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteNovelMutation.mutate(novel.id)}
                          disabled={deleteNovelMutation.isPending}
                          className="min-w-0 flex-shrink-0"
                          data-testid={`button-delete-${novel.id}`}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>

                      {/* Analysis tools */}
                      {(novel.status === "completed" || novel.status === "batch_completed") && (
                        <div className="space-y-2 mt-2 border-t pt-2">
                          <div className="flex gap-1 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                console.log('Analyze clicked for novel:', novel.id);
                                setAnalysisNovelId(novel.id);
                                setShowNarrativeAnalysis(true);
                              }}
                              className="min-w-0 flex-shrink-0"
                              data-testid={`button-narrative-analysis-${novel.id}`}
                            >
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Analyze
                            </Button>
                          
                            {isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAudiobookNovelId(novel.id);
                                setShowAudiobookGenerator(true);
                              }}
                              className="min-w-0 flex-shrink-0"
                              data-testid={`button-audiobook-${novel.id}`}
                            >
                              <Headphones className="h-3 w-3 mr-1" />
                              Audiobook
                            </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                              console.log('Characters clicked for novel:', novel.id);
                              setAnalysisNovelId(novel.id);
                              setShowCharacterConsistency(true);
                            }}
                            className="min-w-0 flex-shrink-0"
                            data-testid={`button-character-consistency-${novel.id}`}
                          >
                            <Users className="h-3 w-3 mr-1" />
                            Characters
                          </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateVideoScript(novel)}
                              className="min-w-0 flex-shrink-0"
                              data-testid={`button-video-script-${novel.id}`}
                            >
                              <Video className="h-3 w-3 mr-1" />
                              Trailer Script
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Analysis Modals */}
      {showCharacterConsistency && analysisNovelId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <CharacterConsistencyAnalyzer 
              novelId={analysisNovelId}
              onClose={() => {
                setShowCharacterConsistency(false);
                setAnalysisNovelId(null);
              }}
            />
          </div>
        </div>
      )}

      {showNarrativeAnalysis && analysisNovelId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <NarrativeArcVisualization 
              novelId={analysisNovelId}
              onClose={() => {
                setShowNarrativeAnalysis(false);
                setAnalysisNovelId(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Download Modal */}
      {showDownload && selectedNovel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Download {selectedNovel.title}</h3>
            <div className="space-y-3">
              <Button 
                onClick={() => handleDownload(selectedNovel, 'docx', 'kdp')}
                className="w-full"
              >
                Download DOCX (KDP Ready)
              </Button>
              <Button 
                onClick={() => handleDownload(selectedNovel, 'docx', 'manuscript')}
                variant="outline"
                className="w-full"
              >
                Download DOCX (Manuscript)
              </Button>
              <Button 
                onClick={() => handleDownload(selectedNovel, 'md')}
                variant="outline"
                className="w-full"
              >
                Download Markdown
              </Button>
              <Button 
                onClick={() => setShowDownload(false)}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Audiobook Generator Modal */}
      {showAudiobookGenerator && audiobookNovelId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <AudiobookGenerator 
                novelId={audiobookNovelId}
                novelTitle={novels.find(n => n.id === audiobookNovelId)?.title || 'Unknown Novel'}
                onClose={() => {
                  setShowAudiobookGenerator(false);
                  setAudiobookNovelId(null);
                }}
              />
              <div className="mt-6 flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAudiobookGenerator(false);
                    setAudiobookNovelId(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Video Trailer Script Modal */}
      {showVideoScript && videoScriptNovel && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Video className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Book Trailer Script</h2>
                  <p className="text-sm text-slate-500">{videoScriptNovel.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {videoScript && (
                  <Button size="sm" variant="outline" onClick={copyScriptToClipboard}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Script
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowVideoScript(false);
                    setVideoScriptNovel(null);
                    setVideoScript(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Modal Body */}
            <ScrollArea className="flex-1 p-6">
              {isGeneratingScript ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-14 w-14 border-4 border-purple-200 border-t-purple-600"></div>
                    <Video className="absolute inset-0 m-auto h-5 w-5 text-purple-600" />
                  </div>
                  <p className="text-slate-700 font-medium">Writing your trailer script...</p>
                  <p className="text-sm text-slate-500 text-center max-w-xs">
                    GPT-5.2 is crafting a cinematic scene-by-scene script based on your manuscript.
                  </p>
                </div>
              ) : videoScript ? (
                <div className="space-y-6">
                  {/* Overview Bar */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                      <div className="flex items-center gap-1.5 text-xs text-purple-600 font-medium mb-1">
                        <Clock className="h-3 w-3" /> Duration
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{videoScript.totalDuration}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium mb-1">
                        <Monitor className="h-3 w-3" /> Tone
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{videoScript.tone}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                      <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium mb-1">
                        <Music className="h-3 w-3" /> Music
                      </div>
                      <p className="text-sm font-semibold text-slate-800 line-clamp-2">{videoScript.musicDirection}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                      <div className="flex items-center gap-1.5 text-xs text-orange-600 font-medium mb-1">
                        <Mic className="h-3 w-3" /> Narrator
                      </div>
                      <p className="text-sm font-semibold text-slate-800 line-clamp-2">{videoScript.voiceoverStyle}</p>
                    </div>
                  </div>

                  {/* Script Title */}
                  {videoScript.title && videoScript.title !== videoScriptNovel.title && (
                    <div className="text-center py-2">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Trailer Title</p>
                      <h3 className="text-2xl font-bold text-slate-900 italic">"{videoScript.title}"</h3>
                    </div>
                  )}

                  {/* Scenes */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Scenes</h4>
                    <div className="space-y-3">
                      {videoScript.scenes?.map((scene: any) => (
                        <div key={scene.sceneNumber} className="border border-slate-200 rounded-lg overflow-hidden">
                          {/* Scene header */}
                          <div className="flex items-center justify-between bg-slate-50 px-4 py-2 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                                {scene.sceneNumber}
                              </span>
                              <span className="font-semibold text-slate-800 text-sm">{scene.type}</span>
                            </div>
                            <span className="text-xs text-slate-500 font-mono">{scene.duration}</span>
                          </div>
                          {/* Scene content */}
                          <div className="p-4 space-y-3">
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                <Monitor className="h-3 w-3" /> VISUAL
                              </p>
                              <p className="text-sm text-slate-700">{scene.visualDescription}</p>
                            </div>
                            {scene.voiceover && scene.voiceover !== "NO VOICEOVER" && (
                              <div className="bg-slate-50 rounded p-3">
                                <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                  <Mic className="h-3 w-3" /> VOICEOVER
                                </p>
                                <p className="text-sm text-slate-800 italic">"{scene.voiceover}"</p>
                              </div>
                            )}
                            {scene.onScreenText && scene.onScreenText !== "NONE" && (
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-1">ON-SCREEN TEXT</p>
                                <p className="text-sm font-semibold text-purple-700">{scene.onScreenText}</p>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Music className="h-3 w-3" />
                              <span>{scene.soundDirection}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Call to Action */}
                  {videoScript.callToAction && (
                    <div className="border-2 border-purple-300 rounded-lg bg-purple-50 overflow-hidden">
                      <div className="bg-purple-600 text-white px-4 py-2 flex items-center gap-2">
                        <ChevronRight className="h-4 w-4" />
                        <span className="font-semibold text-sm">Call to Action — {videoScript.callToAction.duration}</span>
                      </div>
                      <div className="p-4 space-y-2">
                        <p className="text-sm text-slate-700">{videoScript.callToAction.visualDescription}</p>
                        <p className="text-lg font-bold text-purple-800">{videoScript.callToAction.onScreenText}</p>
                      </div>
                    </div>
                  )}

                  {/* Production Notes */}
                  {videoScript.productionNotes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-amber-800 mb-2">Production Notes</h4>
                      <p className="text-sm text-amber-900">{videoScript.productionNotes}</p>
                    </div>
                  )}
                </div>
              ) : null}
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}