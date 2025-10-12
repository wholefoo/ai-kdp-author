import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Plus, 
  Star, 
  BookOpen, 
  Zap, 
  Edit3, 
  Trash2, 
  Heart, 
  Target,
  Network,
  UserPlus,
  Sparkles,
  BarChart3,
  MessageSquare,
  ArrowRight,
  Search
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCharacterSchema, type Character, type InsertCharacter } from "@shared/schema";
import CharacterInterview from "./character-interview";
import EmotionalJourney from "./emotional-journey";

interface CharacterWorkshopProps {
  novelId?: string;
  genre?: string;
}

export default function CharacterWorkshop({ novelId, genre = "general" }: CharacterWorkshopProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const { toast } = useToast();

  // Fetch characters
  const { data: characters = [], isLoading } = useQuery<Character[]>({
    queryKey: ["/api/characters", { novelId }],
  });

  // Create character form
  const form = useForm<InsertCharacter>({
    resolver: zodResolver(insertCharacterSchema),
    defaultValues: {
      name: "",
      role: "supporting",
      age: undefined,
      gender: "",
      occupation: "",
      physicalDescription: "",
      personality: "",
      backstory: "",
      motivation: "",
      goals: "",
      fears: "",
      quirks: "",
      voiceAndSpeech: "",
      characterArc: null,
      relationships: [],
      tags: [],
      notes: "",
      isFavorited: false,
      novelId: novelId || null,
    },
  });

  // Mutations
  const createCharacterMutation = useMutation({
    mutationFn: async (data: InsertCharacter) => {
      return apiRequest(`/api/characters`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
      toast({ title: "Character created successfully!" });
      setIsCreating(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create character", variant: "destructive" });
    },
  });

  const generateProfileMutation = useMutation({
    mutationFn: async ({ name, role }: { name: string; role: string }) => {
      return apiRequest(`/api/characters/generate`, "POST", { name, role, genre });
    },
    onSuccess: (data) => {
      // Populate form with generated data
      Object.entries(data).forEach(([key, value]) => {
        if (key in form.getValues()) {
          form.setValue(key as keyof InsertCharacter, value as any);
        }
      });
      toast({ title: "Character profile generated!" });
    },
    onError: () => {
      toast({ title: "Failed to generate profile", variant: "destructive" });
    },
  });

  const deleteCharacterMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/characters/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
      toast({ title: "Character deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete character", variant: "destructive" });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/characters/${id}/favorite`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
    },
  });

  // Filter characters
  const filteredCharacters = characters.filter(character => {
    const matchesSearch = character.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (character.occupation?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (character.personality?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = filterRole === "all" || character.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleCreateCharacter = (data: InsertCharacter) => {
    createCharacterMutation.mutate(data);
  };

  const handleGenerateProfile = () => {
    const name = form.getValues("name");
    const role = form.getValues("role");
    
    if (!name.trim()) {
      toast({ title: "Please enter a character name first", variant: "destructive" });
      return;
    }

    generateProfileMutation.mutate({ name, role });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'protagonist': return <Star className="h-4 w-4 text-yellow-500" />;
      case 'antagonist': return <Target className="h-4 w-4 text-red-500" />;
      case 'supporting': return <Users className="h-4 w-4 text-blue-500" />;
      case 'minor': return <UserPlus className="h-4 w-4 text-gray-500" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'protagonist': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'antagonist': return 'bg-red-100 text-red-800 border-red-200';
      case 'supporting': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'minor': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateCompleteness = (character: Character): number => {
    const fields = [
      character.physicalDescription,
      character.personality,
      character.backstory,
      character.motivation,
      character.goals,
      character.fears,
      character.quirks,
      character.voiceAndSpeech
    ];
    const completed = fields.filter(field => field && field.length > 20).length;
    return Math.round((completed / fields.length) * 100);
  };

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="h-5 w-5 text-purple-600" />
            <div>
              <CardTitle className="text-purple-900">Character Development Workshop</CardTitle>
              <p className="text-sm text-purple-700">Create rich, multi-dimensional characters for your stories</p>
            </div>
          </div>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white" data-testid="button-create-character">
                <Plus className="h-4 w-4 mr-2" />
                Create Character
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Character</DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateCharacter)} className="space-y-6">
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="personality">Personality</TabsTrigger>
                      <TabsTrigger value="background">Background</TabsTrigger>
                      <TabsTrigger value="development">Development</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Character name" data-testid="input-character-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-character-role">
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="protagonist">Protagonist</SelectItem>
                                  <SelectItem value="antagonist">Antagonist</SelectItem>
                                  <SelectItem value="supporting">Supporting</SelectItem>
                                  <SelectItem value="minor">Minor</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="age"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Age</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  placeholder="Age"
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                  data-testid="input-character-age"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="gender"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gender</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} placeholder="Gender identity" data-testid="input-character-gender" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="occupation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Occupation</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="Job, profession, or role in society" data-testid="input-character-occupation" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="physicalDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Physical Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                value={field.value || ""}
                                placeholder="Describe their appearance, build, distinctive features..."
                                className="min-h-20"
                                data-testid="textarea-character-physical"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-between">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleGenerateProfile}
                          disabled={generateProfileMutation.isPending}
                          data-testid="button-generate-profile"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          {generateProfileMutation.isPending ? 'Generating...' : 'AI Generate Profile'}
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="personality" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="personality"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Personality</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                value={field.value || ""}
                                placeholder="Core traits, emotional patterns, behavioral tendencies..."
                                className="min-h-24"
                                data-testid="textarea-character-personality"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="motivation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Motivation</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                value={field.value || ""}
                                placeholder="What drives them? Internal and external motivations..."
                                className="min-h-20"
                                data-testid="textarea-character-motivation"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="goals"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Goals</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  value={field.value || ""}
                                  placeholder="Short-term and long-term objectives..."
                                  className="min-h-20"
                                  data-testid="textarea-character-goals"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="fears"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fears</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  value={field.value || ""}
                                  placeholder="Deep-seated fears, phobias, insecurities..."
                                  className="min-h-20"
                                  data-testid="textarea-character-fears"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="quirks"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quirks & Mannerisms</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                value={field.value || ""}
                                placeholder="Unique habits, gestures, speech patterns that make them memorable..."
                                className="min-h-20"
                                data-testid="textarea-character-quirks"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="background" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="backstory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Backstory</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                value={field.value || ""}
                                placeholder="Key formative experiences, family background, education, past relationships..."
                                className="min-h-32"
                                data-testid="textarea-character-backstory"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="voiceAndSpeech"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Voice & Speech Patterns</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                value={field.value || ""}
                                placeholder="How they speak, vocabulary level, accent, verbal tics..."
                                className="min-h-24"
                                data-testid="textarea-character-voice"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="development" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Development Notes</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                value={field.value || ""}
                                placeholder="Additional notes, ideas for character development, plot connections..."
                                className="min-h-24"
                                data-testid="textarea-character-notes"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createCharacterMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-save-character"
                    >
                      {createCharacterMutation.isPending ? 'Creating...' : 'Create Character'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search characters by name, occupation, or personality..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-characters"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-role">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="protagonist">Protagonist</SelectItem>
              <SelectItem value="antagonist">Antagonist</SelectItem>
              <SelectItem value="supporting">Supporting</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Character Grid */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-purple-700 mt-2">Loading characters...</p>
          </div>
        ) : filteredCharacters.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-purple-300 mb-4" />
            <h3 className="text-lg font-medium text-purple-900 mb-2">
              {characters.length === 0 ? "No Characters Yet" : "No Matching Characters"}
            </h3>
            <p className="text-purple-600 mb-4">
              {characters.length === 0 
                ? "Create your first character to start building your story world"
                : "Try adjusting your search or filters"
              }
            </p>
            {characters.length === 0 && (
              <Button 
                onClick={() => setIsCreating(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                data-testid="button-create-first-character"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Character
              </Button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCharacters.map((character) => {
              const completeness = calculateCompleteness(character);
              return (
                <Card key={character.id} className="bg-white border-purple-200 hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(character.role)}
                        <div>
                          <h3 className="font-semibold text-purple-900">{character.name}</h3>
                          <Badge variant="outline" className={getRoleColor(character.role)}>
                            {character.role}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFavoriteMutation.mutate(character.id)}
                          data-testid={`button-favorite-${character.id}`}
                        >
                          <Heart className={`h-4 w-4 ${character.isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCharacterMutation.mutate(character.id)}
                          data-testid={`button-delete-${character.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Character Info */}
                    <div className="space-y-2">
                      {character.age && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Age:</span> {character.age}
                        </p>
                      )}
                      {character.occupation && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Occupation:</span> {character.occupation}
                        </p>
                      )}
                      {character.personality && (
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {character.personality.substring(0, 120)}
                          {character.personality.length > 120 && '...'}
                        </p>
                      )}
                    </div>

                    {/* Completeness Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Profile Completeness</span>
                        <span className="text-xs font-medium text-purple-600">{completeness}%</span>
                      </div>
                      <Progress value={completeness} className="w-full h-2" />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setSelectedCharacter(character)}
                        data-testid={`button-view-${character.id}`}
                      >
                        <BookOpen className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        data-testid={`button-edit-${character.id}`}
                      >
                        <Edit3 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Character Details Dialog */}
        {selectedCharacter && (
          <Dialog open={!!selectedCharacter} onOpenChange={() => setSelectedCharacter(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  {getRoleIcon(selectedCharacter.role)}
                  <span>{selectedCharacter.name}</span>
                  <Badge variant="outline" className={getRoleColor(selectedCharacter.role)}>
                    {selectedCharacter.role}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="personality">Personality</TabsTrigger>
                  <TabsTrigger value="background">Background</TabsTrigger>
                  <TabsTrigger value="development">Development</TabsTrigger>
                  <TabsTrigger value="interview">Interview</TabsTrigger>
                  <TabsTrigger value="emotions">Journey</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="bg-purple-50 border-purple-200">
                      <CardHeader>
                        <CardTitle className="text-sm">Basic Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {selectedCharacter.age && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Age:</span>
                            <span className="text-sm font-medium">{selectedCharacter.age}</span>
                          </div>
                        )}
                        {selectedCharacter.gender && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Gender:</span>
                            <span className="text-sm font-medium">{selectedCharacter.gender}</span>
                          </div>
                        )}
                        {selectedCharacter.occupation && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Occupation:</span>
                            <span className="text-sm font-medium">{selectedCharacter.occupation}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="bg-purple-50 border-purple-200">
                      <CardHeader>
                        <CardTitle className="text-sm">Profile Status</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Completeness</span>
                            <span className="text-xs font-medium text-purple-600">
                              {calculateCompleteness(selectedCharacter)}%
                            </span>
                          </div>
                          <Progress value={calculateCompleteness(selectedCharacter)} className="w-full h-2" />
                        </div>
                        {selectedCharacter.isFavorited && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <Heart className="h-3 w-3 mr-1 fill-current" />
                            Favorited
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {selectedCharacter.physicalDescription && (
                    <Card className="bg-white border-purple-200">
                      <CardHeader>
                        <CardTitle className="text-sm">Physical Description</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700">{selectedCharacter.physicalDescription}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="personality" className="space-y-4">
                  {selectedCharacter.personality && (
                    <Card className="bg-white border-purple-200">
                      <CardHeader>
                        <CardTitle className="text-sm">Personality</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700">{selectedCharacter.personality}</p>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedCharacter.motivation && (
                      <Card className="bg-white border-purple-200">
                        <CardHeader>
                          <CardTitle className="text-sm">Motivation</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700">{selectedCharacter.motivation}</p>
                        </CardContent>
                      </Card>
                    )}

                    {selectedCharacter.goals && (
                      <Card className="bg-white border-purple-200">
                        <CardHeader>
                          <CardTitle className="text-sm">Goals</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700">{selectedCharacter.goals}</p>
                        </CardContent>
                      </Card>
                    )}

                    {selectedCharacter.fears && (
                      <Card className="bg-white border-purple-200">
                        <CardHeader>
                          <CardTitle className="text-sm">Fears</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700">{selectedCharacter.fears}</p>
                        </CardContent>
                      </Card>
                    )}

                    {selectedCharacter.quirks && (
                      <Card className="bg-white border-purple-200">
                        <CardHeader>
                          <CardTitle className="text-sm">Quirks & Mannerisms</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700">{selectedCharacter.quirks}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="background" className="space-y-4">
                  {selectedCharacter.backstory && (
                    <Card className="bg-white border-purple-200">
                      <CardHeader>
                        <CardTitle className="text-sm">Backstory</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700">{selectedCharacter.backstory}</p>
                      </CardContent>
                    </Card>
                  )}

                  {selectedCharacter.voiceAndSpeech && (
                    <Card className="bg-white border-purple-200">
                      <CardHeader>
                        <CardTitle className="text-sm">Voice & Speech Patterns</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700">{selectedCharacter.voiceAndSpeech}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="development" className="space-y-4">
                  {selectedCharacter.characterArc && (
                    <Card className="bg-white border-purple-200">
                      <CardHeader>
                        <CardTitle className="text-sm">Character Arc</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                          {typeof selectedCharacter.characterArc === 'string' 
                            ? selectedCharacter.characterArc 
                            : JSON.stringify(selectedCharacter.characterArc, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  )}

                  {selectedCharacter.relationships && Array.isArray(selectedCharacter.relationships) && selectedCharacter.relationships.length > 0 && (
                    <Card className="bg-white border-purple-200">
                      <CardHeader>
                        <CardTitle className="text-sm">Relationships</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                          {typeof selectedCharacter.relationships === 'string' 
                            ? selectedCharacter.relationships 
                            : JSON.stringify(selectedCharacter.relationships, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  )}

                  {selectedCharacter.notes && (
                    <Card className="bg-white border-purple-200">
                      <CardHeader>
                        <CardTitle className="text-sm">Development Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700">{selectedCharacter.notes}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="interview" className="space-y-4">
                  <CharacterInterview 
                    character={selectedCharacter}
                    onInterviewComplete={(data) => {
                      // Handle interview completion
                      console.log("Interview completed:", data);
                    }}
                  />
                </TabsContent>

                <TabsContent value="emotions" className="space-y-4">
                  <EmotionalJourney 
                    character={selectedCharacter}
                    onJourneyComplete={(data) => {
                      // Handle emotional journey completion
                      console.log("Emotional journey completed:", data);
                    }}
                  />
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}