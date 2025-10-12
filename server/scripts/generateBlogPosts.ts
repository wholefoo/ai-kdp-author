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

const topics: ArticleTopic[] = [
  {
    title: "How to Optimize Your KDP Book Listing for Maximum Visibility",
    category: "KDP Tips",
    tags: ["KDP", "book listing", "optimization", "visibility"],
    prompt: "Write a comprehensive 1000-word article about optimizing Amazon KDP book listings. Cover title optimization, keyword research, category selection, book description best practices, and A+ content. Include actionable tips and real examples."
  },
  {
    title: "Creating Compelling Characters That Readers Can't Forget",
    category: "Writing Craft",
    tags: ["character development", "writing tips", "storytelling"],
    prompt: "Write a detailed 950-word article about creating memorable characters in fiction. Discuss character arcs, motivations, flaws, backstory, and dialogue. Include techniques for making characters feel authentic and relatable."
  },
  {
    title: "The Ultimate Book Launch Strategy for Self-Published Authors",
    category: "Marketing",
    tags: ["book launch", "marketing", "promotion", "self-publishing"],
    prompt: "Write an in-depth 1100-word article about launching a book on Amazon KDP. Cover pre-launch strategies, launch day tactics, ARC reviews, social media promotion, email lists, and post-launch momentum. Include a timeline and checklist."
  },
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
  console.log(`\nGenerating article: ${topic.title}...`);
  
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
  
  // Generate excerpt (first 2-3 sentences or ~150 chars)
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const excerpt = sentences.slice(0, 2).join('. ').trim() + '.';
  
  // Generate slug
  const slug = topic.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  // Calculate read time
  const wordCount = content.split(/\s+/).length;
  const readTime = Math.ceil(wordCount / 200);
  
  console.log(`✅ Generated ${wordCount} words (${readTime} min read)`);
  
  return {
    title: topic.title,
    slug,
    excerpt,
    content,
    category: topic.category,
    tags: topic.tags,
    readTime,
  };
}

async function main() {
  console.log("🚀 Starting blog post generation...\n");
  
  for (const topic of topics) {
    try {
      const article = await generateArticle(topic);
      
      // Insert into database
      await db.insert(blogPosts).values({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        category: article.category,
        tags: article.tags,
        author: "AI KDP Author Team",
        published: true,
        publishedAt: new Date(),
        readTime: article.readTime,
      });
      
      console.log(`✅ Saved to database: ${article.slug}\n`);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`❌ Error generating article: ${topic.title}`, error.message);
    }
  }
  
  console.log("\n🎉 All blog posts generated successfully!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
