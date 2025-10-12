import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Lightbulb, FileText, Tag, Copy, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["KDP Tips", "Writing Craft", "Marketing", "Research", "Sales"];

export default function BlogPostGenerator() {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Title Generator State
  const [titleTopic, setTitleTopic] = useState("");
  const [titleCategory, setTitleCategory] = useState("KDP Tips");
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);

  // Content Generator State
  const [contentTopic, setContentTopic] = useState("");
  const [contentOutline, setContentOutline] = useState("");
  const [contentCategory, setContentCategory] = useState("KDP Tips");
  const [generatedContent, setGeneratedContent] = useState("");

  // Full Post Generator State
  const [fullPostTopic, setFullPostTopic] = useState("");
  const [fullPostCategory, setFullPostCategory] = useState("KDP Tips");
  const [fullPostKeywords, setFullPostKeywords] = useState("");
  const [generatedFullPost, setGeneratedFullPost] = useState<{
    title: string;
    excerpt: string;
    content: string;
    tags: string[];
  } | null>(null);

  // Tag Generator State
  const [tagContent, setTagContent] = useState("");
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);

  const generateTitles = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/admin/blog/generate-titles", "POST", {
        topic: titleTopic,
        category: titleCategory,
      });
    },
    onSuccess: (data: { titles: string[] }) => {
      setGeneratedTitles(data.titles);
      toast({
        title: "Titles Generated",
        description: "AI has generated title suggestions for you.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Generating Titles",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateContent = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/admin/blog/generate-content", "POST", {
        topic: contentTopic,
        outline: contentOutline,
        category: contentCategory,
      });
    },
    onSuccess: (data: { content: string }) => {
      setGeneratedContent(data.content);
      toast({
        title: "Content Generated",
        description: "AI has generated blog post content for you.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Generating Content",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateFullPost = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/admin/blog/generate-full-post", "POST", {
        topic: fullPostTopic,
        category: fullPostCategory,
        keywords: fullPostKeywords,
      });
    },
    onSuccess: (data: { title: string; excerpt: string; content: string; tags: string[] }) => {
      setGeneratedFullPost(data);
      toast({
        title: "Full Post Generated",
        description: "AI has generated a complete blog post for you.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Generating Full Post",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  const generateTags = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/admin/blog/generate-tags", "POST", {
        content: tagContent,
      });
    },
    onSuccess: (data: { tags: string[] }) => {
      setGeneratedTags(data.tags);
      toast({
        title: "Tags Generated",
        description: "AI has generated tag suggestions for you.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Generating Tags",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: "Copied to Clipboard",
      description: "Content has been copied to your clipboard.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">AI Blog Post Generator</h2>
        <p className="text-muted-foreground">
          Use AI-powered tools to generate blog post titles, content, tags, and complete articles.
        </p>
      </div>

      <Tabs defaultValue="titles" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="titles" data-testid="tab-generate-titles">
            <Lightbulb className="w-4 h-4 mr-2" />
            Titles
          </TabsTrigger>
          <TabsTrigger value="content" data-testid="tab-generate-content">
            <FileText className="w-4 h-4 mr-2" />
            Content
          </TabsTrigger>
          <TabsTrigger value="full-post" data-testid="tab-generate-full-post">
            <Sparkles className="w-4 h-4 mr-2" />
            Full Post
          </TabsTrigger>
          <TabsTrigger value="tags" data-testid="tab-generate-tags">
            <Tag className="w-4 h-4 mr-2" />
            Tags
          </TabsTrigger>
        </TabsList>

        {/* Title Generator */}
        <TabsContent value="titles">
          <Card>
            <CardHeader>
              <CardTitle>Generate Blog Post Titles</CardTitle>
              <CardDescription>
                AI will generate 5 compelling, SEO-friendly title options based on your topic.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title-topic">Topic or Main Idea</Label>
                <Input
                  id="title-topic"
                  placeholder="e.g., Amazon KDP keyword research strategies"
                  value={titleTopic}
                  onChange={(e) => setTitleTopic(e.target.value)}
                  data-testid="input-title-topic"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title-category">Category</Label>
                <Select value={titleCategory} onValueChange={setTitleCategory}>
                  <SelectTrigger id="title-category" data-testid="select-title-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={() => generateTitles.mutate()} 
                disabled={!titleTopic || generateTitles.isPending}
                className="w-full"
                data-testid="button-generate-titles"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generateTitles.isPending ? "Generating..." : "Generate Titles"}
              </Button>

              {generatedTitles.length > 0 && (
                <div className="space-y-2 mt-4">
                  <Label>Generated Titles</Label>
                  <div className="space-y-2">
                    {generatedTitles.map((title, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-muted rounded-lg" data-testid={`generated-title-${idx}`}>
                        <span className="flex-1">{title}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(title, `title-${idx}`)}
                          data-testid={`button-copy-title-${idx}`}
                        >
                          {copiedField === `title-${idx}` ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Generator */}
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Generate Blog Post Content</CardTitle>
              <CardDescription>
                Provide a topic and optional outline. AI will generate detailed, engaging content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content-topic">Topic or Title</Label>
                <Input
                  id="content-topic"
                  placeholder="e.g., How to Optimize Your KDP Book Description"
                  value={contentTopic}
                  onChange={(e) => setContentTopic(e.target.value)}
                  data-testid="input-content-topic"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content-outline">Outline or Key Points (Optional)</Label>
                <Textarea
                  id="content-outline"
                  placeholder="e.g., 1. Why book descriptions matter&#10;2. Writing compelling hooks&#10;3. Using keywords effectively&#10;4. Formatting tips"
                  value={contentOutline}
                  onChange={(e) => setContentOutline(e.target.value)}
                  rows={6}
                  data-testid="textarea-content-outline"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content-category">Category</Label>
                <Select value={contentCategory} onValueChange={setContentCategory}>
                  <SelectTrigger id="content-category" data-testid="select-content-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={() => generateContent.mutate()} 
                disabled={!contentTopic || generateContent.isPending}
                className="w-full"
                data-testid="button-generate-content"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generateContent.isPending ? "Generating..." : "Generate Content"}
              </Button>

              {generatedContent && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <Label>Generated Content (Markdown)</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generatedContent, "content")}
                      data-testid="button-copy-content"
                    >
                      {copiedField === "content" ? (
                        <Check className="w-4 h-4 mr-2 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 mr-2" />
                      )}
                      Copy All
                    </Button>
                  </div>
                  <Textarea
                    value={generatedContent}
                    readOnly
                    rows={15}
                    className="font-mono text-sm"
                    data-testid="textarea-generated-content"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Full Post Generator */}
        <TabsContent value="full-post">
          <Card>
            <CardHeader>
              <CardTitle>Generate Complete Blog Post</CardTitle>
              <CardDescription>
                AI will generate a complete blog post including title, excerpt, content, and tags.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full-post-topic">Topic or Main Idea</Label>
                <Input
                  id="full-post-topic"
                  placeholder="e.g., Self-publishing success strategies for 2025"
                  value={fullPostTopic}
                  onChange={(e) => setFullPostTopic(e.target.value)}
                  data-testid="input-full-post-topic"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full-post-keywords">Target Keywords (comma-separated)</Label>
                <Input
                  id="full-post-keywords"
                  placeholder="e.g., KDP publishing, self-publishing, Amazon authors"
                  value={fullPostKeywords}
                  onChange={(e) => setFullPostKeywords(e.target.value)}
                  data-testid="input-full-post-keywords"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full-post-category">Category</Label>
                <Select value={fullPostCategory} onValueChange={setFullPostCategory}>
                  <SelectTrigger id="full-post-category" data-testid="select-full-post-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={() => generateFullPost.mutate()} 
                disabled={!fullPostTopic || generateFullPost.isPending}
                className="w-full"
                data-testid="button-generate-full-post"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generateFullPost.isPending ? "Generating..." : "Generate Complete Post"}
              </Button>

              {generatedFullPost && (
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Title</Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(generatedFullPost.title, "full-title")}
                        data-testid="button-copy-full-title"
                      >
                        {copiedField === "full-title" ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <Input value={generatedFullPost.title} readOnly data-testid="input-generated-full-title" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Excerpt</Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(generatedFullPost.excerpt, "full-excerpt")}
                        data-testid="button-copy-full-excerpt"
                      >
                        {copiedField === "full-excerpt" ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <Textarea value={generatedFullPost.excerpt} readOnly rows={3} data-testid="textarea-generated-full-excerpt" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Content (Markdown)</Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(generatedFullPost.content, "full-content")}
                        data-testid="button-copy-full-content"
                      >
                        {copiedField === "full-content" ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <Textarea
                      value={generatedFullPost.content}
                      readOnly
                      rows={12}
                      className="font-mono text-sm"
                      data-testid="textarea-generated-full-content"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Suggested Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {generatedFullPost.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" data-testid={`badge-generated-tag-${idx}`}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tag Generator */}
        <TabsContent value="tags">
          <Card>
            <CardHeader>
              <CardTitle>Generate Tags</CardTitle>
              <CardDescription>
                AI will analyze your content and suggest relevant, SEO-friendly tags.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tag-content">Blog Post Content or Summary</Label>
                <Textarea
                  id="tag-content"
                  placeholder="Paste your blog post content or a summary here..."
                  value={tagContent}
                  onChange={(e) => setTagContent(e.target.value)}
                  rows={10}
                  data-testid="textarea-tag-content"
                />
              </div>

              <Button 
                onClick={() => generateTags.mutate()} 
                disabled={!tagContent || generateTags.isPending}
                className="w-full"
                data-testid="button-generate-tags"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generateTags.isPending ? "Generating..." : "Generate Tags"}
              </Button>

              {generatedTags.length > 0 && (
                <div className="space-y-2 mt-4">
                  <Label>Generated Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {generatedTags.map((tag, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-primary/20"
                        onClick={() => copyToClipboard(tag, `tag-${idx}`)}
                        data-testid={`badge-tag-${idx}`}
                      >
                        {tag}
                        {copiedField === `tag-${idx}` && (
                          <Check className="w-3 h-3 ml-1 text-green-600" />
                        )}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedTags.join(", "), "all-tags")}
                    className="mt-2"
                    data-testid="button-copy-all-tags"
                  >
                    {copiedField === "all-tags" ? (
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    Copy All Tags
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
