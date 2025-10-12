import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, Wand2, BookOpen, Users, Heart, Zap, Skull, Globe, Rocket, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface PlotSuggestion {
  title: string;
  premise: string;
  themes: string[];
  targetAudience: string;
  estimatedLength: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

interface GenreInfo {
  name: string;
  description: string;
  popularSubgenres: string[];
  keyElements: string[];
  famousExamples: string[];
  targetWordCount: number;
  chapterCount: number;
  chapterLength: number;
}

interface GenreWizardProps {
  onSelectPlot: (plot: PlotSuggestion & { genre: string }) => void;
}

const GENRES: GenreInfo[] = [
  {
    name: "Fantasy",
    description: "Stories set in magical worlds with supernatural elements, mythical creatures, and extraordinary powers.",
    popularSubgenres: ["Epic Fantasy", "Urban Fantasy", "Dark Fantasy", "Fairy Tale Retelling", "Sword & Sorcery"],
    keyElements: ["Magic systems", "Mythical creatures", "Quests", "Worldbuilding", "Good vs Evil"],
    famousExamples: ["Lord of the Rings", "Harry Potter", "Game of Thrones", "The Name of the Wind"],
    targetWordCount: 80000,
    chapterCount: 30,
    chapterLength: 2700
  },
  {
    name: "Science Fiction",
    description: "Futuristic stories exploring advanced technology, space travel, and scientific concepts.",
    popularSubgenres: ["Space Opera", "Cyberpunk", "Dystopian", "Time Travel", "Hard Sci-Fi"],
    keyElements: ["Advanced technology", "Space exploration", "Scientific concepts", "Future societies", "AI"],
    famousExamples: ["Dune", "Foundation", "Neuromancer", "The Martian"],
    targetWordCount: 75000,
    chapterCount: 28,
    chapterLength: 2600
  },
  {
    name: "Romance",
    description: "Stories focused on relationships and romantic love between characters.",
    popularSubgenres: ["Contemporary Romance", "Historical Romance", "Paranormal Romance", "Romantic Suspense"],
    keyElements: ["Relationship development", "Emotional conflict", "Happy ending", "Character chemistry"],
    famousExamples: ["Pride and Prejudice", "The Hating Game", "Outlander", "It Ends with Us"],
    targetWordCount: 65000,
    chapterCount: 25,
    chapterLength: 2600
  },
  {
    name: "Mystery/Thriller",
    description: "Suspenseful stories involving crime, investigation, and psychological tension.",
    popularSubgenres: ["Cozy Mystery", "Police Procedural", "Psychological Thriller", "Legal Thriller"],
    keyElements: ["Investigation", "Clues and red herrings", "Suspense", "Plot twists", "Resolution"],
    famousExamples: ["Gone Girl", "The Girl with the Dragon Tattoo", "Sherlock Holmes", "Agatha Christie"],
    targetWordCount: 70000,
    chapterCount: 26,
    chapterLength: 2700
  },
  {
    name: "Horror",
    description: "Stories designed to frighten, unsettle, and create suspense through supernatural or psychological elements.",
    popularSubgenres: ["Supernatural Horror", "Psychological Horror", "Gothic Horror", "Body Horror"],
    keyElements: ["Fear and dread", "Supernatural elements", "Dark atmosphere", "Psychological tension"],
    famousExamples: ["The Shining", "Dracula", "The Exorcist", "Pet Sematary"],
    targetWordCount: 65000,
    chapterCount: 24,
    chapterLength: 2700
  },
  {
    name: "Literary Fiction",
    description: "Character-driven stories that explore the human condition with artistic and intellectual depth.",
    popularSubgenres: ["Contemporary Fiction", "Historical Fiction", "Coming-of-Age", "Family Saga"],
    keyElements: ["Character development", "Themes", "Literary style", "Human relationships", "Social commentary"],
    famousExamples: ["To Kill a Mockingbird", "The Great Gatsby", "Beloved", "The Kite Runner"],
    targetWordCount: 70000,
    chapterCount: 25,
    chapterLength: 2800
  }
];

const GENRE_ICONS = {
  "Fantasy": Wand2,
  "Science Fiction": Rocket,
  "Romance": Heart,
  "Mystery/Thriller": Zap,
  "Horror": Skull,
  "Literary Fiction": BookOpen
};

export default function GenreWizard({ onSelectPlot }: GenreWizardProps) {
  const [selectedGenre, setSelectedGenre] = useState<GenreInfo | null>(null);
  const [selectedSubgenres, setSelectedSubgenres] = useState<string[]>([]);
  const [preferences, setPreferences] = useState({
    themes: [] as string[],
    complexity: "Intermediate" as "Beginner" | "Intermediate" | "Advanced",
    audience: "Adult" as "Young Adult" | "Adult" | "All Ages"
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Save plot mutation
  const savePlotMutation = useMutation({
    mutationFn: async (plotData: PlotSuggestion & { genre: string }) => {
      const response = await fetch("/api/saved-plots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: plotData.title,
          premise: plotData.premise,
          genre: plotData.genre,
          themes: plotData.themes,
          targetAudience: plotData.targetAudience,
          estimatedLength: plotData.estimatedLength,
          difficulty: plotData.difficulty,
          isFavorited: false,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-plots"] });
      toast({
        title: "Plot Saved!",
        description: "The plot has been added to your inspiration vault.",
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save the plot. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generatePlotsMutation = useMutation({
    mutationFn: async (genreData: { genre: string; subgenres: string[]; preferences: typeof preferences }) => {
      const response = await fetch("/api/generate-plots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(genreData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plot-suggestions"] });
    },
  });

  const { data: plotSuggestions, isLoading: plotsLoading } = useQuery({
    queryKey: ["/api/plot-suggestions", selectedGenre?.name, selectedSubgenres, preferences],
    queryFn: async () => {
      const response = await fetch(`/api/plot-suggestions?genre=${selectedGenre?.name}&subgenres=${selectedSubgenres.join(',')}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!selectedGenre && generatePlotsMutation.isSuccess,
  });

  const handleGeneratePlots = () => {
    if (!selectedGenre) return;
    
    generatePlotsMutation.mutate({
      genre: selectedGenre.name,
      subgenres: selectedSubgenres,
      preferences
    });
  };

  const toggleSubgenre = (subgenre: string) => {
    setSelectedSubgenres(prev => 
      prev.includes(subgenre) 
        ? prev.filter(s => s !== subgenre)
        : [...prev, subgenre]
    );
  };

  const addTheme = (theme: string) => {
    if (!preferences.themes.includes(theme)) {
      setPreferences(prev => ({
        ...prev,
        themes: [...prev.themes, theme]
      }));
    }
  };

  const removeTheme = (theme: string) => {
    setPreferences(prev => ({
      ...prev,
      themes: prev.themes.filter(t => t !== theme)
    }));
  };

  if (!selectedGenre) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Globe className="h-6 w-6 text-purple-600" />
            <CardTitle className="text-2xl font-bold">Genre Exploration Wizard</CardTitle>
          </div>
          <p className="text-slate-600">Discover new genres and get AI-generated plot suggestions tailored to your preferences</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {GENRES.map((genre) => {
              const IconComponent = GENRE_ICONS[genre.name as keyof typeof GENRE_ICONS];
              return (
                <Card 
                  key={genre.name}
                  className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-purple-300"
                  onClick={() => setSelectedGenre(genre)}
                  data-testid={`genre-card-${genre.name.toLowerCase().replace(/[^a-z]/g, '-')}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <IconComponent className="h-8 w-8 text-purple-600" />
                      <h3 className="text-lg font-semibold">{genre.name}</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">{genre.description}</p>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-slate-700 mb-1">Popular Subgenres:</p>
                        <div className="flex flex-wrap gap-1">
                          {genre.popularSubgenres.slice(0, 3).map((subgenre) => (
                            <Badge key={subgenre} variant="secondary" className="text-xs">
                              {subgenre}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs font-medium text-slate-700 mb-1">Typical Length:</p>
                        <p className="text-xs text-slate-600">
                          ~{(genre.targetWordCount / 1000).toFixed(0)}K words, {genre.chapterCount} chapters
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Genre Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {(() => {
                const IconComponent = GENRE_ICONS[selectedGenre.name as keyof typeof GENRE_ICONS];
                return <IconComponent className="h-8 w-8 text-purple-600" />;
              })()}
              <div>
                <h2 className="text-2xl font-bold">{selectedGenre.name}</h2>
                <p className="text-slate-600">{selectedGenre.description}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setSelectedGenre(null)}
              data-testid="button-back-to-genres"
            >
              ← Back to Genres
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Subgenre Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Choose Subgenres</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedGenre.popularSubgenres.map((subgenre) => (
                <div 
                  key={subgenre}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedSubgenres.includes(subgenre)
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => toggleSubgenre(subgenre)}
                  data-testid={`subgenre-${subgenre.toLowerCase().replace(/[^a-z]/g, '-')}`}
                >
                  <p className="font-medium text-sm">{subgenre}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Complexity Level</label>
                <div className="space-y-2">
                  {["Beginner", "Intermediate", "Advanced"].map((level) => (
                    <label key={level} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value={level}
                        checked={preferences.complexity === level}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          complexity: e.target.value as any
                        }))}
                        className="radio radio-primary"
                        data-testid={`complexity-${level.toLowerCase()}`}
                      />
                      <span className="text-sm">{level}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Audience</label>
                <div className="space-y-2">
                  {["Young Adult", "Adult", "All Ages"].map((audience) => (
                    <label key={audience} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value={audience}
                        checked={preferences.audience === audience}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          audience: e.target.value as any
                        }))}
                        className="radio radio-primary"
                        data-testid={`audience-${audience.toLowerCase().replace(/\s/g, '-')}`}
                      />
                      <span className="text-sm">{audience}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Themes (Optional)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedGenre.keyElements.map((element) => (
                    <Badge 
                      key={element}
                      variant={preferences.themes.includes(element) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => preferences.themes.includes(element) ? removeTheme(element) : addTheme(element)}
                      data-testid={`theme-${element.toLowerCase().replace(/[^a-z]/g, '-')}`}
                    >
                      {element}
                    </Badge>
                  ))}
                </div>
                {preferences.themes.length > 0 && (
                  <div className="text-xs text-slate-600">
                    Selected: {preferences.themes.join(", ")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleGeneratePlots}
            disabled={selectedSubgenres.length === 0 || generatePlotsMutation.isPending}
            className="w-full"
            data-testid="button-generate-plots"
          >
            {generatePlotsMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Wand2 className="h-4 w-4 mr-2" />
            )}
            Generate Plot Ideas
          </Button>
        </div>

        {/* Plot Suggestions */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">AI-Generated Plot Suggestions</CardTitle>
                {plotSuggestions && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePlots}
                    disabled={generatePlotsMutation.isPending}
                    data-testid="button-regenerate-plots"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Regenerate
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!generatePlotsMutation.isSuccess && !generatePlotsMutation.isPending && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">Select subgenres and click "Generate Plot Ideas" to get started</p>
                </div>
              )}

              {(generatePlotsMutation.isPending || plotsLoading) && (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
                  <p className="text-slate-600">AI is crafting unique plot suggestions for you...</p>
                </div>
              )}

              {plotSuggestions && Array.isArray(plotSuggestions) && (
                <ScrollArea className="h-96">
                  <div className="space-y-4 pr-4">
                    {plotSuggestions.map((plot: PlotSuggestion, index: number) => (
                      <Card key={index} className="border-2 hover:border-purple-300 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-semibold text-lg">{plot.title}</h4>
                            <Badge variant="outline">{plot.difficulty}</Badge>
                          </div>
                          
                          <p className="text-slate-700 mb-3">{plot.premise}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            <div>
                              <p className="text-xs font-medium text-slate-600 mb-1">Themes:</p>
                              <div className="flex flex-wrap gap-1">
                                {plot.themes.map((theme) => (
                                  <Badge key={theme} variant="secondary" className="text-xs">
                                    {theme}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-600 mb-1">Details:</p>
                              <p className="text-xs text-slate-600">
                                {plot.targetAudience} • {plot.estimatedLength}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => savePlotMutation.mutate({ ...plot, genre: selectedGenre.name })}
                              disabled={savePlotMutation.isPending}
                              className="flex-1"
                              data-testid={`button-save-plot-${index}`}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              Save Plot
                            </Button>
                            <Button
                              onClick={() => onSelectPlot({ ...plot, genre: selectedGenre.name })}
                              className="flex-1"
                              data-testid={`button-select-plot-${index}`}
                            >
                              Use This Plot
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}