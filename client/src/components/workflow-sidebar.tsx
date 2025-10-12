import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Wand2, 
  FileEdit, 
  Download, 
  CheckCircle, 
  Circle,
  BookOpen 
} from "lucide-react";

interface WorkflowSidebarProps {
  currentStage: "create" | "refine" | "publish";
  onStageChange: (stage: "create" | "refine" | "publish") => void;
  progress?: {
    create: number;
    refine: number;
    publish: number;
  };
}

export default function WorkflowSidebar({ 
  currentStage, 
  onStageChange, 
  progress = { create: 0, refine: 0, publish: 0 } 
}: WorkflowSidebarProps) {
  const stages = [
    {
      id: "create" as const,
      title: "Create",
      description: "Generate your novel",
      icon: Wand2,
      progress: progress.create
    },
    {
      id: "refine" as const,
      title: "Refine",
      description: "Analyze & improve",
      icon: FileEdit,
      progress: progress.refine
    },
    {
      id: "publish" as const,
      title: "Publish",
      description: "Export & share",
      icon: Download,
      progress: progress.publish
    }
  ];

  return (
    <Card className="w-80 h-fit">
      <CardContent className="p-6">
        <div className="space-y-2 mb-6">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Novel Workflow</h2>
          </div>
          <p className="text-sm text-slate-600">
            Follow the guided process from creation to publication
          </p>
        </div>

        <div className="space-y-4">
          {stages.map((stage, index) => {
            const isActive = currentStage === stage.id;
            const isCompleted = stage.progress >= 100;
            
            return (
              <div key={stage.id} className="space-y-2">
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className="w-full justify-start p-3 h-auto"
                  onClick={() => onStageChange(stage.id)}
                  data-testid={`stage-${stage.id}`}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div className="relative">
                      <stage.icon className="h-5 w-5" />
                      {isCompleted && (
                        <CheckCircle className="h-3 w-3 absolute -top-1 -right-1 text-green-500 bg-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{stage.title}</div>
                      <div className="text-xs opacity-75">{stage.description}</div>
                    </div>
                  </div>
                </Button>
                
                {stage.progress > 0 && (
                  <div className="px-3">
                    <Progress value={stage.progress} className="h-2" />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>Progress</span>
                      <span>{Math.round(stage.progress)}%</span>
                    </div>
                  </div>
                )}

                {index < stages.length - 1 && (
                  <div className="flex justify-center py-2">
                    <div className="w-px h-4 bg-slate-200"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-3 bg-slate-50 rounded-lg">
          <div className="text-sm font-medium text-slate-700 mb-2">
            Current Stage
          </div>
          <div className="text-xs text-slate-600">
            {currentStage === "create" && "Generate novels, explore ideas, and develop characters"}
            {currentStage === "refine" && "Upload manuscripts and analyze quality"}
            {currentStage === "publish" && "Access your library and export novels"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}