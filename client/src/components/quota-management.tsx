import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Play, Clock, RefreshCw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Novel } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface QuotaManagementProps {
  novel: Novel;
}

export function QuotaManagement({ novel }: QuotaManagementProps) {
  const [batchSize, setBatchSize] = useState(3);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const batchMutation = useMutation({
    mutationFn: async ({ startChapter, batchSize }: { startChapter: number; batchSize: number }) => {
      return apiRequest(`/api/novels/${novel.id}/generate-chapters-batch`, {
        method: "POST",
        body: JSON.stringify({ startChapter, batchSize }),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: () => {
      toast({
        title: "Batch Started",
        description: "Chapter generation has started. Monitor progress below.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/novels/${novel.id}`] });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to start batch generation",
        variant: "destructive",
      });
    },
  });

  const totalChapters = (novel.outline as any)?.chapters?.length || 0;
  const completedChapters = (novel.chapters as string[])?.filter(ch => ch && ch.trim()).length || 0;
  const progressPercent = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;
  
  const nextChapter = completedChapters + 1;
  const remainingChapters = totalChapters - completedChapters;
  
  const isQuotaExceeded = novel.status === "quota_exceeded";
  const isBatchCompleted = novel.status === "batch_completed";
  const isGenerating = novel.status === "generating_chapters_batch";

  const handleContinueGeneration = () => {
    if (remainingChapters > 0) {
      batchMutation.mutate({ 
        startChapter: nextChapter, 
        batchSize: Math.min(batchSize, remainingChapters) 
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Batch Generation Management
        </CardTitle>
        <CardDescription>
          Continue generating your novel in small batches to manage API quotas
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Generation Progress</span>
            <span>{completedChapters} of {totalChapters} chapters</span>
          </div>
          <Progress value={progressPercent} className="w-full" />
          <div className="text-xs text-muted-foreground">
            {remainingChapters} chapters remaining
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          {isQuotaExceeded && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Quota Exceeded
            </Badge>
          )}
          {isBatchCompleted && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Batch Completed
            </Badge>
          )}
          {isGenerating && (
            <Badge className="flex items-center gap-1">
              <Play className="h-3 w-3" />
              Generating
            </Badge>
          )}
          {novel.status === "completed" && (
            <Badge variant="default" className="bg-green-500">
              ✓ Complete
            </Badge>
          )}
        </div>

        {/* Current Status Message */}
        {novel.progress?.currentStatus && (
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-sm">{novel.progress.currentStatus}</p>
          </div>
        )}

        {/* Error Message */}
        {novel.error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
            <p className="text-sm text-red-700">{novel.error}</p>
          </div>
        )}

        {/* Batch Controls */}
        {remainingChapters > 0 && novel.status !== "completed" && !isGenerating && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Batch Size (chapters per batch)</label>
              <div className="flex gap-2">
                {[2, 3, 4, 5].map((size) => (
                  <Button
                    key={size}
                    variant={batchSize === size ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBatchSize(size)}
                    disabled={size > remainingChapters}
                  >
                    {size}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Smaller batches reduce quota usage but take longer. Larger batches are faster but may hit quotas.
              </p>
            </div>

            <Button 
              onClick={handleContinueGeneration}
              disabled={batchMutation.isPending}
              className="w-full"
            >
              {batchMutation.isPending ? (
                "Starting Batch..."
              ) : (
                `Continue Generation (Chapters ${nextChapter}-${Math.min(nextChapter + batchSize - 1, totalChapters)})`
              )}
            </Button>
          </div>
        )}

        {/* Quota Information */}
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Quota Management Tips</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• OpenAI quotas typically reset every hour or at midnight (depending on your plan)</li>
            <li>• Smaller batch sizes (2-3 chapters) are more quota-friendly</li>
            <li>• You can pause and resume generation at any time</li>
            <li>• All completed chapters are automatically saved</li>
          </ul>
        </div>

        {/* Chapter Summary */}
        {completedChapters > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Completed Chapters</h4>
            <div className="grid grid-cols-8 gap-1">
              {Array.from({ length: totalChapters }, (_, i) => (
                <div
                  key={i + 1}
                  className={`
                    w-8 h-8 rounded text-xs flex items-center justify-center font-medium
                    ${i < completedChapters 
                      ? 'bg-green-100 text-green-700 border border-green-300' 
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }
                  `}
                  title={`Chapter ${i + 1}: ${i < completedChapters ? 'Complete' : 'Pending'}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}