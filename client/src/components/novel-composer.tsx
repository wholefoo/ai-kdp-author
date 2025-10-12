import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Plus, X, Sparkles, BookOpen, FileUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GenerationProgress from './generation-progress';
import type { Novel } from '@shared/schema';

interface ContentSection {
  id: string;
  type: 'chapter' | 'introduction' | 'outline' | 'characters' | 'notes';
  title: string;
  content: string;
}

interface NovelComposerProps {
  onNovelGenerated?: (novel: any) => void;
}

export function NovelComposer({ onNovelGenerated }: NovelComposerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'create' | 'extend' | 'special'>('create');
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [targetWordCount, setTargetWordCount] = useState('60000');
  const [targetChapters, setTargetChapters] = useState('25');
  
  // Extension tab states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [manuscriptContent, setManuscriptContent] = useState('');
  const [additionalChapters, setAdditionalChapters] = useState('5');
  const [chapterWordCount, setChapterWordCount] = useState('2500');
  const [manuscriptAnalysis, setManuscriptAnalysis] = useState<any>(null);
  const [extendingNovelId, setExtendingNovelId] = useState<string | null>(null);

  // Poll for updates to the extending novel
  const { data: extendingNovel } = useQuery<Novel>({
    queryKey: ["/api/novels", extendingNovelId],
    refetchInterval: 2000,
    enabled: !!extendingNovelId,
  });

  // Function to cancel manuscript extension
  const cancelExtension = () => {
    setExtendingNovelId(null);
    toast({
      title: "Extension Cancelled",
      description: "Manuscript extension progress hidden. The extension may still be processing in the background.",
    });
  };

  // Watch for completion of manuscript extension
  useEffect(() => {
    if (extendingNovel && (extendingNovel.status === 'completed' || extendingNovel.status === 'generated')) {
      // Extension completed successfully
      toast({
        title: "Manuscript Extended!",
        description: "Your manuscript has been extended and saved to the library.",
      });
      
      // Call the completion callback
      onNovelGenerated?.(extendingNovel);
      
      // Clear the extending state
      setExtendingNovelId(null);
    } else if (extendingNovel && extendingNovel.status === 'failed') {
      // Extension failed
      toast({
        title: "Extension Failed",
        description: extendingNovel.error || "The manuscript extension encountered an error.",
        variant: "destructive",
      });
      
      // Clear the extending state
      setExtendingNovelId(null);
    }
  }, [extendingNovel?.status, extendingNovel, onNovelGenerated]);
  
  // Special sections state
  const [specialSourceType, setSpecialSourceType] = useState<'upload' | 'plot'>('plot');
  const [specialManuscriptContent, setSpecialManuscriptContent] = useState('');
  const [specialManuscriptFile, setSpecialManuscriptFile] = useState<File | null>(null);
  const [plotDescription, setPlotDescription] = useState('');
  const [specialTitle, setSpecialTitle] = useState('');
  const [specialGenre, setSpecialGenre] = useState('');
  const [selectedSections, setSelectedSections] = useState<('introduction' | 'prologue' | 'epilogue' | 'sample-dedication' | 'sample-acknowledgments' | '10-book-titles' | 'kdp-metadata' | 'table-of-contents' | 'about-the-author')[]>(['prologue']);
  const [generatedSections, setGeneratedSections] = useState<{
    introduction?: string;
    prologue?: string;
    epilogue?: string;
    'sample-dedication'?: string;
    'sample-acknowledgments'?: string;
    '10-book-titles'?: string;
    'kdp-metadata'?: string;
    'table-of-contents'?: string;
    'about-the-author'?: string;
  }>({});

  const generateNovelMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      genre: string;
      targetWordCount: number;
      targetChapters: number;
      chapterWordCount: number;
      sections: ContentSection[];
    }) => {
      return apiRequest('/api/novel/compose', 'POST', data);
    },
    onSuccess: async (response) => {
      const novel = response.novel;
      toast({
        title: "Success",
        description: "Novel outline created! Starting chapter generation...",
      });
      
      // Trigger chapter generation
      try {
        const generateResponse = await apiRequest(`/api/novel/${novel.id}/generate-chapters`, 'POST');
        toast({
          title: "Novel Complete!",
          description: "Your novel has been generated and saved to the library.",
        });
        onNovelGenerated?.(generateResponse.novel);
      } catch (error) {
        toast({
          title: "Generation Error",
          description: "Failed to generate chapters. Check the main generator for details.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadManuscriptMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('manuscript', file);
      return apiRequest('/api/manuscript/analyze-for-extension', 'POST', formData);
    },
    onSuccess: (data) => {
      setManuscriptContent(data.content);
      setManuscriptAnalysis(data.analysis);
      setTitle(data.analysis.suggestedTitle || '');
      setGenre(data.analysis.detectedGenre || '');
      toast({
        title: "Manuscript Uploaded",
        description: "Your manuscript has been analyzed and is ready for extension.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload manuscript.",
        variant: "destructive",
      });
    },
  });

  const extendManuscriptMutation = useMutation({
    mutationFn: async (data: {
      manuscriptContent: string;
      title: string;
      genre: string;
      additionalChapters: number;
      targetWordCount: number;
      chapterWordCount: number;
    }) => {
      return apiRequest('/api/manuscript/extend', 'POST', data);
    },
    onSuccess: async (response) => {
      const novel = response.novel;
      
      // Set the extending novel ID to start polling and show progress UI
      setExtendingNovelId(novel.id);
      
      toast({
        title: "Success",
        description: "Extension outline created! Starting chapter generation...",
      });
      
      // Trigger chapter generation and let the progress UI handle the rest
      try {
        await apiRequest(`/api/novel/${novel.id}/generate-chapters`, 'POST');
      } catch (error) {
        toast({
          title: "Extension Error", 
          description: "Failed to start chapter generation.",
          variant: "destructive",
        });
        setExtendingNovelId(null); // Clear the extending novel on error
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateSpecialSectionsMutation = useMutation({
    mutationFn: async (data: {
      sourceContent: string;
      type: 'upload' | 'plot';
      title: string;
      genre: string;
      sections: ('introduction' | 'prologue' | 'epilogue' | 'sample-dedication' | 'sample-acknowledgments' | '10-book-titles' | 'kdp-metadata' | 'table-of-contents' | 'about-the-author')[];
      file?: File;
    }) => {
      // If we have a file for upload type, use FormData
      if (data.type === 'upload' && data.file) {
        const formData = new FormData();
        formData.append('manuscript', data.file);
        formData.append('sourceContent', data.sourceContent);
        formData.append('type', data.type);
        formData.append('title', data.title);
        formData.append('genre', data.genre);
        formData.append('sections', JSON.stringify(data.sections));
        return apiRequest('/api/novel/generate-special-sections', 'POST', formData);
      } else {
        // Otherwise use regular JSON
        return apiRequest('/api/novel/generate-special-sections', 'POST', {
          sourceContent: data.sourceContent,
          type: data.type,
          title: data.title,
          genre: data.genre,
          sections: data.sections
        });
      }
    },
    onSuccess: (response) => {
      setGeneratedSections(response.sections);
      toast({
        title: "Success",
        description: "Special sections generated successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate special sections",
        variant: "destructive",
      });
    },
  });

  const addSection = (type: ContentSection['type']) => {
    const newSection: ContentSection = {
      id: `section-${Date.now()}`,
      type,
      title: getDefaultTitle(type),
      content: ''
    };
    setSections([...sections, newSection]);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(section => section.id !== id));
  };

  const updateSection = (id: string, updates: Partial<ContentSection>) => {
    setSections(sections.map(section => 
      section.id === id ? { ...section, ...updates } : section
    ));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, sectionId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      updateSection(sectionId, { content: text });
      toast({
        title: "Success",
        description: `File "${file.name}" uploaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to read file",
        variant: "destructive",
      });
    }
  };

  const handleManuscriptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      toast({
        title: "Invalid File",
        description: "Please upload a DOCX file.",
        variant: "destructive",
      });
      return;
    }

    console.log('Uploading manuscript file:', file.name, file.size);
    setUploadedFile(file);
    uploadManuscriptMutation.mutate(file);
  };

  const handleSpecialManuscriptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      toast({
        title: "Invalid File",
        description: "Please upload a DOCX file.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Uploading special manuscript file:', file.name, file.size);
      const formData = new FormData();
      formData.append('manuscript', file);
      const response = await apiRequest('/api/manuscript/analyze-for-extension', 'POST', formData);
      setSpecialManuscriptContent(response.content);
      setSpecialManuscriptFile(file); // Store the file for later use
      toast({
        title: "Manuscript Uploaded",
        description: "Your manuscript has been analyzed and is ready for special section generation.",
      });
    } catch (error) {
      console.error('Special manuscript upload error:', error);
      toast({
        title: "Upload Failed",
        description: `Failed to upload manuscript: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const getDefaultTitle = (type: ContentSection['type']): string => {
    switch (type) {
      case 'chapter': return 'Chapter Draft';
      case 'introduction': return 'Introduction';
      case 'outline': return 'Story Outline';
      case 'characters': return 'Character List';
      case 'notes': return 'Story Notes';
      default: return 'Content';
    }
  };

  const getSectionIcon = (type: ContentSection['type']) => {
    return <FileText className="h-4 w-4" />;
  };

  const getSectionColor = (type: ContentSection['type']): string => {
    switch (type) {
      case 'chapter': return 'bg-blue-100 text-blue-800';
      case 'introduction': return 'bg-green-100 text-green-800';
      case 'outline': return 'bg-purple-100 text-purple-800';
      case 'characters': return 'bg-orange-100 text-orange-800';
      case 'notes': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canGenerate = activeTab === 'create' 
    ? title && genre && sections.length > 0 && sections.some(s => s.content.trim())
    : title && genre && manuscriptContent && additionalChapters;

  const handleGenerate = () => {
    if (activeTab === 'create') {
      generateNovelMutation.mutate({
        title,
        genre,
        targetWordCount: parseInt(targetWordCount),
        targetChapters: parseInt(targetChapters),
        chapterWordCount: parseInt(chapterWordCount),
        sections,
      });
    } else {
      extendManuscriptMutation.mutate({
        manuscriptContent,
        title,
        genre,
        additionalChapters: parseInt(additionalChapters),
        targetWordCount: parseInt(additionalChapters) * parseInt(chapterWordCount),
        chapterWordCount: parseInt(chapterWordCount),
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6" data-testid="novel-composer">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Novel Composer</h1>
        <p className="text-gray-600">
          Create new novels from source material or extend existing manuscripts
        </p>
      </div>

      {/* Show progress UI when extending manuscript */}
      {extendingNovel && (
        <GenerationProgress 
          novel={extendingNovel} 
          onCancel={cancelExtension}
        />
      )}

      {/* Show tabs only when not extending */}
      {!extendingNovel && (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'create' | 'extend' | 'special')} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create" className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4" />
            <span>Create New Novel</span>
          </TabsTrigger>
          <TabsTrigger value="extend" className="flex items-center space-x-2">
            <FileUp className="h-4 w-4" />
            <span>Extend Manuscript</span>
          </TabsTrigger>
          <TabsTrigger value="special" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>Special Sections</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          {/* Novel Configuration */}
          <Card>
        <CardHeader>
          <CardTitle>Novel Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="novel-title">Novel Title</Label>
              <Input
                id="novel-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your novel title"
                data-testid="input-novel-title"
              />
            </div>
            <div>
              <Label htmlFor="novel-genre">Genre</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger data-testid="select-genre">
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fantasy">Fantasy</SelectItem>
                  <SelectItem value="science-fiction">Science Fiction</SelectItem>
                  <SelectItem value="romance">Romance</SelectItem>
                  <SelectItem value="mystery">Mystery</SelectItem>
                  <SelectItem value="thriller">Thriller</SelectItem>
                  <SelectItem value="historical-fiction">Historical Fiction</SelectItem>
                  <SelectItem value="literary-fiction">Literary Fiction</SelectItem>
                  <SelectItem value="young-adult">Young Adult</SelectItem>
                  <SelectItem value="horror">Horror</SelectItem>
                  <SelectItem value="contemporary">Contemporary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="target-words">Target Word Count</Label>
              <Select value={targetWordCount} onValueChange={setTargetWordCount}>
                <SelectTrigger data-testid="select-word-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30000">30,000 words (Novella)</SelectItem>
                  <SelectItem value="50000">50,000 words (Short Novel)</SelectItem>
                  <SelectItem value="60000">60,000 words (Standard)</SelectItem>
                  <SelectItem value="80000">80,000 words (Full Novel)</SelectItem>
                  <SelectItem value="100000">100,000 words (Epic)</SelectItem>
                  <SelectItem value="120000">120,000 words (Extended)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="target-chapters">Target Chapters</Label>
              <Select value={targetChapters} onValueChange={setTargetChapters}>
                <SelectTrigger data-testid="select-chapter-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 chapters</SelectItem>
                  <SelectItem value="15">15 chapters</SelectItem>
                  <SelectItem value="20">20 chapters</SelectItem>
                  <SelectItem value="25">25 chapters</SelectItem>
                  <SelectItem value="30">30 chapters</SelectItem>
                  <SelectItem value="35">35 chapters</SelectItem>
                  <SelectItem value="40">40 chapters</SelectItem>
                  <SelectItem value="50">50 chapters</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="chapter-word-count-create">Words per Chapter</Label>
              <Select value={chapterWordCount} onValueChange={setChapterWordCount}>
                <SelectTrigger data-testid="select-chapter-word-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1500">1,500 words</SelectItem>
                  <SelectItem value="2000">2,000 words</SelectItem>
                  <SelectItem value="2500">2,500 words</SelectItem>
                  <SelectItem value="3000">3,000 words</SelectItem>
                  <SelectItem value="3500">3,500 words</SelectItem>
                  <SelectItem value="4000">4,000 words</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Sections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Source Content
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addSection('chapter')}
                data-testid="add-chapter"
              >
                <Plus className="h-4 w-4 mr-1" />
                Chapter
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addSection('introduction')}
                data-testid="add-introduction"
              >
                <Plus className="h-4 w-4 mr-1" />
                Introduction
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addSection('outline')}
                data-testid="add-outline"
              >
                <Plus className="h-4 w-4 mr-1" />
                Outline
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addSection('characters')}
                data-testid="add-characters"
              >
                <Plus className="h-4 w-4 mr-1" />
                Characters
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addSection('notes')}
                data-testid="add-notes"
              >
                <Plus className="h-4 w-4 mr-1" />
                Notes
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sections.length === 0 ? (
            <div className="text-center py-8 text-gray-500" data-testid="no-sections">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No content sections added yet. Click the buttons above to add content.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((section) => (
                <Card key={section.id} className="border-l-4 border-l-blue-500" data-testid={`section-${section.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getSectionIcon(section.type)}
                        <div>
                          <Input
                            value={section.title}
                            onChange={(e) => updateSection(section.id, { title: e.target.value })}
                            className="font-semibold border-none p-0 h-auto bg-transparent focus:ring-0"
                            data-testid={`section-title-${section.id}`}
                          />
                          <Badge className={getSectionColor(section.type)} data-testid={`section-type-${section.id}`}>
                            {section.type}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          accept=".txt,.md,.docx"
                          onChange={(e) => handleFileUpload(e, section.id)}
                          className="hidden"
                          id={`file-upload-${section.id}`}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => document.getElementById(`file-upload-${section.id}`)?.click()}
                          data-testid={`upload-file-${section.id}`}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeSection(section.id)}
                          data-testid={`remove-section-${section.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={section.content}
                      onChange={(e) => updateSection(section.id, { content: e.target.value })}
                      placeholder={`Enter your ${section.type} content here or upload a file...`}
                      rows={8}
                      data-testid={`section-content-${section.id}`}
                    />
                    <div className="mt-2 text-sm text-gray-500" data-testid={`section-word-count-${section.id}`}>
                      {section.content.split(/\s+/).filter(word => word.length > 0).length} words
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

          {/* Generation Controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Ready to Generate</h3>
                  <p className="text-sm text-gray-600">
                    {sections.length} section{sections.length !== 1 ? 's' : ''} added • 
                    Target: {parseInt(targetWordCount).toLocaleString()} words in {targetChapters} chapters
                  </p>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate || generateNovelMutation.isPending}
                  className="flex items-center space-x-2"
                  data-testid="generate-novel"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {generateNovelMutation.isPending ? 'Generating...' : 'Generate Novel'}
                  </span>
                </Button>
              </div>
              {!canGenerate && (
                <p className="text-sm text-red-600 mt-2">
                  Please provide a title, genre, and at least one content section to generate a novel.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="extend" className="space-y-6">
          {/* Manuscript Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Manuscript</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".docx"
                  onChange={handleManuscriptUpload}
                  className="hidden"
                  id="manuscript-upload"
                />
                <div 
                  className="cursor-pointer"
                  onClick={() => {
                    console.log('Manuscript upload button clicked');
                    const input = document.getElementById('manuscript-upload') as HTMLInputElement;
                    if (input) {
                      input.click();
                    } else {
                      console.error('Manuscript upload input not found');
                    }
                  }}
                >
                  <FileUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    {uploadedFile ? uploadedFile.name : 'Upload DOCX Manuscript'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Click to upload your existing manuscript (.docx format)
                  </p>
                </div>
              </div>
              
              {uploadManuscriptMutation.isPending && (
                <div className="text-center text-blue-600">
                  Analyzing manuscript...
                </div>
              )}

              {manuscriptAnalysis && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">Analysis Complete</h4>
                  <p className="text-sm text-green-700">
                    Current word count: {manuscriptAnalysis.wordCount?.toLocaleString()} words
                  </p>
                  <p className="text-sm text-green-700">
                    Detected chapters: {manuscriptAnalysis.chapterCount}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Extension Configuration */}
          {manuscriptContent && (
            <Card>
              <CardHeader>
                <CardTitle>Extension Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="extend-title">Novel Title</Label>
                    <Input
                      id="extend-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter your novel title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="extend-genre">Genre</Label>
                    <Select value={genre} onValueChange={setGenre}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select genre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fantasy">Fantasy</SelectItem>
                        <SelectItem value="science-fiction">Science Fiction</SelectItem>
                        <SelectItem value="romance">Romance</SelectItem>
                        <SelectItem value="mystery">Mystery</SelectItem>
                        <SelectItem value="thriller">Thriller</SelectItem>
                        <SelectItem value="historical-fiction">Historical Fiction</SelectItem>
                        <SelectItem value="literary-fiction">Literary Fiction</SelectItem>
                        <SelectItem value="young-adult">Young Adult</SelectItem>
                        <SelectItem value="horror">Horror</SelectItem>
                        <SelectItem value="contemporary">Contemporary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="additional-chapters">Additional Chapters</Label>
                    <Select value={additionalChapters} onValueChange={setAdditionalChapters}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 chapters</SelectItem>
                        <SelectItem value="5">5 chapters</SelectItem>
                        <SelectItem value="10">10 chapters</SelectItem>
                        <SelectItem value="15">15 chapters</SelectItem>
                        <SelectItem value="20">20 chapters</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="chapter-word-count">Words per Chapter</Label>
                    <Select value={chapterWordCount} onValueChange={setChapterWordCount}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1500">1,500 words</SelectItem>
                        <SelectItem value="2000">2,000 words</SelectItem>
                        <SelectItem value="2500">2,500 words</SelectItem>
                        <SelectItem value="3000">3,000 words</SelectItem>
                        <SelectItem value="3500">3,500 words</SelectItem>
                        <SelectItem value="4000">4,000 words</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Extension Controls */}
          {manuscriptContent && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Ready to Extend</h3>
                    <p className="text-sm text-gray-600">
                      Add {additionalChapters} chapters to your manuscript
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate || extendManuscriptMutation.isPending}
                    className="flex items-center space-x-2"
                    data-testid="extend-manuscript"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>
                      {extendManuscriptMutation.isPending ? 'Extending...' : 'Extend Manuscript'}
                    </span>
                  </Button>
                </div>
                {!canGenerate && manuscriptContent && (
                  <p className="text-sm text-red-600 mt-2">
                    Please provide a title and genre to extend your manuscript.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="special" className="space-y-6">
          {/* Source Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Source Material Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <Button
                  variant={specialSourceType === 'plot' ? 'default' : 'outline'}
                  onClick={() => setSpecialSourceType('plot')}
                  data-testid="source-plot"
                >
                  Plot Description
                </Button>
                <Button
                  variant={specialSourceType === 'upload' ? 'default' : 'outline'}
                  onClick={() => setSpecialSourceType('upload')}
                  data-testid="source-upload"
                >
                  Upload Manuscript
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Source Content Input */}
          <Card>
            <CardHeader>
              <CardTitle>
                {specialSourceType === 'plot' ? 'Plot Description' : 'Upload Manuscript'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {specialSourceType === 'plot' ? (
                <Textarea
                  placeholder="Enter your plot description, story summary, or existing content..."
                  value={plotDescription}
                  onChange={(e) => setPlotDescription(e.target.value)}
                  className="min-h-[200px]"
                  data-testid="plot-description"
                />
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Upload Your Manuscript</h3>
                      <p className="text-gray-600">Upload a DOCX file to generate special sections</p>
                      <input
                        type="file"
                        accept=".docx"
                        onChange={handleSpecialManuscriptUpload}
                        className="hidden"
                        id="special-manuscript-upload"
                        ref={(el) => {
                          if (el) {
                            (window as any).specialUploadInput = el;
                          }
                        }}
                      />
                      <Button 
                        variant="outline" 
                        className="cursor-pointer" 
                        data-testid="upload-special-manuscript"
                        onClick={() => {
                          console.log('Special manuscript upload button clicked');
                          const input = document.getElementById('special-manuscript-upload') as HTMLInputElement;
                          if (input) {
                            input.click();
                          } else {
                            console.error('File input not found');
                          }
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose DOCX File
                      </Button>
                    </div>
                  </div>
                  {specialManuscriptContent && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-green-800">
                        ✓ Manuscript uploaded successfully ({Math.floor(specialManuscriptContent.length / 5)} words)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="special-title">Title</Label>
                  <Input
                    id="special-title"
                    value={specialTitle}
                    onChange={(e) => setSpecialTitle(e.target.value)}
                    placeholder="Enter your story title"
                    data-testid="special-title"
                  />
                </div>
                <div>
                  <Label htmlFor="special-genre">Genre</Label>
                  <Select value={specialGenre} onValueChange={setSpecialGenre}>
                    <SelectTrigger data-testid="special-genre">
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fantasy">Fantasy</SelectItem>
                      <SelectItem value="science-fiction">Science Fiction</SelectItem>
                      <SelectItem value="romance">Romance</SelectItem>
                      <SelectItem value="mystery">Mystery</SelectItem>
                      <SelectItem value="thriller">Thriller</SelectItem>
                      <SelectItem value="historical-fiction">Historical Fiction</SelectItem>
                      <SelectItem value="literary-fiction">Literary Fiction</SelectItem>
                      <SelectItem value="young-adult">Young Adult</SelectItem>
                      <SelectItem value="horror">Horror</SelectItem>
                      <SelectItem value="contemporary">Contemporary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Sections to Generate</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {([
                    'introduction', 
                    'prologue', 
                    'epilogue',
                    'sample-dedication',
                    'sample-acknowledgments',
                    '10-book-titles',
                    'kdp-metadata',
                    'table-of-contents',
                    'about-the-author'
                  ] as const).map((section) => (
                    <div key={section} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={section}
                        checked={selectedSections.includes(section)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSections([...selectedSections, section]);
                          } else {
                            setSelectedSections(selectedSections.filter(s => s !== section));
                          }
                        }}
                        data-testid={`checkbox-${section}`}
                      />
                      <Label htmlFor={section} className="capitalize cursor-pointer text-sm">
                        {section.replace(/-/g, ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Generate Special Sections</h3>
                  <p className="text-sm text-gray-600">
                    Create {selectedSections.join(', ')} from your {specialSourceType === 'plot' ? 'plot description' : 'manuscript'}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    const sourceContent = specialSourceType === 'plot' ? plotDescription : specialManuscriptContent;
                    generateSpecialSectionsMutation.mutate({
                      sourceContent,
                      type: specialSourceType,
                      title: specialTitle,
                      genre: specialGenre,
                      sections: selectedSections,
                      file: specialSourceType === 'upload' ? specialManuscriptFile || undefined : undefined,
                    });
                  }}
                  disabled={
                    !specialTitle || 
                    !specialGenre || 
                    selectedSections.length === 0 ||
                    (specialSourceType === 'plot' ? !plotDescription.trim() : !specialManuscriptContent.trim()) ||
                    generateSpecialSectionsMutation.isPending
                  }
                  className="flex items-center space-x-2"
                  data-testid="generate-special-sections"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {generateSpecialSectionsMutation.isPending ? 'Generating...' : 'Generate Sections'}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Generated Sections Display */}
          {Object.keys(generatedSections).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Sections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedSections.map((sectionType) => {
                  const content = generatedSections[sectionType];
                  if (!content) return null;
                  
                  return (
                    <div key={sectionType} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium capitalize">{sectionType}</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(content);
                            toast({
                              title: "Copied!",
                              description: `${sectionType} copied to clipboard`,
                            });
                          }}
                          data-testid={`copy-${sectionType}`}
                        >
                          Copy
                        </Button>
                      </div>
                      <div className="prose max-w-none p-4 bg-gray-50 rounded-lg border">
                        <pre className="whitespace-pre-wrap font-sans text-sm">{content}</pre>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}