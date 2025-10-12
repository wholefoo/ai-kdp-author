import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Heart, 
  BookOpen, 
  Trash2, 
  Edit, 
  Search, 
  Filter,
  ArrowLeft,
  Star,
  Calendar,
  Tag,
  Save,
  X
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { SavedPlot } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface PlotInspirationVaultProps {
  onSelectPlot?: (plot: SavedPlot) => void;
  onBack?: () => void;
}

export default function PlotInspirationVault({ onSelectPlot, onBack }: PlotInspirationVaultProps) {
  const [selectedPlot, setSelectedPlot] = useState<SavedPlot | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGenre, setFilterGenre] = useState<string>("all");
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [editingNotes, setEditingNotes] = useState("");
  const [editingTags, setEditingTags] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all saved plots
  const { data: savedPlots = [], isLoading } = useQuery({
    queryKey: ["/api/saved-plots"],
    queryFn: async () => {
      const response = await fetch("/api/saved-plots");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (plotId: string) => {
      const response = await fetch(`/api/saved-plots/${plotId}/favorite`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-plots"] });
      toast({
        title: "Success",
        description: "Plot favorite status updated",
      });
    },
  });

  // Update plot mutation
  const updatePlotMutation = useMutation({
    mutationFn: async ({ plotId, updates }: { plotId: string; updates: Partial<SavedPlot> }) => {
      const response = await fetch(`/api/saved-plots/${plotId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-plots"] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Plot updated successfully",
      });
    },
  });

  // Delete plot mutation
  const deletePlotMutation = useMutation({
    mutationFn: async (plotId: string) => {
      const response = await fetch(`/api/saved-plots/${plotId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-plots"] });
      setSelectedPlot(null);
      toast({
        title: "Success",
        description: "Plot deleted successfully",
      });
    },
  });

  // Filter and search plots
  const filteredPlots = savedPlots.filter((plot: SavedPlot) => {
    const matchesSearch = plot.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         plot.premise.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = filterGenre === "all" || plot.genre === filterGenre;
    const matchesFavorites = !filterFavorites || plot.isFavorited;
    
    return matchesSearch && matchesGenre && matchesFavorites;
  });

  // Get unique genres for filter
  const genres: string[] = Array.from(new Set(savedPlots.map((plot: SavedPlot) => plot.genre)));

  const handleSaveNotes = () => {
    if (!selectedPlot) return;
    
    updatePlotMutation.mutate({
      plotId: selectedPlot.id,
      updates: {
        notes: editingNotes,
        tags: editingTags.split(',').map(tag => tag.trim()).filter(tag => tag),
      },
    });
  };

  const handleEditStart = () => {
    if (!selectedPlot) return;
    setEditingNotes(selectedPlot.notes || "");
    setEditingTags(selectedPlot.tags?.join(", ") || "");
    setIsEditing(true);
  };

  if (selectedPlot && !isEditing) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPlot(null)}
                data-testid="button-back-to-vault"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Vault
              </Button>
              <div className="flex items-center space-x-2">
                {selectedPlot.isFavorited && <Heart className="h-5 w-5 text-red-500 fill-current" />}
                <CardTitle className="text-xl">{selectedPlot.title}</CardTitle>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleFavoriteMutation.mutate(selectedPlot.id)}
                disabled={toggleFavoriteMutation.isPending}
                data-testid="button-toggle-favorite"
              >
                <Heart className={`h-4 w-4 mr-1 ${selectedPlot.isFavorited ? 'text-red-500 fill-current' : ''}`} />
                {selectedPlot.isFavorited ? 'Unfavorite' : 'Favorite'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditStart}
                data-testid="button-edit-plot"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deletePlotMutation.mutate(selectedPlot.id)}
                disabled={deletePlotMutation.isPending}
                data-testid="button-delete-plot"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">Plot Premise</h3>
            <p className="text-slate-700 leading-relaxed">{selectedPlot.premise}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Genre:</span>
                  <Badge variant="outline">{selectedPlot.genre}</Badge>
                </div>
                {selectedPlot.targetAudience && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Audience:</span>
                    <span>{selectedPlot.targetAudience}</span>
                  </div>
                )}
                {selectedPlot.difficulty && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Difficulty:</span>
                    <Badge variant="secondary">{selectedPlot.difficulty}</Badge>
                  </div>
                )}
                {selectedPlot.estimatedLength && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Length:</span>
                    <span>{selectedPlot.estimatedLength}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 mb-2">Themes & Elements</h4>
              <div className="space-y-3">
                {selectedPlot.themes && selectedPlot.themes.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">Themes:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedPlot.themes.map((theme, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedPlot.subgenres && selectedPlot.subgenres.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">Subgenres:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedPlot.subgenres.map((subgenre, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {subgenre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedPlot.notes && (
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Personal Notes</h4>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-slate-700">{selectedPlot.notes}</p>
              </div>
            </div>
          )}

          {selectedPlot.tags && selectedPlot.tags.length > 0 && (
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {selectedPlot.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-xs text-slate-500">
              <Calendar className="h-4 w-4 inline mr-1" />
              Saved {new Date(selectedPlot.createdAt!).toLocaleDateString()}
            </div>
            <div className="flex space-x-2">
              {onSelectPlot && (
                <Button
                  onClick={() => onSelectPlot(selectedPlot)}
                  data-testid="button-use-plot"
                >
                  <BookOpen className="h-4 w-4 mr-1" />
                  Use This Plot
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isEditing && selectedPlot) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Edit Plot: {selectedPlot.title}</CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                data-testid="button-cancel-edit"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveNotes}
                disabled={updatePlotMutation.isPending}
                data-testid="button-save-edit"
              >
                <Save className="h-4 w-4 mr-1" />
                Save Changes
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Personal Notes</label>
            <Textarea
              value={editingNotes}
              onChange={(e) => setEditingNotes(e.target.value)}
              placeholder="Add your personal notes about this plot idea..."
              rows={4}
              data-testid="textarea-notes"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
            <Input
              value={editingTags}
              onChange={(e) => setEditingTags(e.target.value)}
              placeholder="romance, enemies-to-lovers, fantasy"
              data-testid="input-tags"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBack && (
              <Button
                variant="outline"
                onClick={onBack}
                data-testid="button-back-from-vault"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <div>
              <CardTitle className="text-2xl">Plot Inspiration Vault</CardTitle>
              <p className="text-slate-600">Your saved plot ideas and favorites</p>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="all" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all-plots">All Plots ({savedPlots.length})</TabsTrigger>
              <TabsTrigger value="favorites" data-testid="tab-favorites">
                <Heart className="h-4 w-4 mr-1" />
                Favorites ({savedPlots.filter((p: SavedPlot) => p.isFavorited).length})
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search plots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                  data-testid="input-search"
                />
              </div>
              
              <Select value={filterGenre} onValueChange={setFilterGenre}>
                <SelectTrigger className="w-40" data-testid="select-genre-filter">
                  <SelectValue placeholder="All Genres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genres</SelectItem>
                  {genres.map((genre) => (
                    <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-slate-600 mt-2">Loading your saved plots...</p>
              </div>
            ) : filteredPlots.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">
                  {searchQuery || filterGenre !== "all" 
                    ? "No plots match your current filters" 
                    : "No plots saved yet. Save plots from the Genre Wizard to build your collection!"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlots.map((plot: SavedPlot) => (
                  <Card 
                    key={plot.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-purple-300"
                    onClick={() => setSelectedPlot(plot)}
                    data-testid={`plot-card-${plot.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-lg line-clamp-1">{plot.title}</h4>
                        {plot.isFavorited && (
                          <Heart className="h-5 w-5 text-red-500 fill-current flex-shrink-0" />
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-600 line-clamp-3 mb-3">{plot.premise}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <Badge variant="outline">{plot.genre}</Badge>
                          {plot.difficulty && (
                            <Badge variant="secondary">{plot.difficulty}</Badge>
                          )}
                        </div>
                        
                        {plot.themes && plot.themes.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {plot.themes.slice(0, 3).map((theme, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {theme}
                              </Badge>
                            ))}
                            {plot.themes.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{plot.themes.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="text-xs text-slate-500 pt-2 border-t">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {new Date(plot.createdAt!).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4">
            {savedPlots.filter((p: SavedPlot) => p.isFavorited).length === 0 ? (
              <div className="text-center py-12">
                <Star className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No favorite plots yet. Click the heart icon to add plots to favorites!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedPlots.filter((p: SavedPlot) => p.isFavorited).map((plot: SavedPlot) => (
                  <Card 
                    key={plot.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-purple-300"
                    onClick={() => setSelectedPlot(plot)}
                    data-testid={`favorite-plot-card-${plot.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-lg line-clamp-1">{plot.title}</h4>
                        <Heart className="h-5 w-5 text-red-500 fill-current flex-shrink-0" />
                      </div>
                      
                      <p className="text-sm text-slate-600 line-clamp-3 mb-3">{plot.premise}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <Badge variant="outline">{plot.genre}</Badge>
                          {plot.difficulty && (
                            <Badge variant="secondary">{plot.difficulty}</Badge>
                          )}
                        </div>
                        
                        <div className="text-xs text-slate-500 pt-2 border-t">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {new Date(plot.createdAt!).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}