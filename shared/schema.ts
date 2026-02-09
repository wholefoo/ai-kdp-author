import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const novels = pgTable("novels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  title: text("title").notNull(),
  genre: text("genre").notNull(),
  plotIdea: text("plot_idea").notNull(),
  targetWordCount: integer("target_word_count").default(65000),
  targetChapterCount: integer("target_chapter_count").default(25),
  targetChapterLength: integer("target_chapter_length").default(2600),
  writingStyle: varchar("writing_style").default("balanced"), // narrative, descriptive, dialogue-heavy, balanced
  pointOfView: varchar("point_of_view").default("third-person"), // first-person, third-person-limited, third-person-omniscient
  toneAndMood: varchar("tone_and_mood").default("adventurous"), // dark, light, humorous, serious, adventurous, romantic
  contentRating: varchar("content_rating").default("pg-13"), // g, pg, pg-13, r
  customInstructions: text("custom_instructions"),
  outline: jsonb("outline"),
  chapters: jsonb("chapters").default([]),
  manuscriptContent: text("manuscript_content"),
  status: text("status").notNull().default("pending"), // pending, generating_outline, generating_chapters, compiling, completed, error
  progress: jsonb("progress").default({}),
  wordCount: integer("word_count").default(0),
  actualChapterCount: integer("actual_chapter_count").default(0),
  sourceContent: text("source_content"), // For novel composer source material
  error: text("error"),
  // Non-fiction specific fields
  contentType: varchar("content_type").default("fiction"), // fiction, non-fiction
  nonFictionSubtype: varchar("non_fiction_subtype"), // self-help, business, history, science, biography, how-to, etc.
  nonFictionTopic: text("non_fiction_topic"), // Main topic/subject for non-fiction
  targetAudience: text("target_audience"), // Who is this book for?
  bibliography: jsonb("bibliography").default([]), // Array of source citations
  excludedSources: jsonb("excluded_sources").default(["wikipedia.org", "wiki"]), // Sources to exclude
  verificationStatus: varchar("verification_status"), // pending, verified, partial
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNovelSchema = createInsertSchema(novels).pick({
  userId: true,
  title: true,
  genre: true,
  plotIdea: true,
  targetWordCount: true,
  targetChapterCount: true,
  targetChapterLength: true,
  writingStyle: true,
  pointOfView: true,
  toneAndMood: true,
  contentRating: true,
  customInstructions: true,
  sourceContent: true,
  contentType: true,
  nonFictionSubtype: true,
  nonFictionTopic: true,
  targetAudience: true,
  excludedSources: true,
});

export const updateNovelSchema = createInsertSchema(novels).pick({
  outline: true,
  chapters: true,
  manuscriptContent: true,
  status: true,
  progress: true,
  wordCount: true,
  actualChapterCount: true,
  error: true,
  bibliography: true,
  verificationStatus: true,
}).partial();

export type InsertNovel = z.infer<typeof insertNovelSchema>;
export type UpdateNovel = z.infer<typeof updateNovelSchema>;
export type Novel = typeof novels.$inferSelect;

// Bibliography entry schema for non-fiction citations
export const bibliographyEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string().optional(),
  source: z.string(), // URL or publication name
  publishDate: z.string().optional(),
  accessDate: z.string().optional(),
  chapterNumber: z.number().optional(), // Which chapter this citation is used in
  claimText: z.string().optional(), // The specific claim this supports
  verified: z.boolean().default(true),
});

export type BibliographyEntry = z.infer<typeof bibliographyEntrySchema>;

// Non-fiction subtypes
export const nonFictionSubtypes = [
  "self-help",
  "business",
  "history",
  "science",
  "biography",
  "how-to",
  "health-wellness",
  "finance",
  "technology",
  "philosophy",
  "psychology",
  "education",
  "travel",
  "true-crime",
  "politics",
  "memoir",
  "reference",
] as const;

export type NonFictionSubtype = typeof nonFictionSubtypes[number];

// Novel generation request schema
export const novelGenerationRequestSchema = z.object({
  genre: z.string().optional(),
  title: z.string().optional(),
  plotIdea: z.string().optional(),
  targetWordCount: z.number().min(30000).max(120000).optional().default(65000),
  targetChapterCount: z.number().min(10).max(50).optional().default(25),
  targetChapterLength: z.number().min(1500).max(5000).optional().default(2600),
  writingStyle: z.enum(["narrative", "descriptive", "dialogue-heavy", "balanced"]).optional().default("balanced"),
  pointOfView: z.enum(["first-person", "third-person-limited", "third-person-omniscient"]).optional().default("third-person-limited"),
  toneAndMood: z.enum(["dark", "light", "humorous", "serious", "adventurous", "romantic", "mysterious", "epic"]).optional().default("adventurous"),
  contentRating: z.enum(["g", "pg", "pg-13", "r"]).optional().default("pg-13"),
  customInstructions: z.string().optional(),
  // Non-fiction specific fields
  contentType: z.enum(["fiction", "non-fiction"]).optional().default("fiction"),
  nonFictionSubtype: z.enum(nonFictionSubtypes).optional(),
  nonFictionTopic: z.string().optional(),
  targetAudience: z.string().optional(),
  excludedSources: z.array(z.string()).optional().default(["wikipedia.org", "wiki"]),
});

export type NovelGenerationRequest = z.infer<typeof novelGenerationRequestSchema>;

// Progress tracking schemas
export const progressSchema = z.object({
  overall: z.number().min(0).max(100).default(0),
  step1: z.number().min(0).max(100).default(0),
  step2: z.number().min(0).max(100).default(0),
  step3: z.number().min(0).max(100).default(0),
  currentChapter: z.number().optional(),
  totalChapters: z.number().optional(),
  currentStatus: z.string().optional(),
  estimatedTimeRemaining: z.string().optional(),
});

export type Progress = z.infer<typeof progressSchema>;

// Outline schema (supports both fiction and non-fiction)
export const outlineSchema = z.object({
  title: z.string(),
  genre: z.string(),
  length: z.string(),
  summary: z.string(),
  contentType: z.enum(["fiction", "non-fiction"]).optional().default("fiction"),
  // Fiction-specific fields
  characters: z.array(z.object({
    name: z.string(),
    description: z.string(),
    role: z.string(),
  })).optional().default([]),
  timeline: z.string().optional(),
  // Non-fiction specific fields
  keyTopics: z.array(z.string()).optional(), // Main topics covered
  learningObjectives: z.array(z.string()).optional(), // What readers will learn
  targetAudience: z.string().optional(),
  // Shared fields
  chapters: z.array(z.object({
    number: z.number(),
    title: z.string(),
    summary: z.string(),
    keyPoints: z.array(z.string()).optional(), // For non-fiction chapters
    sourcesNeeded: z.array(z.string()).optional(), // Types of sources needed
  })),
  themes: z.array(z.string()),
});

export type Outline = z.infer<typeof outlineSchema>;

// Plot Inspiration Vault table
export const savedPlots = pgTable("saved_plots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  premise: text("premise").notNull(),
  genre: varchar("genre").notNull(),
  subgenres: jsonb("subgenres").$type<string[]>(),
  themes: jsonb("themes").$type<string[]>(),
  targetAudience: varchar("target_audience"),
  estimatedLength: varchar("estimated_length"),
  difficulty: varchar("difficulty"),
  isFavorited: boolean("is_favorited").default(false),
  tags: jsonb("tags").$type<string[]>(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSavedPlotSchema = createInsertSchema(savedPlots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SavedPlot = typeof savedPlots.$inferSelect;
export type InsertSavedPlot = z.infer<typeof insertSavedPlotSchema>;

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Stripe subscription fields for paid access
  stripeCustomerId: varchar("stripe_customer_id").unique(),
  stripeSubscriptionId: varchar("stripe_subscription_id").unique(),
  subscriptionStatus: varchar("subscription_status"), // active, canceled, past_due, unpaid
  subscriptionTier: varchar("subscription_tier").default("trial"), // trial, basic, pro, premium, founders
  subscriptionEndDate: timestamp("subscription_end_date"),
  // Usage tracking for tiered limits
  novelsGeneratedThisMonth: integer("novels_generated_this_month").default(0),
  monthlyNovelLimit: integer("monthly_novel_limit").default(0), // 0=trial (refine only), 5=basic, 50=pro, 100=founders, -1=unlimited premium
  currentPeriodStart: timestamp("current_period_start").defaultNow(),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Manuscript library table for storing processed manuscripts
export const manuscripts = pgTable("manuscripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: varchar("title").notNull(),
  originalText: text("original_text").notNull(),
  cleanedText: text("cleaned_text").notNull(),
  originalWordCount: integer("original_word_count").notNull(),
  cleanedWordCount: integer("cleaned_word_count").notNull(),
  fileSize: integer("file_size").notNull(), // Size in bytes
  processingOptions: jsonb("processing_options"), // Store the cleanup options used
  processingResults: jsonb("processing_results"), // Store changes and summary
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Manuscript = typeof manuscripts.$inferSelect;
export type InsertManuscript = typeof manuscripts.$inferInsert;

// Character Development Workshop
export const characters = pgTable("characters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  novelId: varchar("novel_id"), // Optional - can be standalone or linked to novel
  name: text("name").notNull(),
  role: varchar("role").notNull(), // protagonist, antagonist, supporting, minor
  age: integer("age"),
  gender: varchar("gender"),
  occupation: text("occupation"),
  physicalDescription: text("physical_description"),
  personality: text("personality"),
  backstory: text("backstory"),
  motivation: text("motivation"),
  goals: text("goals"),
  fears: text("fears"),
  quirks: text("quirks"),
  voiceAndSpeech: text("voice_and_speech"),
  characterArc: jsonb("character_arc"), // journey progression
  relationships: jsonb("relationships"), // connections to other characters
  interviewData: jsonb("interview_data"), // AI interview responses and insights
  emotionalJourney: jsonb("emotional_journey"), // emotional development tracking
  tags: jsonb("tags").default([]),
  notes: text("notes"),
  isFavorited: boolean("is_favorited").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCharacterSchema = createInsertSchema(characters).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof characters.$inferSelect;

// Audiobook generation support
export const audiobooks = pgTable("audiobooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  novelId: varchar("novel_id").notNull(),
  userId: varchar("user_id"),
  title: text("title").notNull(),
  ttsProvider: varchar("tts_provider").notNull().default("deepgram"), // deepgram (primary), openai, gemini
  voice: varchar("voice").notNull().default("aura-2-athena-en"), // Deepgram: aura-2-* voices | OpenAI: alloy, echo, fable, onyx, nova, shimmer | Gemini: Zephyr, Puck, Charon, etc.
  model: varchar("model").notNull().default("aura-2"), // Deepgram: aura-2 | OpenAI: gpt-4o-mini-tts | Gemini: gemini-2.5-flash-preview-tts, gemini-2.5-pro-preview-tts
  speed: integer("speed").default(100), // 25-400 (stored as percentage)
  format: varchar("format").default("mp3"), // mp3, opus, aac, flac
  status: text("status").notNull().default("pending"), // pending, generating, completed, failed, partial_completed
  progress: jsonb("progress").default({}),
  chapters: jsonb("chapters").default([]), // Array of chapter information with audioPath
  selectedChapters: jsonb("selected_chapters").default([]), // Array of chapter indices that were selected for generation (e.g., [0, 2, 4] for chapters 1, 3, 5)
  audioFiles: jsonb("audio_files").default([]), // Array of generated audio file paths
  totalDuration: integer("total_duration").default(0), // Total duration in seconds
  chapterCount: integer("chapter_count").default(0),
  metadata: jsonb("metadata").default({}), // Additional audiobook metadata
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAudiobookSchema = createInsertSchema(audiobooks).pick({
  novelId: true,
  userId: true,
  title: true,
  ttsProvider: true,
  voice: true,
  model: true,
  speed: true,
  format: true,
  selectedChapters: true,
});

export const updateAudiobookSchema = createInsertSchema(audiobooks).pick({
  status: true,
  progress: true,
  chapters: true,
  selectedChapters: true,
  audioFiles: true,
  totalDuration: true,
  chapterCount: true,
  metadata: true,
  error: true,
}).partial();

export type InsertAudiobook = z.infer<typeof insertAudiobookSchema>;
export type UpdateAudiobook = z.infer<typeof updateAudiobookSchema>;
export type Audiobook = typeof audiobooks.$inferSelect;

// About page content (editable from dashboard)
export const aboutPage = pgTable("about_page", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull().default("About AI KDP Author"),
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by"), // userId of admin who updated
});

export const insertAboutPageSchema = createInsertSchema(aboutPage).pick({
  title: true,
  content: true,
  updatedBy: true,
});

export const updateAboutPageSchema = createInsertSchema(aboutPage).pick({
  title: true,
  content: true,
  updatedBy: true,
}).partial();

export type InsertAboutPage = z.infer<typeof insertAboutPageSchema>;
export type UpdateAboutPage = z.infer<typeof updateAboutPageSchema>;
export type AboutPage = typeof aboutPage.$inferSelect;

// Blog posts for public KDP publishing blog
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: varchar("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  coverImage: text("cover_image"),
  category: varchar("category").notNull(), // KDP Tips, Writing Craft, Marketing, Research, Sales
  tags: text("tags").array().default([]),
  author: text("author").notNull().default("AI KDP Author Team"),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  readTime: integer("read_time").notNull(), // in minutes
  views: integer("views").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by"), // userId of admin who created
}, (table) => ({
  slugIdx: index("blog_posts_slug_idx").on(table.slug),
  categoryIdx: index("blog_posts_category_idx").on(table.category),
  publishedIdx: index("blog_posts_published_idx").on(table.published),
}));

export const insertBlogPostSchema = createInsertSchema(blogPosts).pick({
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  coverImage: true,
  category: true,
  tags: true,
  author: true,
  published: true,
  publishedAt: true,
  readTime: true,
  createdBy: true,
});

export const updateBlogPostSchema = createInsertSchema(blogPosts).pick({
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  coverImage: true,
  category: true,
  tags: true,
  author: true,
  published: true,
  publishedAt: true,
  readTime: true,
  views: true,
}).partial();

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type UpdateBlogPost = z.infer<typeof updateBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

// Marketing campaigns for novel promotion
export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  novelId: varchar("novel_id").notNull(),
  userId: varchar("user_id").notNull(),
  novelTitle: text("novel_title").notNull(),
  genre: text("genre").notNull(),
  targetAudience: text("target_audience"),
  
  // Amazon KDP content
  amazonDescription: text("amazon_description"),
  amazonKeywords: text("amazon_keywords").array().default([]),
  amazonCategories: text("amazon_categories").array().default([]),
  
  // Social media content
  twitterPosts: jsonb("twitter_posts").default([]), // Array of tweet objects
  facebookPosts: jsonb("facebook_posts").default([]),
  instagramPosts: jsonb("instagram_posts").default([]),
  linkedinPosts: jsonb("linkedin_posts").default([]),
  
  // Email marketing
  emailSubjectLines: text("email_subject_lines").array().default([]),
  emailNewsletter: text("email_newsletter"),
  
  // Press and promotional
  pressRelease: text("press_release"),
  authorBio: text("author_bio"),
  bookBlurb: text("book_blurb"),
  elevatorPitch: text("elevator_pitch"),
  
  // Quotes and excerpts
  quotableExcerpts: jsonb("quotable_excerpts").default([]),
  chapterTeasers: jsonb("chapter_teasers").default([]),
  
  // Launch strategy
  launchTimeline: jsonb("launch_timeline").default([]),
  pricingRecommendation: jsonb("pricing_recommendation"),
  
  status: varchar("status").default("draft"), // draft, in_progress, completed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns).pick({
  novelId: true,
  userId: true,
  novelTitle: true,
  genre: true,
  targetAudience: true,
});

export const updateMarketingCampaignSchema = createInsertSchema(marketingCampaigns).pick({
  targetAudience: true,
  amazonDescription: true,
  amazonKeywords: true,
  amazonCategories: true,
  twitterPosts: true,
  facebookPosts: true,
  instagramPosts: true,
  linkedinPosts: true,
  emailSubjectLines: true,
  emailNewsletter: true,
  pressRelease: true,
  authorBio: true,
  bookBlurb: true,
  elevatorPitch: true,
  quotableExcerpts: true,
  chapterTeasers: true,
  launchTimeline: true,
  pricingRecommendation: true,
  status: true,
}).partial();

export type InsertMarketingCampaign = z.infer<typeof insertMarketingCampaignSchema>;
export type UpdateMarketingCampaign = z.infer<typeof updateMarketingCampaignSchema>;
export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
