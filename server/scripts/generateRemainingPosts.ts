import OpenAI from "openai";
import { db } from "../db";
import { blogPosts } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ArticleTopic {
  title: string;
  category: string;
  tags: string[];
  prompt: string;
}

const remainingTopics: ArticleTopic[] = [
  {
    title: "Finding Profitable Niches on Amazon KDP: A Data-Driven Approach",
    category: "Research",
    tags: ["niche research", "market analysis", "profitability"],
    prompt: "Write a comprehensive 1050-word article about finding profitable niches on Amazon KDP. Discuss using tools like Publisher Rocket, analyzing BSR, checking competition, evaluating demand, and validating niche profitability. Include case studies."
  },
  {
    title: "KDP Pricing Strategies: How to Price Your Book for Maximum Profit",
    category: "Sales",
    tags: ["pricing", "royalties", "sales strategy"],
    prompt: "Write a detailed 900-word article about pricing strategies for KDP books. Explain the 35% vs 70% royalty structure, psychological pricing, competitive analysis, launch pricing, and long-term pricing adjustments. Include profit calculations."
  },
  {
    title: "Cover Design Best Practices: What Actually Sells Books on Amazon",
    category: "KDP Tips",
    tags: ["cover design", "book marketing", "visual appeal"],
    prompt: "Write an informative 1000-word article about book cover design for KDP. Discuss genre conventions, typography, color psychology, thumbnail visibility, DIY vs professional design, and tools like Canva. Include before/after examples."
  },
  {
    title: "Plot Structures That Sell: Proven Frameworks for Page-Turners",
    category: "Writing Craft",
    tags: ["plot structure", "storytelling", "writing techniques"],
    prompt: "Write a comprehensive 1100-word article about plot structures that work for commercial fiction. Explain the three-act structure, hero's journey, save the cat beats, and genre-specific structures. Include plotting techniques and tools."
  },
  {
    title: "Amazon Ads for Authors: A Complete Guide to Profitable Campaigns",
    category: "Marketing",
    tags: ["Amazon ads", "advertising", "PPC", "marketing"],
    prompt: "Write an in-depth 1150-word article about Amazon Advertising for KDP authors. Cover sponsored products, keyword targeting, bidding strategies, ACOS optimization, campaign structure, and scaling profitable ads. Include real metrics."
  },
  {
    title: "Keyword Research Mastery: How to Rank Your KDP Book in Search Results",
    category: "Research",
    tags: ["keywords", "SEO", "discoverability", "ranking"],
    prompt: "Write a detailed 950-word article about keyword research for KDP books. Explain the 7 backend keywords, title keywords, subtitle optimization, using tools like KDP Rocket, analyzing competitor keywords, and tracking rankings."
  },
  {
    title: "Maximizing Your KDP Royalties: Advanced Strategies for Serious Authors",
    category: "Sales",
    tags: ["royalties", "income", "optimization", "earnings"],
    prompt: "Write a comprehensive 1000-word article about maximizing KDP royalties. Cover expanded distribution, international markets, print vs ebook, box sets, series strategies, and using KDP Select vs wide distribution. Include earnings examples."
  }
];

async function generateArticle(topic: ArticleTopic): Promise<{
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  readTime: number;
}> {
  console.log(`Generating: ${topic.title}...`);
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an expert KDP publishing consultant and content writer. Write engaging, informative, and actionable blog posts for self-published authors. Use a professional yet conversational tone. Include practical examples and specific tips."
      },
      {
        role: "user",
        content: topic.prompt
      }
    ],
    temperature: 0.8,
    max_tokens: 2000,
  });

  const content = completion.choices[0].message.content || "";
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const excerpt = sentences.slice(0, 2).join('. ').trim() + '.';
  const slug = topic.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const wordCount = content.split(/\s+/).length;
  const readTime = Math.ceil(wordCount / 200);
  
  console.log(`✅ ${wordCount} words (${readTime} min)\n`);
  
  return { title: topic.title, slug, excerpt, content, category: topic.category, tags: topic.tags, readTime };
}

async function main() {
  console.log("Generating remaining 7 articles...\n");
  
  for (const topic of remainingTopics) {
    try {
      const article = await generateArticle(topic);
      await db.insert(blogPosts).values({
        ...article,
        author: "AI KDP Author Team",
        published: true,
        publishedAt: new Date(),
      });
      console.log(`Saved: ${article.slug}\n`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`Error: ${topic.title}`, error.message);
    }
  }
  
  console.log("🎉 Complete!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
