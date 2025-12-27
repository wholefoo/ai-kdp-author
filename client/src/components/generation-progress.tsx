import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Novel } from "@shared/schema";

interface GenerationProgressProps {
  novel?: Novel;
  onCancel: () => void;
}

export default function GenerationProgress({ novel, onCancel }: GenerationProgressProps) {
  // Early return if no novel provided
  if (!novel) {
    return (
      <Card className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <CardContent className="p-6 text-center">
          <p className="text-slate-600">Loading book generation...</p>
        </CardContent>
      </Card>
    );
  }

  // Poll for updates every 2 seconds
  const { data: updatedNovel } = useQuery<Novel>({
    queryKey: ["/api/novels", novel.id],
    refetchInterval: 2000,
    enabled: novel.status === "generating_outline" || novel.status === "generating_chapters" || novel.status === "compiling",
  });

  const currentNovel = updatedNovel || novel;
  const progress = (currentNovel.progress as any) || { overall: 0, step1: 0, step2: 0, step3: 0 };

  const getStepStatus = (step: number) => {
    switch (step) {
      case 1:
        return progress.step1 === 100 ? "complete" : progress.step1 > 0 ? "in-progress" : "pending";
      case 2:
        return progress.step2 === 100 ? "complete" : progress.step2 > 0 ? "in-progress" : "pending";
      case 3:
        return progress.step3 === 100 ? "complete" : progress.step3 > 0 ? "in-progress" : "pending";
      default:
        return "pending";
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case "complete":
        return "bg-accent text-white";
      case "in-progress":
        return "bg-warning text-white";
      default:
        return "bg-slate-300 text-slate-600";
    }
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Generating Your Book</h2>
        <p className="text-slate-600 mt-1">Please wait while we create your complete book...</p>
      </div>

      <CardContent className="p-6">
        {/* Overall Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Overall Progress</span>
            <span className="text-sm text-slate-600" data-testid="text-overall-progress">
              {Math.round(progress.overall || 0)}%
            </span>
          </div>
          <Progress value={progress.overall || 0} className="w-full h-2" />
        </div>

        {/* Step-by-Step Progress */}
        <div className="space-y-6">
          {/* Step 1: Outline Generation */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStepColor(getStepStatus(1))}`}>
                <i className="fas fa-list text-sm"></i>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-slate-900">Step 1: Generating Outline</h3>
              <p className="text-slate-600 text-sm mt-1">Creating detailed story structure and character arcs...</p>
              <div className="mt-3">
                <div className="flex items-center space-x-2">
                  <Progress value={progress.step1 || 0} className="w-full h-1.5" />
                  <span className="text-xs text-slate-600 whitespace-nowrap">
                    {getStepStatus(1) === "complete" ? "Complete" : 
                     getStepStatus(1) === "in-progress" ? "In Progress" : "Pending"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Chapter Generation */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStepColor(getStepStatus(2))}`}>
                <i className="fas fa-book text-sm"></i>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-slate-900">Step 2: Writing Chapters</h3>
              <p className="text-slate-600 text-sm mt-1">Generating full chapter content...</p>
              <div className="mt-3">
                {progress.totalChapters && progress.currentChapter && (
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span>Chapter {progress.currentChapter} of {progress.totalChapters}</span>
                    <span>{Math.floor((progress.currentChapter - 1) * 100 / progress.totalChapters)}% completed</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Progress value={progress.step2 || 0} className="w-full h-1.5" />
                  <span className="text-xs text-slate-600 whitespace-nowrap">
                    {getStepStatus(2) === "complete" ? "Complete" : 
                     getStepStatus(2) === "in-progress" ? "In Progress" : "Pending"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Compilation */}
          <div className={`flex items-start space-x-4 ${getStepStatus(3) === "pending" ? "opacity-50" : ""}`}>
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStepColor(getStepStatus(3))}`}>
                <i className="fas fa-file-alt text-sm"></i>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-slate-900">Step 3: Compiling Manuscript</h3>
              <p className="text-slate-600 text-sm mt-1">Assembling final novel with proper formatting...</p>
              <div className="mt-3">
                <div className="flex items-center space-x-2">
                  <Progress value={progress.step3 || 0} className="w-full h-1.5" />
                  <span className="text-xs text-slate-600 whitespace-nowrap">
                    {getStepStatus(3) === "complete" ? "Complete" : 
                     getStepStatus(3) === "in-progress" ? "In Progress" : "Pending"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Status */}
        <div className="mt-8 bg-slate-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin">
              <i className="fas fa-spinner text-primary"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900" data-testid="text-current-status">
                {progress.currentStatus || "Initializing..."}
              </p>
              {progress.estimatedTimeRemaining && (
                <p className="text-xs text-slate-600 mt-1">
                  Estimated time remaining: {progress.estimatedTimeRemaining}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        <div className="mt-6 flex justify-center">
          <Button 
            variant="ghost"
            onClick={onCancel}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm transition-colors"
            data-testid="button-cancel-generation"
          >
            <i className="fas fa-stop mr-2"></i>
            Cancel Generation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
