import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Brain, Lightbulb, TrendingUp, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Character } from "@shared/schema";

interface CharacterInterviewProps {
  character: Character;
  onInterviewComplete?: (data: any) => void;
}

interface InterviewData {
  questions: Array<{
    question: string;
    response: string;
    insight: string;
  }>;
  summary: string;
  revelations: string[];
  developmentSuggestions: string[];
}

export default function CharacterInterview({ character, onInterviewComplete }: CharacterInterviewProps) {
  const [interviewType, setInterviewType] = useState<"personality" | "backstory" | "motivation" | "relationships">("personality");
  const [interviewData, setInterviewData] = useState<InterviewData | null>(
    character.interviewData as InterviewData | null
  );
  const { toast } = useToast();

  const interviewMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/characters/${character.id}/interview`, "POST", { interviewType });
    },
    onSuccess: (data: InterviewData) => {
      setInterviewData(data);
      onInterviewComplete?.(data);
      toast({
        title: "Interview Complete",
        description: `AI interview on ${interviewType} completed successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Interview Failed",
        description: "Unable to conduct character interview. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStartInterview = () => {
    interviewMutation.mutate();
  };

  const getInterviewTypeDescription = (type: string) => {
    switch (type) {
      case "personality":
        return "Explore core personality traits, emotional patterns, and behavioral tendencies";
      case "backstory":
        return "Delve into formative experiences, family history, and past relationships";
      case "motivation":
        return "Uncover driving forces, internal desires, and hidden motivations";
      case "relationships":
        return "Examine social connections, interpersonal dynamics, and relationship patterns";
      default:
        return "Deep character exploration";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <CardTitle>Character Interview Mode</CardTitle>
        </div>
        <p className="text-sm text-gray-600">
          Conduct an AI-powered interview to develop deeper character insights and uncover hidden depths.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Interview Configuration */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Interview Focus</label>
            <Select value={interviewType} onValueChange={(value: any) => setInterviewType(value)}>
              <SelectTrigger data-testid="select-interview-type">
                <SelectValue placeholder="Choose interview focus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personality">Personality Deep Dive</SelectItem>
                <SelectItem value="backstory">Backstory Exploration</SelectItem>
                <SelectItem value="motivation">Motivation Analysis</SelectItem>
                <SelectItem value="relationships">Relationship Dynamics</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {getInterviewTypeDescription(interviewType)}
            </p>
          </div>

          <Button
            onClick={handleStartInterview}
            disabled={interviewMutation.isPending}
            className="w-full"
            data-testid="button-start-interview"
          >
            {interviewMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Conducting Interview...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Start {interviewType} Interview
              </>
            )}
          </Button>
        </div>

        {/* Interview Results */}
        {interviewData && (
          <div className="space-y-6">
            <Separator />
            
            {/* Interview Summary */}
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <strong>Interview Summary:</strong> {interviewData.summary}
              </AlertDescription>
            </Alert>

            {/* Questions and Responses */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Interview Questions & Insights</h4>
              <ScrollArea className="h-64 w-full">
                <div className="space-y-4 pr-4">
                  {interviewData.questions.map((item, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <p className="font-medium text-sm text-blue-700">Q{index + 1}: {item.question}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-700 italic">"{item.response}"</p>
                        </div>
                        <div className="bg-blue-50 p-2 rounded">
                          <p className="text-xs text-blue-800">
                            <strong>Insight:</strong> {item.insight}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Revelations */}
            {interviewData.revelations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                  Character Revelations
                </h4>
                <div className="flex flex-wrap gap-2">
                  {interviewData.revelations.map((revelation, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {revelation}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Development Suggestions */}
            {interviewData.developmentSuggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Development Suggestions</h4>
                <ul className="list-disc list-inside space-y-1">
                  {interviewData.developmentSuggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-gray-700">
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}