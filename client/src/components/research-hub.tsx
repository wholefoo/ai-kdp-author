import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Search,
  BookOpen,
  FileText,
  Loader2,
  Sparkles,
  ChevronRight,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  BookMarked,
  Users,
  Globe,
  TrendingUp,
  Lightbulb,
  List,
  RefreshCw,
} from "lucide-react";

const FICTION_GENRES = [
  "Romance", "Mystery", "Thriller", "Science Fiction", "Fantasy",
  "Horror", "Historical Fiction", "Literary Fiction", "Young Adult",
  "Crime", "Adventure", "Suspense", "Paranormal", "Western",
];

const NONFICTION_SUBTYPES = [
  "self-help", "business", "history", "science", "biography",
  "how-to", "health-wellness", "finance", "technology",
  "philosophy", "psychology", "education", "travel", "true-crime",
  "politics", "memoir", "reference",
];

interface ResearchData {
  topic: string;
  summary: string;
  keyFindings: Array<{ finding: string; significance: string; supportingEvidence: string }>;
  themes: Array<{ theme: string; description: string; examples: string }>;
  sources: Array<{ title: string; author: string; year: string; type: string; publisher: string; keyInsight: string }>;
  suggestedAngles: Array<{ angle: string; description: string; targetAudience: string }>;
  controversies: string[];
  historicalContext: string;
  currentRelevance: string;
  keyFigures: string[];
  statistics: string[];
}

interface FictionPlot {
  title: string;
  genre: string;
  premise: string;
  thematicElements: string[];
  protagonist: { name: string; background: string; motivation: string; arc: string };
  antagonistOrConflict: string;
  plotSummary: string;
  actStructure: { act1: string; act2: string; act3: string };
  settingAndWorld: string;
  researchTies: string;
  suggestedChapters: Array<{ number: number; title: string; summary: string }>;
}

interface NonfictionOutline {
  title: string;
  subtitle: string;
  premise: string;
  uniqueAngle: string;
  targetAudience: string;
  learningObjectives: string[];
  chapters: Array<{ number: number; title: string; summary: string; keyPoints: string[]; sources: string[] }>;
  introduction: string;
  conclusion: string;
}

interface ResearchSession {
  id: string;
  topic: string;
  contentType: string;
  genre: string | null;
  status: string;
  researchData: ResearchData | null;
  fictionPlot: FictionPlot | null;
  nonfictionOutline: NonfictionOutline | null;
  createdAt: string;
}

interface ResearchHubProps {
  onUseForFiction?: (plot: FictionPlot, topic: string) => void;
  onUseForNonfiction?: (outline: NonfictionOutline, topic: string) => void;
}

export default function ResearchHub({ onUseForFiction, onUseForNonfiction }: ResearchHubProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState<"fiction" | "non-fiction">("fiction");
  const [genre, setGenre] = useState("");
  const [nonfictionSubtype, setNonfictionSubtype] = useState("");
  const [selectedSession, setSelectedSession] = useState<ResearchSession | null>(null);
  const [pollingId, setPollingId] = useState<string | null>(null);

  const [plotGenre, setPlotGenre] = useState("");
  const [plotContext, setPlotContext] = useState("");
  const [outlineAudience, setOutlineAudience] = useState("");
  const [outlineContext, setOutlineContext] = useState("");
  const [activeOutput, setActiveOutput] = useState<"plot" | "outline" | null>(null);

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<ResearchSession[]>({
    queryKey: ["/api/research"],
    refetchInterval: pollingId ? 3000 : false,
  });

  // Auto-update selected session when polling data comes in
  const polledSession = sessions.find(s => s.id === pollingId);
  if (polledSession && polledSession.status !== "pending" && pollingId) {
    if (polledSession.status === "completed") {
      setSelectedSession(polledSession);
      setPollingId(null);
    } else if (polledSession.status === "error") {
      setPollingId(null);
      toast({ title: "Research failed", description: "Something went wrong during research. Please try again.", variant: "destructive" });
    }
  }

  const startResearchMutation = useMutation({
    mutationFn: (data: { topic: string; contentType: string; genre?: string }) =>
      apiRequest("POST", "/api/research", data).then(r => r.json()),
    onSuccess: (session: ResearchSession) => {
      queryClient.invalidateQueries({ queryKey: ["/api/research"] });
      setPollingId(session.id);
      toast({ title: "Research started", description: "Gathering and verifying information from credible sources..." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to start research", description: error.message, variant: "destructive" });
    },
  });

  const generateFictionPlotMutation = useMutation({
    mutationFn: ({ id, genre, additionalContext }: { id: string; genre: string; additionalContext?: string }) =>
      apiRequest("POST", `/api/research/${id}/generate-fiction-plot`, { genre, additionalContext }).then(r => r.json()),
    onSuccess: (data: { fictionPlot: FictionPlot; session: ResearchSession }) => {
      setSelectedSession(data.session);
      setActiveOutput("plot");
      queryClient.invalidateQueries({ queryKey: ["/api/research"] });
      toast({ title: "Fiction plot generated!", description: "Your research has been transformed into a complete story structure." });
    },
    onError: (error: any) => {
      toast({ title: "Plot generation failed", description: error.message, variant: "destructive" });
    },
  });

  const generateNonfictionOutlineMutation = useMutation({
    mutationFn: ({ id, subtype, targetAudience, additionalContext }: { id: string; subtype: string; targetAudience?: string; additionalContext?: string }) =>
      apiRequest("POST", `/api/research/${id}/generate-nonfiction-outline`, { subtype, targetAudience, additionalContext }).then(r => r.json()),
    onSuccess: (data: { nonfictionOutline: NonfictionOutline; session: ResearchSession }) => {
      setSelectedSession(data.session);
      setActiveOutput("outline");
      queryClient.invalidateQueries({ queryKey: ["/api/research"] });
      toast({ title: "Non-fiction outline generated!", description: "Your research has been structured into a complete book outline." });
    },
    onError: (error: any) => {
      toast({ title: "Outline generation failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteResearchMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/research/${id}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research"] });
      if (selectedSession) setSelectedSession(null);
      toast({ title: "Research deleted" });
    },
  });

  const handleStartResearch = () => {
    if (!topic.trim()) {
      toast({ title: "Topic required", description: "Enter a subject to research.", variant: "destructive" });
      return;
    }
    startResearchMutation.mutate({
      topic,
      contentType,
      genre: contentType === "fiction" ? genre : undefined,
    });
  };

  const handleSessionClick = (session: ResearchSession) => {
    setSelectedSession(session);
    setActiveOutput(session.fictionPlot ? "plot" : session.nonfictionOutline ? "outline" : null);
    setPlotGenre(session.genre || "");
  };

  const isResearching = pollingId !== null;
  const currentSession = selectedSession || sessions.find(s => s.id === pollingId) || null;

  return (
    <div className="space-y-6">
      {/* New Research Form */}
      <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Search className="h-5 w-5" />
            Start New Research
          </CardTitle>
          <CardDescription>
            Conduct thorough subject matter research using credible academic, journalistic, and expert sources.
            Use the findings to build a fiction plot or non-fiction book structure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="topic">Research Topic</Label>
              <Input
                id="topic"
                placeholder="e.g. The psychology of cult leadership, Quantum computing, Victorian-era medicine..."
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Purpose</Label>
              <Select value={contentType} onValueChange={(v: any) => setContentType(v)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fiction">For Fiction Novel</SelectItem>
                  <SelectItem value="non-fiction">For Non-Fiction Book</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {contentType === "fiction" && (
            <div className="space-y-1.5">
              <Label>Target Genre (optional)</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select genre to focus research..." />
                </SelectTrigger>
                <SelectContent>
                  {FICTION_GENRES.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={handleStartResearch}
              disabled={startResearchMutation.isPending || isResearching}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {startResearchMutation.isPending || isResearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Research This Topic
                </>
              )}
            </Button>
            {isResearching && (
              <span className="text-sm text-blue-600 animate-pulse">
                Gathering and verifying from credible sources — this takes 1-2 minutes...
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <BookMarked className="h-4 w-4" />
            Your Research Sessions
          </h3>

          {sessionsLoading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : sessions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center text-slate-500 text-sm">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No research sessions yet.<br />Start your first research above.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sessions.map(session => (
                <Card
                  key={session.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedSession?.id === session.id ? "border-blue-400 bg-blue-50" : ""}`}
                  onClick={() => handleSessionClick(session)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-800 truncate">{session.topic}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-xs py-0">
                            {session.contentType === "fiction" ? "Fiction" : "Non-Fiction"}
                          </Badge>
                          {session.status === "pending" && (
                            <span className="flex items-center gap-1 text-xs text-amber-600">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Researching
                            </span>
                          )}
                          {session.status === "completed" && (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Ready
                            </span>
                          )}
                          {session.status === "error" && (
                            <span className="flex items-center gap-1 text-xs text-red-500">
                              <AlertCircle className="h-3 w-3" />
                              Error
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                        onClick={e => { e.stopPropagation(); deleteResearchMutation.mutate(session.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-4">
          {!currentSession && (
            <Card className="border-dashed">
              <CardContent className="pt-12 pb-12 text-center text-slate-500">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Select a research session or start a new one</p>
                <p className="text-sm mt-1">Research findings will appear here</p>
              </CardContent>
            </Card>
          )}

          {currentSession?.status === "pending" && (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <Loader2 className="h-12 w-12 mx-auto mb-4 text-blue-500 animate-spin" />
                <p className="font-semibold text-lg">Conducting Research</p>
                <p className="text-slate-500 mt-1 text-sm max-w-sm mx-auto">
                  Gathering verified information from academic papers, journals, books, and credible publications on <strong>{currentSession.topic}</strong>
                </p>
                <p className="text-xs text-slate-400 mt-3">This usually takes 1-2 minutes</p>
              </CardContent>
            </Card>
          )}

          {currentSession?.status === "completed" && currentSession.researchData && (
            <div className="space-y-4">
              {/* Research Header */}
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                <CardContent className="pt-6 pb-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{currentSession.researchData.topic}</h2>
                      <p className="text-slate-300 text-sm mt-1 leading-relaxed">{currentSession.researchData.summary}</p>
                    </div>
                    <Badge className="bg-green-500 text-white ml-3 shrink-0">Verified</Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {currentSession.researchData.keyFigures?.slice(0, 4).map((f, i) => (
                      <Badge key={i} variant="secondary" className="bg-slate-700 text-slate-200 text-xs">{f}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Research Findings Accordion */}
              <Accordion type="multiple" defaultValue={["findings", "sources"]}>
                {/* Key Findings */}
                <AccordionItem value="findings">
                  <AccordionTrigger className="font-semibold">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      Key Findings ({currentSession.researchData.keyFindings?.length || 0})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {currentSession.researchData.keyFindings?.map((f, i) => (
                        <div key={i} className="border-l-4 border-blue-400 pl-4 py-1">
                          <p className="font-medium text-slate-800">{f.finding}</p>
                          <p className="text-sm text-slate-600 mt-0.5">{f.significance}</p>
                          <p className="text-xs text-slate-500 mt-1 italic">{f.supportingEvidence}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Themes */}
                <AccordionItem value="themes">
                  <AccordionTrigger className="font-semibold">
                    <span className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Major Themes ({currentSession.researchData.themes?.length || 0})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentSession.researchData.themes?.map((t, i) => (
                        <Card key={i} className="bg-amber-50 border-amber-200">
                          <CardContent className="p-3">
                            <p className="font-semibold text-amber-900 text-sm">{t.theme}</p>
                            <p className="text-xs text-amber-800 mt-1">{t.description}</p>
                            <p className="text-xs text-amber-700 mt-1 italic">{t.examples}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Sources */}
                <AccordionItem value="sources">
                  <AccordionTrigger className="font-semibold">
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-green-600" />
                      Verified Sources ({currentSession.researchData.sources?.length || 0})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {currentSession.researchData.sources?.map((s, i) => (
                        <div key={i} className="flex gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                          <Globe className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-sm text-slate-800">{s.title}</p>
                            <p className="text-xs text-slate-600">{s.author} — {s.publisher}, {s.year}</p>
                            <Badge variant="outline" className="mt-1 text-xs py-0">{s.type}</Badge>
                            <p className="text-xs text-slate-600 mt-1">{s.keyInsight}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Historical Context & Relevance */}
                <AccordionItem value="context">
                  <AccordionTrigger className="font-semibold">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-600" />
                      Context & Relevance
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium text-slate-700 mb-1">Historical Context</p>
                        <p className="text-sm text-slate-600">{currentSession.researchData.historicalContext}</p>
                      </div>
                      <Separator />
                      <div>
                        <p className="font-medium text-slate-700 mb-1">Current Relevance</p>
                        <p className="text-sm text-slate-600">{currentSession.researchData.currentRelevance}</p>
                      </div>
                      {currentSession.researchData.controversies?.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <p className="font-medium text-slate-700 mb-2">Controversies & Debates</p>
                            <ul className="space-y-1">
                              {currentSession.researchData.controversies.map((c, i) => (
                                <li key={i} className="text-sm text-slate-600 flex gap-2">
                                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                                  {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </>
                      )}
                      {currentSession.researchData.statistics?.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <p className="font-medium text-slate-700 mb-2">Key Statistics</p>
                            <ul className="space-y-1">
                              {currentSession.researchData.statistics.map((s, i) => (
                                <li key={i} className="text-sm text-slate-600 flex gap-2">
                                  <ChevronRight className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Suggested Angles */}
                <AccordionItem value="angles">
                  <AccordionTrigger className="font-semibold">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      Suggested Angles ({currentSession.researchData.suggestedAngles?.length || 0})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {currentSession.researchData.suggestedAngles?.map((a, i) => (
                        <div key={i} className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                          <p className="font-semibold text-indigo-900 text-sm">{a.angle}</p>
                          <p className="text-xs text-indigo-800 mt-1">{a.description}</p>
                          <p className="text-xs text-indigo-600 mt-1">
                            <span className="font-medium">Audience:</span> {a.targetAudience}
                          </p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Action Panel: Generate from Research */}
              <Card className="border-2 border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Use This Research</CardTitle>
                  <CardDescription>Transform your research into a fiction plot or a non-fiction book structure</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Fiction Plot Generator */}
                    <div className="space-y-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        <h4 className="font-semibold text-purple-900">Generate Fiction Plot</h4>
                      </div>
                      <p className="text-xs text-purple-700">
                        The AI will weave your research findings into a compelling story structure, grounded in real facts.
                      </p>
                      <div className="space-y-2">
                        <Label className="text-xs text-purple-800">Genre</Label>
                        <Select value={plotGenre} onValueChange={setPlotGenre}>
                          <SelectTrigger className="bg-white text-sm h-8">
                            <SelectValue placeholder="Select genre..." />
                          </SelectTrigger>
                          <SelectContent>
                            {FICTION_GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-purple-800">Additional notes (optional)</Label>
                        <Textarea
                          placeholder="Any specific story elements you want included..."
                          value={plotContext}
                          onChange={e => setPlotContext(e.target.value)}
                          rows={2}
                          className="bg-white text-sm resize-none"
                        />
                      </div>
                      <Button
                        className="w-full bg-purple-600 hover:bg-purple-700 text-sm"
                        disabled={generateFictionPlotMutation.isPending || !plotGenre}
                        onClick={() => generateFictionPlotMutation.mutate({
                          id: currentSession.id,
                          genre: plotGenre,
                          additionalContext: plotContext || undefined,
                        })}
                      >
                        {generateFictionPlotMutation.isPending ? (
                          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Generating Plot...</>
                        ) : (
                          <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Generate Fiction Plot</>
                        )}
                      </Button>
                    </div>

                    {/* Non-Fiction Outline Generator */}
                    <div className="space-y-3 p-4 bg-teal-50 rounded-xl border border-teal-200">
                      <div className="flex items-center gap-2">
                        <List className="h-5 w-5 text-teal-600" />
                        <h4 className="font-semibold text-teal-900">Generate Non-Fiction Outline</h4>
                      </div>
                      <p className="text-xs text-teal-700">
                        The AI will structure your research into a comprehensive non-fiction book outline with chapters and key points.
                      </p>
                      <div className="space-y-2">
                        <Label className="text-xs text-teal-800">Book Category</Label>
                        <Select value={nonfictionSubtype} onValueChange={setNonfictionSubtype}>
                          <SelectTrigger className="bg-white text-sm h-8">
                            <SelectValue placeholder="Select category..." />
                          </SelectTrigger>
                          <SelectContent>
                            {NONFICTION_SUBTYPES.map(s => (
                              <SelectItem key={s} value={s}>{s.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-teal-800">Target audience (optional)</Label>
                        <Textarea
                          placeholder="e.g. Business professionals, curious beginners, researchers..."
                          value={outlineAudience}
                          onChange={e => setOutlineAudience(e.target.value)}
                          rows={2}
                          className="bg-white text-sm resize-none"
                        />
                      </div>
                      <Button
                        className="w-full bg-teal-600 hover:bg-teal-700 text-sm"
                        disabled={generateNonfictionOutlineMutation.isPending || !nonfictionSubtype}
                        onClick={() => generateNonfictionOutlineMutation.mutate({
                          id: currentSession.id,
                          subtype: nonfictionSubtype,
                          targetAudience: outlineAudience || undefined,
                          additionalContext: outlineContext || undefined,
                        })}
                      >
                        {generateNonfictionOutlineMutation.isPending ? (
                          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Generating Outline...</>
                        ) : (
                          <><List className="h-3.5 w-3.5 mr-1.5" />Generate Book Outline</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fiction Plot Result */}
              {activeOutput === "plot" && currentSession.fictionPlot && (
                <Card className="border-purple-300 bg-purple-50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-purple-900">{currentSession.fictionPlot.title}</CardTitle>
                        <CardDescription className="text-purple-700 mt-1">{currentSession.fictionPlot.genre} Novel</CardDescription>
                      </div>
                      {onUseForFiction && (
                        <Button
                          onClick={() => onUseForFiction(currentSession.fictionPlot!, currentSession.topic)}
                          className="bg-purple-600 hover:bg-purple-700 shrink-0"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Use in Generator
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="font-semibold text-slate-700 mb-1">Premise</p>
                      <p className="text-slate-700 bg-white p-3 rounded-lg border border-purple-200 text-sm leading-relaxed">{currentSession.fictionPlot.premise}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-lg border border-purple-200">
                        <p className="font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                          <Users className="h-4 w-4" /> Protagonist
                        </p>
                        <p className="text-sm font-medium">{currentSession.fictionPlot.protagonist.name}</p>
                        <p className="text-xs text-slate-600 mt-1">{currentSession.fictionPlot.protagonist.background}</p>
                        <p className="text-xs text-slate-500 mt-1"><span className="font-medium">Motivation:</span> {currentSession.fictionPlot.protagonist.motivation}</p>
                        <p className="text-xs text-slate-500"><span className="font-medium">Arc:</span> {currentSession.fictionPlot.protagonist.arc}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-purple-200">
                        <p className="font-semibold text-slate-700 mb-2">Central Conflict</p>
                        <p className="text-xs text-slate-600">{currentSession.fictionPlot.antagonistOrConflict}</p>
                        <div className="mt-2">
                          <p className="text-xs font-medium text-slate-600">Themes:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {currentSession.fictionPlot.thematicElements?.map((t, i) => (
                              <Badge key={i} variant="secondary" className="text-xs py-0">{t}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-purple-200">
                      <p className="font-semibold text-slate-700 mb-2">Three-Act Structure</p>
                      <div className="space-y-2">
                        <div><span className="font-medium text-xs text-purple-700">Act 1 — Setup:</span> <span className="text-xs text-slate-600">{currentSession.fictionPlot.actStructure.act1}</span></div>
                        <div><span className="font-medium text-xs text-purple-700">Act 2 — Confrontation:</span> <span className="text-xs text-slate-600">{currentSession.fictionPlot.actStructure.act2}</span></div>
                        <div><span className="font-medium text-xs text-purple-700">Act 3 — Resolution:</span> <span className="text-xs text-slate-600">{currentSession.fictionPlot.actStructure.act3}</span></div>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-purple-200">
                      <p className="font-semibold text-slate-700 mb-2">Research Ties</p>
                      <p className="text-xs text-slate-600">{currentSession.fictionPlot.researchTies}</p>
                    </div>
                    {currentSession.fictionPlot.suggestedChapters?.length > 0 && (
                      <Accordion type="single" collapsible>
                        <AccordionItem value="chapters">
                          <AccordionTrigger className="text-sm font-semibold">
                            Chapter Breakdown ({currentSession.fictionPlot.suggestedChapters.length} chapters)
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                              {currentSession.fictionPlot.suggestedChapters.map((ch, i) => (
                                <div key={i} className="flex gap-3 bg-white p-2 rounded border border-purple-100">
                                  <span className="text-xs font-bold text-purple-600 w-8 shrink-0">Ch {ch.number}</span>
                                  <div>
                                    <p className="text-xs font-medium text-slate-800">{ch.title}</p>
                                    <p className="text-xs text-slate-500">{ch.summary}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Non-Fiction Outline Result */}
              {activeOutput === "outline" && currentSession.nonfictionOutline && (
                <Card className="border-teal-300 bg-teal-50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-teal-900">{currentSession.nonfictionOutline.title}</CardTitle>
                        <CardDescription className="text-teal-700 mt-1 italic">{currentSession.nonfictionOutline.subtitle}</CardDescription>
                      </div>
                      {onUseForNonfiction && (
                        <Button
                          onClick={() => onUseForNonfiction(currentSession.nonfictionOutline!, currentSession.topic)}
                          className="bg-teal-600 hover:bg-teal-700 shrink-0"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Use in Generator
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-lg border border-teal-200">
                        <p className="font-semibold text-slate-700 mb-1 text-sm">Promise</p>
                        <p className="text-xs text-slate-600">{currentSession.nonfictionOutline.premise}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-teal-200">
                        <p className="font-semibold text-slate-700 mb-1 text-sm">Unique Angle</p>
                        <p className="text-xs text-slate-600">{currentSession.nonfictionOutline.uniqueAngle}</p>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-teal-200">
                      <p className="font-semibold text-slate-700 mb-2 text-sm">Learning Objectives</p>
                      <ul className="space-y-1">
                        {currentSession.nonfictionOutline.learningObjectives?.map((obj, i) => (
                          <li key={i} className="flex gap-2 text-xs text-slate-600">
                            <ChevronRight className="h-3.5 w-3.5 text-teal-500 shrink-0 mt-0.5" />
                            {obj}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-teal-200">
                      <p className="font-semibold text-slate-700 mb-1 text-sm">Introduction</p>
                      <p className="text-xs text-slate-600">{currentSession.nonfictionOutline.introduction}</p>
                    </div>
                    <Accordion type="single" collapsible>
                      <AccordionItem value="chapters">
                        <AccordionTrigger className="text-sm font-semibold">
                          Chapter Outline ({currentSession.nonfictionOutline.chapters?.length} chapters)
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {currentSession.nonfictionOutline.chapters?.map((ch, i) => (
                              <div key={i} className="bg-white p-3 rounded border border-teal-100">
                                <p className="text-sm font-semibold text-teal-800">Chapter {ch.number}: {ch.title}</p>
                                <p className="text-xs text-slate-600 mt-1">{ch.summary}</p>
                                {ch.keyPoints?.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs font-medium text-slate-500 mb-1">Key Points:</p>
                                    <ul className="space-y-0.5">
                                      {ch.keyPoints.map((pt, j) => (
                                        <li key={j} className="text-xs text-slate-600 flex gap-1.5">
                                          <ChevronRight className="h-3 w-3 text-teal-400 shrink-0 mt-0.5" />{pt}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {ch.sources?.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {ch.sources.map((s, j) => (
                                      <Badge key={j} variant="outline" className="text-xs py-0 border-teal-200">{s}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                    <div className="bg-white p-3 rounded-lg border border-teal-200">
                      <p className="font-semibold text-slate-700 mb-1 text-sm">Conclusion</p>
                      <p className="text-xs text-slate-600">{currentSession.nonfictionOutline.conclusion}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
