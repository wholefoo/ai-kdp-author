import OpenAI from "openai";
import { db } from "../db";
import { blogPosts } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const topics = [
  {
    title: "Cover Design Best Practices: What Actually Sells Books on Amazon",
    category: "KDP Tips",
    tags: ["cover design", "book marketing", "visual appeal"],
    prompt: "Write a 1000-word article about book cover design for KDP. Discuss genre conventions, typography, color psychology, thumbnail visibility, DIY vs professional design, and tools like Canva."
  },
  {
    title: "Plot Structures That Sell: Proven Frameworks for Page-Turners",
    category: "Writing Craft",
    tags: ["plot structure", "storytelling", "writing techniques"],
    prompt: "Write a 1100-word article about plot structures for commercial fiction. Explain three-act structure, hero's journey, save the cat beats, and genre-specific structures."
  },
  {
    title: "Amazon Ads for Authors: A Complete Guide to Profitable Campaigns",
    category: "Marketing",
    tags: ["Amazon ads", "advertising", "PPC", "marketing"],
    prompt: "Write a 1150-word article about Amazon Advertising for KDP authors. Cover sponsored products, keyword targeting, bidding strategies, ACOS optimization, and campaign structure."
  },
  {
    title: "Keyword Research Mastery: How to Rank Your KDP Book in Search Results",
    category: "Research",
    tags: ["keywords", "SEO", "discoverability", "ranking"],
    prompt: "Write a 950-word article about keyword research for KDP books. Explain the 7 backend keywords, title keywords, subtitle optimization, and using tools like KDP Rocket."
  },
  {
    title: "Maximizing Your KDP Royalties: Advanced Strategies for Serious Authors",
    category: "Sales",
    tags: ["royalties", "income", "optimization", "earnings"],
    prompt: "Write a 1000-word article about maximizing KDP royalties. Cover expanded distribution, international markets, print vs ebook, box sets, and series strategies."
  }
];

async function generate(t: typeof topics[0]) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a KDP publishing expert. Write engaging blog posts for self-published authors." },
      { role: "user", content: t.prompt }
    ],
    temperature: 0.8,
    max_tokens: 2000,
  });
  
  const content = res.choices[0].message.content || "";
  const excerpt = content.split(/[.!?]+/).filter(s => s.trim()).slice(0, 2).join('. ') + '.';
  const slug = t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const readTime = Math.ceil(content.split(/\s+/).length / 200);
  
  await db.insert(blogPosts).values({
    title: t.title,
    slug,
    excerpt,
    content,
    category: t.category,
    tags: t.tags,
    author: "AI KDP Author Team",
    published: true,
    publishedAt: new Date(),
    readTime,
  });
  
  console.log(`✅ ${t.title.substring(0, 50)}...`);
}

(async () => {
  for (const t of topics) {
    await generate(t);
    await new Promise(r => setTimeout(r, 500));
  }
  console.log("Done!");
  process.exit(0);
})();
