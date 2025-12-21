import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Megaphone, 
  Share2, 
  Mail, 
  FileText, 
  Quote, 
  Calendar,
  DollarSign,
  Sparkles,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
  ShoppingCart,
  Tag,
  BookOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Novel, MarketingCampaign } from "@shared/schema";

interface PromotionHubProps {
  novel?: Novel;
}

interface SocialMediaPost {
  content: string;
  hashtags: string[];
  platform: string;
  type: string;
}

interface QuotableExcerpt {
  excerpt: string;
  chapter: number;
  context: string;
}

interface ChapterTeaser {
  chapterNumber: number;
  chapterTitle: string;
  teaser: string;
}

interface LaunchTimelineItem {
  day: number;
  phase: string;
  activities: string[];
  tips: string;
}

interface PricingRecommendation {
  launchPrice: string;
  regularPrice: string;
  promotionalStrategy: string;
  kdpSelectRecommendation: boolean;
  reasoning: string;
}

export default function PromotionHub({ novel }: PromotionHubProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedNovelId, setSelectedNovelId] = useState<string | undefined>(novel?.id);

  const { data: novels } = useQuery<Novel[]>({
    queryKey: ['/api/novels'],
  });

  const completedNovels = novels?.filter(n => n.status === 'completed') || [];
  const selectedNovel = completedNovels.find(n => n.id === selectedNovelId) || novel;

  const { data: campaign, isLoading: campaignLoading, refetch: refetchCampaign } = useQuery<MarketingCampaign | null>({
    queryKey: ['/api/marketing/novels', selectedNovelId, 'campaign'],
    enabled: !!selectedNovelId,
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (novelId: string) => {
      const response = await apiRequest(`/api/marketing/novels/${novelId}/campaign`, 'POST');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/novels', selectedNovelId, 'campaign'] });
      toast({ title: "Marketing campaign created!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const generateFullCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await apiRequest(`/api/marketing/campaigns/${campaignId}/generate`, 'POST');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/novels', selectedNovelId, 'campaign'] });
      toast({ title: "Marketing content generated successfully!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const generateContentMutation = useMutation({
    mutationFn: async ({ campaignId, contentType }: { campaignId: string; contentType: string }) => {
      const response = await apiRequest(`/api/marketing/campaigns/${campaignId}/generate/${contentType}`, 'POST');
      return response;
    },
    onSuccess: () => {
      refetchCampaign();
      toast({ title: "Content generated!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  const handleStartCampaign = async () => {
    if (!selectedNovelId) return;
    await createCampaignMutation.mutateAsync(selectedNovelId);
  };

  const handleGenerateAll = async () => {
    if (!campaign?.id) return;
    await generateFullCampaignMutation.mutateAsync(campaign.id);
  };

  const handleGenerateContent = async (contentType: string) => {
    if (!campaign?.id) return;
    await generateContentMutation.mutateAsync({ campaignId: campaign.id, contentType });
  };

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleCopy(text, id)}
      data-testid={`copy-${id}`}
    >
      {copiedId === id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </Button>
  );

  const GenerateButton = ({ contentType, label }: { contentType: string; label: string }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => handleGenerateContent(contentType)}
      disabled={generateContentMutation.isPending}
      data-testid={`generate-${contentType}`}
    >
      {generateContentMutation.isPending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      {label}
    </Button>
  );

  if (!selectedNovel && completedNovels.length === 0) {
    return (
      <div className="text-center py-12">
        <Megaphone className="h-16 w-16 mx-auto mb-4 text-slate-300" />
        <h3 className="text-xl font-semibold text-slate-700 mb-2">No Completed Novels</h3>
        <p className="text-slate-500 max-w-md mx-auto">
          Complete a novel first to access marketing and promotion tools.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900">Promote Your Novel</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          AI-powered marketing tools to help you launch and promote your book on Amazon KDP and social media.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Select Novel to Promote
              </CardTitle>
              <CardDescription>
                Choose a completed novel to generate marketing materials
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Select value={selectedNovelId} onValueChange={setSelectedNovelId}>
            <SelectTrigger data-testid="select-novel">
              <SelectValue placeholder="Select a completed novel" />
            </SelectTrigger>
            <SelectContent>
              {completedNovels.map((n) => (
                <SelectItem key={n.id} value={n.id} data-testid={`novel-option-${n.id}`}>
                  {n.title} ({n.genre})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedNovelId && !campaign && (
            <div className="mt-4">
              <Button 
                onClick={handleStartCampaign}
                disabled={createCampaignMutation.isPending}
                className="w-full"
                data-testid="start-campaign"
              >
                {createCampaignMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Start Marketing Campaign
              </Button>
            </div>
          )}

          {campaign && (
            <div className="mt-4 flex items-center justify-between">
              <Badge variant={campaign.status === 'completed' ? 'default' : 'secondary'}>
                {campaign.status === 'completed' ? 'Campaign Ready' : campaign.status === 'in_progress' ? 'Generating...' : 'Draft'}
              </Badge>
              <Button 
                onClick={handleGenerateAll}
                disabled={generateFullCampaignMutation.isPending}
                data-testid="generate-all"
              >
                {generateFullCampaignMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate All Content
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {campaign && (
        <Tabs defaultValue="amazon" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="amazon" className="flex items-center gap-1" data-testid="tab-amazon">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Amazon</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-1" data-testid="tab-social">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Social</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-1" data-testid="tab-email">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-1" data-testid="tab-content">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Content</span>
            </TabsTrigger>
            <TabsTrigger value="strategy" className="flex items-center gap-1" data-testid="tab-strategy">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Strategy</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="amazon" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Amazon Book Description</CardTitle>
                  <CardDescription>HTML-formatted description for your KDP listing</CardDescription>
                </div>
                <div className="flex gap-2">
                  {campaign.amazonDescription && <CopyButton text={campaign.amazonDescription} id="amazon-desc" />}
                  <GenerateButton contentType="amazon-description" label="Generate" />
                </div>
              </CardHeader>
              <CardContent>
                {campaign.amazonDescription ? (
                  <div className="bg-slate-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: campaign.amazonDescription }} />
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Click Generate to create your Amazon description</p>
                )}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Keywords
                    </CardTitle>
                    <CardDescription>7 optimized search keywords</CardDescription>
                  </div>
                  <GenerateButton contentType="amazon-keywords" label="Generate" />
                </CardHeader>
                <CardContent>
                  {campaign.amazonKeywords && (campaign.amazonKeywords as string[]).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(campaign.amazonKeywords as string[]).map((keyword, i) => (
                        <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => handleCopy(keyword, `kw-${i}`)}>
                          {keyword}
                          {copiedId === `kw-${i}` && <Check className="h-3 w-3 ml-1" />}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">Generate keywords for Amazon search optimization</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Categories</CardTitle>
                    <CardDescription>Recommended BISAC categories</CardDescription>
                  </div>
                  <GenerateButton contentType="amazon-categories" label="Generate" />
                </CardHeader>
                <CardContent>
                  {campaign.amazonCategories && (campaign.amazonCategories as string[]).length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {(campaign.amazonCategories as string[]).map((cat, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-green-500">•</span>
                          {cat}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 text-sm">Generate category recommendations</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="social" className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              {(['twitter', 'facebook', 'instagram', 'linkedin'] as const).map((platform) => {
                const posts = campaign[`${platform}Posts` as keyof MarketingCampaign] as SocialMediaPost[] || [];
                const Icon = platform === 'twitter' ? Twitter : platform === 'facebook' ? Facebook : platform === 'instagram' ? Instagram : Linkedin;
                
                return (
                  <Card key={platform}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        <CardTitle className="text-lg capitalize">{platform}</CardTitle>
                      </div>
                      <GenerateButton contentType={platform} label="Generate" />
                    </CardHeader>
                    <CardContent>
                      {posts.length > 0 ? (
                        <ScrollArea className="h-64">
                          <div className="space-y-3">
                            {posts.map((post, i) => (
                              <div key={i} className="p-3 bg-slate-50 rounded-lg relative group">
                                <Badge variant="outline" className="mb-2 text-xs">{post.type}</Badge>
                                <p className="text-sm mb-2">{post.content}</p>
                                <div className="flex flex-wrap gap-1">
                                  {post.hashtags?.map((tag, j) => (
                                    <span key={j} className="text-xs text-blue-500">#{tag}</span>
                                  ))}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                                  onClick={() => handleCopy(post.content + '\n' + post.hashtags?.map(t => '#' + t).join(' '), `${platform}-${i}`)}
                                >
                                  {copiedId === `${platform}-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <p className="text-slate-500 text-sm">Generate {platform} posts</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Subject Lines</CardTitle>
                    <CardDescription>5 high-converting email subjects</CardDescription>
                  </div>
                  <GenerateButton contentType="email-subjects" label="Generate" />
                </CardHeader>
                <CardContent>
                  {campaign.emailSubjectLines && (campaign.emailSubjectLines as string[]).length > 0 ? (
                    <div className="space-y-2">
                      {(campaign.emailSubjectLines as string[]).map((subject, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded group">
                          <span className="text-sm">{subject}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={() => handleCopy(subject, `subject-${i}`)}
                          >
                            {copiedId === `subject-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">Generate email subject lines</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Newsletter Template</CardTitle>
                    <CardDescription>Launch announcement email</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {campaign.emailNewsletter && <CopyButton text={campaign.emailNewsletter} id="newsletter" />}
                    <GenerateButton contentType="email-newsletter" label="Generate" />
                  </div>
                </CardHeader>
                <CardContent>
                  {campaign.emailNewsletter ? (
                    <ScrollArea className="h-64">
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-sm bg-slate-50 p-4 rounded">{campaign.emailNewsletter}</pre>
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-slate-500 text-sm">Generate newsletter template</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Book Blurb</CardTitle>
                    <CardDescription>Back cover copy</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {campaign.bookBlurb && <CopyButton text={campaign.bookBlurb} id="blurb" />}
                    <GenerateButton contentType="book-blurb" label="Generate" />
                  </div>
                </CardHeader>
                <CardContent>
                  {campaign.bookBlurb ? (
                    <p className="text-sm leading-relaxed">{campaign.bookBlurb}</p>
                  ) : (
                    <p className="text-slate-500 text-sm">Generate book blurb</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Elevator Pitch</CardTitle>
                    <CardDescription>30-second pitch</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {campaign.elevatorPitch && <CopyButton text={campaign.elevatorPitch} id="pitch" />}
                    <GenerateButton contentType="elevator-pitch" label="Generate" />
                  </div>
                </CardHeader>
                <CardContent>
                  {campaign.elevatorPitch ? (
                    <p className="text-sm leading-relaxed font-medium">{campaign.elevatorPitch}</p>
                  ) : (
                    <p className="text-slate-500 text-sm">Generate elevator pitch</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Author Bio</CardTitle>
                    <CardDescription>Multiple length versions</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {campaign.authorBio && <CopyButton text={campaign.authorBio} id="bio" />}
                    <GenerateButton contentType="author-bio" label="Generate" />
                  </div>
                </CardHeader>
                <CardContent>
                  {campaign.authorBio ? (
                    <ScrollArea className="h-48">
                      <pre className="whitespace-pre-wrap text-sm">{campaign.authorBio}</pre>
                    </ScrollArea>
                  ) : (
                    <p className="text-slate-500 text-sm">Generate author bio templates</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Press Release</CardTitle>
                    <CardDescription>Media announcement template</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {campaign.pressRelease && <CopyButton text={campaign.pressRelease} id="press" />}
                    <GenerateButton contentType="press-release" label="Generate" />
                  </div>
                </CardHeader>
                <CardContent>
                  {campaign.pressRelease ? (
                    <ScrollArea className="h-48">
                      <pre className="whitespace-pre-wrap text-sm">{campaign.pressRelease}</pre>
                    </ScrollArea>
                  ) : (
                    <p className="text-slate-500 text-sm">Generate press release</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Quote className="h-5 w-5" />
                    Quotable Excerpts
                  </CardTitle>
                  <CardDescription>Shareable quotes from your book</CardDescription>
                </div>
                <GenerateButton contentType="quotable-excerpts" label="Generate" />
              </CardHeader>
              <CardContent>
                {(campaign.quotableExcerpts as QuotableExcerpt[])?.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-3">
                    {(campaign.quotableExcerpts as QuotableExcerpt[]).map((quote, i) => (
                      <div key={i} className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border-l-4 border-blue-500 group relative">
                        <p className="text-sm italic mb-2">"{quote.excerpt}"</p>
                        <p className="text-xs text-slate-500">— Chapter {quote.chapter}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                          onClick={() => handleCopy(quote.excerpt, `quote-${i}`)}
                        >
                          {copiedId === `quote-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Generate quotable excerpts</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="strategy" className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Pricing Strategy
                    </CardTitle>
                    <CardDescription>KDP pricing recommendations</CardDescription>
                  </div>
                  <GenerateButton contentType="pricing" label="Generate" />
                </CardHeader>
                <CardContent>
                  {campaign.pricingRecommendation ? (
                    <div className="space-y-3">
                      {(() => {
                        const pricing = campaign.pricingRecommendation as PricingRecommendation;
                        return (
                          <>
                            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                              <span className="font-medium">Launch Price</span>
                              <span className="text-2xl font-bold text-green-600">{pricing.launchPrice}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                              <span className="font-medium">Regular Price</span>
                              <span className="text-2xl font-bold text-blue-600">{pricing.regularPrice}</span>
                            </div>
                            <Separator />
                            <div>
                              <p className="font-medium mb-1">Strategy:</p>
                              <p className="text-sm text-slate-600">{pricing.promotionalStrategy}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={pricing.kdpSelectRecommendation ? 'default' : 'secondary'}>
                                KDP Select: {pricing.kdpSelectRecommendation ? 'Recommended' : 'Not Recommended'}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500">{pricing.reasoning}</p>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">Generate pricing recommendations</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Launch Timeline
                    </CardTitle>
                    <CardDescription>14-day launch plan</CardDescription>
                  </div>
                  <GenerateButton contentType="launch-timeline" label="Generate" />
                </CardHeader>
                <CardContent>
                  {(campaign.launchTimeline as LaunchTimelineItem[])?.length > 0 ? (
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {(campaign.launchTimeline as LaunchTimelineItem[]).map((item, i) => (
                          <div key={i} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant={item.day === 0 ? 'default' : item.day < 0 ? 'secondary' : 'outline'}>
                                {item.day === 0 ? 'LAUNCH DAY' : item.day < 0 ? `Day ${item.day}` : `Day +${item.day}`}
                              </Badge>
                              <span className="text-xs font-medium text-slate-500">{item.phase}</span>
                            </div>
                            <ul className="text-sm space-y-1">
                              {item.activities.map((activity, j) => (
                                <li key={j} className="flex items-start gap-2">
                                  <span className="text-green-500 mt-1">•</span>
                                  {activity}
                                </li>
                              ))}
                            </ul>
                            {item.tips && (
                              <p className="text-xs text-blue-600 mt-2 italic">Tip: {item.tips}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-slate-500 text-sm">Generate launch timeline</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Chapter Teasers</CardTitle>
                  <CardDescription>Sneak peek content for pre-launch marketing</CardDescription>
                </div>
                <GenerateButton contentType="chapter-teasers" label="Generate" />
              </CardHeader>
              <CardContent>
                {(campaign.chapterTeasers as ChapterTeaser[])?.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-3">
                    {(campaign.chapterTeasers as ChapterTeaser[]).map((teaser, i) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-lg group relative">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Ch. {teaser.chapterNumber}</Badge>
                          <span className="font-medium text-sm">{teaser.chapterTitle}</span>
                        </div>
                        <p className="text-sm text-slate-600">{teaser.teaser}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                          onClick={() => handleCopy(teaser.teaser, `teaser-${i}`)}
                        >
                          {copiedId === `teaser-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Generate chapter teasers</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
