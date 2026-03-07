import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wand2, BookOpen, Users, FileEdit, Lightbulb, FlaskConical, GraduationCap } from "lucide-react";
import NovelGenerator from "./novel-generator";
import GenreWizard from "./genre-wizard";
import PlotInspirationVault from "./plot-inspiration-vault";
import CharacterWorkshop from "./character-workshop";
import { NovelComposer } from "./novel-composer";
import ResearchHub from "./research-hub";
import EducationalGenerator from "./educational-generator";
import type { Novel, NovelGenerationRequest } from "@shared/schema";

interface CreateHubProps {
  novel?: Novel;
  isGenerating: boolean;
  onStartGeneration: (params: any) => void;
  onNovelCreated?: (novel: Novel) => void;
}

export default function CreateHub({ 
  novel, 
  isGenerating, 
  onStartGeneration,
  onNovelCreated 
}: CreateHubProps) {
  const [selectedPlot, setSelectedPlot] = useState<{title: string; premise: string; genre: string} | null>(null);
  const [activeTab, setActiveTab] = useState("generator");
  const [generatorKey, setGeneratorKey] = useState(0);
  const [prefilledGeneratorData, setPrefilledGeneratorData] = useState<Partial<NovelGenerationRequest> | undefined>(undefined);

  const handleSelectPlot = (plot: { title: string; premise: string; genre: string }) => {
    setSelectedPlot(plot);
  };

  const handleUseResearchForFiction = (plot: any, topic: string) => {
    const prefill: Partial<NovelGenerationRequest> = {
      contentType: "fiction",
      title: plot.title || "",
      genre: plot.genre || "Fiction",
      plotIdea: `${plot.premise}\n\n${plot.plotSummary || ""}`.trim(),
      customInstructions: `This story is inspired by research on "${topic}". ${plot.researchTies || ""}`,
    };
    setPrefilledGeneratorData(prefill);
    setGeneratorKey(k => k + 1);
    setActiveTab("generator");
  };

  const handleUseResearchForNonfiction = (outline: any, topic: string) => {
    const prefill: Partial<NovelGenerationRequest> = {
      contentType: "non-fiction",
      title: `${outline.title}${outline.subtitle ? `: ${outline.subtitle}` : ""}`,
      nonFictionTopic: topic,
      plotIdea: outline.premise || "",
      targetAudience: outline.targetAudience || "",
      customInstructions: `Unique angle: ${outline.uniqueAngle || ""}. Learning objectives: ${(outline.learningObjectives || []).slice(0, 3).join("; ")}`,
    };
    setPrefilledGeneratorData(prefill);
    setGeneratorKey(k => k + 1);
    setActiveTab("generator");
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900">Create Your Manuscript</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Start your journey from idea to published manuscript. Generate, plan, and develop your story with AI assistance.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="generator" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="educational" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Educational
          </TabsTrigger>
          <TabsTrigger value="research" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Research
          </TabsTrigger>
          <TabsTrigger value="wizard" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Ideas
          </TabsTrigger>
          <TabsTrigger value="vault" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Plot Vault
          </TabsTrigger>
          <TabsTrigger value="characters" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Characters
          </TabsTrigger>
          <TabsTrigger value="composer" className="flex items-center gap-2">
            <FileEdit className="h-4 w-4" />
            Composer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                AI KDP Author
              </CardTitle>
              <CardDescription>
                Generate complete 50K-80K word fiction and non-fiction books ready for Amazon KDP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NovelGenerator
                key={generatorKey}
                onStartGeneration={onStartGeneration}
                isGenerating={isGenerating}
                prefilledData={prefilledGeneratorData}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="educational" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Educational Book & Series Generator
              </CardTitle>
              <CardDescription>
                Generate complete educational books or cohesive series for Elementary through High School.
                Choose age group, subject, and series length — fact-checked for applicable subjects.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EducationalGenerator onSeriesCreated={() => {}} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="research" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Research
              </CardTitle>
              <CardDescription>
                Conduct thorough subject matter research from credible academic and journalistic sources, then use it to build a fiction plot or non-fiction book structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResearchHub
                onUseForFiction={handleUseResearchForFiction}
                onUseForNonfiction={handleUseResearchForNonfiction}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wizard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Genre & Ideas Wizard
              </CardTitle>
              <CardDescription>
                Explore genres and get AI-generated plot suggestions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GenreWizard onSelectPlot={handleSelectPlot} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vault" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Plot Inspiration Vault
              </CardTitle>
              <CardDescription>
                Save and organize your story ideas and plot concepts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlotInspirationVault 
                onSelectPlot={handleSelectPlot}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="characters" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Character Development Workshop
              </CardTitle>
              <CardDescription>
                Develop rich, consistent characters with AI-powered tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CharacterWorkshop 
                novelId={novel?.id}
                genre={novel?.genre || "general"}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="composer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileEdit className="h-5 w-5" />
                Novel Composer
              </CardTitle>
              <CardDescription>
                Transform existing manuscripts into complete novels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NovelComposer onNovelGenerated={onNovelCreated} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
