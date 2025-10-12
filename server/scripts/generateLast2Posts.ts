import OpenAI from "openai";
import { db } from "../db";
import { blogPosts } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateArticle9() {
  console.log("Generating article 9...");
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an expert KDP publishing consultant. Write a comprehensive, engaging 950-word blog post for self-published authors. Use a professional yet conversational tone with practical examples."
      },
      {
        role: "user",
        content: "Write a detailed 950-word article about keyword research for Amazon KDP books. Cover: 1) The 7 backend keywords and how to use them strategically, 2) Title and subtitle optimization with keywords, 3) Using research tools like Publisher Rocket/KDP Rocket, 4) Analyzing competitor keywords, 5) Tracking keyword rankings over time, 6) Common mistakes to avoid. Include specific examples and actionable tips."
      }
    ],
    temperature: 0.7,
    max_tokens: 2500,
  });

  const content = completion.choices[0].message.content || "";
  const wordCount = content.split(/\s+/).length;
  console.log(`Generated ${wordCount} words`);
  
  // Generate better excerpt using OpenAI
  const excerptCompletion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `Create a compelling 2-sentence excerpt (150-200 chars) for this blog post:\n\n${content.substring(0, 500)}`
      }
    ],
    max_tokens: 100,
  });
  
  const excerpt = excerptCompletion.choices[0].message.content?.trim() || content.substring(0, 150) + "...";
  
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
  
  console.log("✅ Article 9 saved");
}

async function generateArticle10() {
  console.log("\nGenerating article 10...");
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an expert KDP publishing consultant. Write a comprehensive, engaging 1000-word blog post for self-published authors. Use a professional yet conversational tone with practical examples and data."
      },
      {
        role: "user",
        content: "Write a detailed 1000-word article about maximizing Amazon KDP royalties. Cover: 1) Understanding 35% vs 70% royalty structures, 2) Expanded distribution strategies, 3) International markets and pricing, 4) Print vs ebook economics, 5) Box sets and bundle strategies, 6) Series pricing optimization, 7) KDP Select vs wide distribution, 8) Timing and price optimization, 9) Audiobook rights and revenue. Include specific profit examples and calculations."
      }
    ],
    temperature: 0.7,
    max_tokens: 2500,
  });

  const content = completion.choices[0].message.content || "";
  const wordCount = content.split(/\s+/).length;
  console.log(`Generated ${wordCount} words`);
  
  // Generate better excerpt using OpenAI
  const excerptCompletion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `Create a compelling 2-sentence excerpt (150-200 chars) for this blog post:\n\n${content.substring(0, 500)}`
      }
    ],
    max_tokens: 100,
  });
  
  const excerpt = excerptCompletion.choices[0].message.content?.trim() || content.substring(0, 150) + "...";
  
  await db.insert(blogPosts).values({
    title: "Maximizing Your KDP Royalties: Advanced Strategies for Serious Authors",
    slug: "maximizing-your-kdp-royalties-advanced-strategies-for-serious-authors",
    excerpt,
    content,
    category: "Sales",
    tags: ["royalties", "income", "optimization", "earnings"],
    author: "AI KDP Author Team",
    published: true,
    publishedAt: new Date(),
    readTime: Math.ceil(wordCount / 200),
  });
  
  console.log("✅ Article 10 saved");
}

(async () => {
  try {
    await generateArticle9();
    await generateArticle10();
    console.log("\n🎉 Complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
})();
