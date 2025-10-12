import OpenAI from "openai";
import { db } from "../db";
import { blogPosts } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generate1() {
  console.log("Generating: KDP Pricing Strategies...");
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an expert KDP publishing consultant. Write a comprehensive, engaging blog post of exactly 900-950 words for self-published authors. Use a professional yet conversational tone with specific examples and actionable strategies."
      },
      {
        role: "user",
        content: "Write a detailed 900-word article titled 'KDP Pricing Strategies: How to Price Your Book for Maximum Profit'. Cover: 1) The 35% vs 70% royalty structure with delivery costs explained, 2) Psychological pricing tactics ($2.99 vs $3.00), 3) Competitive pricing analysis in your niche, 4) Launch pricing strategies (loss leader vs premium), 5) Long-term price optimization and testing, 6) When to use $0.99 vs $9.99 pricing, 7) Series pricing strategies. Include profit calculation examples and real scenarios."
      }
    ],
    temperature: 0.7,
    max_tokens: 2800,
  });

  const content = completion.choices[0].message.content || "";
  const wordCount = content.split(/\s+/).length;
  console.log(`Generated ${wordCount} words`);
  
  const excerptResp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: `Write a compelling 2-sentence excerpt (150-200 chars) for this post:\n\n${content.substring(0, 500)}` }],
    max_tokens: 100,
  });
  
  const excerpt = excerptResp.choices[0].message.content?.trim() || content.substring(0, 150) + "...";
  
  await db.insert(blogPosts).values({
    title: "KDP Pricing Strategies: How to Price Your Book for Maximum Profit",
    slug: "kdp-pricing-strategies-how-to-price-your-book-for-maximum-profit",
    excerpt,
    content,
    category: "Sales",
    tags: ["pricing", "royalties", "sales strategy"],
    author: "AI KDP Author Team",
    published: true,
    publishedAt: new Date(),
    readTime: Math.ceil(wordCount / 200),
  });
  
  console.log("✅ Saved\n");
}

async function generate2() {
  console.log("Generating: Keyword Research Mastery...");
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an expert KDP publishing consultant. Write a comprehensive, engaging blog post of exactly 900-950 words for self-published authors. Use a professional yet conversational tone with specific examples and step-by-step guidance."
      },
      {
        role: "user",
        content: "Write a detailed 900-word article titled 'Keyword Research Mastery: How to Rank Your KDP Book in Search Results'. Cover: 1) Understanding the 7 backend keywords and how to maximize them strategically, 2) Title and subtitle keyword optimization techniques, 3) Using Publisher Rocket (KDP Rocket) and alternative free tools, 4) Analyzing competitor keywords from successful books, 5) Tracking and monitoring keyword rankings over time, 6) Common keyword mistakes that hurt rankings. Include specific examples, tool recommendations, and a step-by-step action plan."
      }
    ],
    temperature: 0.7,
    max_tokens: 2800,
  });

  const content = completion.choices[0].message.content || "";
  const wordCount = content.split(/\s+/).length;
  console.log(`Generated ${wordCount} words`);
  
  const excerptResp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: `Write a compelling 2-sentence excerpt (150-200 chars) for this post:\n\n${content.substring(0, 500)}` }],
    max_tokens: 100,
  });
  
  const excerpt = excerptResp.choices[0].message.content?.trim() || content.substring(0, 150) + "...";
  
  await db.insert(blogPosts).values({
    title: "Keyword Research Mastery: How to Rank Your KDP Book in Search Results",
    slug: "keyword-research-mastery-how-to-rank-your-kdp-book-in-search-results",
    excerpt,
    content,
    category: "Research",
    tags: ["keywords", "SEO", "discoverability", "ranking"],
    author: "AI KDP Author Team",
    published: true,
    publishedAt: new Date(),
    readTime: Math.ceil(wordCount / 200),
  });
  
  console.log("✅ Saved\n");
}

(async () => {
  try {
    await generate1();
    await generate2();
    console.log("🎉 Complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
})();
