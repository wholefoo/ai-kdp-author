import { useState, useEffect } from "react";
import type { Novel } from "@shared/schema";
import GenerationProgress from "./generation-progress";
import OutlinePreview from "./outline-preview";
import CompletedNovel from "./completed-novel";
import CreateHub from "./create-hub";
import RefineHub from "./refine-hub";
import PublishHub from "./publish-hub";
import WorkflowSidebar from "./workflow-sidebar";
import SubscriptionGuard from "./subscription-guard";
import { useNovelGeneration } from "../hooks/use-novel-generation";
import { BookOpen, Shield, FileText, GraduationCap, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

type WorkflowStage = "create" | "refine" | "publish";

export default function ConsolidatedHome() {
  const [currentStage, setCurrentStage] = useState<WorkflowStage | null>(null);
  const {
    novel,
    isGenerating,
    currentStep,
    startGeneration,
    proceedToChapters,
    cancelGeneration,
    downloadNovel,
    resetGeneration
  } = useNovelGeneration();

  // Check if user is admin
  const { data: subscriptionStatus } = useQuery<any>({
    queryKey: ['/api/subscription/status'],
  });

  // Fetch user's novels to determine initial stage
  const { data: novels = [] } = useQuery<Novel[]>({
    queryKey: ['/api/novels'],
  });

  // Set initial stage based on whether user has novels
  useEffect(() => {
    if (currentStage === null) {
      // If user has novels, start on publish (library view)
      // If no novels, start on create (generation form)
      setCurrentStage(novels.length > 0 ? "publish" : "create");
    }
  }, [novels, currentStage]);

  // Calculate progress for each stage based on novel generation state
  const getProgress = () => {
    let createProgress = 0;
    let refineProgress = 0;
    let publishProgress = 0;

    // Create stage progress based on generation steps
    if (currentStep >= 2) createProgress = 25; // Started generation
    if (currentStep >= 3) createProgress = 50; // In progress
    if (currentStep >= 4) createProgress = 75; // Outline ready
    if (currentStep >= 5) createProgress = 100; // Completed

    // Auto-advance to refine when novel is complete
    if (currentStep === 5 && currentStage === "create") {
      setCurrentStage("refine");
    }

    return { create: createProgress, refine: refineProgress, publish: publishProgress };
  };

  const handleNovelCreated = (novel: Novel) => {
    // Move to refine stage when a novel is created
    setCurrentStage("refine");
  };

  // Show generation progress when actively generating
  if (isGenerating && (currentStep === 2 || currentStep === 3)) {
    return (
      <div className="bg-slate-50 font-inter min-h-screen">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-white rounded-lg p-2">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">AI KDP Author</h1>
                <p className="text-slate-600 text-sm">Creating your book...</p>
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-6xl mx-auto px-4 py-8">
          <GenerationProgress 
            novel={novel}
            onCancel={cancelGeneration}
          />
        </main>
      </div>
    );
  }

  // Show outline preview step
  if (currentStep === 4 && novel) {
    return (
      <div className="bg-slate-50 font-inter min-h-screen">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-white rounded-lg p-2">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">AI KDP Author</h1>
                <p className="text-slate-600 text-sm">Review your book outline</p>
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-6xl mx-auto px-4 py-8">
          <OutlinePreview 
            novel={novel as Novel}
            onProceedToChapters={proceedToChapters}
            onEdit={() => {/* TODO: Implement edit functionality */}}
          />
        </main>
      </div>
    );
  }

  // Show completed novel step
  if (currentStep === 5 && novel) {
    return (
      <div className="bg-slate-50 font-inter min-h-screen">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-white rounded-lg p-2">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">AI KDP Author</h1>
                <p className="text-slate-600 text-sm">Novel completed successfully!</p>
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-6xl mx-auto px-4 py-8">
          <CompletedNovel 
            novel={novel as Novel}
            onDownload={downloadNovel}
            onGenerateAnother={resetGeneration}
          />
        </main>
      </div>
    );
  }

  // Show loading state while determining initial stage
  if (currentStage === null) {
    return (
      <div className="bg-slate-50 font-inter min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Main workflow interface with three hubs
  return (
    <div className="bg-slate-50 font-inter min-h-screen">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-white rounded-lg p-2">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">AI KDP Author</h1>
                <p className="text-slate-600 text-sm">Create complete novels ready for Amazon KDP</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <a href="/blog" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" data-testid="button-blog">
                  <Newspaper className="h-4 w-4 mr-2" />
                  Blog
                </Button>
              </a>
              
              <Link href="/documentation">
                <Button variant="outline" size="sm" data-testid="button-documentation">
                  <FileText className="h-4 w-4 mr-2" />
                  Documentation
                </Button>
              </Link>
              
              <Link href="/tutorials">
                <Button variant="outline" size="sm" data-testid="button-tutorials">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Tutorials
                </Button>
              </Link>
              
              {subscriptionStatus?.isAdmin && (
                <Link href="/admin">
                  <Button variant="outline" size="sm" data-testid="button-admin-dashboard">
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Dashboard
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Persistent Sidebar */}
          <WorkflowSidebar
            currentStage={currentStage}
            onStageChange={setCurrentStage}
            progress={getProgress()}
          />

          {/* Main Content Area */}
          <div className="flex-1">
            {currentStage === "create" && (
              <SubscriptionGuard feature="Novel Creation" requiresPro={true}>
                <CreateHub
                  novel={novel}
                  isGenerating={isGenerating}
                  onStartGeneration={startGeneration}
                  onNovelCreated={handleNovelCreated}
                />
              </SubscriptionGuard>
            )}

            {currentStage === "refine" && (
              <SubscriptionGuard feature="Novel Refinement Tools" requiresPro={false}>
                <RefineHub novel={novel} />
              </SubscriptionGuard>
            )}

            {currentStage === "publish" && (
              <SubscriptionGuard feature="Publishing & Export Tools" requiresPro={true}>
                <PublishHub novel={novel} />
              </SubscriptionGuard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}