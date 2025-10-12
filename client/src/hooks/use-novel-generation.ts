import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import type { Novel, NovelGenerationRequest } from "@shared/schema";

export function useNovelGeneration() {
  const [currentNovelId, setCurrentNovelId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get current novel data
  const { data: novel, isLoading } = useQuery<Novel>({
    queryKey: ["/api/novels", currentNovelId],
    enabled: !!currentNovelId,
  });

  // Create novel mutation
  const createNovelMutation = useMutation({
    mutationFn: async (request: NovelGenerationRequest) => {
      return await apiRequest("/api/novels", "POST", request);
    },
    onSuccess: (novel) => {
      setCurrentNovelId(novel.id);
      setCurrentStep(2);
      // Start outline generation immediately
      generateOutlineMutation.mutate(novel.id);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create novel. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate outline mutation
  const generateOutlineMutation = useMutation({
    mutationFn: async (novelId: string) => {
      return await apiRequest(`/api/novels/${novelId}/generate-outline`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Outline generation started!",
      });
      // Poll for outline completion
      const checkOutline = () => {
        queryClient.invalidateQueries({ queryKey: ["/api/novels", currentNovelId] });
        
        const updatedNovel = queryClient.getQueryData(["/api/novels", currentNovelId]) as Novel;
        if (updatedNovel?.status === "outline_generated") {
          setCurrentStep(4); // Show outline preview
          return;
        }
        if (updatedNovel?.status === "error") {
          toast({
            title: "Error",
            description: updatedNovel.error || "Failed to generate outline",
            variant: "destructive",
          });
          return;
        }
        
        setTimeout(checkOutline, 2000);
      };
      setTimeout(checkOutline, 2000);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to start outline generation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate chapters mutation
  const generateChaptersMutation = useMutation({
    mutationFn: async (novelId: string) => {
      return await apiRequest(`/api/novels/${novelId}/generate-chapters`, "POST");
    },
    onSuccess: () => {
      setCurrentStep(3); // Show progress
      toast({
        title: "Success",
        description: "Chapter generation started!",
      });
      
      // Poll for completion
      const checkCompletion = () => {
        queryClient.invalidateQueries({ queryKey: ["/api/novels", currentNovelId] });
        
        const updatedNovel = queryClient.getQueryData(["/api/novels", currentNovelId]) as Novel;
        if (updatedNovel?.status === "completed") {
          setCurrentStep(5); // Show completed novel
          toast({
            title: "Success",
            description: "Novel generation completed!",
          });
          return;
        }
        if (updatedNovel?.status === "error") {
          toast({
            title: "Error",
            description: updatedNovel.error || "Failed to generate chapters",
            variant: "destructive",
          });
          return;
        }
        
        setTimeout(checkCompletion, 5000);
      };
      setTimeout(checkCompletion, 5000);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to start chapter generation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Cancel generation mutation
  const cancelMutation = useMutation({
    mutationFn: async (novelId: string) => {
      return await apiRequest(`/api/novels/${novelId}/cancel`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Cancelled",
        description: "Novel generation has been cancelled.",
      });
      resetGeneration();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to cancel generation.",
        variant: "destructive",
      });
    },
  });

  const startGeneration = useCallback((request: NovelGenerationRequest) => {
    createNovelMutation.mutate(request);
  }, [createNovelMutation]);

  const proceedToChapters = useCallback(() => {
    if (currentNovelId) {
      generateChaptersMutation.mutate(currentNovelId);
    }
  }, [currentNovelId, generateChaptersMutation]);

  const cancelGeneration = useCallback(() => {
    if (currentNovelId) {
      cancelMutation.mutate(currentNovelId);
    }
  }, [currentNovelId, cancelMutation]);

  const downloadNovel = useCallback((format: 'md' | 'docx' = 'docx', preset: 'kdp' | 'manuscript' | 'ebook' | 'createspace' = 'kdp') => {
    if (currentNovelId) {
      const params = new URLSearchParams();
      params.append('format', format);
      if (format === 'docx') {
        params.append('preset', preset);
      }
      
      const downloadUrl = `/api/novels/${currentNovelId}/download?${params.toString()}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${novel?.title || 'novel'}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Success",
        description: `Novel downloaded as ${format.toUpperCase()} successfully!`,
      });
    }
  }, [currentNovelId, novel?.title, toast]);

  const resetGeneration = useCallback(() => {
    setCurrentNovelId(null);
    setCurrentStep(1);
    queryClient.clear();
  }, [queryClient]);

  return {
    novel,
    isLoading,
    isGenerating: createNovelMutation.isPending || generateOutlineMutation.isPending || generateChaptersMutation.isPending,
    currentStep,
    startGeneration,
    proceedToChapters,
    cancelGeneration,
    downloadNovel,
    resetGeneration,
  };
}
