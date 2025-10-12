import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { 
  Upload, 
  FileText, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  RefreshCw,
  BarChart3,
  Wand2,
  Eye
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";

interface ManuscriptAnalysis {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  estimatedReadingTime: number;
  detectedGenre: string;
  detectedPOV: string;
  detectedTone: string;
  qualityIssues: string[];
  strengths: string[];
}

interface CleanupResult {
  originalText: string;
  cleanedText: string;
  wordCount: number;
  changes: Array<{
    type: "formatting" | "style" | "grammar" | "consistency" | "structure";
    description: string;
    before: string;
    after: string;
  }>;
  summary: {
    totalChanges: number;
    wordsAdded: number;
    wordsRemoved: number;
    improvementAreas: string[];
  };
}

interface ManuscriptCleanupOptions {
  genre?: string;
  writingStyle?: "narrative" | "descriptive" | "dialogue-heavy" | "balanced";
  pointOfView?: "first-person" | "third-person-limited" | "third-person-omniscient";
  toneAndMood?: "dark" | "light" | "humorous" | "serious" | "adventurous" | "romantic" | "mysterious" | "epic";
  contentRating?: "g" | "pg" | "pg-13" | "r";
  targetWordCount?: number;
  customInstructions?: string;
}

export default function ManuscriptUploader() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ManuscriptAnalysis | null>(null);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [activeTab, setActiveTab] = useState("upload");
  const [cleanupProgress, setCleanupProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<ManuscriptCleanupOptions>({
    defaultValues: {
      genre: "Fantasy",
      writingStyle: "balanced",
      pointOfView: "third-person-limited",
      toneAndMood: "adventurous",
      contentRating: "pg-13",
      targetWordCount: 65000,
      customInstructions: ""
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('manuscript', file);
      return apiRequest("/api/manuscript/upload", "POST", formData);
    },
    onSuccess: (data: any) => {
      setAnalysis(data.analysis);
      setActiveTab("analysis");
      toast({
        title: "Upload Successful",
        description: "Your manuscript has been analyzed successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error?.message || "Unable to process your manuscript. Please check the file format.",
        variant: "destructive",
      });
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: async (options: ManuscriptCleanupOptions) => {
      if (!uploadedFile) throw new Error("No file uploaded");
      
      setCleanupProgress(5);
      
      const formData = new FormData();
      formData.append('manuscript', uploadedFile);
      formData.append('options', JSON.stringify(options));
      
      setCleanupProgress(15);
      
      // Simulate more realistic progress during API call
      const progressInterval = setInterval(() => {
        setCleanupProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 2000);
      
      try {
        const result = await apiRequest("/api/manuscript/cleanup", "POST", formData);
        clearInterval(progressInterval);
        setCleanupProgress(100);
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (data: any) => {
      setCleanupResult(data);
      setActiveTab("results");
      setCleanupProgress(0);
      toast({
        title: "Cleanup Complete",
        description: `Made ${data.summary.totalChanges} improvements to your manuscript.`,
      });
    },
    onError: () => {
      setCleanupProgress(0);
      toast({
        title: "Cleanup Failed",
        description: "Unable to clean up your manuscript. Please try again.",
        variant: "destructive",
      });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (format: 'docx' | 'txt' | 'md') => {
      if (!cleanupResult) throw new Error("No cleaned manuscript available");
      
      const response = await fetch("/api/manuscript/download", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ 
          cleanedText: cleanupResult.cleanedText, 
          format 
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Download failed: ${errorText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `cleaned-manuscript.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Download Started",
        description: "Your cleaned manuscript is being downloaded.",
      });
    },
    onError: () => {
      toast({
        title: "Download Failed",
        description: "Unable to download the file. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        toast({
          title: "Invalid File Type",
          description: "Please upload a DOCX file.",
          variant: "destructive",
        });
        return;
      }
      
      setUploadedFile(file);
      uploadMutation.mutate(file);
    }
  };

  const handleCleanup = () => {
    const options = form.getValues();
    cleanupMutation.mutate(options);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Upload className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-xl">Manuscript Upload & Cleanup Tool</CardTitle>
          </div>
          <p className="text-gray-600">
            Upload your DOCX manuscript and have AI clean it up according to your novel parameters.
          </p>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload" data-testid="tab-upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="analysis" data-testid="tab-analysis">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="cleanup" data-testid="tab-cleanup">
            <Wand2 className="h-4 w-4 mr-2" />
            Cleanup
          </TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results">
            <Eye className="h-4 w-4 mr-2" />
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Your Manuscript</CardTitle>
              <p className="text-sm text-gray-600">
                Upload a DOCX file to analyze and clean up your manuscript.
              </p>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".docx"
                  className="hidden"
                  data-testid="file-input-manuscript"
                />
                
                {uploadedFile ? (
                  <div className="space-y-4">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">{uploadedFile.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(uploadedFile.size)}</p>
                    </div>
                    
                    {uploadMutation.isPending && (
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Analyzing manuscript...</span>
                      </div>
                    )}
                    
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      data-testid="button-change-file"
                    >
                      Change File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">Upload your manuscript</p>
                      <p className="text-sm text-gray-500">DOCX files only, up to 50MB</p>
                    </div>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadMutation.isPending}
                      data-testid="button-upload-file"
                    >
                      {uploadMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Choose File
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {analysis ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Manuscript Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-2xl font-bold text-blue-600">{analysis.wordCount.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Words</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-2xl font-bold text-green-600">{analysis.paragraphCount}</div>
                      <div className="text-sm text-gray-600">Paragraphs</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-2xl font-bold text-purple-600">{analysis.estimatedReadingTime}</div>
                      <div className="text-sm text-gray-600">Minutes to Read</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-2xl font-bold text-orange-600">{(analysis.characterCount / 1000).toFixed(1)}K</div>
                      <div className="text-sm text-gray-600">Characters</div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Detected Genre</h4>
                      <Badge variant="outline" className="text-sm">{analysis.detectedGenre}</Badge>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Point of View</h4>
                      <Badge variant="outline" className="text-sm">{analysis.detectedPOV}</Badge>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Primary Tone</h4>
                      <Badge variant="outline" className="text-sm">{analysis.detectedTone}</Badge>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-sm mb-3 flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Strengths
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {analysis.strengths.map((strength, index) => (
                          <li key={index}>{strength}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-3 flex items-center text-orange-600">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Areas for Improvement
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {analysis.qualityIssues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center">
                <Button onClick={() => setActiveTab("cleanup")} size="lg" data-testid="button-proceed-cleanup">
                  Proceed to Cleanup <Wand2 className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Upload a manuscript to see analysis results.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cleanup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cleanup Parameters</CardTitle>
              <p className="text-sm text-gray-600">
                Configure how you want your manuscript to be cleaned up and improved.
              </p>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="genre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Genre</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select genre" />
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
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="writingStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Writing Style</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select writing style" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="balanced">Balanced</SelectItem>
                              <SelectItem value="narrative">Narrative-focused</SelectItem>
                              <SelectItem value="descriptive">Descriptive</SelectItem>
                              <SelectItem value="dialogue-heavy">Dialogue-heavy</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pointOfView"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Point of View</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select POV" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="first-person">First Person</SelectItem>
                              <SelectItem value="third-person-limited">Third Person Limited</SelectItem>
                              <SelectItem value="third-person-omniscient">Third Person Omniscient</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="toneAndMood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tone & Mood</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select tone" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="adventurous">Adventurous</SelectItem>
                              <SelectItem value="dark">Dark</SelectItem>
                              <SelectItem value="light">Light</SelectItem>
                              <SelectItem value="humorous">Humorous</SelectItem>
                              <SelectItem value="serious">Serious</SelectItem>
                              <SelectItem value="romantic">Romantic</SelectItem>
                              <SelectItem value="mysterious">Mysterious</SelectItem>
                              <SelectItem value="epic">Epic</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contentRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content Rating</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select rating" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="g">G - General Audiences</SelectItem>
                              <SelectItem value="pg">PG - Parental Guidance</SelectItem>
                              <SelectItem value="pg-13">PG-13 - Teens and Up</SelectItem>
                              <SelectItem value="r">R - Restricted</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetWordCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Word Count</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={30000}
                            max={120000}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="customInstructions"
                  render={({ field }) => (
                    <FormItem className="mt-6">
                      <FormLabel>Custom Instructions</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder="Any specific instructions for how you'd like your manuscript cleaned up..."
                          rows={4}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </Form>

              {cleanupMutation.isPending && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Processing manuscript...</span>
                    <span>{cleanupProgress}%</span>
                  </div>
                  <Progress value={cleanupProgress} className="w-full" />
                  <p className="text-xs text-gray-500 text-center">
                    This may take a few minutes for large manuscripts
                  </p>
                </div>
              )}

              <div className="flex justify-center mt-8">
                <Button 
                  onClick={handleCleanup}
                  disabled={cleanupMutation.isPending || !uploadedFile}
                  size="lg"
                  data-testid="button-start-cleanup"
                >
                  {cleanupMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cleaning up manuscript...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Start Cleanup
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {cleanupResult ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Cleanup Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-green-50 rounded">
                      <div className="text-2xl font-bold text-green-600">{cleanupResult.summary.totalChanges}</div>
                      <div className="text-sm text-gray-600">Total Changes</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <div className="text-2xl font-bold text-blue-600">{cleanupResult.wordCount.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Final Word Count</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded">
                      <div className="text-2xl font-bold text-purple-600">+{cleanupResult.summary.wordsAdded}</div>
                      <div className="text-sm text-gray-600">Words Added</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded">
                      <div className="text-2xl font-bold text-orange-600">-{cleanupResult.summary.wordsRemoved}</div>
                      <div className="text-sm text-gray-600">Words Removed</div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-medium text-sm mb-3">Improvement Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {cleanupResult.summary.improvementAreas.map((area, index) => (
                        <Badge key={index} variant="secondary">{area}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-medium text-sm mb-3">Detailed Changes</h4>
                    <ScrollArea className="h-64 w-full border rounded-md">
                      <div className="p-4 space-y-3">
                        {cleanupResult.changes.map((change, index) => (
                          <div key={index} className="border-l-4 border-l-blue-500 pl-4 py-2">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="outline" className="text-xs capitalize">
                                {change.type}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium mb-1">{change.description}</p>
                            <div className="text-xs space-y-1">
                              <div>
                                <span className="font-medium text-red-600">Before:</span>
                                <span className="italic"> "{change.before}"</span>
                              </div>
                              <div>
                                <span className="font-medium text-green-600">After:</span>
                                <span className="italic"> "{change.after}"</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => downloadMutation.mutate('docx')}
                      disabled={downloadMutation.isPending}
                      data-testid="button-download-docx"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download DOCX
                    </Button>
                    <Button
                      onClick={() => downloadMutation.mutate('txt')}
                      disabled={downloadMutation.isPending}
                      variant="outline"
                      data-testid="button-download-txt"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download TXT
                    </Button>
                    <Button
                      onClick={() => downloadMutation.mutate('md')}
                      disabled={downloadMutation.isPending}
                      variant="outline"
                      data-testid="button-download-md"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Markdown
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Eye className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Complete the cleanup process to see results.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}