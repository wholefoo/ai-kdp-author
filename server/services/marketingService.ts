import OpenAI from "openai";
import type { Novel, MarketingCampaign, UpdateMarketingCampaign } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface SocialMediaPost {
  content: string;
  hashtags: string[];
  platform: string;
  type: 'announcement' | 'teaser' | 'quote' | 'engagement' | 'promo';
}

export interface QuotableExcerpt {
  excerpt: string;
  chapter: number;
  context: string;
}

export interface ChapterTeaser {
  chapterNumber: number;
  chapterTitle: string;
  teaser: string;
}

export interface LaunchTimelineItem {
  day: number;
  phase: string;
  activities: string[];
  tips: string;
}

export interface PricingRecommendation {
  launchPrice: string;
  regularPrice: string;
  promotionalStrategy: string;
  kdpSelectRecommendation: boolean;
  reasoning: string;
}

export class MarketingService {
  
  async generateAmazonDescription(novel: Novel): Promise<string> {
    const prompt = `You are an expert Amazon KDP book marketing specialist. Generate a compelling Amazon book description for this novel.

NOVEL DETAILS:
- Title: ${novel.title}
- Genre: ${novel.genre}
- Plot Idea: ${novel.plotIdea}
- Word Count: ${novel.wordCount} words
- Chapter Count: ${novel.actualChapterCount} chapters

REQUIREMENTS:
1. Create a hook that grabs attention in the first 2-3 sentences
2. Introduce the main conflict without spoilers
3. Highlight what makes this book unique
4. Include emotional appeal appropriate for the genre
5. End with a compelling call-to-action
6. Use HTML formatting for Amazon (bold, italics, line breaks)
7. Keep it between 300-500 words
8. Include genre-appropriate keywords naturally

Generate the Amazon description now:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 1500,
    });

    return response.choices[0]?.message?.content || "";
  }

  async generateAmazonKeywords(novel: Novel): Promise<string[]> {
    const prompt = `You are an Amazon KDP keyword optimization expert. Generate 7 highly-relevant search keywords for this book.

NOVEL DETAILS:
- Title: ${novel.title}
- Genre: ${novel.genre}
- Plot Idea: ${novel.plotIdea}

REQUIREMENTS:
1. Each keyword phrase should be 2-4 words
2. Focus on searchable terms readers actually use
3. Include genre-specific terms
4. Include mood/tone descriptors
5. Consider comparable titles and tropes
6. Avoid overly generic terms
7. Think about what readers search for when looking for books like this

Return ONLY a JSON array of 7 keyword strings, no other text. Example format:
["keyword one", "keyword two", "keyword three", ...]`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    });

    try {
      const content = response.choices[0]?.message?.content || "[]";
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedContent);
    } catch {
      return [];
    }
  }

  async generateAmazonCategories(novel: Novel): Promise<string[]> {
    const prompt = `You are an Amazon KDP category expert. Suggest the best 2-3 Amazon BISAC categories for this book.

NOVEL DETAILS:
- Title: ${novel.title}
- Genre: ${novel.genre}
- Plot Idea: ${novel.plotIdea}

REQUIREMENTS:
1. Suggest actual Amazon book categories
2. Include both broad and specific categories
3. Consider where competition is reasonable
4. Focus on categories where this book would rank well

Return ONLY a JSON array of 2-3 category strings. Example:
["Fiction > Science Fiction > Hard Science Fiction", "Fiction > Thrillers > Technothriller"]`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
    });

    try {
      const content = response.choices[0]?.message?.content || "[]";
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedContent);
    } catch {
      return [];
    }
  }

  async generateSocialMediaPosts(novel: Novel, platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin'): Promise<SocialMediaPost[]> {
    const platformConfig = {
      twitter: { maxLength: 280, hashtagCount: 3, postsCount: 5 },
      facebook: { maxLength: 500, hashtagCount: 5, postsCount: 4 },
      instagram: { maxLength: 2200, hashtagCount: 15, postsCount: 4 },
      linkedin: { maxLength: 700, hashtagCount: 3, postsCount: 3 },
    };

    const config = platformConfig[platform];

    const prompt = `You are a book marketing social media expert. Generate ${config.postsCount} ${platform.toUpperCase()} posts for this book launch.

NOVEL DETAILS:
- Title: ${novel.title}
- Genre: ${novel.genre}
- Plot Idea: ${novel.plotIdea}

PLATFORM REQUIREMENTS:
- Max character length: ${config.maxLength}
- Include ${config.hashtagCount} relevant hashtags per post
- Platform: ${platform}

POST TYPES NEEDED:
1. Launch announcement post
2. Teaser/hook post to build intrigue
3. Quote or excerpt post
4. Engagement question post
5. Promotional/buy now post (if applicable)

Return a JSON array with this structure:
[
  {
    "content": "post content here",
    "hashtags": ["hashtag1", "hashtag2"],
    "platform": "${platform}",
    "type": "announcement|teaser|quote|engagement|promo"
  }
]

Generate the posts now:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 2000,
    });

    try {
      const content = response.choices[0]?.message?.content || "[]";
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedContent);
    } catch {
      return [];
    }
  }

  async generateEmailSubjectLines(novel: Novel): Promise<string[]> {
    const prompt = `You are an email marketing expert for book launches. Generate 5 compelling email subject lines for promoting this book.

NOVEL DETAILS:
- Title: ${novel.title}
- Genre: ${novel.genre}
- Plot Idea: ${novel.plotIdea}

REQUIREMENTS:
1. Keep each under 50 characters when possible
2. Include curiosity-driven hooks
3. Mix urgency with intrigue
4. Avoid spam trigger words
5. Personalization-ready (can include [NAME])

Return ONLY a JSON array of 5 subject line strings:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 500,
    });

    try {
      const content = response.choices[0]?.message?.content || "[]";
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedContent);
    } catch {
      return [];
    }
  }

  async generateEmailNewsletter(novel: Novel): Promise<string> {
    const prompt = `You are an email marketing specialist. Create a newsletter email template for launching this book.

NOVEL DETAILS:
- Title: ${novel.title}
- Genre: ${novel.genre}
- Plot Idea: ${novel.plotIdea}
- Word Count: ${novel.wordCount} words

REQUIREMENTS:
1. Engaging subject line suggestion at the top
2. Personal greeting with [NAME] placeholder
3. Exciting book announcement
4. Brief synopsis (without spoilers)
5. Why readers will love it
6. Clear call-to-action with [BOOK_LINK] placeholder
7. Social sharing encouragement
8. Professional sign-off

Format with clear sections and use **bold** and *italic* for emphasis. Keep it under 400 words.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });

    return response.choices[0]?.message?.content || "";
  }

  async generatePressRelease(novel: Novel, authorName: string = "Author"): Promise<string> {
    const prompt = `You are a book publicity expert. Write a professional press release for this book launch.

NOVEL DETAILS:
- Title: ${novel.title}
- Genre: ${novel.genre}
- Plot Idea: ${novel.plotIdea}
- Word Count: ${novel.wordCount} words
- Author: ${authorName}

REQUIREMENTS:
1. Professional headline with "FOR IMMEDIATE RELEASE" header
2. Dateline with [CITY, STATE] placeholder
3. Compelling lead paragraph (who, what, when, where, why)
4. Book synopsis paragraph
5. Author bio paragraph with [AUTHOR_BIO] placeholder
6. Quote from the author with [AUTHOR_QUOTE] placeholder
7. Availability information with [BOOK_LINK] and [PRICE] placeholders
8. Contact information section with placeholders
9. ### at the end (standard press release ending)

Format professionally with proper spacing.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 1500,
    });

    return response.choices[0]?.message?.content || "";
  }

  async generateAuthorBio(novel: Novel): Promise<string> {
    const prompt = `You are a book marketing expert. Create a versatile author bio template for the author of this book.

NOVEL DETAILS:
- Title: ${novel.title}
- Genre: ${novel.genre}

REQUIREMENTS:
1. Create 3 versions: Long (150 words), Medium (75 words), Short (30 words)
2. Include [AUTHOR_NAME] placeholder
3. Genre-appropriate tone
4. Include placeholders for [CREDENTIALS], [LOCATION], [WEBSITE], [SOCIAL_HANDLE]
5. End with connection to readers

Format clearly with headers for each version.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
    });

    return response.choices[0]?.message?.content || "";
  }

  async generateBookBlurb(novel: Novel): Promise<string> {
    const prompt = `You are a bestselling book copywriter. Create a compelling back-cover book blurb for this novel.

NOVEL DETAILS:
- Title: ${novel.title}
- Genre: ${novel.genre}
- Plot Idea: ${novel.plotIdea}

REQUIREMENTS:
1. Maximum 200 words
2. Hook readers in the first sentence
3. Introduce protagonist and their world
4. Present the central conflict
5. Raise stakes without spoilers
6. End with a cliffhanger or compelling question
7. Genre-appropriate language and tone

Generate the blurb now:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || "";
  }

  async generateElevatorPitch(novel: Novel): Promise<string> {
    const prompt = `You are a book marketing expert. Create a 30-second elevator pitch for this novel.

NOVEL DETAILS:
- Title: ${novel.title}
- Genre: ${novel.genre}
- Plot Idea: ${novel.plotIdea}

REQUIREMENTS:
1. Maximum 75 words
2. Capture the essence immediately
3. Include a compelling hook
4. Mention the genre appeal
5. End with why readers will love it

Generate the elevator pitch now:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content || "";
  }

  async generateQuotableExcerpts(novel: Novel): Promise<QuotableExcerpt[]> {
    const chapters = Array.isArray(novel.chapters) ? novel.chapters : [];
    
    if (chapters.length === 0) {
      return [];
    }

    const prompt = `You are a literary marketing expert. Based on this novel's plot, generate 5 compelling quotable excerpts that could be used for social media and marketing.

NOVEL DETAILS:
- Title: ${novel.title}
- Genre: ${novel.genre}
- Plot Idea: ${novel.plotIdea}

REQUIREMENTS:
1. Create fictional but genre-appropriate quotes (1-3 sentences each)
2. Each quote should be emotionally resonant
3. Suitable for quote cards and social media
4. Include attribution context

Return a JSON array with this structure:
[
  {
    "excerpt": "The compelling quote text",
    "chapter": 1,
    "context": "Brief context about when this quote appears"
  }
]`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 1000,
    });

    try {
      const content = response.choices[0]?.message?.content || "[]";
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedContent);
    } catch {
      return [];
    }
  }

  async generateChapterTeasers(novel: Novel): Promise<ChapterTeaser[]> {
    const outline = novel.outline as any;
    
    if (!outline || !outline.chapters) {
      return [];
    }

    const chapterSummaries = outline.chapters.slice(0, 5).map((ch: any) => 
      `Chapter ${ch.number}: ${ch.title} - ${ch.summary}`
    ).join('\n');

    const prompt = `You are a book marketing expert. Generate teaser text for these chapters that could be used for a "sneak peek" campaign.

NOVEL: ${novel.title}
GENRE: ${novel.genre}

CHAPTERS:
${chapterSummaries}

REQUIREMENTS:
1. Create a 2-3 sentence teaser for each chapter
2. Build intrigue without spoilers
3. End each teaser on a hook

Return a JSON array with this structure:
[
  {
    "chapterNumber": 1,
    "chapterTitle": "Chapter title",
    "teaser": "The teaser text"
  }
]`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 1500,
    });

    try {
      const content = response.choices[0]?.message?.content || "[]";
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedContent);
    } catch {
      return [];
    }
  }

  async generateLaunchTimeline(novel: Novel): Promise<LaunchTimelineItem[]> {
    const prompt = `You are a book launch strategist. Create a 14-day pre-launch to launch timeline for this book.

NOVEL DETAILS:
- Title: ${novel.title}
- Genre: ${novel.genre}

REQUIREMENTS:
1. Cover days -14 to day 0 (launch day) to day +3
2. Include specific actionable activities
3. Cover social media, email, PR, and Amazon activities
4. Genre-appropriate strategies

Return a JSON array with this structure:
[
  {
    "day": -14,
    "phase": "Pre-Launch",
    "activities": ["Activity 1", "Activity 2"],
    "tips": "Pro tip for this day"
  }
]`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    try {
      const content = response.choices[0]?.message?.content || "[]";
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedContent);
    } catch {
      return [];
    }
  }

  async generatePricingRecommendation(novel: Novel): Promise<PricingRecommendation> {
    const wordCount = novel.wordCount || 65000;
    
    const prompt = `You are an Amazon KDP pricing strategist. Recommend optimal pricing for this book.

NOVEL DETAILS:
- Title: ${novel.title}
- Genre: ${novel.genre}
- Word Count: ${wordCount} words
- Approximate page count: ${Math.round(wordCount / 250)} pages

REQUIREMENTS:
1. Consider genre norms
2. Factor in word count/length
3. Recommend launch price vs regular price
4. Suggest KDP Select enrollment strategy
5. Include promotional pricing ideas

Return a JSON object with this structure:
{
  "launchPrice": "$X.XX",
  "regularPrice": "$X.XX",
  "promotionalStrategy": "Description of promo strategy",
  "kdpSelectRecommendation": true/false,
  "reasoning": "Explanation of pricing logic"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 800,
    });

    try {
      const content = response.choices[0]?.message?.content || "{}";
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedContent);
    } catch {
      return {
        launchPrice: "$2.99",
        regularPrice: "$4.99",
        promotionalStrategy: "Launch at lower price, increase after initial reviews",
        kdpSelectRecommendation: true,
        reasoning: "Standard pricing for the genre"
      };
    }
  }

  async generateFullMarketingCampaign(novel: Novel): Promise<UpdateMarketingCampaign> {
    console.log(`📢 Generating full marketing campaign for: ${novel.title}`);

    const [
      amazonDescription,
      amazonKeywords,
      amazonCategories,
      twitterPosts,
      facebookPosts,
      instagramPosts,
      linkedinPosts,
      emailSubjectLines,
      emailNewsletter,
      pressRelease,
      authorBio,
      bookBlurb,
      elevatorPitch,
      quotableExcerpts,
      chapterTeasers,
      launchTimeline,
      pricingRecommendation
    ] = await Promise.all([
      this.generateAmazonDescription(novel),
      this.generateAmazonKeywords(novel),
      this.generateAmazonCategories(novel),
      this.generateSocialMediaPosts(novel, 'twitter'),
      this.generateSocialMediaPosts(novel, 'facebook'),
      this.generateSocialMediaPosts(novel, 'instagram'),
      this.generateSocialMediaPosts(novel, 'linkedin'),
      this.generateEmailSubjectLines(novel),
      this.generateEmailNewsletter(novel),
      this.generatePressRelease(novel),
      this.generateAuthorBio(novel),
      this.generateBookBlurb(novel),
      this.generateElevatorPitch(novel),
      this.generateQuotableExcerpts(novel),
      this.generateChapterTeasers(novel),
      this.generateLaunchTimeline(novel),
      this.generatePricingRecommendation(novel)
    ]);

    console.log(`✅ Marketing campaign generated successfully`);

    return {
      amazonDescription,
      amazonKeywords,
      amazonCategories,
      twitterPosts,
      facebookPosts,
      instagramPosts,
      linkedinPosts,
      emailSubjectLines,
      emailNewsletter,
      pressRelease,
      authorBio,
      bookBlurb,
      elevatorPitch,
      quotableExcerpts,
      chapterTeasers,
      launchTimeline,
      pricingRecommendation,
      status: 'completed'
    };
  }
}

export const marketingService = new MarketingService();
