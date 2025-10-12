import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Save } from "lucide-react";

interface AboutPageData {
  title: string;
  content: string;
  updatedAt: string;
}

export default function AboutPageEditor() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: aboutPage, isLoading } = useQuery<AboutPageData>({
    queryKey: ['/api/about'],
  });

  useEffect(() => {
    if (aboutPage) {
      setTitle(aboutPage.title);
      setContent(aboutPage.content);
    }
  }, [aboutPage]);

  const updateMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      return await apiRequest("/api/admin/about", "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/about'] });
      toast({
        title: "Success",
        description: "About page updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update about page",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!content.trim()) {
      toast({
        title: "Validation Error",
        description: "Content cannot be empty",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({ title, content });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit About Page</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit About Page</CardTitle>
        <CardDescription>
          Update the About page content that visitors see
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="about-title">Page Title</Label>
          <Input
            id="about-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="About AI KDP Author"
            data-testid="input-about-title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="about-content">Page Content</Label>
          <Textarea
            id="about-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter the about page content..."
            rows={12}
            className="font-mono"
            data-testid="textarea-about-content"
          />
          <p className="text-sm text-muted-foreground">
            Line breaks will be preserved in the display
          </p>
        </div>

        <div className="flex justify-between items-center pt-4">
          <p className="text-sm text-muted-foreground">
            Last updated: {aboutPage?.updatedAt ? new Date(aboutPage.updatedAt).toLocaleString() : 'Never'}
          </p>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            data-testid="button-save-about"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
