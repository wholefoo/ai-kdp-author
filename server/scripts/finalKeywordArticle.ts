import OpenAI from "openai";
import { db } from "../db";
import { blogPosts } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

(async () => {
  console.log("Generating Keyword Research article with 1000+ words...");
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: "You are an expert KDP consultant. Write a comprehensive, detailed article of EXACTLY 1000-1100 words. Be thorough and include many specific examples and actionable tips."
      },
      {
        role: "user",
        content: "Write a detailed 1050-word article titled 'Keyword Research Mastery: How to Rank Your KDP Book in Search Results'. Thoroughly cover: 1) The 7 backend keywords - what they are, how to maximize them, best practices and examples, 2) Title and subtitle optimization with keyword placement strategies and examples, 3) Using Publisher Rocket/KDP Rocket - features, how to use it, pricing, alternatives, 4) Competitor keyword analysis - step-by-step process, what to look for, tools to use, 5) Tracking and monitoring keyword rankings - tools, frequency, what to do with the data, 6) Common keyword mistakes authors make and how to avoid them, 7) Complete step-by-step action plan for keyword research. Include specific examples, real scenarios, and tactical advice. Make it comprehensive and detailed to reach 1050 words."
      }
    ],
    temperature: 0.7,
    max_tokens: 3200,
  });

  const content = completion.choices[0].message.content || "";
  const wordCount = content.split(/\s+/).length;
  console.log(`Generated ${wordCount} words`);
  
  if (wordCount < 800) {
    console.error(`ERROR: Only generated ${wordCount} words, need 800+`);
    process.exit(1);
  }
  
  const excerptResp = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ 
      role: "user", 
      content: `Create a compelling 2-sentence excerpt (150-200 chars) for this blog post:\n\n${content.substring(0, 500)}` 
    }],
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
  
  console.log(`✅ Saved article with ${wordCount} words`);
  process.exit(0);
})().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
