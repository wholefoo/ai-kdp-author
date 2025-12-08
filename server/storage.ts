import { 
  novels,
  savedPlots,
  users,
  characters,
  manuscripts,
  audiobooks,
  aboutPage,
  blogPosts,
  marketingCampaigns,
  type Novel, 
  type InsertNovel, 
  type UpdateNovel, 
  type SavedPlot, 
  type InsertSavedPlot,
  type User,
  type UpsertUser,
  type Character,
  type InsertCharacter,
  type Manuscript,
  type InsertManuscript,
  type Audiobook,
  type InsertAudiobook,
  type UpdateAudiobook,
  type AboutPage,
  type UpdateAboutPage,
  type BlogPost,
  type InsertBlogPost,
  type UpdateBlogPost,
  type MarketingCampaign,
  type InsertMarketingCampaign,
  type UpdateMarketingCampaign
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  getNovel(id: string): Promise<Novel | undefined>;
  createNovel(novel: InsertNovel): Promise<Novel>;
  updateNovel(id: string, updates: UpdateNovel): Promise<Novel | undefined>;
  deleteNovel(id: string): Promise<boolean>;
  getAllNovels(userId?: string): Promise<Novel[]>;
  
  // Plot Inspiration Vault operations
  getSavedPlot(id: string): Promise<SavedPlot | undefined>;
  createSavedPlot(plot: InsertSavedPlot): Promise<SavedPlot>;
  updateSavedPlot(id: string, updates: Partial<SavedPlot>): Promise<SavedPlot | undefined>;
  deleteSavedPlot(id: string): Promise<boolean>;
  getAllSavedPlots(): Promise<SavedPlot[]>;
  getFavoritedPlots(): Promise<SavedPlot[]>;
  togglePlotFavorite(id: string): Promise<SavedPlot | undefined>;

  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserCustomerId(userId: string, stripeCustomerId: string): Promise<User | undefined>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User | undefined>;
  updateUserSubscriptionStatus(userId: string, status: string, endDate?: Date): Promise<User | undefined>;
  
  // Subscription tier operations
  updateUserSubscriptionTier(userId: string, tier: string, monthlyLimit: number): Promise<User | undefined>;
  checkUserNovelLimit(userId: string): Promise<{ canGenerate: boolean; remaining: number; limit: number }>;
  incrementUserNovelCount(userId: string): Promise<User | undefined>;
  resetUserMonthlyCounts(userId: string): Promise<User | undefined>;
  
  // Founders tier tracking (100 member limit)
  getFoundersCount(): Promise<number>;
  getFoundersRemaining(): Promise<number>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getUserStats(): Promise<{
    totalUsers: number;
    activeSubscriptions: number;
    totalRevenue: number;
    recentSignups: number;
    subscriptionsByStatus: { status: string; count: number }[];
  }>;
  getRecentSignups(limit?: number): Promise<User[]>;

  // Character Development Workshop operations
  getCharacter(id: string): Promise<Character | undefined>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  updateCharacter(id: string, updates: Partial<Character>): Promise<Character | undefined>;
  deleteCharacter(id: string): Promise<boolean>;
  getAllCharacters(novelId?: string): Promise<Character[]>;

  // Manuscript Library operations
  getManuscript(id: string): Promise<Manuscript | undefined>;
  createManuscript(manuscript: InsertManuscript): Promise<Manuscript>;
  updateManuscript(id: string, updates: Partial<Manuscript>): Promise<Manuscript | undefined>;
  deleteManuscript(id: string): Promise<boolean>;
  getUserManuscripts(userId: string): Promise<Manuscript[]>;
  toggleCharacterFavorite(id: string): Promise<Character | undefined>;

  // Audiobook generation operations
  getAudiobook(id: string): Promise<Audiobook | undefined>;
  createAudiobook(audiobook: InsertAudiobook): Promise<Audiobook>;
  updateAudiobook(id: string, updates: UpdateAudiobook): Promise<Audiobook | undefined>;
  deleteAudiobook(id: string): Promise<boolean>;
  getUserAudiobooks(userId: string): Promise<Audiobook[]>;
  getNovelAudiobooks(novelId: string): Promise<Audiobook[]>;

  // About page operations
  getAboutPage(): Promise<AboutPage | undefined>;
  updateAboutPage(updates: UpdateAboutPage): Promise<AboutPage | undefined>;

  // Blog post operations
  getBlogPost(id: string): Promise<BlogPost | undefined>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: string, updates: UpdateBlogPost): Promise<BlogPost | undefined>;
  deleteBlogPost(id: string): Promise<boolean>;
  getAllBlogPosts(publishedOnly?: boolean): Promise<BlogPost[]>;
  incrementBlogPostViews(id: string): Promise<BlogPost | undefined>;

  // Marketing campaign operations
  getMarketingCampaign(id: string): Promise<MarketingCampaign | undefined>;
  getMarketingCampaignByNovelId(novelId: string): Promise<MarketingCampaign | undefined>;
  createMarketingCampaign(campaign: InsertMarketingCampaign): Promise<MarketingCampaign>;
  updateMarketingCampaign(id: string, updates: UpdateMarketingCampaign): Promise<MarketingCampaign | undefined>;
  deleteMarketingCampaign(id: string): Promise<boolean>;
  getUserMarketingCampaigns(userId: string): Promise<MarketingCampaign[]>;
}

export class MemStorage implements IStorage {
  private novels: Map<string, Novel>;
  private savedPlots: Map<string, SavedPlot>;
  private manuscripts: Map<string, Manuscript>;
  private audiobooks: Map<string, Audiobook>;

  constructor() {
    this.novels = new Map();
    this.savedPlots = new Map();
    this.manuscripts = new Map();
    this.audiobooks = new Map();
  }

  async getNovel(id: string): Promise<Novel | undefined> {
    return this.novels.get(id);
  }

  async createNovel(insertNovel: InsertNovel): Promise<Novel> {
    const id = randomUUID();
    const now = new Date();
    const novel: Novel = {
      ...insertNovel,
      id,
      userId: insertNovel.userId || "system",
      targetWordCount: insertNovel.targetWordCount || 65000,
      targetChapterCount: insertNovel.targetChapterCount || 25,
      targetChapterLength: insertNovel.targetChapterLength || 2600,
      writingStyle: insertNovel.writingStyle || "balanced",
      pointOfView: insertNovel.pointOfView || "third-person-limited",
      toneAndMood: insertNovel.toneAndMood || "adventurous",
      contentRating: insertNovel.contentRating || "pg-13",
      customInstructions: insertNovel.customInstructions || null,
      sourceContent: insertNovel.sourceContent || null,
      outline: null,
      chapters: [],
      manuscriptContent: null,
      status: "pending",
      progress: {
        overall: 0,
        step1: 0,
        step2: 0,
        step3: 0,
      },
      wordCount: 0,
      actualChapterCount: 0,
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    this.novels.set(id, novel);
    return novel;
  }

  async updateNovel(id: string, updates: UpdateNovel): Promise<Novel | undefined> {
    const novel = this.novels.get(id);
    if (!novel) {
      return undefined;
    }

    const updatedNovel: Novel = {
      ...novel,
      ...updates,
      updatedAt: new Date(),
    };

    this.novels.set(id, updatedNovel);
    return updatedNovel;
  }

  async deleteNovel(id: string): Promise<boolean> {
    return this.novels.delete(id);
  }

  async getAllNovels(): Promise<Novel[]> {
    return Array.from(this.novels.values());
  }

  // Plot Inspiration Vault operations
  async getSavedPlot(id: string): Promise<SavedPlot | undefined> {
    return this.savedPlots.get(id);
  }

  async createSavedPlot(insertPlot: InsertSavedPlot): Promise<SavedPlot> {
    const id = randomUUID();
    const now = new Date();
    const plot: SavedPlot = {
      ...insertPlot,
      id,
      subgenres: (insertPlot.subgenres as string[]) || [],
      themes: (insertPlot.themes as string[]) || [],
      tags: (insertPlot.tags as string[]) || [],
      targetAudience: insertPlot.targetAudience || null,
      estimatedLength: insertPlot.estimatedLength || null,
      difficulty: insertPlot.difficulty || null,
      notes: insertPlot.notes || null,
      isFavorited: insertPlot.isFavorited || false,
      createdAt: now,
      updatedAt: now,
    };
    
    this.savedPlots.set(id, plot);
    return plot;
  }

  async updateSavedPlot(id: string, updates: Partial<SavedPlot>): Promise<SavedPlot | undefined> {
    const existingPlot = this.savedPlots.get(id);
    if (!existingPlot) {
      return undefined;
    }

    const updatedPlot: SavedPlot = {
      ...existingPlot,
      ...updates,
      updatedAt: new Date(),
    };

    this.savedPlots.set(id, updatedPlot);
    return updatedPlot;
  }

  async deleteSavedPlot(id: string): Promise<boolean> {
    return this.savedPlots.delete(id);
  }

  async getAllSavedPlots(): Promise<SavedPlot[]> {
    return Array.from(this.savedPlots.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getFavoritedPlots(): Promise<SavedPlot[]> {
    return Array.from(this.savedPlots.values())
      .filter(plot => plot.isFavorited)
      .sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime());
  }

  async togglePlotFavorite(id: string): Promise<SavedPlot | undefined> {
    const plot = this.savedPlots.get(id);
    if (!plot) {
      return undefined;
    }

    const updatedPlot: SavedPlot = {
      ...plot,
      isFavorited: !plot.isFavorited,
      updatedAt: new Date(),
    };

    this.savedPlots.set(id, updatedPlot);
    return updatedPlot;
  }

  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    // In-memory implementation would store users, but we're using database
    return undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // In-memory implementation - not recommended for auth
    throw new Error("Use DatabaseStorage for authentication");
  }

  async updateUserCustomerId(userId: string, stripeCustomerId: string): Promise<User | undefined> {
    // In-memory implementation - not recommended for auth
    throw new Error("Use DatabaseStorage for authentication");
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User | undefined> {
    // In-memory implementation - not recommended for auth
    throw new Error("Use DatabaseStorage for authentication");
  }

  async updateUserSubscriptionStatus(userId: string, status: string, endDate?: Date): Promise<User | undefined> {
    // In-memory implementation - not recommended for auth
    throw new Error("Use DatabaseStorage for authentication");
  }

  // Character Development Workshop operations
  async getCharacter(id: string): Promise<Character | undefined> {
    // In-memory implementation - basic support
    return undefined;
  }

  async createCharacter(character: InsertCharacter): Promise<Character> {
    throw new Error("Use DatabaseStorage for characters");
  }

  async updateCharacter(id: string, updates: Partial<Character>): Promise<Character | undefined> {
    return undefined;
  }

  async deleteCharacter(id: string): Promise<boolean> {
    return false;
  }

  async getAllCharacters(novelId?: string): Promise<Character[]> {
    return [];
  }

  async toggleCharacterFavorite(id: string): Promise<Character | undefined> {
    return undefined;
  }

  // Manuscript Library operations - basic implementation
  async getManuscript(id: string): Promise<Manuscript | undefined> {
    return this.manuscripts.get(id);
  }

  async createManuscript(manuscript: InsertManuscript): Promise<Manuscript> {
    const id = randomUUID();
    const now = new Date();
    const newManuscript: Manuscript = {
      ...manuscript,
      id,
      processingOptions: manuscript.processingOptions || null,
      processingResults: manuscript.processingResults || null,
      createdAt: now,
      updatedAt: now,
    };
    this.manuscripts.set(id, newManuscript);
    return newManuscript;
  }

  async updateManuscript(id: string, updates: Partial<Manuscript>): Promise<Manuscript | undefined> {
    const manuscript = this.manuscripts.get(id);
    if (!manuscript) {
      return undefined;
    }

    const updatedManuscript: Manuscript = {
      ...manuscript,
      ...updates,
      updatedAt: new Date(),
    };

    this.manuscripts.set(id, updatedManuscript);
    return updatedManuscript;
  }

  async deleteManuscript(id: string): Promise<boolean> {
    return this.manuscripts.delete(id);
  }

  async getUserManuscripts(userId: string): Promise<Manuscript[]> {
    return Array.from(this.manuscripts.values()).filter(m => m.userId === userId);
  }

  // Audiobook operations for MemStorage (development/testing only)
  async getAudiobook(id: string): Promise<Audiobook | undefined> {
    return this.audiobooks.get(id);
  }

  async createAudiobook(insertAudiobook: InsertAudiobook): Promise<Audiobook> {
    const id = randomUUID();
    const audiobook: Audiobook = {
      id,
      novelId: insertAudiobook.novelId,
      title: insertAudiobook.title,
      ttsProvider: insertAudiobook.ttsProvider || 'openai',
      voice: insertAudiobook.voice || 'alloy',
      model: insertAudiobook.model || 'tts-1',
      speed: insertAudiobook.speed || 100,
      format: insertAudiobook.format || 'mp3',
      selectedChapters: insertAudiobook.selectedChapters || [],
      userId: insertAudiobook.userId || null,
      status: 'pending',
      progress: {},
      chapters: [],
      audioFiles: [],
      totalDuration: 0,
      chapterCount: 0,
      metadata: {},
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.audiobooks.set(id, audiobook);
    return audiobook;
  }

  async updateAudiobook(id: string, updates: UpdateAudiobook): Promise<Audiobook | undefined> {
    const audiobook = this.audiobooks.get(id);
    if (!audiobook) return undefined;
    
    const updatedAudiobook = { ...audiobook, ...updates, updatedAt: new Date() };
    this.audiobooks.set(id, updatedAudiobook);
    return updatedAudiobook;
  }

  async deleteAudiobook(id: string): Promise<boolean> {
    return this.audiobooks.delete(id);
  }

  async getUserAudiobooks(userId: string): Promise<Audiobook[]> {
    return Array.from(this.audiobooks.values()).filter(a => a.userId === userId);
  }

  async getNovelAudiobooks(novelId: string): Promise<Audiobook[]> {
    return Array.from(this.audiobooks.values()).filter(a => a.novelId === novelId);
  }

  // About page operations (MemStorage stub implementations)
  async getAboutPage(): Promise<AboutPage | undefined> {
    throw new Error("Use DatabaseStorage for About page operations");
  }

  async updateAboutPage(updates: UpdateAboutPage): Promise<AboutPage | undefined> {
    throw new Error("Use DatabaseStorage for About page operations");
  }

  // Blog post operations (MemStorage stub implementations)
  async getBlogPost(id: string): Promise<BlogPost | undefined> {
    throw new Error("Use DatabaseStorage for blog post operations");
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    throw new Error("Use DatabaseStorage for blog post operations");
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    throw new Error("Use DatabaseStorage for blog post operations");
  }

  async updateBlogPost(id: string, updates: UpdateBlogPost): Promise<BlogPost | undefined> {
    throw new Error("Use DatabaseStorage for blog post operations");
  }

  async deleteBlogPost(id: string): Promise<boolean> {
    throw new Error("Use DatabaseStorage for blog post operations");
  }

  async getAllBlogPosts(publishedOnly?: boolean): Promise<BlogPost[]> {
    throw new Error("Use DatabaseStorage for blog post operations");
  }

  async incrementBlogPostViews(id: string): Promise<BlogPost | undefined> {
    throw new Error("Use DatabaseStorage for blog post operations");
  }

  // Marketing campaign operations (MemStorage stub implementations)
  async getMarketingCampaign(id: string): Promise<MarketingCampaign | undefined> {
    throw new Error("Use DatabaseStorage for marketing campaign operations");
  }

  async getMarketingCampaignByNovelId(novelId: string): Promise<MarketingCampaign | undefined> {
    throw new Error("Use DatabaseStorage for marketing campaign operations");
  }

  async createMarketingCampaign(campaign: InsertMarketingCampaign): Promise<MarketingCampaign> {
    throw new Error("Use DatabaseStorage for marketing campaign operations");
  }

  async updateMarketingCampaign(id: string, updates: UpdateMarketingCampaign): Promise<MarketingCampaign | undefined> {
    throw new Error("Use DatabaseStorage for marketing campaign operations");
  }

  async deleteMarketingCampaign(id: string): Promise<boolean> {
    throw new Error("Use DatabaseStorage for marketing campaign operations");
  }

  async getUserMarketingCampaigns(userId: string): Promise<MarketingCampaign[]> {
    throw new Error("Use DatabaseStorage for marketing campaign operations");
  }

  // Subscription tier operations (MemStorage stub implementations)
  async updateUserSubscriptionTier(userId: string, tier: string, monthlyLimit: number): Promise<User | undefined> {
    throw new Error("Use DatabaseStorage for subscription operations");
  }

  async checkUserNovelLimit(userId: string): Promise<{ canGenerate: boolean; remaining: number; limit: number }> {
    throw new Error("Use DatabaseStorage for subscription operations");
  }

  async incrementUserNovelCount(userId: string): Promise<User | undefined> {
    throw new Error("Use DatabaseStorage for subscription operations");
  }

  async resetUserMonthlyCounts(userId: string): Promise<User | undefined> {
    throw new Error("Use DatabaseStorage for subscription operations");
  }

  async getFoundersCount(): Promise<number> {
    throw new Error("Use DatabaseStorage for Founders tracking");
  }

  async getFoundersRemaining(): Promise<number> {
    throw new Error("Use DatabaseStorage for Founders tracking");
  }

  // Admin operations (MemStorage stub implementations)
  async getAllUsers(): Promise<User[]> {
    throw new Error("Use DatabaseStorage for admin operations");
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeSubscriptions: number;
    totalRevenue: number;
    recentSignups: number;
    subscriptionsByStatus: { status: string; count: number }[];
  }> {
    throw new Error("Use DatabaseStorage for admin operations");
  }

  async getRecentSignups(limit?: number): Promise<User[]> {
    throw new Error("Use DatabaseStorage for admin operations");
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // Novel operations
  async getNovel(id: string): Promise<Novel | undefined> {
    const [novel] = await db.select().from(novels).where(eq(novels.id, id));
    return novel;
  }

  async createNovel(insertNovel: InsertNovel): Promise<Novel> {
    const [novel] = await db
      .insert(novels)
      .values({
        ...insertNovel,
        userId: insertNovel.userId || "system", // Set default userId
        targetWordCount: insertNovel.targetWordCount || 65000,
        targetChapterCount: insertNovel.targetChapterCount || 25,
        targetChapterLength: insertNovel.targetChapterLength || 2600,
      })
      .returning();
    return novel;
  }

  async updateNovel(id: string, updates: UpdateNovel): Promise<Novel | undefined> {
    const [updatedNovel] = await db
      .update(novels)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(novels.id, id))
      .returning();
    return updatedNovel;
  }

  async deleteNovel(id: string): Promise<boolean> {
    const result = await db.delete(novels).where(eq(novels.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllNovels(userId?: string): Promise<Novel[]> {
    // For now, return all novels regardless of userId to fix the immediate issue
    return await db.select().from(novels).orderBy(desc(novels.createdAt));
  }

  // Plot Inspiration Vault operations
  async getSavedPlot(id: string): Promise<SavedPlot | undefined> {
    const [plot] = await db.select().from(savedPlots).where(eq(savedPlots.id, id));
    return plot;
  }

  async createSavedPlot(insertPlot: InsertSavedPlot): Promise<SavedPlot> {
    const [plot] = await db
      .insert(savedPlots)
      .values({
        ...insertPlot,
        themes: insertPlot.themes || null,
        tags: insertPlot.tags || null,
        targetAudience: insertPlot.targetAudience || null,
        estimatedLength: insertPlot.estimatedLength || null,
        difficulty: insertPlot.difficulty || null,
        notes: insertPlot.notes || null,
        isFavorited: insertPlot.isFavorited || false,
      })
      .returning();
    return plot;
  }

  async updateSavedPlot(id: string, updates: Partial<SavedPlot>): Promise<SavedPlot | undefined> {
    const [updatedPlot] = await db
      .update(savedPlots)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(savedPlots.id, id))
      .returning();
    return updatedPlot;
  }

  async deleteSavedPlot(id: string): Promise<boolean> {
    const result = await db.delete(savedPlots).where(eq(savedPlots.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllSavedPlots(): Promise<SavedPlot[]> {
    return await db.select().from(savedPlots);
  }

  async getFavoritedPlots(): Promise<SavedPlot[]> {
    return await db.select().from(savedPlots).where(eq(savedPlots.isFavorited, true));
  }

  async togglePlotFavorite(id: string): Promise<SavedPlot | undefined> {
    const [plot] = await db.select().from(savedPlots).where(eq(savedPlots.id, id));
    if (!plot) {
      return undefined;
    }

    const [updatedPlot] = await db
      .update(savedPlots)
      .set({
        isFavorited: !plot.isFavorited,
        updatedAt: new Date(),
      })
      .where(eq(savedPlots.id, id))
      .returning();
    return updatedPlot;
  }

  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email, // Handle conflicts on email since it has unique constraint
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserCustomerId(userId: string, stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        stripeSubscriptionId,
        // DO NOT set subscriptionStatus to 'active' here - webhooks will handle activation
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserSubscriptionStatus(userId: string, status: string, endDate?: Date): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        subscriptionStatus: status,
        subscriptionEndDate: endDate,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Subscription tier operations
  async updateUserSubscriptionTier(userId: string, tier: string, monthlyLimit: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        subscriptionTier: tier,
        monthlyNovelLimit: monthlyLimit,
        novelsGeneratedThisMonth: 0, // Reset count when tier changes
        currentPeriodStart: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async checkUserNovelLimit(userId: string): Promise<{ canGenerate: boolean; remaining: number; limit: number }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return { canGenerate: false, remaining: 0, limit: 0 };
    }

    // Admin users bypass all generation limits
    if (user.isAdmin) {
      return { canGenerate: true, remaining: Infinity, limit: -1 };
    }

    // Check if we need to reset monthly count (new billing period)
    const now = new Date();
    const periodStart = user.currentPeriodStart ? new Date(user.currentPeriodStart) : new Date();
    const monthsSinceStart = (now.getFullYear() - periodStart.getFullYear()) * 12 + 
                             (now.getMonth() - periodStart.getMonth());
    
    if (monthsSinceStart >= 1) {
      // Reset monthly count for new period
      await this.resetUserMonthlyCounts(userId);
      const limit = user.monthlyNovelLimit || 0;
      return { 
        canGenerate: limit === -1 || 0 < limit, 
        remaining: limit === -1 ? Infinity : limit, 
        limit: limit 
      };
    }

    const generated = user.novelsGeneratedThisMonth || 0;
    const limit = user.monthlyNovelLimit || 0;
    
    // -1 means unlimited (premium)
    if (limit === -1) {
      return { canGenerate: true, remaining: Infinity, limit: -1 };
    }
    
    const remaining = Math.max(0, limit - generated);
    return { 
      canGenerate: remaining > 0, 
      remaining, 
      limit 
    };
  }

  async incrementUserNovelCount(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        novelsGeneratedThisMonth: sql`${users.novelsGeneratedThisMonth} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async resetUserMonthlyCounts(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        novelsGeneratedThisMonth: 0,
        currentPeriodStart: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Founders tier tracking (100 member limit)
  async getFoundersCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.subscriptionTier, 'founders'));
    return Number(result[0]?.count || 0);
  }

  async getFoundersRemaining(): Promise<number> {
    const FOUNDERS_MAX = 100;
    const count = await this.getFoundersCount();
    return Math.max(0, FOUNDERS_MAX - count);
  }

  // Character Development Workshop operations
  async getCharacter(id: string): Promise<Character | undefined> {
    const [character] = await db.select().from(characters).where(eq(characters.id, id));
    return character;
  }

  async createCharacter(characterData: InsertCharacter): Promise<Character> {
    const [character] = await db
      .insert(characters)
      .values({
        ...characterData,
        userId: "system", // TODO: Use actual user ID from session
      })
      .returning();
    return character;
  }

  async updateCharacter(id: string, updates: Partial<Character>): Promise<Character | undefined> {
    const [character] = await db
      .update(characters)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(characters.id, id))
      .returning();
    return character;
  }

  async deleteCharacter(id: string): Promise<boolean> {
    const result = await db.delete(characters).where(eq(characters.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllCharacters(novelId?: string): Promise<Character[]> {
    if (novelId) {
      return await db.select().from(characters).where(eq(characters.novelId, novelId));
    }
    return await db.select().from(characters);
  }

  async toggleCharacterFavorite(id: string): Promise<Character | undefined> {
    const [character] = await db.select().from(characters).where(eq(characters.id, id));
    if (!character) {
      return undefined;
    }

    const [updatedCharacter] = await db
      .update(characters)
      .set({
        isFavorited: !character.isFavorited,
        updatedAt: new Date(),
      })
      .where(eq(characters.id, id))
      .returning();
    return updatedCharacter;
  }

  // Manuscript Library operations
  async getManuscript(id: string): Promise<Manuscript | undefined> {
    const [manuscript] = await db.select().from(manuscripts).where(eq(manuscripts.id, id));
    return manuscript;
  }

  async createManuscript(manuscriptData: InsertManuscript): Promise<Manuscript> {
    const [manuscript] = await db
      .insert(manuscripts)
      .values(manuscriptData)
      .returning();
    return manuscript;
  }

  async updateManuscript(id: string, updates: Partial<Manuscript>): Promise<Manuscript | undefined> {
    const [manuscript] = await db
      .update(manuscripts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(manuscripts.id, id))
      .returning();
    return manuscript;
  }

  async deleteManuscript(id: string): Promise<boolean> {
    const result = await db.delete(manuscripts).where(eq(manuscripts.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getUserManuscripts(userId: string): Promise<Manuscript[]> {
    return await db
      .select()
      .from(manuscripts)
      .where(eq(manuscripts.userId, userId))
      .orderBy(desc(manuscripts.createdAt));
  }

  // Audiobook generation operations
  async getAudiobook(id: string): Promise<Audiobook | undefined> {
    const [audiobook] = await db.select().from(audiobooks).where(eq(audiobooks.id, id));
    return audiobook;
  }

  async createAudiobook(audiobookData: InsertAudiobook): Promise<Audiobook> {
    const [audiobook] = await db
      .insert(audiobooks)
      .values(audiobookData)
      .returning();
    return audiobook;
  }

  async updateAudiobook(id: string, updates: UpdateAudiobook): Promise<Audiobook | undefined> {
    const [audiobook] = await db
      .update(audiobooks)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(audiobooks.id, id))
      .returning();
    return audiobook;
  }

  async deleteAudiobook(id: string): Promise<boolean> {
    const result = await db.delete(audiobooks).where(eq(audiobooks.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getUserAudiobooks(userId: string): Promise<Audiobook[]> {
    return await db
      .select()
      .from(audiobooks)
      .where(eq(audiobooks.userId, userId))
      .orderBy(desc(audiobooks.createdAt));
  }

  async getNovelAudiobooks(novelId: string): Promise<Audiobook[]> {
    return await db
      .select()
      .from(audiobooks)
      .where(eq(audiobooks.novelId, novelId))
      .orderBy(desc(audiobooks.createdAt));
  }

  // About page operations
  async getAboutPage(): Promise<AboutPage | undefined> {
    const [page] = await db
      .select()
      .from(aboutPage)
      .limit(1);
    return page;
  }

  async updateAboutPage(updates: UpdateAboutPage): Promise<AboutPage | undefined> {
    // Check if an About page exists
    const existing = await this.getAboutPage();
    
    if (existing) {
      // Update existing page
      const [updated] = await db
        .update(aboutPage)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(aboutPage.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new page with default content if it doesn't exist
      const [created] = await db
        .insert(aboutPage)
        .values({
          title: updates.title || "About AI KDP Author",
          content: updates.content || "Welcome to AI KDP Author - Your AI-powered novel writing assistant.",
          updatedBy: updates.updatedBy,
          updatedAt: new Date(),
        })
        .returning();
      return created;
    }
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeSubscriptions: number;
    totalRevenue: number;
    recentSignups: number;
    subscriptionsByStatus: { status: string; count: number }[];
  }> {
    const allUsers = await db.select().from(users);
    const totalUsers = allUsers.length;
    
    // Count active subscriptions
    const activeSubscriptions = allUsers.filter(user => 
      user.subscriptionStatus === 'active'
    ).length;
    
    // Calculate total revenue (simplified - assuming $20/month for active subscriptions)
    const totalRevenue = activeSubscriptions * 20;
    
    // Count recent signups (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSignups = allUsers.filter(user => 
      user.createdAt && new Date(user.createdAt) >= sevenDaysAgo
    ).length;
    
    // Group subscriptions by status
    const statusCounts = allUsers.reduce((acc, user) => {
      const status = user.subscriptionStatus || 'none';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const subscriptionsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
    
    return {
      totalUsers,
      activeSubscriptions,
      totalRevenue,
      recentSignups,
      subscriptionsByStatus
    };
  }

  async getRecentSignups(limit: number = 10): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit);
  }

  // Blog post operations
  async getBlogPost(id: string): Promise<BlogPost | undefined> {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);
    return post;
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1);
    return post;
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const [created] = await db
      .insert(blogPosts)
      .values({
        ...post,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return created;
  }

  async updateBlogPost(id: string, updates: UpdateBlogPost): Promise<BlogPost | undefined> {
    const [updated] = await db
      .update(blogPosts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning();
    return updated;
  }

  async deleteBlogPost(id: string): Promise<boolean> {
    const result = await db
      .delete(blogPosts)
      .where(eq(blogPosts.id, id));
    return true;
  }

  async getAllBlogPosts(publishedOnly: boolean = false): Promise<BlogPost[]> {
    if (publishedOnly) {
      return await db
        .select()
        .from(blogPosts)
        .where(eq(blogPosts.published, true))
        .orderBy(desc(blogPosts.publishedAt));
    }
    return await db
      .select()
      .from(blogPosts)
      .orderBy(desc(blogPosts.createdAt));
  }

  async incrementBlogPostViews(id: string): Promise<BlogPost | undefined> {
    const [updated] = await db
      .update(blogPosts)
      .set({
        views: sql`${blogPosts.views} + 1`,
      })
      .where(eq(blogPosts.id, id))
      .returning();
    return updated;
  }

  // Marketing campaign operations
  async getMarketingCampaign(id: string): Promise<MarketingCampaign | undefined> {
    const [campaign] = await db
      .select()
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.id, id))
      .limit(1);
    return campaign;
  }

  async getMarketingCampaignByNovelId(novelId: string): Promise<MarketingCampaign | undefined> {
    const [campaign] = await db
      .select()
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.novelId, novelId))
      .limit(1);
    return campaign;
  }

  async createMarketingCampaign(campaign: InsertMarketingCampaign): Promise<MarketingCampaign> {
    const [created] = await db
      .insert(marketingCampaigns)
      .values({
        ...campaign,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return created;
  }

  async updateMarketingCampaign(id: string, updates: UpdateMarketingCampaign): Promise<MarketingCampaign | undefined> {
    const [updated] = await db
      .update(marketingCampaigns)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(marketingCampaigns.id, id))
      .returning();
    return updated;
  }

  async deleteMarketingCampaign(id: string): Promise<boolean> {
    await db
      .delete(marketingCampaigns)
      .where(eq(marketingCampaigns.id, id));
    return true;
  }

  async getUserMarketingCampaigns(userId: string): Promise<MarketingCampaign[]> {
    return await db
      .select()
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.userId, userId))
      .orderBy(desc(marketingCampaigns.createdAt));
  }
}

export const storage = new DatabaseStorage();
