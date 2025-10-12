import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, TrendingUp, BarChart3, Loader2, ArrowRight, Target } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Character } from "@shared/schema";

interface EmotionalJourneyProps {
  character: Character;
  onJourneyComplete?: (data: any) => void;
}

interface EmotionalJourneyData {
  baseline: {
    dominantEmotions: string[];
    emotionalState: string;
    triggers: string[];
    coping: string[];
  };
  journey: Array<{
    phase: string;
    events: string[];
    emotionalShifts: Array<{
      from: string;
      to: string;
      trigger: string;
      impact: "minor" | "moderate" | "major" | "transformative";
    }>;
    internalConflicts: string[];
    growth: string[];
  }>;
  emotionalArc: {
    startingPoint: string;
    lowPoint: string;
    turningPoint: string;
    resolution: string;
    transformation: string;
  };
  consistencyNotes: string[];
}

export default function EmotionalJourney({ character, onJourneyComplete }: EmotionalJourneyProps) {
  const [journeyData, setJourneyData] = useState<EmotionalJourneyData | null>(
    character.emotionalJourney as EmotionalJourneyData | null
  );
  const { toast } = useToast();

  const journeyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/characters/${character.id}/emotional-journey`, "POST", {
        storyStructure: null // Could be enhanced to include actual story structure
      });
    },
    onSuccess: (data: EmotionalJourneyData) => {
      setJourneyData(data);
      onJourneyComplete?.(data);
      toast({
        title: "Emotional Journey Mapped",
        description: "Character's emotional development has been analyzed and mapped.",
      });
    },
    onError: () => {
      toast({
        title: "Mapping Failed",
        description: "Unable to map emotional journey. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "transformative": return "text-red-600 bg-red-50";
      case "major": return "text-orange-600 bg-orange-50";
      case "moderate": return "text-yellow-600 bg-yellow-50";
      case "minor": return "text-green-600 bg-green-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const handleMapJourney = () => {
    journeyMutation.mutate();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Heart className="h-5 w-5 text-red-500" />
          <CardTitle>Emotional Journey Mapping</CardTitle>
        </div>
        <p className="text-sm text-gray-600">
          Map your character's emotional development throughout their story arc with AI-powered analysis.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!journeyData && (
          <Button
            onClick={handleMapJourney}
            disabled={journeyMutation.isPending}
            className="w-full"
            data-testid="button-map-emotional-journey"
          >
            {journeyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mapping Emotional Journey...
              </>
            ) : (
              <>
                <BarChart3 className="mr-2 h-4 w-4" />
                Map Emotional Journey
              </>
            )}
          </Button>
        )}

        {journeyData && (
          <Tabs defaultValue="baseline" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="baseline">Baseline</TabsTrigger>
              <TabsTrigger value="journey">Journey</TabsTrigger>
              <TabsTrigger value="arc">Arc</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="baseline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Emotional Baseline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Dominant Emotions</h4>
                    <div className="flex flex-wrap gap-2">
                      {journeyData.baseline.dominantEmotions.map((emotion, index) => (
                        <Badge key={index} variant="secondary">{emotion}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Emotional State</h4>
                    <Alert>
                      <AlertDescription>{journeyData.baseline.emotionalState}</AlertDescription>
                    </Alert>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Triggers</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {journeyData.baseline.triggers.map((trigger, index) => (
                          <li key={index}>{trigger}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Coping Mechanisms</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {journeyData.baseline.coping.map((coping, index) => (
                          <li key={index}>{coping}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="journey" className="space-y-4">
              <ScrollArea className="h-96 w-full">
                <div className="space-y-4 pr-4">
                  {journeyData.journey.map((phase, phaseIndex) => (
                    <Card key={phaseIndex} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <CardTitle className="text-base">{phase.phase}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {phase.events.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-2">Key Events</h5>
                            <ul className="list-disc list-inside text-sm space-y-1">
                              {phase.events.map((event, index) => (
                                <li key={index}>{event}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {phase.emotionalShifts.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-2">Emotional Shifts</h5>
                            <div className="space-y-2">
                              {phase.emotionalShifts.map((shift, index) => (
                                <div key={index} className="flex items-center space-x-2 text-sm">
                                  <Badge variant="outline">{shift.from}</Badge>
                                  <ArrowRight className="h-3 w-3" />
                                  <Badge variant="outline">{shift.to}</Badge>
                                  <Badge className={`text-xs ${getImpactColor(shift.impact)}`}>
                                    {shift.impact}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {phase.internalConflicts.length > 0 && (
                            <div>
                              <h5 className="font-medium text-sm mb-2">Internal Conflicts</h5>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {phase.internalConflicts.map((conflict, index) => (
                                  <li key={index}>{conflict}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {phase.growth.length > 0 && (
                            <div>
                              <h5 className="font-medium text-sm mb-2">Growth</h5>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {phase.growth.map((growth, index) => (
                                  <li key={index}>{growth}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="arc" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Complete Emotional Arc</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">Starting Point:</span>
                    </div>
                    <p className="text-sm text-gray-700 ml-6">{journeyData.emotionalArc.startingPoint}</p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                      <span className="font-medium text-sm">Low Point:</span>
                    </div>
                    <p className="text-sm text-gray-700 ml-6">{journeyData.emotionalArc.lowPoint}</p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium text-sm">Turning Point:</span>
                    </div>
                    <p className="text-sm text-gray-700 ml-6">{journeyData.emotionalArc.turningPoint}</p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">Resolution:</span>
                    </div>
                    <p className="text-sm text-gray-700 ml-6">{journeyData.emotionalArc.resolution}</p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">Transformation:</span>
                    </div>
                    <p className="text-sm text-gray-700 ml-6">{journeyData.emotionalArc.transformation}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Consistency Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {journeyData.consistencyNotes.length > 0 ? (
                    <ul className="list-disc list-inside text-sm space-y-2">
                      {journeyData.consistencyNotes.map((note, index) => (
                        <li key={index}>{note}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No consistency notes available.</p>
                  )}
                </CardContent>
              </Card>

              <Button
                onClick={handleMapJourney}
                disabled={journeyMutation.isPending}
                variant="outline"
                className="w-full"
              >
                {journeyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Regenerate Journey Map
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}