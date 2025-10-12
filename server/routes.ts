import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { novelGenerationService } from "./services/openai";
import { exportService } from "./services/export";
import { consistencyChecker } from "./services/consistency";
import { grammarChecker } from "./services/grammar";
import { characterService } from "./services/character";
import { styleConsistencyService } from "./services/styleChecker";
import { manuscriptProcessor } from "./services/manuscriptProcessor";
import { ManuscriptAnalyzer } from "./services/manuscriptAnalyzer";
import { ExportService } from "./services/exportService";
import { docxExportService, DocxExportService } from "./services/docxExportService";
import { simpleDocxExportService } from "./services/simpleDocxExport";
import { ContentQualityService } from "./services/contentQualityService";
import { readabilityService } from "./services/readabilityService";
import { NovelComposerService } from "./services/novelComposer";
import { proofreadingService } from "./services/proofreadingService";
import { chapterRevisionService } from "./services/chapterRevision";
import { narrativeArcService } from "./services/narrativeArcService";
import { emailService } from "./services/emailService";
import qualityRoutes from "./routes/qualityRoutes";
import multer from "multer";
import OpenAI from "openai";
import * as fs from "fs/promises";
import { createReadStream } from "fs";
import * as path from "path";
import mammoth from "mammoth";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { novelGenerationRequestSchema, updateNovelSchema, insertCharacterSchema, users, insertBlogPostSchema, updateBlogPostSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { 
    fileSize: 100 * 1024 * 1024,      // 100MB file limit
    fieldSize: 50 * 1024 * 1024,      // 50MB field size limit for large text fields
    fieldNameSize: 1000,              // 1KB field name limit
    fields: 100,                      // Maximum 100 fields
    files: 10                         // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      cb(null, true);
    } else {
      cb(new Error("Only DOCX files are allowed"));
    }
  }
});

// Extend Request interface for multer
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Helper function to parse chapters from manuscript content
function parseChaptersFromContent(content: string): Array<{ title: string; content: string; chapterNumber: number }> {
  const chapters: Array<{ title: string; content: string; chapterNumber: number }> = [];
  
  // Clean the content and remove copyright/front matter sections
  let cleanContent = content
    .replace(/^#[\s\S]*?(?=Week\s+\d+|Chapter\s+\d+)/g, '') // Remove title and front matter
    .replace(/## Copyright[\s\S]*?(?=Week\s+\d+|Chapter\s+\d+)/g, '') // Remove copyright section
    .replace(/## Table of Contents[\s\S]*?(?=Week\s+\d+|Chapter\s+\d+)/g, '') // Remove TOC
    .replace(/DEDICATION[\s\S]*?(?=Week\s+\d+|Chapter\s+\d+)/g, '') // Remove dedication
    .replace(/ACKNOWLEDGMENTS[\s\S]*?(?=Week\s+\d+|Chapter\s+\d+)/g, '') // Remove acknowledgments
    .replace(/Introduction[\s\S]*?(?=Week\s+\d+|Chapter\s+\d+)/g, '') // Remove introduction
    .trim();

  // Define patterns for diary entry headers
  const diaryHeaderPatterns = [
    /^The\s+[A-Z][^.\n]+$/gm, // "The Something Something"
    /^[A-Z][^.\n]*\s+vs\.\s+[A-Z][^.\n]*$/gm, // "Something vs. Something"
    /^Trying\s+to\s+[A-Z][^.\n]*$/gm, // "Trying to..."
    /^[A-Z][^.\n]*\s+Relationship\s+with\s+[A-Z][^.\n]*$/gm, // "...Relationship with..."
    /^[A-Z][^.\n]*\s+(Crisis|Battle|Attempt|Love-Hate|Update|Job)\b/gm, // Various diary topic patterns
    /^Robo\s+(vs\.|the|and)\s+[A-Z][^.\n]*$/gm, // "Robo vs./the/and Something"
  ];

  let allChapters: string[] = [];
  
  // First, split by "Week X" if present
  const weekSections = cleanContent.split(/(?=^Week\s+\d+)/gm);
  
  if (weekSections.length > 1) {
    console.log(`📅 Found ${weekSections.length} week sections`);
    
    // Process each week section and look for diary entries within it
    weekSections.forEach((weekSection, weekIndex) => {
      if (weekSection.trim().length < 50) return; // Skip very short sections
      
      const lines = weekSection.split('\n');
      let currentEntry = '';
      let currentTitle = '';
      let inEntry = false;
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Check if this line looks like a diary entry header
        const isDiaryHeader = (
          trimmed.length > 10 && trimmed.length < 100 &&
          /^[A-Z]/.test(trimmed) &&
          !trimmed.includes('Week') && // Don't treat Week headers as diary entries
          (
            // Specific patterns for this novel
            trimmed.includes(':') && trimmed.includes('?') ||
            trimmed.includes('vs.') ||
            trimmed.startsWith('The ') ||
            trimmed.startsWith('Trying to') ||
            trimmed.startsWith('Robo') ||
            trimmed.includes('Relationship with') ||
            trimmed.includes('Crisis') ||
            trimmed.includes('Battle') ||
            trimmed.includes('Update') ||
            trimmed.includes('Job') ||
            trimmed.includes('Love-Hate')
          )
        );
        
        if (isDiaryHeader) {
          // Save previous entry if it exists and has content
          if (inEntry && currentEntry.trim().length > 50) {
            allChapters.push((currentTitle ? `${currentTitle}\n\n` : '') + currentEntry.trim());
          }
          
          // Start new entry
          currentTitle = trimmed;
          currentEntry = '';
          inEntry = true;
        } else if (inEntry || (weekIndex === 0 && !inEntry)) {
          // Add content to current entry or handle week header content
          currentEntry += line + '\n';
          if (!inEntry) inEntry = true; // Start collecting if this is meaningful content
        }
      }
      
      // Add the last entry from this week
      if (inEntry && currentEntry.trim().length > 50) {
        allChapters.push((currentTitle ? `${currentTitle}\n\n` : '') + currentEntry.trim());
      }
    });
  } else {
    // No weeks found, try to split by diary entry headers directly
    console.log(`📝 No weeks found, parsing as individual diary entries`);
    
    const lines = cleanContent.split('\n');
    let currentSection = '';
    let currentTitle = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check if this line looks like a diary entry title/header
      const isDiaryHeader = (
        trimmed.length > 10 && trimmed.length < 80 &&
        /^[A-Z]/.test(trimmed) &&
        (!trimmed.includes('.') || trimmed.endsWith(':')) &&
        (trimmed.includes(':') || trimmed.includes('vs.') || 
         trimmed.startsWith('The ') || trimmed.startsWith('Trying to') ||
         trimmed.includes('Relationship with') || 
         /^[A-Z][^.\n]*\s+(Crisis|Battle|Attempt|Love-Hate|Update|Job)/.test(trimmed))
      );
      
      if (isDiaryHeader && currentSection.trim().length > 50) {
        // Save the previous section
        allChapters.push((currentTitle ? `${currentTitle}\n\n` : '') + currentSection.trim());
        currentSection = '';
        currentTitle = trimmed;
      } else if (isDiaryHeader) {
        currentTitle = trimmed;
      } else {
        currentSection += line + '\n';
      }
    }
    
    // Add the last section
    if (currentSection.trim().length > 50) {
      allChapters.push((currentTitle ? `${currentTitle}\n\n` : '') + currentSection.trim());
    }
  }

  // Process each chapter
  allChapters.forEach((section, index) => {
    const lines = section.split('\n').filter(line => line.trim());
    if (lines.length === 0) return;
    
    let title = '';
    let content = section;
    
    // Extract title from first meaningful line
    const firstLine = lines[0]?.trim() || '';
    
    if (firstLine.startsWith('Week ')) {
      title = firstLine;
      content = lines.slice(1).join('\n').trim();
    } else if (firstLine.length < 100 && /^[A-Z]/.test(firstLine) && !firstLine.includes('…')) {
      title = firstLine;
      content = lines.slice(1).join('\n').trim();
    } else {
      // Generate a title based on content or position
      title = `Chapter ${index + 1}`;
    }
    
    // Clean up the content
    content = content
      .replace(/^\n+/, '')
      .replace(/\n\n\n+/g, '\n\n')
      .trim();
    
    // Lower minimum content length to capture shorter diary entries
    if (content.length > 50) {
      chapters.push({
        title: title,
        content: content,
        chapterNumber: index + 1
      });
    }
  });

  console.log(`📖 Parsed ${chapters.length} chapters from content`);
  return chapters;
}

// Helper function to extract chapters from HTML using page breaks and structure
function extractChaptersFromHtml(htmlContent: string, plainTextContent: string): string[] {
  const chapters: string[] = [];
  
  // Look for page breaks using Mammoth's actual output format
  // Mammoth outputs page breaks as: <p class="page-break"></p> or similar
  const htmlSections = htmlContent
    .split(/(?:<p[^>]*class="[^"]*page-break[^"]*"[^>]*>.*?<\/p>)|(?:<br[^>]*class="[^"]*page-break[^"]*"[^>]*>)|(?:<div[^>]*class="[^"]*page-break[^"]*"[^>]*>)|(?:<w:br[^>]*w:type="page"[^>]*>)/i)
    .filter(section => section.trim().length > 100);
  
  if (htmlSections.length > 1) {
    // Found page break indicators
    console.log(`Found ${htmlSections.length} sections with page breaks`);
    
    htmlSections.forEach((section, index) => {
      // Convert HTML section back to text
      const sectionText = section
        .replace(/<h[1-6][^>]*>/gi, '\n\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n\n\n+/g, '\n\n')
        .trim();
      
      if (sectionText.length > 100) {
        // Normalize chapter title - try to extract or add a chapter heading if missing
        const lines = sectionText.split('\n').filter(line => line.trim());
        const firstLine = lines[0]?.trim() || '';
        
        // If first line doesn't look like a chapter title, add one
        if (firstLine.length > 100 || !(/^(chapter|\d+|[ivxlcdm]+)/i.test(firstLine))) {
          const chapterTitle = `Chapter ${index + 1}`;
          chapters.push(`${chapterTitle}\n\n${sectionText}`);
        } else {
          chapters.push(sectionText);
        }
      }
    });
  } else {
    // Look for heading tags that might indicate chapters
    const headingSections = htmlContent.split(/<h[1-3][^>]*>/i);
    if (headingSections.length > 1) {
      console.log(`Found ${headingSections.length} sections with headings`);
      
      headingSections.forEach((section, index) => {
        if (index === 0 && section.trim().length < 100) return; // Skip short intro
        
        const sectionText = section
          .replace(/<\/h[1-6]>/gi, '\n\n')
          .replace(/<p[^>]*>/gi, '')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\n\n\n+/g, '\n\n')
          .trim();
        
        if (sectionText.length > 100) {
          // Normalize chapter title for heading-based detection too
          const lines = sectionText.split('\n').filter(line => line.trim());
          const firstLine = lines[0]?.trim() || '';
          
          // If first line doesn't look like a chapter title, add one
          if (firstLine.length > 100 || !(/^(chapter|\d+|[ivxlcdm]+)/i.test(firstLine))) {
            const chapterTitle = `Chapter ${index}`;
            chapters.push(`${chapterTitle}\n\n${sectionText}`);
          } else {
            chapters.push(sectionText);
          }
        }
      });
    }
  }
  
  return chapters;
}

// Helper function to extract chapters from DOCX content using enhanced diary detection
function extractChaptersFromContent(content: string, htmlContent?: string): Array<{ title: string; content: string; chapterNumber: number }> {
  // First try: Use HTML content to detect page breaks and structural elements
  if (htmlContent) {
    const pageBreakChapters = extractChaptersFromHtml(htmlContent, content);
    if (pageBreakChapters.length > 1) {
      console.log(`Detected ${pageBreakChapters.length} chapters using page breaks and HTML structure`);
      // Convert string chapters to objects for consistency
      return pageBreakChapters.map((chapter, index) => ({
        title: `Chapter ${index + 1}`,
        content: chapter,
        chapterNumber: index + 1
      }));
    }
  }
  
  // Fallback: Use enhanced diary-aware text-based detection
  console.log("Falling back to text-based chapter detection");
  
  // Use the improved parseChaptersFromContent logic for diary-style detection
  const parsedChapters = parseChaptersFromContent(content);
  
  console.log(`Successfully imported DOCX: detected ${parsedChapters.length} chapters`);
  return parsedChapters;
}

// Helper function to infer genre from content
function inferGenre(content: string): string {
  const lowerContent = content.toLowerCase();
  
  // Fantasy keywords
  if (lowerContent.includes('magic') || lowerContent.includes('wizard') || 
      lowerContent.includes('dragon') || lowerContent.includes('spell') ||
      lowerContent.includes('fantasy') || lowerContent.includes('realm')) {
    return 'Fantasy';
  }
  
  // Romance keywords
  if (lowerContent.includes('love') || lowerContent.includes('romance') || 
      lowerContent.includes('heart') || lowerContent.includes('kiss') ||
      lowerContent.includes('relationship') || lowerContent.includes('dating')) {
    return 'Romance';
  }
  
  // Mystery/Thriller keywords
  if (lowerContent.includes('murder') || lowerContent.includes('detective') || 
      lowerContent.includes('crime') || lowerContent.includes('mystery') ||
      lowerContent.includes('investigation') || lowerContent.includes('thriller')) {
    return 'Mystery';
  }
  
  // Science Fiction keywords
  if (lowerContent.includes('space') || lowerContent.includes('alien') || 
      lowerContent.includes('robot') || lowerContent.includes('future') ||
      lowerContent.includes('technology') || lowerContent.includes('sci-fi')) {
    return 'Science Fiction';
  }
  
  // Horror keywords
  if (lowerContent.includes('horror') || lowerContent.includes('ghost') || 
      lowerContent.includes('demon') || lowerContent.includes('nightmare') ||
      lowerContent.includes('evil') || lowerContent.includes('terror')) {
    return 'Horror';
  }
  
  // Default to Literary Fiction
  return 'Literary Fiction';
}

// Initialize OpenAI for manuscript analysis
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

// Subscription middleware to check if user has active subscription
const requireSubscription: typeof isAuthenticated = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userId = (req.user as any)?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Invalid user session" });
  }

  const user = await storage.getUser(userId);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  // Check subscription status
  if (!user.subscriptionStatus || 
      user.subscriptionStatus === 'canceled' || 
      user.subscriptionStatus === 'unpaid' ||
      (user.subscriptionEndDate && new Date(user.subscriptionEndDate) < new Date())) {
    return res.status(403).json({ 
      message: "Active subscription required",
      subscriptionStatus: user.subscriptionStatus,
      endDate: user.subscriptionEndDate
    });
  }

  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Character Consistency Analyzer route for novels
  app.post('/api/novels/:novelId/character-consistency', isAuthenticated, async (req, res) => {
    try {
      const { novelId } = req.params;
      const userId = (req.user as any)?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const novel = await storage.getNovel(novelId);
      if (!novel) {
        return res.status(404).json({ message: 'Novel not found' });
      }

      // Import the service here to avoid circular dependencies
      const { CharacterConsistencyService } = await import('./services/characterConsistency');
      const consistencyService = new CharacterConsistencyService();

      // Extract chapter content from the novel
      const chapters = (novel as any).chapters || [];
      if (chapters.length === 0) {
        return res.status(400).json({ message: 'Novel has no chapters to analyze' });
      }

      // Analyze character consistency
      const report = await consistencyService.analyzeCharacterConsistency(
        chapters,
        novel.title
      );

      res.json(report);
    } catch (error) {
      console.error('Character consistency analysis error:', error);
      res.status(500).json({ 
        message: 'Failed to analyze character consistency',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Quality control routes
  app.use("/api/quality", qualityRoutes);

  // Get all novels
  app.get("/api/novels", async (req, res) => {
    try {
      const novels = await storage.getAllNovels();
      res.json(novels);
    } catch (error) {
      console.error("Error fetching novels:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Readability analysis routes
  app.post("/api/readability/analyze", isAuthenticated, async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string' || text.trim().length < 50) {
        return res.status(400).json({ message: "Text must be at least 50 characters long" });
      }

      const analysis = await readabilityService.analyzeReadability(text);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing readability:", error);
      res.status(500).json({ 
        message: "Failed to analyze readability",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/readability/improve", isAuthenticated, async (req, res) => {
    try {
      const { text, targetLevel } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Text is required" });
      }

      const improvedText = await readabilityService.improveReadability(text, targetLevel || 'high');
      res.json({ improvedText });
    } catch (error) {
      console.error("Error improving readability:", error);
      res.status(500).json({ 
        message: "Failed to improve readability",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Comprehensive proofreading routes
  app.post("/api/proofreading/analyze", isAuthenticated, async (req, res) => {
    try {
      const { content, options } = req.body;
      
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Content is required for proofreading analysis" });
      }

      if (content.trim().length < 100) {
        return res.status(400).json({ message: "Content must be at least 100 characters long" });
      }

      const report = await proofreadingService.proofreadManuscript(content, options || {});
      res.json(report);
    } catch (error) {
      console.error("Error in proofreading analysis:", error);
      res.status(500).json({ 
        message: "Failed to analyze manuscript for proofreading",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Test AI service fallback functionality
  app.get("/api/ai/status", async (req, res) => {
    try {
      const { aiService } = await import("./services/aiService");
      const status = await aiService.checkModelAvailability();
      res.json({
        success: true,
        models: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error checking AI model status:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  app.post("/api/proofreading/analyze-upload", isAuthenticated, upload.single('manuscript'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (req.file.mimetype !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        return res.status(400).json({ message: "Only DOCX files are supported for proofreading" });
      }

      // Extract text from DOCX
      const extractedText = await manuscriptProcessor.extractTextFromDocx(req.file.path);
      
      // Parse options from request body
      const options = req.body.options ? JSON.parse(req.body.options) : {};
      
      // Perform comprehensive proofreading
      const report = await proofreadingService.proofreadManuscript(extractedText, {
        includeProcessedText: options.includeProcessedText || false,
        targetAudience: options.targetAudience,
        genre: options.genre,
        focusAreas: options.focusAreas
      });

      // Clean up the temporary file
      await fs.unlink(req.file.path);

      res.json(report);
    } catch (error) {
      console.error("Error in uploaded file proofreading:", error);
      // Clean up file if it exists
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error("Error cleaning up file:", cleanupError);
        }
      }
      res.status(500).json({ 
        message: "Failed to proofread uploaded manuscript",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/proofreading/novel/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { options } = req.body;
      
      const novel = await storage.getNovel(id);
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }

      if (!novel.manuscriptContent) {
        return res.status(400).json({ message: "Novel has no content to proofread" });
      }

      const report = await proofreadingService.proofreadManuscript(novel.manuscriptContent, {
        includeProcessedText: options?.includeProcessedText || false,
        targetAudience: options?.targetAudience,
        genre: novel.genre,
        focusAreas: options?.focusAreas
      });

      res.json(report);
    } catch (error) {
      console.error("Error proofreading novel:", error);
      res.status(500).json({ 
        message: "Failed to proofread novel",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Save corrected text as formatted DOCX to library
  app.post("/api/proofreading/save-to-library", isAuthenticated, async (req, res) => {
    try {
      const { correctedText, originalTitle, analysisReport } = req.body;
      
      if (!correctedText || typeof correctedText !== 'string') {
        return res.status(400).json({ message: "Corrected text is required" });
      }

      if (correctedText.trim().length < 100) {
        return res.status(400).json({ message: "Content is too short to save" });
      }

      const userId = (req.user as any)?.claims?.sub || "system";
      const title = `${originalTitle || 'Proofread Manuscript'} - Corrected`;

      // Format the corrected text into a proper DOCX manuscript
      const wordCount = correctedText.split(/\s+/).filter(word => word.length > 0).length;
      const estimatedPages = Math.ceil(wordCount / 250); // 250 words per page estimate
      const estimatedReadingTime = Math.ceil(wordCount / 250); // 250 words per minute

      // Create a processing summary based on the analysis report
      const processingResults = analysisReport ? {
        proofreadingScore: analysisReport.overallScore,
        issuesFound: analysisReport.summary.totalIssues,
        criticalIssues: analysisReport.summary.criticalIssues,
        improvements: {
          grammarScore: analysisReport.spellingAndGrammar?.score || 0,
          readabilityScore: analysisReport.readabilityAnalysis?.score || 0,
          styleScore: analysisReport.styleConsistency?.score || 0
        },
        recommendations: analysisReport.recommendations?.immediate || []
      } : null;

      // Save to manuscript library
      const savedManuscript = await storage.createManuscript({
        userId,
        title,
        originalText: correctedText, // Use corrected text as the source
        cleanedText: correctedText,
        originalWordCount: wordCount,
        cleanedWordCount: wordCount,
        fileSize: Buffer.byteLength(correctedText, 'utf8'),
        processingOptions: {
          type: 'proofreading',
          source: 'proofreading-analyzer',
          timestamp: new Date().toISOString()
        },
        processingResults: {
          type: 'proofread',
          summary: `Manuscript proofread and corrected. Overall score: ${analysisReport?.overallScore || 'N/A'}/100`,
          changes: processingResults ? [
            `Grammar improvements: ${processingResults.improvements.grammarScore}/100`,
            `Readability score: ${processingResults.improvements.readabilityScore}/100`,
            `Style consistency: ${processingResults.improvements.styleScore}/100`,
            `Issues resolved: ${processingResults.issuesFound}`
          ] : ['Manuscript proofread and saved'],
          wordCount,
          estimatedPages,
          estimatedReadingTime,
          ...processingResults
        }
      });

      res.json({ 
        success: true,
        manuscriptId: savedManuscript.id,
        message: "Corrected manuscript saved to library successfully",
        manuscript: {
          id: savedManuscript.id,
          title,
          wordCount,
          estimatedPages,
          createdAt: savedManuscript.createdAt
        }
      });
    } catch (error) {
      console.error("Error saving corrected text to library:", error);
      res.status(500).json({ 
        message: "Failed to save corrected manuscript",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Generate and download formatted DOCX from corrected text
  app.post("/api/proofreading/download-docx", isAuthenticated, async (req, res) => {
    try {
      const { correctedText, title, formatOptions } = req.body;
      
      if (!correctedText || typeof correctedText !== 'string') {
        return res.status(400).json({ message: "Corrected text is required" });
      }

      const manuscriptTitle = title || 'Corrected Manuscript';
      
      // Use the simple DOCX export service for formatting
      const docxBuffer = await simpleDocxExportService.generateFromText(correctedText, manuscriptTitle, {
        fontSize: (formatOptions?.fontSize || 12) * 2, // Convert to half-points
        fontFamily: formatOptions?.font || 'Aptos',
        includeTitle: formatOptions?.includeTitle !== false,
        chapterStartsNewPage: true
      });

      const filename = `${manuscriptTitle.replace(/[^a-zA-Z0-9-_\s]/g, '')}.docx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(docxBuffer);
    } catch (error) {
      console.error("Error generating DOCX from corrected text:", error);
      res.status(500).json({ 
        message: "Failed to generate DOCX file",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims?.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Create a new novel generation request - requires subscription and usage limit check
  app.post("/api/novels", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check user's novel generation limit before proceeding
      const limitCheck = await storage.checkUserNovelLimit(userId);
      
      if (!limitCheck.canGenerate) {
        // Send upgrade prompt email when user hits limit
        const user = await storage.getUser(userId);
        if (user?.email) {
          const userName = user.firstName || user.email.split('@')[0];
          emailService.sendUpgradePromptEmail(
            user.email,
            userName,
            limitCheck.limit,
            limitCheck.limit
          ).catch(err => console.error('Failed to send upgrade prompt email:', err));
        }
        
        return res.status(403).json({ 
          message: "Novel generation limit reached",
          remaining: limitCheck.remaining,
          limit: limitCheck.limit,
          error: "LIMIT_EXCEEDED"
        });
      }

      const validatedData = novelGenerationRequestSchema.parse(req.body);
      
      const novel = await storage.createNovel({
        userId,
        title: validatedData.title || "",
        genre: validatedData.genre || "Fantasy",
        plotIdea: validatedData.plotIdea || "",
        targetWordCount: validatedData.targetWordCount,
        targetChapterCount: validatedData.targetChapterCount,
        targetChapterLength: validatedData.targetChapterLength,
        writingStyle: validatedData.writingStyle,
        pointOfView: validatedData.pointOfView,
        toneAndMood: validatedData.toneAndMood,
        contentRating: validatedData.contentRating,
        customInstructions: validatedData.customInstructions,
      });

      // Increment user's novel count after successful creation
      await storage.incrementUserNovelCount(userId);

      // Check if user is approaching limit and send upgrade prompt email
      const newRemaining = limitCheck.remaining - 1;
      const usagePercentage = ((limitCheck.limit - newRemaining) / limitCheck.limit) * 100;
      
      if (usagePercentage >= 80 && limitCheck.limit > 0) {
        const user = await storage.getUser(userId);
        if (user?.email) {
          const userName = user.firstName || user.email.split('@')[0];
          emailService.sendUpgradePromptEmail(
            user.email,
            userName,
            limitCheck.limit - newRemaining,
            limitCheck.limit
          ).catch(err => console.error('Failed to send upgrade prompt email:', err));
        }
      }

      res.json({
        ...novel,
        usageInfo: {
          remaining: newRemaining,
          limit: limitCheck.limit
        }
      });
    } catch (error) {
      console.error("Error creating novel:", error);
      res.status(400).json({ 
        message: error instanceof z.ZodError ? "Invalid input data" : error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Upload DOCX file to create a novel
  app.post("/api/novels/upload-docx", upload.single('docx'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No DOCX file provided" });
      }

      console.log("Processing uploaded DOCX file:", req.file.originalname);

      // Parse DOCX file using mammoth
      const htmlResult = await mammoth.convertToHtml({ 
        path: req.file.path
      });
      
      // Extract plain text as well for fallback
      const textResult = await mammoth.extractRawText({ path: req.file.path });
      const content = textResult.value;
      const htmlContent = htmlResult.value;

      if (!content || content.trim().length < 100) {
        // Clean up uploaded file
        await fs.unlink(req.file.path);
        return res.status(400).json({ message: "DOCX file appears to be empty or corrupted" });
      }

      // Extract title from filename or content
      let title = req.file.originalname.replace(/\.docx$/i, '').replace(/[-_]/g, ' ');
      
      // Try to extract title from first line if it looks like a title
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        const firstLine = lines[0].trim();
        if (firstLine.length < 100 && firstLine.length > 5 && !firstLine.includes('.')) {
          title = firstLine;
        }
      }

      // Extract chapters from content using enhanced detection
      const chapters = extractChaptersFromContent(content, htmlContent);
      
      // Calculate word count
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      
      // Determine approximate genre based on content keywords (simple heuristic)
      const genre = inferGenre(content);

      // Create novel entry (first create with basic info)
      const novel = await storage.createNovel({
        title,
        genre,
        plotIdea: `Imported from DOCX file: ${req.file.originalname}`,
        targetWordCount: wordCount,
        targetChapterCount: chapters.length,
        targetChapterLength: Math.round(wordCount / Math.max(chapters.length, 1)),
        writingStyle: "imported",
        pointOfView: "unknown",
        toneAndMood: "imported",
        contentRating: "unknown",
        sourceContent: `Imported DOCX: ${req.file.originalname}`,
      });

      // Then update with chapters and other data that requires updateNovelSchema
      await storage.updateNovel(novel.id, {
        chapters: chapters,
        manuscriptContent: content,
        status: "completed",
        wordCount,
        actualChapterCount: chapters.length,
        progress: {
          overall: 100,
          step1: 100,
          step2: 100,
          step3: 100,
          currentStatus: "Import complete",
        }
      });

      // Clean up uploaded file
      await fs.unlink(req.file.path);

      console.log(`Successfully imported DOCX: ${title} (${wordCount} words, ${chapters.length} chapters)`);

      res.status(201).json({
        message: "DOCX file imported successfully",
        novel: {
          id: novel.id,
          title: novel.title,
          wordCount: novel.wordCount,
          chapterCount: novel.actualChapterCount,
          genre: novel.genre,
        }
      });

    } catch (error) {
      console.error("Error uploading DOCX:", error);
      
      // Clean up uploaded file if it exists
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error("Error cleaning up file:", cleanupError);
        }
      }

      res.status(500).json({ 
        message: "Failed to process DOCX file",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get novel by ID
  app.get("/api/novels/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const novel = await storage.getNovel(id);
      
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }

      res.json(novel);
    } catch (error) {
      console.error("Error fetching novel:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Start outline generation
  app.post("/api/novels/:id/generate-outline", async (req, res) => {
    try {
      const { id } = req.params;
      const novel = await storage.getNovel(id);
      
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }

      if (novel.status !== "pending") {
        return res.status(400).json({ message: "Novel generation already in progress or completed" });
      }

      // Update status to generating
      await storage.updateNovel(id, {
        status: "generating_outline",
        progress: {
          overall: 10,
          step1: 50,
          step2: 0,
          step3: 0,
          currentStatus: "Generating outline...",
        }
      });

      // Generate outline (this runs in background)
      setImmediate(async () => {
        try {
          const outline = await novelGenerationService.generateOutline(
            novel.genre,
            novel.plotIdea,
            novel.title,
            novel.targetWordCount || 65000,
            novel.targetChapterCount || 25,
            novel.targetChapterLength || 2600,
            novel.writingStyle || "balanced",
            novel.pointOfView || "third-person-limited",
            novel.toneAndMood || "adventurous",
            novel.contentRating || "pg-13",
            novel.customInstructions || undefined
          );

          await storage.updateNovel(id, {
            outline,
            status: "outline_generated",
            progress: {
              overall: 25,
              step1: 100,
              step2: 0,
              step3: 0,
              currentStatus: "Outline generated successfully",
              totalChapters: outline.chapters.length,
            }
          });
        } catch (error) {
          await storage.updateNovel(id, {
            status: "error",
            error: error instanceof Error ? error.message : 'Unknown error',
            progress: {
              overall: 0,
              step1: 0,
              step2: 0,
              step3: 0,
              currentStatus: "Error generating outline",
            }
          });
        }
      });

      res.json({ message: "Outline generation started" });
    } catch (error) {
      console.error("Error starting outline generation:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Start chapter generation
  app.post("/api/novels/:id/generate-chapters", async (req, res) => {
    try {
      const { id } = req.params;
      const novel = await storage.getNovel(id);
      
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }

      if (novel.status !== "outline_generated") {
        return res.status(400).json({ message: "Outline must be generated first" });
      }

      if (!novel.outline) {
        return res.status(400).json({ message: "No outline available" });
      }

      // Update status to generating chapters
      await storage.updateNovel(id, {
        status: "generating_chapters",
        progress: {
          overall: 30,
          step1: 100,
          step2: 0,
          step3: 0,
          currentStatus: "Starting chapter generation...",
          currentChapter: 1,
          totalChapters: (novel.outline as any).chapters.length,
        }
      });

      // Generate chapters (this runs in background)
      setImmediate(async () => {
        try {
          const chapters: string[] = [];
          let previousContent = "";
          const totalChapters = (novel.outline as any)!.chapters.length;

          // Use the original novel generation service for consistent, full-length chapters
          for (let i = 1; i <= totalChapters; i++) {
            const chapterInfo = (novel.outline as any)?.chapters?.[i-1];
            if (!chapterInfo) {
              console.error(`Chapter ${i} not found in outline`);
              continue;
            }

            // Generate chapter using the full-strength original method
            let chapterContent = await novelGenerationService.generateChapter(
              i,
              novel.outline as any,
              previousContent,
              novel.targetChapterLength || 4000
            );

            // Post-process for proper formatting
            chapterContent = ensureProperFormatting(chapterContent);

            const wordCount = chapterContent.split(/\s+/).length;
            const paragraphCount = chapterContent.split('\n\n').filter(p => p.trim()).length;
            console.log(`Chapter ${i} generated: ${wordCount} words, ${paragraphCount} paragraphs`);

            chapters.push(chapterContent);
            previousContent = chapterContent;

            const chaptersProgress = (i / totalChapters) * 100;
            const overallProgress = 30 + (chaptersProgress * 0.6); // Chapters are 60% of total work

            await storage.updateNovel(id, {
              chapters,
              progress: {
                overall: Math.round(overallProgress),
                step1: 100,
                step2: Math.round(chaptersProgress),
                step3: 0,
                currentStatus: `Generated Chapter ${i}: "${(novel.outline as any)!.chapters[i-1].title}"`,
                currentChapter: i + 1,
                totalChapters,
                estimatedTimeRemaining: `${Math.round((totalChapters - i) * 2)} minutes`,
              }
            });
          }

          // Start compilation
          await storage.updateNovel(id, {
            status: "compiling",
            progress: {
              overall: 90,
              step1: 100,
              step2: 100,
              step3: 50,
              currentStatus: "Compiling final manuscript...",
              totalChapters,
            }
          });

          // Final quality pass on complete manuscript
          let manuscript = await novelGenerationService.compileManuscript(novel.title, chapters);
          const qualityService = new ContentQualityService();
          manuscript = await qualityService.fixCommonIssues(manuscript);
          
          const wordCount = novelGenerationService.calculateWordCount(manuscript);
          const readingTime = novelGenerationService.calculateReadingTime(wordCount);
          const estimatedPages = novelGenerationService.calculateEstimatedPages(wordCount);

          await storage.updateNovel(id, {
            manuscriptContent: manuscript,
            status: "completed",
            wordCount,
            actualChapterCount: totalChapters,
            progress: {
              overall: 100,
              step1: 100,
              step2: 100,
              step3: 100,
              currentStatus: "Novel generation complete!",
              totalChapters,
            }
          });

          // Send novel completion email
          if (novel.userId) {
            const user = await storage.getUser(novel.userId);
            if (user?.email) {
              const userName = user.firstName || user.email.split('@')[0];
              emailService.sendNovelCompletionEmail(
                user.email,
                userName,
                novel.title,
                id,
                wordCount
              ).catch(err => console.error('Failed to send novel completion email:', err));
            }
          }

        } catch (error) {
          await storage.updateNovel(id, {
            status: "error",
            error: error instanceof Error ? error.message : 'Unknown error',
            progress: {
              overall: 0,
              step1: 100,
              step2: 0,
              step3: 0,
              currentStatus: "Error generating chapters",
            }
          });
        }
      });

      res.json({ message: "Chapter generation started" });
    } catch (error) {
      console.error("Error starting chapter generation:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Batch chapter generation endpoint for quota management
  app.post("/api/novels/:id/generate-chapters-batch", async (req, res) => {
    try {
      const { id } = req.params;
      const { startChapter = 1, batchSize = 5 } = req.body;
      const novel = await storage.getNovel(id);
      
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }

      if (!novel.outline) {
        return res.status(400).json({ message: "Novel outline must be generated first" });
      }

      const totalChapters = (novel.outline as any).chapters.length;
      const endChapter = Math.min(startChapter + batchSize - 1, totalChapters);
      
      res.json({ 
        message: `Batch generation started for chapters ${startChapter}-${endChapter}`,
        batchInfo: {
          startChapter,
          endChapter,
          totalChapters,
          batchSize
        }
      });

      // Generate chapters in background
      setImmediate(async () => {
        try {
          await storage.updateNovel(id, { 
            status: "generating_chapters_batch",
            progress: {
              ...(novel.progress || {}),
              currentStatus: `Generating chapters ${startChapter}-${endChapter}`,
              currentChapter: startChapter
            }
          });

          const novelGenerationService = new (await import("./services/openai")).NovelGenerationService();
          let previousContent = "";
          
          // Get existing chapters for context
          const existingChapters = (novel.chapters as string[]) || [];
          if (existingChapters.length > 0 && startChapter > 1) {
            previousContent = existingChapters.slice(-2).join('\n\n').slice(0, 2000);
          }

          for (let i = startChapter; i <= endChapter; i++) {
            try {
              console.log(`Generating chapter ${i} in batch...`);
              
              const chapterContent = await novelGenerationService.generateChapter(
                i, 
                novel.outline as any,
                previousContent,
                novel.targetChapterLength || 4000
              );

              // Update the chapters array at the correct index
              const updatedChapters = [...existingChapters];
              while (updatedChapters.length < i) {
                updatedChapters.push("");
              }
              updatedChapters[i - 1] = chapterContent;

              // Count words and paragraphs for logging
              const words = chapterContent.split(/\s+/).length;
              const paragraphs = chapterContent.split('\n\n').length;
              console.log(`Chapter ${i} generated: ${words} words, ${paragraphs} paragraphs`);

              previousContent = chapterContent.slice(0, 2000);

              // Update progress
              const batchProgress = ((i - startChapter + 1) / batchSize) * 100;
              const overallProgress = 30 + ((i / totalChapters) * 60);
              
              await storage.updateNovel(id, { 
                chapters: updatedChapters,
                progress: {
                  overall: Math.round(overallProgress),
                  step1: 100,
                  step2: Math.round((i / totalChapters) * 100),
                  step3: 0,
                  currentStatus: `Chapter ${i} completed`,
                  currentChapter: i + 1,
                  totalChapters,
                  batchProgress: Math.round(batchProgress)
                }
              });

            } catch (error) {
              console.error(`Error generating chapter ${i}:`, error);
              
              // Handle quota exceeded specifically
              if (error instanceof Error && error.message.includes('quota')) {
                await storage.updateNovel(id, { 
                  status: "quota_exceeded", 
                  error: `Quota exceeded at chapter ${i}. Generated chapters ${startChapter}-${i-1}. Continue with batch starting at chapter ${i}.`,
                  progress: { 
                    ...(novel.progress || {}), 
                    lastCompletedChapter: i - 1,
                    suggestedNextBatch: { startChapter: i, batchSize: 3 }
                  } as any
                });
              } else {
                await storage.updateNovel(id, { 
                  status: "error", 
                  error: `Failed to generate chapter ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
              }
              return;
            }
          }

          // Check if all chapters are completed
          const updatedNovel = await storage.getNovel(id);
          const allChapters = (updatedNovel?.chapters as string[]) || [];
          
          if (allChapters.length >= totalChapters && allChapters.every((ch: string) => ch)) {
            // All chapters generated - start compilation
            const manuscriptContent = (allChapters as string[]).join('\n\n');
            const wordCount = manuscriptContent.split(/\s+/).length;
            
            await storage.updateNovel(id, { 
              status: "completed",
              manuscriptContent,
              wordCount,
              actualChapterCount: (allChapters as string[]).length,
              progress: { 
                overall: 100, 
                step1: 100, 
                step2: 100, 
                step3: 100,
                currentStatus: "Novel generation completed!"
              } as any
            });

            console.log(`Novel generation completed! Total words: ${wordCount}`);
            
            // Send novel completion email
            if (novel.userId) {
              const user = await storage.getUser(novel.userId);
              if (user?.email) {
                const userName = user.firstName || user.email.split('@')[0];
                emailService.sendNovelCompletionEmail(
                  user.email,
                  userName,
                  novel.title,
                  id,
                  wordCount
                ).catch(err => console.error('Failed to send novel completion email:', err));
              }
            }
          } else {
            // Batch completed but more chapters remain
            const nextStart = endChapter + 1;
            const remainingChapters = totalChapters - endChapter;
            
            await storage.updateNovel(id, { 
              status: "batch_completed",
              progress: { 
                ...(novel.progress || {}), 
                lastCompletedChapter: endChapter,
                currentStatus: `Batch completed: chapters ${startChapter}-${endChapter}`,
                suggestedNextBatch: { 
                  startChapter: nextStart, 
                  batchSize: Math.min(5, remainingChapters),
                  remainingChapters 
                }
              } as any
            });
            console.log(`Batch completed: chapters ${startChapter}-${endChapter}. ${remainingChapters} chapters remaining.`);
          }

        } catch (error) {
          console.error("Error in batch chapter generation:", error);
          await storage.updateNovel(id, { 
            status: "error", 
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

    } catch (error) {
      console.error("Error starting batch chapter generation:", error);
      res.status(500).json({ message: "Failed to start batch chapter generation" });
    }
  });

  function ensureProperFormatting(content: string): string {
    let formatted = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();

    // If content lacks paragraph breaks, force them
    if (!formatted.includes('\n\n')) {
      formatted = formatted
        .replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2')
        .replace(/("\s*[.!?])\s+([A-Z])/g, '$1\n\n$2')
        .replace(/([.!?])\s+(He |She |They |It |The |A |An |I |You |We )/g, '$1\n\n$2')
        .replace(/\n{3,}/g, '\n\n');
    }

    const paragraphs = formatted.split('\n\n').filter(p => p.trim());
    
    // If still too few paragraphs, force more breaks
    if (paragraphs.length < 5 && formatted.length > 1000) {
      const sentences = formatted.split(/([.!?])\s+/).filter(s => s.trim());
      const newParagraphs = [];
      let currentParagraph = '';
      
      for (let i = 0; i < sentences.length; i += 2) {
        const sentence = (sentences[i] + (sentences[i + 1] || '')).trim();
        if (sentence) {
          currentParagraph += (currentParagraph ? ' ' : '') + sentence;
          
          if ((i % 4 === 2) || currentParagraph.split(' ').length > 150) {
            newParagraphs.push(currentParagraph.trim());
            currentParagraph = '';
          }
        }
      }
      
      if (currentParagraph.trim()) {
        newParagraphs.push(currentParagraph.trim());
      }
      
      return newParagraphs.join('\n\n');
    }

    return paragraphs.join('\n\n');
  }

  // Download manuscript
  app.get("/api/novels/:id/download", async (req, res) => {
    try {
      const { id } = req.params;
      const novel = await storage.getNovel(id);
      
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }

      // Check if novel has content to download
      const hasChapters = Array.isArray(novel.chapters) && novel.chapters.length > 0 && 
                         novel.chapters.some(ch => ch && ch.trim().length > 100);
      const hasManuscript = novel.manuscriptContent && novel.manuscriptContent.trim().length > 100;
      
      if (!hasChapters && !hasManuscript) {
        return res.status(400).json({ 
          message: "Novel has no content to download yet",
          status: novel.status,
          chapterCount: Array.isArray(novel.chapters) ? novel.chapters.length : 0,
        });
      }

      const format = req.query.format as string || 'md';
      console.log(`Download request: format=${format}, preset=${req.query.preset}`);

      if (format === 'docx') {
        // Generate DOCX file using our simple service
        const preset = req.query.preset as string || 'kdp';
        let options;
        
        switch (preset) {
          case 'manuscript':
            options = DocxExportService.getManuscriptPreset();
            break;
          case 'ebook':
            options = DocxExportService.getEbookPreset();
            break;
          case 'createspace':
            options = DocxExportService.getCreateSpacePreset();
            break;
          default:
            options = DocxExportService.getKdpPreset();
        }

        console.log(`Generating DOCX with preset: ${preset}`);
        try {
          const docxBuffer = await simpleDocxExportService.generateDocx(novel, options);
          console.log(`DOCX generated successfully, buffer size: ${docxBuffer.length} bytes`);
          const filename = `${novel.title.replace(/[^a-z0-9]/gi, '_')}.docx`;
          
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          res.send(docxBuffer);
        } catch (docxError) {
          console.error('DOCX generation failed, falling back to markdown:', docxError);
          // Fall through to markdown generation
          // Generate markdown content from chapters if no compiled manuscript exists
          let content = novel.manuscriptContent;
          
          if (!content && hasChapters) {
            // Compile chapters into manuscript content on-demand
            content = `# ${novel.title}\n\n`;
            if (novel.genre) content += `**Genre:** ${novel.genre}\n\n`;
            if (novel.plotIdea) content += `**Plot:** ${novel.plotIdea}\n\n`;
            content += `---\n\n`;
            
            const validChapters = (novel.chapters as string[]).filter(ch => ch && ch.trim().length > 100);
            validChapters.forEach((chapter, index) => {
              // Check if chapter already has a heading to avoid duplicates
              const chapterText = chapter.trim();
              const hasHeading = /^#{1,6}\s+/.test(chapterText) || /^Chapter\s+\d+/i.test(chapterText);
              
              if (hasHeading) {
                // Chapter already has a heading, use it as-is
                content += `${chapterText}\n\n`;
              } else {
                // Add heading for chapter without one
                content += `## Chapter ${index + 1}\n\n${chapterText}\n\n`;
              }
            });
            
            content += `\n---\n\n*Generated by AI KDP Author*\n`;
            content += `*Status: ${novel.status} | Chapters: ${validChapters.length}/${novel.targetChapterCount}*`;
          }
          
          // Generate and send the markdown file as fallback
          res.setHeader('Content-Type', 'text/markdown');
          res.setHeader('Content-Disposition', `attachment; filename="${novel.title.replace(/[^a-zA-Z0-9]/g, '_')}.md"`);
          res.send(content || "No content available");
        }
      } else {
        // Generate markdown content from chapters if no compiled manuscript exists
        let content = novel.manuscriptContent;
        
        if (!content && hasChapters) {
          // Compile chapters into manuscript content on-demand
          content = `# ${novel.title}\n\n`;
          if (novel.genre) content += `**Genre:** ${novel.genre}\n\n`;
          if (novel.plotIdea) content += `**Plot:** ${novel.plotIdea}\n\n`;
          content += `---\n\n`;
          
          const validChapters = (novel.chapters as string[]).filter(ch => ch && ch.trim().length > 100);
          validChapters.forEach((chapter, index) => {
            // Check if chapter already has a heading to avoid duplicates
            const chapterText = chapter.trim();
            const hasHeading = /^#{1,6}\s+/.test(chapterText) || /^Chapter\s+\d+/i.test(chapterText);
            
            if (hasHeading) {
              // Chapter already has a heading, use it as-is
              content += `${chapterText}\n\n`;
            } else {
              // Add heading for chapter without one
              content += `## Chapter ${index + 1}\n\n${chapterText}\n\n`;
            }
          });
          
          content += `\n---\n\n*Generated by AI KDP Author*\n`;
          content += `*Status: ${novel.status} | Chapters: ${validChapters.length}/${novel.targetChapterCount}*`;
        }
        
        // Generate and send the markdown file
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename="${novel.title.replace(/[^a-zA-Z0-9]/g, '_')}.md"`);
        res.send(content || "No content available");
      }
    } catch (error) {
      console.error("Error downloading novel:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Chapter revision endpoints
  app.post("/api/novels/:id/chapters/:chapterIndex/revise", isAuthenticated, async (req, res) => {
    try {
      const { id, chapterIndex } = req.params;
      const { options } = req.body;
      
      const novel = await storage.getNovel(id);
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }

      const index = parseInt(chapterIndex);
      if (!novel.chapters || !Array.isArray(novel.chapters) || !novel.chapters[index]) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      // Extract chapter content (handle both old string format and new object format)
      const chapterData = novel.chapters[index];
      const chapterText = typeof chapterData === 'string' 
        ? chapterData 
        : (chapterData && typeof chapterData === 'object' && chapterData.content) 
          ? chapterData.content 
          : '';
      
      if (!chapterText) {
        return res.status(400).json({ message: "Chapter content not found" });
      }
      
      const revisionOptions = {
        ...options,
        genre: novel.genre
      };

      const result = await chapterRevisionService.reviseChapter(chapterText, revisionOptions);
      
      res.json(result);
    } catch (error) {
      console.error("Error revising chapter:", error);
      res.status(500).json({ 
        message: "Failed to revise chapter",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.put("/api/novels/:id/chapters/:chapterIndex", isAuthenticated, async (req, res) => {
    try {
      const { id, chapterIndex } = req.params;
      const { content } = req.body;
      
      const novel = await storage.getNovel(id);
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }

      const index = parseInt(chapterIndex);
      if (!novel.chapters || !Array.isArray(novel.chapters) || index >= novel.chapters.length) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      // Update the specific chapter
      const updatedChapters = [...novel.chapters];
      updatedChapters[index] = content;

      await storage.updateNovel(id, {
        chapters: updatedChapters
      });

      res.json({ message: "Chapter updated successfully" });
    } catch (error) {
      console.error("Error updating chapter:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/novels/:id/chapters/:chapterIndex/analyze", isAuthenticated, async (req, res) => {
    try {
      const { id, chapterIndex } = req.params;
      
      const novel = await storage.getNovel(id);
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }

      const index = parseInt(chapterIndex);
      if (!novel.chapters || !Array.isArray(novel.chapters) || !novel.chapters[index]) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      // Extract chapter content (handle both old string format and new object format)
      const chapterData = novel.chapters[index];
      const chapterText = typeof chapterData === 'string' 
        ? chapterData 
        : (chapterData && typeof chapterData === 'object' && chapterData.content) 
          ? chapterData.content 
          : '';
      
      if (!chapterText) {
        return res.status(400).json({ message: "Chapter content not found" });
      }
      
      const analysis = await chapterRevisionService.analyzeChapter(chapterText, novel.genre);
      
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing chapter:", error);
      res.status(500).json({ 
        message: "Failed to analyze chapter",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Narrative Arc Analysis endpoint
  app.post("/api/novels/:id/narrative-arc", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { settings = {} } = req.body;
      
      const novel = await storage.getNovel(id);
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }

      if (!novel.chapters || !Array.isArray(novel.chapters) || novel.chapters.length === 0) {
        return res.status(400).json({ message: "Novel has no chapters to analyze" });
      }

      // Extract chapter content for analysis (handle both old string format and new object format)
      const chapterTexts = novel.chapters.map((chapter: any) => {
        if (typeof chapter === 'string') {
          return chapter; // Old format: chapters are strings
        } else if (chapter && typeof chapter === 'object' && chapter.content) {
          return chapter.content; // New format: chapters are objects with content property
        } else {
          console.warn('Invalid chapter format:', chapter);
          return ''; // Fallback for invalid chapters
        }
      });

      console.log(`Starting narrative arc analysis for novel "${novel.title}" with ${chapterTexts.length} chapters`);
      const startTime = Date.now();
      
      // Add timeout to prevent hanging
      const narrativeArcPromise = narrativeArcService.analyzeNarrativeArc(
        chapterTexts, 
        novel.genre, 
        settings
      );
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Analysis timeout after 2 minutes'));
        }, 120000); // 2 minute timeout
      });
      
      const narrativeArc = await Promise.race([narrativeArcPromise, timeoutPromise]);
      
      const duration = Date.now() - startTime;
      console.log(`Narrative arc analysis completed in ${duration}ms`);
      
      res.json(narrativeArc);
    } catch (error) {
      console.error("Error analyzing narrative arc:", error);
      res.status(500).json({ 
        message: "Failed to analyze narrative arc",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Convert manuscript to novel
  app.post("/api/manuscripts/:id/convert-to-novel", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.id;

      // Get the manuscript
      const manuscript = await storage.getManuscript(id);
      if (!manuscript) {
        return res.status(404).json({ message: "Manuscript not found" });
      }

      // Read the manuscript content - prefer cleanedText, but also check originalText as fallback
      let manuscriptContent = manuscript.cleanedText;
      
      // If cleanedText is very short or missing, try originalText
      if (!manuscriptContent || manuscriptContent.trim().length < 1000) {
        manuscriptContent = manuscript.originalText;
      }
      
      if (!manuscriptContent) {
        return res.status(400).json({ message: "No content found in manuscript" });
      }
      
      console.log(`Manuscript fields available:`);
      console.log(`- originalText: ${manuscript.originalText?.length || 0} chars`);
      console.log(`- cleanedText: ${manuscript.cleanedText?.length || 0} chars`);
      console.log(`- processingOptions:`, manuscript.processingOptions);
      console.log(`- processingResults:`, manuscript.processingResults);
      console.log(`Using content source: ${manuscript.cleanedText?.length > manuscript.originalText?.length ? 'cleanedText' : 'originalText'}`);
      console.log(`Content length: ${manuscriptContent.length} characters, ~${manuscriptContent.split(/\s+/).length} words`);

      // Improved chapter splitting algorithm
      let chapters: string[] = [];
      
      // First, try to find existing chapter markers and preserve titles
      const chapterPatterns = [
        /(?=Chapter\s+\d+[^\n]*)/gi,
        /(?=CHAPTER\s+\d+[^\n]*)/gi,
        /(?=Chapter\s+[IVXLCDM]+[^\n]*)/gi, // Roman numerals
        /(?=CHAPTER\s+[IVXLCDM]+[^\n]*)/gi
      ];
      
      let foundChapters = false;
      for (const pattern of chapterPatterns) {
        const matches = manuscriptContent.match(pattern);
        if (matches && matches.length > 2) {
          // Split by the pattern but keep the chapter markers
          const splitContent = manuscriptContent.split(pattern);
          const potentialChapters = [];
          
          for (let i = 1; i < splitContent.length; i++) {
            const chapterContent = matches[i-1] + splitContent[i];
            if (chapterContent.trim().length > 500) {
              potentialChapters.push(chapterContent.trim());
            }
          }
          
          if (potentialChapters.length > 2) {
            chapters = potentialChapters;
            foundChapters = true;
            console.log(`Found ${potentialChapters.length} chapters with existing titles`);
            break;
          }
        }
      }

      // If no clear chapters found, intelligently split by content length
      if (!foundChapters || chapters.length <= 2) {
        const words = manuscriptContent.split(/\s+/);
        const totalWords = words.length;
        
        // Aim for 20-30 chapters, with 2000-3500 words each
        const targetChapterCount = Math.min(30, Math.max(20, Math.floor(totalWords / 2500)));
        const wordsPerChapter = Math.ceil(totalWords / targetChapterCount);
        
        console.log(`Splitting ${totalWords} words into ${targetChapterCount} chapters (~${wordsPerChapter} words each)`);
        
        const newChapters = [];
        for (let i = 0; i < totalWords; i += wordsPerChapter) {
          const chapterWords = words.slice(i, i + wordsPerChapter);
          if (chapterWords.length > 100) { // Minimum word count
            newChapters.push(chapterWords.join(' '));
          }
        }
        chapters = newChapters;
      }

      console.log(`Final chapter count: ${chapters.length} chapters`);
      console.log(`Chapter lengths: ${chapters.map(ch => ch.split(/\s+/).length).join(', ')} words`);

      // Create the novel
      const novel = await storage.createNovel({
        userId,
        title: manuscript.title + " (Converted Novel)",
        genre: "Fiction", // Default genre
        plotIdea: "Converted from manuscript: " + manuscript.title,
        targetWordCount: manuscript.cleanedWordCount || 65000,
        targetChapterCount: chapters.length,
        sourceContent: `Converted from manuscript: ${manuscript.title}`
      });

      // Update with chapters and status after creation
      await storage.updateNovel(novel.id, {
        chapters: chapters,
        manuscriptContent: manuscriptContent,
        status: "completed",
        wordCount: manuscript.cleanedWordCount || 0,
        actualChapterCount: chapters.length,
      });

      res.status(201).json({ 
        message: "Manuscript converted to novel successfully",
        novelId: novel.id,
        chapters: chapters.length,
        totalWords: manuscript.cleanedWordCount,
        averageWordsPerChapter: Math.round((manuscript.cleanedWordCount || 0) / chapters.length)
      });

    } catch (error) {
      console.error("Error converting manuscript to novel:", error);
      res.status(500).json({ 
        message: "Failed to convert manuscript to novel",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Delete novel
  app.delete("/api/novels/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteNovel(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Novel not found" });
      }

      res.json({ message: "Novel deleted successfully" });
    } catch (error) {
      console.error("Error deleting novel:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cancel generation
  app.post("/api/novels/:id/cancel", async (req, res) => {
    try {
      const { id } = req.params;
      const novel = await storage.getNovel(id);
      
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }

      await storage.updateNovel(id, {
        status: "cancelled",
        progress: {
          overall: 0,
          step1: 0,
          step2: 0,
          step3: 0,
          currentStatus: "Generation cancelled",
        }
      });

      res.json({ message: "Generation cancelled" });
    } catch (error) {
      console.error("Error cancelling generation:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin route to fix all novels with chapter parsing issues (temporary)
  app.post("/api/admin/fix-all-chapters", async (req, res) => {
    try {
      console.log("🔧 Starting admin chapter fix...");
      const novels = await storage.getAllNovels();
      console.log(`📚 Found ${novels.length} novels to check`);
      
      const results = [];
      
      for (const novel of novels) {
        console.log(`🔍 Checking novel: ${novel.title} (chapters: ${novel.actualChapterCount}, has content: ${!!novel.manuscriptContent})`);
        
        if (novel.manuscriptContent && (novel.actualChapterCount || 0) < 15) {
          console.log(`🔧 Fixing chapters for novel: ${novel.title}`);
          
          const chapters = parseChaptersFromContent(novel.manuscriptContent);
          console.log(`📖 Found ${chapters.length} chapters for "${novel.title}"`);
          
          if (chapters.length > (novel.actualChapterCount || 0)) {
            console.log(`✅ Updating novel ${novel.title} from ${novel.actualChapterCount || 0} to ${chapters.length} chapters`);
            
            await storage.updateNovel(novel.id, {
              chapters: chapters,
              actualChapterCount: chapters.length
            });
            
            results.push({
              novelId: novel.id,
              title: novel.title,
              oldChapterCount: novel.actualChapterCount || 0,
              newChapterCount: chapters.length,
              status: 'fixed'
            });
          } else {
            results.push({
              novelId: novel.id,
              title: novel.title,
              chapterCount: novel.actualChapterCount || 0,
              status: 'no_change_needed'
            });
          }
        } else {
          console.log(`⏭️ Skipping novel: ${novel.title} (no content or enough chapters)`);
        }
      }
      
      console.log(`✅ Admin fix completed: ${results.length} results`);
      
      res.json({
        message: "Chapter fixing completed",
        results
      });
    } catch (error) {
      console.error("Error fixing chapters:", error);
      res.status(500).json({
        message: "Failed to fix chapters",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Diagnostic route to test chapter parsing without auth (temporary)
  app.get("/api/novels/:id/test-parsing", async (req, res) => {
    try {
      const { id } = req.params;
      const novel = await storage.getNovel(id);
      
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }

      if (!novel.manuscriptContent) {
        return res.status(400).json({ message: "Novel has no manuscript content to parse" });
      }

      console.log(`🔧 Testing chapter parsing for novel: ${novel.title}`);
      
      // Test the parsing function
      const chapters = parseChaptersFromContent(novel.manuscriptContent);
      
      res.json({ 
        message: "Chapter parsing test completed",
        chaptersFound: chapters.length,
        chapters: chapters.map((ch, idx) => ({
          number: idx + 1,
          title: ch.title || `Chapter ${idx + 1}`,
          contentLength: ch.content.length,
          contentPreview: ch.content.substring(0, 200) + "..."
        }))
      });
    } catch (error) {
      console.error("Error testing parsing:", error);
      res.status(500).json({ 
        message: "Failed to test parsing",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Fix chapter detection for existing novels
  app.post("/api/novels/:id/fix-chapters", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const novel = await storage.getNovel(id);
      
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }

      if (!novel.manuscriptContent) {
        return res.status(400).json({ message: "Novel has no manuscript content to parse" });
      }

      console.log(`🔧 Re-parsing chapters for novel: ${novel.title}`);
      
      // Parse chapters from manuscript content using improved logic
      const chapters = parseChaptersFromContent(novel.manuscriptContent);
      
      if (chapters.length === 0) {
        return res.status(400).json({ message: "No chapters could be detected in the manuscript content" });
      }

      console.log(`✅ Found ${chapters.length} chapters in manuscript`);
      
      // Update the novel with properly parsed chapters
      await storage.updateNovel(id, {
        chapters: chapters,
        actualChapterCount: chapters.length
      });

      res.json({ 
        message: "Chapters re-parsed successfully",
        chaptersFound: chapters.length,
        chapters: chapters.map((ch, idx) => ({
          number: idx + 1,
          title: ch.title || `Chapter ${idx + 1}`,
          wordCount: ch.content.split(/\s+/).filter(w => w.length > 0).length
        }))
      });
    } catch (error) {
      console.error("Error fixing chapters:", error);
      res.status(500).json({ 
        message: "Failed to fix chapters",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Generate plot suggestions
  app.post("/api/generate-plots", async (req, res) => {
    try {
      const { genre, subgenres, preferences } = req.body;
      
      if (!genre || !subgenres || !Array.isArray(subgenres)) {
        return res.status(400).json({ message: "Genre and subgenres are required" });
      }

      const plots = await novelGenerationService.generatePlotSuggestions(
        genre,
        subgenres,
        preferences
      );

      // Store the generated plots temporarily
      const plotId = Date.now().toString();
      // In a real app, you'd store this in the database
      (global as any).plotSuggestions = { [plotId]: plots };

      res.json(plots);
    } catch (error) {
      console.error("Error generating plots:", error);
      res.status(500).json({ message: "Failed to generate plot suggestions" });
    }
  });

  // Get plot suggestions
  app.get("/api/plot-suggestions", async (req, res) => {
    try {
      // For demo, return the last generated plots
      const plots = (global as any).plotSuggestions;
      const latestPlots = plots ? Object.values(plots)[Object.keys(plots).length - 1] : [];

      res.json(latestPlots);
    } catch (error) {
      console.error("Error fetching plot suggestions:", error);
      res.status(500).json({ message: "Failed to fetch plot suggestions" });
    }
  });

  // Plot Inspiration Vault routes
  
  // Get all saved plots
  app.get("/api/saved-plots", async (req, res) => {
    try {
      const plots = await storage.getAllSavedPlots();
      res.json(plots);
    } catch (error) {
      console.error("Error fetching saved plots:", error);
      res.status(500).json({ message: "Failed to fetch saved plots" });
    }
  });

  // Save a new plot
  app.post("/api/saved-plots", async (req, res) => {
    try {
      const plotData = req.body;
      
      if (!plotData.title || !plotData.premise || !plotData.genre) {
        return res.status(400).json({ message: "Title, premise, and genre are required" });
      }

      const savedPlot = await storage.createSavedPlot(plotData);
      res.json(savedPlot);
    } catch (error) {
      console.error("Error saving plot:", error);
      res.status(500).json({ message: "Failed to save plot" });
    }
  });

  // Get a specific saved plot
  app.get("/api/saved-plots/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const plot = await storage.getSavedPlot(id);
      
      if (!plot) {
        return res.status(404).json({ message: "Plot not found" });
      }

      res.json(plot);
    } catch (error) {
      console.error("Error fetching plot:", error);
      res.status(500).json({ message: "Failed to fetch plot" });
    }
  });

  // Update a saved plot
  app.patch("/api/saved-plots/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedPlot = await storage.updateSavedPlot(id, updates);
      
      if (!updatedPlot) {
        return res.status(404).json({ message: "Plot not found" });
      }

      res.json(updatedPlot);
    } catch (error) {
      console.error("Error updating plot:", error);
      res.status(500).json({ message: "Failed to update plot" });
    }
  });

  // Delete a saved plot
  app.delete("/api/saved-plots/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSavedPlot(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Plot not found" });
      }

      res.json({ message: "Plot deleted successfully" });
    } catch (error) {
      console.error("Error deleting plot:", error);
      res.status(500).json({ message: "Failed to delete plot" });
    }
  });

  // Toggle favorite status for a plot
  app.post("/api/saved-plots/:id/favorite", async (req, res) => {
    try {
      const { id } = req.params;
      const updatedPlot = await storage.togglePlotFavorite(id);
      
      if (!updatedPlot) {
        return res.status(404).json({ message: "Plot not found" });
      }

      res.json(updatedPlot);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      res.status(500).json({ message: "Failed to toggle favorite" });
    }
  });

  // Get only favorited plots
  app.get("/api/saved-plots/favorites/list", async (req, res) => {
    try {
      const favoritedPlots = await storage.getFavoritedPlots();
      res.json(favoritedPlots);
    } catch (error) {
      console.error("Error fetching favorited plots:", error);
      res.status(500).json({ message: "Failed to fetch favorited plots" });
    }
  });

  // Export manuscript
  app.post("/api/novels/:id/export", async (req, res) => {
    try {
      const { id } = req.params;
      const { format = 'docx' } = req.body;
      
      const novel = await storage.getNovel(id);
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }

      if (novel.status !== 'completed') {
        return res.status(400).json({ message: "Novel must be completed before export" });
      }

      const buffer = await exportService.exportManuscript(novel, format);
      
      // Set appropriate headers for file download
      const filename = `${novel.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', getContentType(format));
      res.setHeader('Content-Length', buffer.length);
      
      res.send(buffer);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Export failed" });
    }
  });

  // Consistency check
  app.get("/api/novels/:id/consistency", async (req, res) => {
    try {
      const { id } = req.params;
      const novel = await storage.getNovel(id);
      
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }

      if (novel.status !== 'completed') {
        return res.status(400).json({ message: "Novel must be completed before consistency analysis" });
      }

      const analysis = await consistencyChecker.analyzeManuscript(novel);
      res.json(analysis);
    } catch (error) {
      console.error("Consistency check error:", error);
      res.status(500).json({ message: "Consistency analysis failed" });
    }
  });

  // Grammar and style check
  app.get("/api/novels/:id/grammar", async (req, res) => {
    try {
      const { id } = req.params;
      const novel = await storage.getNovel(id);
      
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }

      if (novel.status !== 'completed') {
        return res.status(400).json({ message: "Novel must be completed before grammar analysis" });
      }

      const analysis = await grammarChecker.analyzeManuscript(novel);
      res.json(analysis);
    } catch (error) {
      console.error("Grammar check error:", error);
      res.status(500).json({ message: "Grammar analysis failed" });
    }
  });

  // Character Development Workshop Routes
  
  // Get all characters (with optional novel filter)
  app.get("/api/characters", async (req, res) => {
    try {
      const { novelId } = req.query;
      const characters = await storage.getAllCharacters(novelId as string);
      res.json(characters);
    } catch (error) {
      console.error("Error fetching characters:", error);
      res.status(500).json({ message: "Failed to fetch characters" });
    }
  });

  // Get specific character
  app.get("/api/characters/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const character = await storage.getCharacter(id);
      
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      res.json(character);
    } catch (error) {
      console.error("Error fetching character:", error);
      res.status(500).json({ message: "Failed to fetch character" });
    }
  });

  // Create new character
  app.post("/api/characters", async (req, res) => {
    try {
      const validatedData = insertCharacterSchema.parse(req.body);
      const character = await storage.createCharacter(validatedData);
      res.status(201).json(character);
    } catch (error) {
      console.error("Error creating character:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid character data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create character" });
    }
  });

  // Update character
  app.patch("/api/characters/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const character = await storage.updateCharacter(id, updates);
      
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      res.json(character);
    } catch (error) {
      console.error("Error updating character:", error);
      res.status(500).json({ message: "Failed to update character" });
    }
  });

  // Delete character
  app.delete("/api/characters/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCharacter(id);
      
      if (!success) {
        return res.status(404).json({ message: "Character not found" });
      }

      res.json({ message: "Character deleted successfully" });
    } catch (error) {
      console.error("Error deleting character:", error);
      res.status(500).json({ message: "Failed to delete character" });
    }
  });

  // Toggle character favorite
  app.post("/api/characters/:id/favorite", async (req, res) => {
    try {
      const { id } = req.params;
      const character = await storage.toggleCharacterFavorite(id);
      
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      res.json(character);
    } catch (error) {
      console.error("Error toggling character favorite:", error);
      res.status(500).json({ message: "Failed to toggle character favorite" });
    }
  });

  // Generate character profile with AI
  app.post("/api/characters/generate", async (req, res) => {
    try {
      const { name, role, genre, basicInfo } = req.body;
      
      if (!name || !role) {
        return res.status(400).json({ message: "Name and role are required" });
      }

      const suggestions = await characterService.generateCharacterProfile(name, role, genre || "general", basicInfo);
      res.json(suggestions);
    } catch (error) {
      console.error("Error generating character profile:", error);
      res.status(500).json({ message: "Failed to generate character profile" });
    }
  });

  // Analyze character consistency
  app.post("/api/characters/:id/analyze", async (req, res) => {
    try {
      const { id } = req.params;
      const character = await storage.getCharacter(id);
      
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      const analysis = await characterService.analyzeCharacterConsistency(character);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing character:", error);
      res.status(500).json({ message: "Failed to analyze character" });
    }
  });

  // Character Interview Mode
  app.post("/api/characters/:id/interview", async (req, res) => {
    try {
      const { id } = req.params;
      const { interviewType } = req.body;
      
      const character = await storage.getCharacter(id);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      const interview = await characterService.conductCharacterInterview(
        character, 
        interviewType as "personality" | "backstory" | "motivation" | "relationships"
      );
      
      // Store interview data
      const updatedCharacter = await storage.updateCharacter(id, {
        interviewData: interview
      });

      res.json(interview);
    } catch (error) {
      console.error("Error conducting character interview:", error);
      res.status(500).json({ message: "Failed to conduct character interview" });
    }
  });

  // Emotional Journey Mapping
  app.post("/api/characters/:id/emotional-journey", async (req, res) => {
    try {
      const { id } = req.params;
      const { storyStructure } = req.body;
      
      const character = await storage.getCharacter(id);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      const emotionalJourney = await characterService.mapEmotionalJourney(character, storyStructure);
      
      // Store emotional journey data
      const updatedCharacter = await storage.updateCharacter(id, {
        emotionalJourney: emotionalJourney
      });

      res.json(emotionalJourney);
    } catch (error) {
      console.error("Error mapping emotional journey:", error);
      res.status(500).json({ message: "Failed to map emotional journey" });
    }
  });

  // Character Growth Suggestions
  app.post("/api/characters/:id/growth-suggestions", async (req, res) => {
    try {
      const { id } = req.params;
      
      const character = await storage.getCharacter(id);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      const growthSuggestions = await characterService.generateCharacterGrowthSuggestions(
        character, 
        character.emotionalJourney
      );

      res.json(growthSuggestions);
    } catch (error) {
      console.error("Error generating growth suggestions:", error);
      res.status(500).json({ message: "Failed to generate growth suggestions" });
    }
  });

  // Style and Tone Consistency Checker Routes
  
  // Analyze manuscript style consistency
  app.post("/api/style-checker/analyze", isAuthenticated, async (req, res) => {
    try {
      const { sections, targetStyle } = req.body;
      
      if (!sections || !Array.isArray(sections)) {
        return res.status(400).json({ message: "Sections array is required" });
      }

      const analysis = await styleConsistencyService.analyzeManuscriptStyle(sections, targetStyle);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing manuscript style:", error);
      res.status(500).json({ message: "Failed to analyze manuscript style" });
    }
  });

  // Check consistency between sections
  app.post("/api/style-checker/section-consistency", isAuthenticated, async (req, res) => {
    try {
      const { previousSection, currentSection, targetStyle } = req.body;
      
      if (!previousSection || !currentSection) {
        return res.status(400).json({ message: "Both sections are required" });
      }

      const consistency = await styleConsistencyService.checkSectionConsistency(
        previousSection, 
        currentSection, 
        targetStyle
      );
      res.json(consistency);
    } catch (error) {
      console.error("Error checking section consistency:", error);
      res.status(500).json({ message: "Failed to check section consistency" });
    }
  });

  // Generate style guide from manuscript
  app.post("/api/style-checker/generate-guide", isAuthenticated, async (req, res) => {
    try {
      const { sections, genre } = req.body;
      
      if (!sections || !Array.isArray(sections)) {
        return res.status(400).json({ message: "Sections array is required" });
      }

      const styleGuide = await styleConsistencyService.generateStyleGuide(sections, genre);
      res.json(styleGuide);
    } catch (error) {
      console.error("Error generating style guide:", error);
      res.status(500).json({ message: "Failed to generate style guide" });
    }
  });

  // Get style improvement suggestions
  app.post("/api/style-checker/improve", isAuthenticated, async (req, res) => {
    try {
      const { text, targetStyle } = req.body;
      
      if (!text || !targetStyle) {
        return res.status(400).json({ message: "Text and target style are required" });
      }

      const improvements = await styleConsistencyService.suggestStyleImprovements(text, targetStyle);
      res.json(improvements);
    } catch (error) {
      console.error("Error suggesting style improvements:", error);
      res.status(500).json({ message: "Failed to suggest style improvements" });
    }
  });

  // Manuscript Processing Routes
  
  // Upload and analyze manuscript
  app.post("/api/manuscript/upload", isAuthenticated, upload.single('manuscript'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (req.file.mimetype !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        return res.status(400).json({ message: "Only DOCX files are supported" });
      }

      // Extract text from DOCX without AI processing first
      const originalText = await manuscriptProcessor.extractTextFromDocx(req.file.path);
      
      // Do basic analysis without AI for large files
      const analysis = await manuscriptProcessor.analyzeManuscriptBasic(originalText);

      // Clean up the temporary file
      await fs.unlink(req.file.path);

      res.json({ analysis });
    } catch (error) {
      console.error("Error uploading manuscript:", error);
      // Clean up file if it exists
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error("Error cleaning up file:", cleanupError);
        }
      }
      res.status(500).json({ 
        message: "Failed to process manuscript",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Cleanup manuscript with AI improvements
  app.post("/api/manuscript/cleanup", isAuthenticated, upload.single('manuscript'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (req.file.mimetype !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        return res.status(400).json({ message: "Only DOCX files are supported" });
      }

      const options = JSON.parse(req.body.options || '{}');
      
      // Process the manuscript with cleanup
      const result = await manuscriptProcessor.processDocxFile(req.file.path, options);

      // Save to manuscript library
      const userId = (req.user as any)?.claims?.sub;
      const title = options.title || req.file.originalname.replace('.docx', '') || 'Untitled Manuscript';
      
      const savedManuscript = await storage.createManuscript({
        userId,
        title,
        originalText: result.originalText,
        cleanedText: result.cleanedText,
        originalWordCount: manuscriptProcessor.countWords(result.originalText),
        cleanedWordCount: result.wordCount,
        fileSize: Buffer.byteLength(result.cleanedText, 'utf8'),
        processingOptions: options,
        processingResults: {
          changes: result.changes,
          summary: result.summary
        }
      });

      // Clean up the temporary file
      await fs.unlink(req.file.path);

      res.json({ ...result, manuscriptId: savedManuscript.id });
    } catch (error) {
      console.error("Error cleaning up manuscript:", error);
      // Clean up file if it exists
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error("Error cleaning up file:", cleanupError);
        }
      }
      res.status(500).json({ 
        message: "Failed to clean up manuscript",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Download cleaned manuscript
  app.post("/api/manuscript/download", isAuthenticated, async (req, res) => {
    try {
      const { cleanedText, format } = req.body;
      
      if (!cleanedText || !format) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const buffer = await manuscriptProcessor.exportCleanedManuscript(cleanedText, format);
      
      const contentTypes = {
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        txt: 'text/plain',
        md: 'text/markdown'
      };

      const filenames = {
        docx: 'cleaned-manuscript.docx',
        txt: 'cleaned-manuscript.txt',
        md: 'cleaned-manuscript.md'
      };

      res.setHeader('Content-Type', contentTypes[format as keyof typeof contentTypes]);
      res.setHeader('Content-Disposition', `attachment; filename="${filenames[format as keyof typeof filenames]}"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error downloading manuscript:", error);
      res.status(500).json({ 
        message: "Failed to download manuscript",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });



  // Analyze manuscript quality
  app.post("/api/manuscript/analyze", isAuthenticated, async (req, res) => {
    try {
      const { content } = req.body;
      
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Content is required" });
      }

      const analyzer = new ManuscriptAnalyzer();
      const report = await analyzer.analyzeManuscript(content);
      
      res.json(report);
    } catch (error) {
      console.error("Error analyzing manuscript:", error);
      res.status(500).json({ 
        message: "Failed to analyze manuscript",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Analyze uploaded manuscript document
  app.post("/api/manuscript/analyze-upload", isAuthenticated, upload.single('manuscript'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Extract text from DOCX
      const extractedText = await manuscriptProcessor.extractTextFromDocx(req.file.path);
      
      // Analyze the extracted content
      const analyzer = new ManuscriptAnalyzer();
      const report = await analyzer.analyzeManuscript(extractedText);

      // Clean up the temporary file
      await fs.unlink(req.file.path);

      res.json(report);
    } catch (error) {
      console.error("Error analyzing uploaded manuscript:", error);
      // Clean up file if it exists
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error("Error cleaning up file:", cleanupError);
        }
      }
      res.status(500).json({ 
        message: "Failed to analyze uploaded manuscript",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Export manuscript with custom formatting
  app.post("/api/manuscript/export", isAuthenticated, async (req, res) => {
    try {
      const { manuscriptId, options } = req.body;
      
      if (!manuscriptId) {
        return res.status(400).json({ message: "Manuscript ID is required" });
      }

      const exportService = new ExportService();
      const result = await exportService.exportManuscript(manuscriptId, options);

      res.set({
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.buffer.length.toString(),
      });

      res.send(result.buffer);
    } catch (error) {
      console.error("Error exporting manuscript:", error);
      res.status(500).json({ 
        message: "Failed to export manuscript",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get user's manuscript library
  app.get("/api/manuscripts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const manuscripts = await storage.getUserManuscripts(userId);
      res.json(manuscripts);
    } catch (error) {
      console.error("Failed to fetch manuscripts:", error);
      res.status(500).json({ error: "Failed to fetch manuscripts" });
    }
  });

  // Delete manuscript
  app.delete("/api/manuscripts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const manuscript = await storage.getManuscript(req.params.id);
      if (!manuscript) {
        return res.status(404).json({ error: "Manuscript not found" });
      }
      
      // Ensure user owns the manuscript
      const userId = req.user?.claims?.sub;
      if (manuscript.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const deleted = await storage.deleteManuscript(req.params.id);
      if (deleted) {
        res.json({ message: "Manuscript deleted successfully" });
      } else {
        res.status(404).json({ error: "Manuscript not found" });
      }
    } catch (error) {
      console.error("Failed to delete manuscript:", error);
      res.status(500).json({ error: "Failed to delete manuscript" });
    }
  });

  // Download manuscript from library in specified format
  app.get("/api/manuscripts/:id/download", isAuthenticated, async (req: any, res) => {
    try {
      const manuscript = await storage.getManuscript(req.params.id);
      if (!manuscript) {
        return res.status(404).json({ error: "Manuscript not found" });
      }
      
      // Ensure user owns the manuscript
      const userId = req.user?.claims?.sub;
      if (manuscript.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const format = (req.query.format as string) || 'docx';
      const buffer = await manuscriptProcessor.exportCleanedManuscript(manuscript.cleanedText, format as any);
      
      const fileName = `${manuscript.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}.${format}`;
      const contentTypes = {
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'txt': 'text/plain',
        'md': 'text/markdown'
      };
      
      res.set({
        'Content-Type': contentTypes[format as keyof typeof contentTypes],
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length
      });
      
      res.send(buffer);
    } catch (error) {
      console.error("Failed to download manuscript:", error);
      res.status(500).json({ error: "Failed to download manuscript" });
    }
  });

  // Manuscript Extension Routes
  
  // Analyze manuscript for extension
  app.post("/api/manuscript/analyze-for-extension", isAuthenticated, upload.single('manuscript'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (req.file.mimetype !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        return res.status(400).json({ message: "Only DOCX files are supported" });
      }

      // Extract text from DOCX
      const manuscriptContent = await manuscriptProcessor.extractTextFromDocx(req.file.path);
      
      // Basic analysis for word count and chapter detection
      const wordCount = manuscriptProcessor.countWords(manuscriptContent);
      const chapterMatches = manuscriptContent.match(/^(Chapter \d+|Ch\d+|Chapter [A-Za-z]+|\d+\.)/gmi);
      const chapterCount = chapterMatches ? chapterMatches.length : 1;
      
      // Try to detect genre and suggest title from content
      let detectedGenre = '';
      let suggestedTitle = '';
      
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-5",
          messages: [
            {
              role: "system",
              content: "Analyze this manuscript excerpt and determine the genre and suggest a title. Always respond with valid JSON."
            },
            {
              role: "user",
              content: `Analyze this manuscript content (first 500 characters):\n\n${manuscriptContent.substring(0, 500).replace(/[^\w\s\.,!?;:'"()-]/g, '')}\n\nRespond with exactly this JSON format:
{
  "detectedGenre": "contemporary",
  "suggestedTitle": "Untitled Manuscript",
  "summary": "Brief content summary"
}`
            }
          ],
          response_format: { type: "json_object" },
        });

        const responseContent = response.choices[0]?.message?.content;
        if (responseContent) {
          try {
            const analysis = JSON.parse(responseContent);
            detectedGenre = analysis.detectedGenre || 'contemporary';
            suggestedTitle = analysis.suggestedTitle || 'Untitled Manuscript';
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
            console.error("Response content:", responseContent);
            // Fallback values
            detectedGenre = 'contemporary';
            suggestedTitle = 'Untitled Manuscript';
          }
        }
      } catch (error) {
        console.error("Error analyzing content for genre/title:", error);
        // Set fallback values
        detectedGenre = 'contemporary';
        suggestedTitle = 'Untitled Manuscript';
      }

      // Clean up the temporary file
      await fs.unlink(req.file.path);

      res.json({
        content: manuscriptContent,
        analysis: {
          wordCount,
          chapterCount,
          detectedGenre,
          suggestedTitle
        }
      });
    } catch (error) {
      console.error("Error analyzing manuscript for extension:", error);
      // Clean up file if it exists
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error("Error cleaning up file:", cleanupError);
        }
      }
      res.status(500).json({ 
        message: "Failed to analyze manuscript",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Extend manuscript with additional chapters
  app.post("/api/manuscript/extend", isAuthenticated, async (req: any, res) => {
    try {
      const { manuscriptContent, title, genre, additionalChapters, targetWordCount, chapterWordCount } = req.body;
      const userId = req.user?.claims?.sub;

      if (!manuscriptContent || !title || !genre || !additionalChapters) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Detect existing chapters in the manuscript to determine starting chapter number
      const chapterMatches = manuscriptContent.match(/^(Chapter \d+|Ch\d+|Chapter [A-Za-z]+|\d+\.)/gmi);
      const originalChapterCount = chapterMatches ? chapterMatches.length : 0;
      const totalTargetChapters = originalChapterCount + additionalChapters;
      
      console.log(`Extension: Found ${originalChapterCount} original chapters, adding ${additionalChapters} for total of ${totalTargetChapters}`);

      // Create a novel entry for the extension
      const novel = await storage.createNovel({
        userId,
        title: `${title} (Extended)`,
        genre,
        plotIdea: `Extension of existing manuscript: ${title}`,
        targetWordCount: targetWordCount || additionalChapters * (chapterWordCount || 2500),
        targetChapterCount: totalTargetChapters, // Total chapters (original + new)
        targetChapterLength: chapterWordCount || 2500,
        writingStyle: "balanced",
        pointOfView: "third-person-limited",
        toneAndMood: "consistent-with-source",
        contentRating: "pg-13",
        sourceContent: manuscriptContent, // Store full manuscript content for extension
        customInstructions: `CRITICAL: This extends an existing ${originalChapterCount}-chapter manuscript. Generate ONLY ${additionalChapters} NEW chapters (continuing from Chapter ${originalChapterCount + 1}). MAINTAIN strict character name consistency - do not change any character names from the original manuscript.`
      });

      // Generate outline for ONLY the extension chapters using Novel Composer service
      const novelComposerService = new NovelComposerService();
      
      const extensionOutline = await novelComposerService.generateDetailedOutline({
        title: `${title} (Extension Chapters ${originalChapterCount + 1}-${totalTargetChapters})`,
        genre,
        targetWordCount: targetWordCount || additionalChapters * (chapterWordCount || 2500),
        targetChapters: additionalChapters, // Only generate outlines for NEW chapters
        sections: [{
          id: 'source',
          type: 'chapter',
          title: 'Source Manuscript for Character/Plot Consistency',
          content: manuscriptContent
        }]
      });

      // Update novel with the generated outline
      await storage.updateNovel(novel.id, {
        status: "outline_generated",
        outline: {
          outline: extensionOutline.outline,
          characters: extensionOutline.characters,
          themes: extensionOutline.themes
        },
        progress: {
          overall: 25,
          step1: 100,
          step2: 0,
          step3: 0,
          currentStatus: "Extension outline generated",
          totalChapters: totalTargetChapters,
          originalChapters: originalChapterCount,
          additionalChapters: additionalChapters,
        }
      });

      res.json({ novel, outline: extensionOutline });
    } catch (error) {
      console.error("Error extending manuscript:", error);
      res.status(500).json({
        message: "Failed to extend manuscript",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Novel Composer Routes
  app.post("/api/novel/compose", isAuthenticated, async (req: any, res) => {
    try {
      const { title, genre, targetWordCount, targetChapters, chapterWordCount, sections } = req.body;
      
      if (!title || !genre || !sections || sections.length === 0) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const userId = req.user?.claims?.sub;
      
      // Import the composer service
      const { NovelComposerService } = await import('./services/novelComposer');
      const composer = new NovelComposerService();
      
      // Generate detailed outline
      const outline = await composer.generateDetailedOutline({
        title,
        genre,
        targetWordCount: parseInt(targetWordCount),
        targetChapters: parseInt(targetChapters),
        sections
      });

      // Create a novel record
      const novel = await storage.createNovel({
        title,
        genre,
        plotIdea: outline.premise,
        targetWordCount: parseInt(targetWordCount),
        targetChapterCount: parseInt(targetChapters),
        targetChapterLength: parseInt(chapterWordCount) || Math.round(parseInt(targetWordCount) / parseInt(targetChapters)),
        sourceContent: JSON.stringify(sections)
      });

      // Update with outline
      await storage.updateNovel(novel.id, {
        outline: {
          outline: outline.outline,
          characters: outline.characters,
          themes: outline.themes
        }
      });

      res.json({ 
        novel,
        message: "Novel composition started successfully" 
      });
    } catch (error) {
      console.error("Error starting novel composition:", error);
      res.status(500).json({ error: "Failed to start novel composition" });
    }
  });

  // Generate chapters for composed novel
  app.post("/api/novel/:id/generate-chapters", isAuthenticated, async (req: any, res) => {
    try {
      const novel = await storage.getNovel(req.params.id);
      if (!novel) {
        return res.status(404).json({ error: "Novel not found" });
      }

      // Get user id  
      const userId = req.user?.claims?.sub;

      // Import the composer service
      const { NovelComposerService } = await import('./services/novelComposer');
      const composer = new NovelComposerService();

      const outlineData = novel.outline as any || {};
      const outline = outlineData.outline || [];
      const characters = outlineData.characters || [];
      
      if (outline.length === 0) {
        console.error("No outline found for chapter generation!");
        return res.status(400).json({ error: "No outline available for chapter generation" });
      }
      
      let generatedChapters: string[] = [];
      let totalWordCount = 0;

      // Update novel status
      await storage.updateNovel(novel.id, {
        status: "generating_chapters",
        progress: { overall: 0, currentChapter: 0, totalChapters: outline.length }
      });

      // Generate chapters sequentially
      for (let i = 0; i < outline.length; i++) {
        const chapterInfo = outline[i];
        
        try {
          // Check if this is an extension by looking at the title and progress data
          const isExtension = novel.title.includes('(Extended)');
          const originalChapterCount = (novel.progress as any)?.originalChapters || 0;
          
          const chapterContent = await composer.generateChapter(chapterInfo, {
            title: novel.title,
            genre: novel.genre,
            premise: novel.plotIdea,
            characters,
            previousChapters: generatedChapters.slice(-2), // Last 2 chapters for context
            isExtension,
            originalChapterCount
          });


          generatedChapters.push(chapterContent);
          totalWordCount += composer.countWords(chapterContent);

          // Update progress
          const progressPercent = Math.round(((i + 1) / outline.length) * 100);
          await storage.updateNovel(novel.id, {
            progress: { 
              overall: progressPercent, 
              currentChapter: i + 1, 
              totalChapters: outline.length 
            },
            wordCount: totalWordCount
          });

        } catch (error) {
          console.error(`Error generating chapter ${i + 1}:`, error);
          throw error;
        }
      }

      // Complete the novel
      const completedNovel = await storage.updateNovel(novel.id, {
        status: "completed",
        progress: { overall: 100, currentChapter: outline.length, totalChapters: outline.length },
        chapters: generatedChapters,
        wordCount: totalWordCount,
        actualChapterCount: generatedChapters.length,
        outline: {
          outline: outline,
          characters: characters,
          themes: (novel.outline as any)?.themes || []
        }
      });

      // Create manuscript content from chapters
      const sourceContentStr = novel.sourceContent || '[]';
      let sourceWordCount = 0;
      let originalContent = '';
      
      try {
        // Try to parse as JSON (for regular novel composer)
        const sourceSections = JSON.parse(sourceContentStr);
        sourceWordCount = sourceSections.reduce((total: number, section: any) => total + composer.countWords(section.content || ''), 0);
        // For regular novels, no original content to prepend
      } catch (parseError) {
        // If it's not JSON, it's raw manuscript content (for extensions)
        // Get the full original manuscript content from the database
        const originalNovel = await storage.getNovel(novel.id);
        if (originalNovel && novel.title.includes('(Extended)')) {
          // This is an extension - we need to get the full original manuscript
          // The sourceContent only contains a substring, we need to reconstruct the full content
          originalContent = sourceContentStr; // This should be the full content, let me fix the extension creation
          sourceWordCount = composer.countWords(originalContent);
        } else {
          originalContent = sourceContentStr;
          sourceWordCount = composer.countWords(sourceContentStr);
        }
      }

      // For extensions, combine original content with new chapters (chapters already have headings)
      const newChaptersContent = generatedChapters.join('\n\n');

      const fullManuscript = originalContent 
        ? `${originalContent}\n\n${newChaptersContent}` // Simply append new chapters to original content
        : `# ${novel.title}\n\n${generatedChapters.map((chapter, index) => {
            const chapterInfo = outline[index];
            return `## Chapter ${index + 1}: ${chapterInfo?.title || `Chapter ${index + 1}`}\n\n${chapter}`;
          }).join('\n\n')}`;
      
      // Also save the manuscript content to the novel record for downloads
      await storage.updateNovel(novel.id, {
        manuscriptContent: fullManuscript
      });

      await storage.createManuscript({
        userId,
        title: novel.title,
        originalText: sourceContentStr, // Store source content as original
        cleanedText: fullManuscript,
        originalWordCount: sourceWordCount,
        cleanedWordCount: totalWordCount + sourceWordCount, // Total includes original + new content
        fileSize: Buffer.byteLength(fullManuscript, 'utf8'),
        processingOptions: {
          type: "novel_composer",
          genre: novel.genre,
          targetWordCount: novel.targetWordCount || 60000,
          targetChapters: novel.targetChapterCount || 25
        },
        processingResults: {
          generatedChapters: generatedChapters.length,
          actualWordCount: totalWordCount,
          sourceType: "novel_composer"
        }
      });

      res.json({ 
        novel: completedNovel,
        message: "Novel generation completed successfully and saved to library" 
      });
    } catch (error) {
      console.error("Error generating novel chapters:", error);
      
      // Update novel status to failed
      await storage.updateNovel(req.params.id, {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
      
      res.status(500).json({ error: "Failed to generate novel chapters" });
    }
  });

  // Manuscript formatting routes
  app.post("/api/manuscripts/:id/format", isAuthenticated, async (req: any, res) => {
    try {
      const manuscriptId = req.params.id;
      const { preset, format, settings, options } = req.body;
      const userId = req.user?.claims?.sub;

      // Get the manuscript
      const manuscript = await storage.getManuscript(manuscriptId);
      if (!manuscript) {
        return res.status(404).json({ error: "Manuscript not found" });
      }

      if (manuscript.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Import the formatter service
      const { ManuscriptFormatterService } = await import('./services/manuscriptFormatter');
      const formatter = new ManuscriptFormatterService();

      // Format the manuscript
      const result = await formatter.formatManuscript(
        manuscript.cleanedText,
        manuscript.title,
        preset,
        format,
        settings,
        options
      );

      // Create download URL
      const downloadUrl = `/api/manuscripts/${manuscriptId}/download-formatted?file=${encodeURIComponent(path.basename(result.filePath))}`;

      res.json({
        success: true,
        downloadUrl,
        format,
        preset,
        mimeType: result.mimeType
      });

    } catch (error) {
      console.error("Error formatting manuscript:", error);
      res.status(500).json({ error: "Failed to format manuscript" });
    }
  });

  app.get("/api/manuscripts/:id/download-formatted", isAuthenticated, async (req: any, res) => {
    try {
      const manuscriptId = req.params.id;
      const fileName = req.query.file as string;
      const userId = req.user?.claims?.sub;

      if (!fileName) {
        return res.status(400).json({ error: "File parameter required" });
      }

      // Verify manuscript ownership
      const manuscript = await storage.getManuscript(manuscriptId);
      if (!manuscript) {
        return res.status(404).json({ error: "Manuscript not found" });
      }

      if (manuscript.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Construct file path
      const filePath = path.join(process.cwd(), 'uploads', fileName);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ error: "Formatted file not found" });
      }

      // Determine content type based on file extension
      const ext = path.extname(fileName).toLowerCase();
      const contentTypes: { [key: string]: string } = {
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.pdf': 'application/pdf',
        '.html': 'text/html',
        '.md': 'text/markdown',
        '.epub': 'application/epub+zip',
        '.mobi': 'application/x-mobipocket-ebook'
      };

      const contentType = contentTypes[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      const fileStream = createReadStream(filePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error("Error downloading formatted manuscript:", error);
      res.status(500).json({ error: "Failed to download formatted manuscript" });
    }
  });

  // Upload manuscript for readability analysis
  app.post("/api/readability/upload-manuscript", isAuthenticated, upload.single('manuscript'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (req.file.mimetype !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        return res.status(400).json({ message: "Only DOCX files are supported" });
      }

      // Extract text from DOCX
      const extractedContent = await manuscriptProcessor.extractTextFromDocx(req.file.path);
      
      // Clean up the temporary file
      await fs.unlink(req.file.path);

      res.json({ 
        content: extractedContent,
        message: "Manuscript processed successfully" 
      });
    } catch (error) {
      console.error("Error processing manuscript for readability:", error);
      // Clean up file if it exists
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error("Error cleaning up file:", cleanupError);
        }
      }
      res.status(500).json({ 
        message: "Failed to process manuscript",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Generate special sections (introduction, prologue, epilogue)
  app.post("/api/novel/generate-special-sections", isAuthenticated, upload.single('manuscript'), async (req: MulterRequest, res) => {
    try {
      let { sourceContent, type, title, genre, sections } = req.body;
      
      // If sections is a string (from FormData), parse it
      if (typeof sections === 'string') {
        try {
          sections = JSON.parse(sections);
        } catch (error) {
          return res.status(400).json({ error: "Invalid sections format" });
        }
      }
      
      if (!sourceContent || !type || !title || !genre || !sections || sections.length === 0) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Import the composer service
      const { NovelComposerService } = await import('./services/novelComposer');
      const composer = new NovelComposerService();
      
      // Get file buffer if a file was uploaded
      let fileBuffer: Buffer | undefined;
      if (req.file) {
        fileBuffer = await fs.readFile(req.file.path);
        // Clean up the temporary file
        await fs.unlink(req.file.path);
      }
      
      const generatedSections = await composer.generateSpecialSections({
        sourceContent,
        type,
        title,
        genre,
        sections,
        fileBuffer
      });

      res.json({ 
        sections: generatedSections,
        message: "Special sections generated successfully" 
      });
    } catch (error) {
      console.error("Error generating special sections:", error);
      // Clean up file if it exists
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error("Error cleaning up file:", cleanupError);
        }
      }
      res.status(500).json({ error: "Failed to generate special sections" });
    }
  });

  // Audiobook generation routes
  app.post("/api/audiobook/generate", isAuthenticated, async (req: any, res) => {
    try {
      const { novelId, voice = 'alloy', model = 'tts-1', speed = 100, format = 'mp3', selectedChapters } = req.body;

      if (!novelId) {
        return res.status(400).json({ error: "Novel ID is required" });
      }

      // Get the novel
      const novel = await storage.getNovel(novelId);
      if (!novel) {
        return res.status(404).json({ error: "Novel not found" });
      }

      if (novel.status !== 'completed') {
        return res.status(400).json({ error: "Only completed novels can be converted to audiobooks" });
      }

      const userId = req.user?.claims?.sub;

      // Convert novel chapters to audiobook format
      const chapters = Array.isArray(novel.chapters) ? novel.chapters : [];
      
      // Filter chapters based on selection (if provided)
      let selectedChapterIndices: number[] = [];
      let audiobookChapters: any[] = [];
      
      if (selectedChapters && Array.isArray(selectedChapters) && selectedChapters.length > 0) {
        // Validate selected chapters are within range
        selectedChapterIndices = selectedChapters
          .filter((index: number) => typeof index === 'number' && index >= 0 && index < chapters.length)
          .sort((a: number, b: number) => a - b); // Sort to maintain order
        
        if (selectedChapterIndices.length === 0) {
          return res.status(400).json({ error: "Invalid chapter selection. Please select valid chapters." });
        }
        
        // Create audiobook chapters from selected chapters
        audiobookChapters = selectedChapterIndices.map((chapterIndex, arrayIndex) => ({
          chapterNumber: arrayIndex + 1, // Sequential numbering for audiobook
          originalChapterNumber: chapterIndex + 1, // Track original chapter number
          title: `Chapter ${chapterIndex + 1}`, // Use original chapter number in title
          content: typeof chapters[chapterIndex] === 'string' ? chapters[chapterIndex] : chapters[chapterIndex].content || '',
        }));
        
        console.log(`🎧 Starting partial audiobook generation for "${novel.title}" with ${audiobookChapters.length} selected chapters (${selectedChapterIndices.map(i => i + 1).join(', ')})`);
      } else {
        // Generate full audiobook (all chapters)
        selectedChapterIndices = chapters.map((_, index) => index);
        audiobookChapters = chapters.map((chapter, index) => ({
          chapterNumber: index + 1,
          originalChapterNumber: index + 1,
          title: `Chapter ${index + 1}`,
          content: typeof chapter === 'string' ? chapter : chapter.content || '',
        }));
        
        console.log(`🎧 Starting full audiobook generation for "${novel.title}" with ${audiobookChapters.length} chapters`);
      }

      // Create audiobook record with selected chapters information
      const audiobookTitle = selectedChapterIndices.length < chapters.length 
        ? `${novel.title} (Chapters ${selectedChapterIndices.map(i => i + 1).join(', ')})` 
        : novel.title;
        
      const audiobook = await storage.createAudiobook({
        novelId,
        userId,
        title: audiobookTitle,
        voice: voice as any,
        model: model as any,
        speed,
        format: format as any,
        selectedChapters: selectedChapterIndices,
      });

      // Start background audiobook generation
      const { AudiobookService } = await import('./services/audiobookService');
      const audiobookService = new AudiobookService();

      // Start generation in background
      const generateAudiobook = async () => {
        try {
          await storage.updateAudiobook(audiobook.id, { status: 'generating' });

          const audioFiles = await audiobookService.generateAudiobook(
            novelId,
            novel.title,
            audiobookChapters,
            {
              voice: voice as any,
              model: model as any,
              speed: speed / 100, // Convert percentage to decimal
              format: format as any,
              // Provider will be auto-determined by AudiobookService based on voice
              backgroundMusic: req.body.backgroundMusic ? {
                enabled: Boolean(req.body.backgroundMusic.enabled),
                musicType: typeof req.body.backgroundMusic.musicType === 'string' ? req.body.backgroundMusic.musicType : 'ambient',
                volume: typeof req.body.backgroundMusic.volume === 'number' && req.body.backgroundMusic.volume >= 0.1 && req.body.backgroundMusic.volume <= 0.5 ? req.body.backgroundMusic.volume : 0.2,
                fadeInOut: req.body.backgroundMusic.fadeInOut ?? true, // Fix: Use nullish coalescing to allow explicit false
                customMusicUrl: typeof req.body.backgroundMusic.customMusicUrl === 'string' ? req.body.backgroundMusic.customMusicUrl : undefined
              } : undefined
            },
            audiobook.id, // Pass the database audiobook ID
            async (progress) => {
              // Update progress in database
              console.log(`📊 Progress update for audiobook ${audiobook.id}:`, progress);
              try {
                await storage.updateAudiobook(audiobook.id, {
                  progress: progress,
                  chapterCount: audiobookChapters.length,
                });
                console.log(`✅ Progress saved to database successfully`);
              } catch (error) {
                console.error(`❌ Failed to save progress to database:`, error);
              }
            }
          );

          // Calculate total duration from completed chapters
          const totalDuration = audiobookChapters.reduce((total, chapter: any) => total + (chapter.duration || 0), 0);

          // Update audiobook as completed
          await storage.updateAudiobook(audiobook.id, {
            status: 'completed',
            chapters: audiobookChapters, // Save the chapters with audioPath properties
            audioFiles: audioFiles,
            totalDuration,
            chapterCount: audiobookChapters.length,
            metadata: {
              generatedAt: new Date().toISOString(),
              totalChapters: audiobookChapters.length,
              voice,
              model,
              speed,
            },
          });

          console.log(`🎉 Audiobook "${novel.title}" generation completed!`);

          // Generate pre-made chunks for faster downloads (background task)
          try {
            console.log(`🚀 Starting background chunk generation for audiobook ${audiobook.id}`);
            audiobookService.generatePreMadeChunks(audiobook.id, 20).catch(error => {
              console.error(`❌ Background chunk generation failed for audiobook ${audiobook.id}:`, error);
            });
          } catch (error) {
            console.error(`❌ Failed to start chunk generation for audiobook ${audiobook.id}:`, error);
          }

        } catch (error) {
          console.error(`❌ Audiobook generation failed for "${novel.title}":`, error);
          await storage.updateAudiobook(audiobook.id, {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      };

      // Start generation without blocking response
      generateAudiobook();

      res.json({
        audiobook,
        message: "Audiobook generation started"
      });

    } catch (error) {
      console.error("Error starting audiobook generation:", error);
      res.status(500).json({
        error: "Failed to start audiobook generation",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get audiobooks for a specific novel
  app.get("/api/novel/:novelId/audiobooks", isAuthenticated, async (req: any, res) => {
    try {
      const { novelId } = req.params;
      if (!novelId || typeof novelId !== 'string') {
        return res.status(400).json({ error: "Invalid novel ID" });
      }
      
      const audiobooks = await storage.getNovelAudiobooks(novelId);
      console.log(`📚 Found ${audiobooks.length} audiobooks for novel ${novelId}`);
      res.json({ audiobooks });
    } catch (error: any) {
      console.error("Error fetching novel audiobooks:", error);
      res.status(500).json({ 
        error: "Failed to fetch audiobooks",
        details: error?.message || "Unknown database error"
      });
    }
  });

  // Get available voices for TTS - MUST come before audiobook/:id route
  app.get("/api/audiobook/voices", async (req, res) => {
    try {
      const { AudiobookService } = await import('./services/audiobookService');
      const audiobookService = new AudiobookService();
      const voices = audiobookService.getAvailableVoices();
      res.json({ voices });
    } catch (error) {
      console.error("Error fetching voices:", error);
      res.status(500).json({ error: "Failed to fetch voices" });
    }
  });

  // Get available background music options for audiobooks
  app.get("/api/audiobook/music-options", async (req, res) => {
    try {
      const { AudiobookService } = await import('./services/audiobookService');
      const audiobookService = new AudiobookService();
      const musicOptions = audiobookService.getBackgroundMusicOptions();
      res.json({ musicOptions });
    } catch (error) {
      console.error("Error fetching background music options:", error);
      res.status(500).json({ error: "Failed to fetch background music options" });
    }
  });

  // Get default sample texts for voice previews
  app.get("/api/audiobook/sample-texts", async (req, res) => {
    try {
      const { AudiobookService } = await import('./services/audiobookService');
      const audiobookService = new AudiobookService();
      const sampleTexts = audiobookService.getDefaultSampleTexts();
      res.json({ sampleTexts });
    } catch (error) {
      console.error("Error fetching sample texts:", error);
      res.status(500).json({ error: "Failed to fetch sample texts" });
    }
  });

  // Generate voice preview sample
  app.post("/api/audiobook/voice-preview", isAuthenticated, async (req: any, res) => {
    try {
      const { voice, sampleText, speed = 100 } = req.body;
      
      if (!voice || !sampleText) {
        return res.status(400).json({ 
          error: 'Voice and sample text are required' 
        });
      }

      console.log(`🎤 Generating voice preview for ${voice} voice`);
      
      const { AudiobookService } = await import('./services/audiobookService');
      const audiobookService = new AudiobookService();
      const audioBuffer = await audiobookService.generateVoicePreview(
        sampleText,
        {
          voice: voice as any,
          model: 'tts-1',
          speed: speed,
          format: 'mp3'
        }
      );

      // Set appropriate headers for audio streaming
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
        'Accept-Ranges': 'bytes'
      });

      res.send(audioBuffer);
    } catch (error: any) {
      console.error('Voice preview generation failed:', error);
      res.status(500).json({ 
        error: 'Failed to generate voice preview',
        details: error.message
      });
    }
  });

  // Download audiobook as ZIP file
  app.get("/api/audiobook/:id/download", isAuthenticated, async (req: any, res) => {
    try {
      const audiobookId = req.params.id;
      if (!audiobookId || typeof audiobookId !== 'string') {
        return res.status(400).json({ error: "Invalid audiobook ID" });
      }

      const audiobook = await storage.getAudiobook(audiobookId);
      if (!audiobook) {
        return res.status(404).json({ error: "Audiobook not found" });
      }
      if (audiobook.status !== 'completed') {
        return res.status(400).json({ error: "Audiobook is not completed yet" });
      }

      const { AudiobookService } = await import('./services/audiobookService');
      const audiobookService = new AudiobookService();
      
      // Check if audio files exist before creating ZIP
      try {
        const zipBuffer = await audiobookService.createAudiobookZip(audiobook.id);
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${audiobook.title.replace(/[^a-zA-Z0-9]/g, '_')}_audiobook.zip"`);
        res.send(zipBuffer);
      } catch (zipError: any) {
        console.error("Error creating audiobook ZIP:", zipError);
        if (zipError.message.includes('ENOENT') || zipError.message.includes('no such file')) {
          return res.status(404).json({ 
            error: "Audiobook files not found",
            details: "The audio files for this audiobook are missing"
          });
        }
        throw zipError; // Re-throw other errors
      }
    } catch (error: any) {
      console.error("Error downloading audiobook:", error);
      res.status(500).json({ 
        error: "Failed to download audiobook",
        details: error?.message || "Unknown error"
      });
    }
  });

  // Preview first chapter of audiobook
  app.get("/api/audiobook/:id/preview", isAuthenticated, async (req: any, res) => {
    try {
      const audiobook = await storage.getAudiobook(req.params.id);
      if (!audiobook) {
        return res.status(404).json({ error: "Audiobook not found" });
      }
      if (audiobook.status !== 'completed') {
        return res.status(400).json({ error: "Audiobook is not completed yet" });
      }

      const { AudiobookService } = await import('./services/audiobookService');
      const audiobookService = new AudiobookService();
      const audioBuffer = await audiobookService.getChapterAudio(audiobook.id, 1);

      res.setHeader('Content-Type', `audio/${audiobook.format}`);
      res.setHeader('Content-Disposition', `inline; filename="chapter_01.${audiobook.format}"`);
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error previewing audiobook:", error);
      res.status(500).json({ error: "Failed to preview audiobook" });
    }
  });

  // Get audiobook status and details
  app.get("/api/audiobook/:id", isAuthenticated, async (req: any, res) => {
    try {
      const audiobook = await storage.getAudiobook(req.params.id);
      if (!audiobook) {
        return res.status(404).json({ error: "Audiobook not found" });
      }
      res.json({ audiobook });
    } catch (error) {
      console.error("Error fetching audiobook:", error);
      res.status(500).json({ error: "Failed to fetch audiobook" });
    }
  });

  // Get user's audiobooks
  app.get("/api/audiobooks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const audiobooks = await storage.getUserAudiobooks(userId);
      res.json({ audiobooks });
    } catch (error) {
      console.error("Error fetching audiobooks:", error);
      res.status(500).json({ error: "Failed to fetch audiobooks" });
    }
  });

  // Resume audiobook generation
  app.post("/api/audiobook/:id/resume", isAuthenticated, async (req: any, res) => {
    try {
      const audiobookId = req.params.id;
      const userId = req.user?.claims?.sub;
      
      // Get the audiobook record
      const audiobook = await storage.getAudiobook(audiobookId);
      if (!audiobook) {
        return res.status(404).json({ error: "Audiobook not found" });
      }

      // Check ownership
      if (audiobook.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get the novel
      const novel = await storage.getNovel(audiobook.novelId);
      if (!novel) {
        return res.status(404).json({ error: "Novel not found" });
      }

      console.log(`🔄 Resuming audiobook generation for "${novel.title}"`);

      // Start resume generation in background
      const resumeGeneration = async () => {
        try {
          await storage.updateAudiobook(audiobookId, { status: 'generating' });

          const { AudiobookService } = await import('./services/audiobookService');
          const audiobookService = new AudiobookService();

          // Convert novel chapters to audiobook format
          const chapters = Array.isArray(novel.chapters) ? novel.chapters : [];
          const audiobookChapters = chapters.map((chapter, index) => ({
            chapterNumber: index + 1,
            title: `Chapter ${index + 1}`,
            content: typeof chapter === 'string' ? chapter : chapter.content || '',
          }));

          const audioFiles = await audiobookService.generateAudiobook(
            audiobook.novelId,
            novel.title,
            audiobookChapters,
            {
              voice: audiobook.voice as any,
              model: audiobook.model as any,
              speed: (audiobook.speed || 100) / 100,
              format: audiobook.format as any,
            },
            audiobookId,
            async (progress) => {
              await storage.updateAudiobook(audiobookId, { 
                status: progress.status,
                progress: progress
              });
            }
          );

          // Calculate total duration from completed chapters
          const totalDuration = audiobookChapters.reduce((total, chapter: any) => total + (chapter.duration || 0), 0);

          await storage.updateAudiobook(audiobookId, { 
            status: 'completed',
            chapters: audiobookChapters, // Save the chapters with audioPath properties
            audioFiles: audioFiles,
            totalDuration,
            chapterCount: audiobookChapters.length,
            metadata: {
              generatedAt: new Date().toISOString(),
              totalChapters: audiobookChapters.length,
              voice: audiobook.voice,
              model: audiobook.model,
              speed: audiobook.speed || 100,
            }
          });

          console.log(`✅ Audiobook resume completed for "${novel.title}"`);
          
          // Send audiobook ready email
          if (audiobook.userId) {
            const user = await storage.getUser(audiobook.userId);
            if (user?.email) {
              const userName = user.firstName || user.email.split('@')[0];
              const hours = Math.floor(totalDuration / 3600);
              const minutes = Math.floor((totalDuration % 3600) / 60);
              const durationString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
              emailService.sendAudiobookReadyEmail(
                user.email,
                userName,
                novel.title,
                audiobookId,
                durationString
              ).catch(err => console.error('Failed to send audiobook ready email:', err));
            }
          }

          // Generate pre-made chunks for faster downloads (background task)
          try {
            console.log(`🚀 Starting background chunk generation for resumed audiobook ${audiobookId}`);
            audiobookService.generatePreMadeChunks(audiobookId, 20).catch(error => {
              console.error(`❌ Background chunk generation failed for audiobook ${audiobookId}:`, error);
            });
          } catch (error) {
            console.error(`❌ Failed to start chunk generation for audiobook ${audiobookId}:`, error);
          }

        } catch (error) {
          console.error(`❌ Audiobook resume failed for "${novel.title}":`, error);
          await storage.updateAudiobook(audiobookId, { 
            status: 'failed',
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      };

      // Start generation in background
      resumeGeneration();

      res.json({ 
        message: "Audiobook resume started",
        audiobookId: audiobookId,
        status: "generating"
      });

    } catch (error) {
      console.error("Error resuming audiobook:", error);
      res.status(500).json({ 
        error: "Failed to resume audiobook generation",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Download sample chapters (first 10 chapters for testing)
  app.get("/api/audiobook/:id/download-sample", isAuthenticated, async (req: any, res) => {
    try {
      const audiobookId = req.params.id;
      const userId = req.user?.claims?.sub;
      
      const audiobook = await storage.getAudiobook(audiobookId);
      if (!audiobook) {
        return res.status(404).json({ error: "Audiobook not found" });
      }

      // Check ownership
      if (audiobook.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { AudiobookService } = await import('./services/audiobookService');
      const audiobookService = new AudiobookService();
      
      try {
        // Set headers first
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${audiobook.title.replace(/[^a-zA-Z0-9]/g, '_')}_sample_10chapters.zip"`);
        res.setHeader('Transfer-Encoding', 'chunked');
        
        // Stream sample ZIP (first 10 chapters only)
        await audiobookService.streamSampleAudiobookZip(audiobook.id, res, 10);
      } catch (zipError: any) {
        console.error("Error creating sample audiobook ZIP:", zipError);
        if (!res.headersSent) {
          res.status(500).json({ 
            error: "Failed to create sample ZIP", 
            details: zipError.message 
          });
        }
      }
    } catch (error: any) {
      console.error("Error downloading sample audiobook:", error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Failed to download sample audiobook",
          details: error?.message || "Unknown error"
        });
      }
    }
  });

  // Download partial audiobook (completed chapters only)
  app.get("/api/audiobook/:id/download-partial", isAuthenticated, async (req: any, res) => {
    try {
      const audiobookId = req.params.id;
      const userId = req.user?.claims?.sub;
      
      const audiobook = await storage.getAudiobook(audiobookId);
      if (!audiobook) {
        return res.status(404).json({ error: "Audiobook not found" });
      }

      // Check ownership
      if (audiobook.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Allow partial download for audiobooks with completed chapters
      if (!['failed', 'partial_completed', 'generating', 'completed'].includes(audiobook.status)) {
        return res.status(400).json({ error: "No completed chapters available for download" });
      }

      const { AudiobookService } = await import('./services/audiobookService');
      const audiobookService = new AudiobookService();
      
      try {
        // Pre-check: Verify completed chapters exist before setting streaming headers
        const chapters = Array.isArray(audiobook.chapters) ? audiobook.chapters : [];
        const completedChapters = chapters.filter((ch: any) => ch.audioPath);
        
        if (completedChapters.length === 0) {
          return res.status(404).json({ 
            error: "No completed audio files found",
            details: "No chapters have been completed yet. Please wait for audio generation to complete."
          });
        }
        
        // Set streaming headers for ZIP download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${audiobook.title.replace(/[^a-zA-Z0-9]/g, '_')}_partial_audiobook.zip"`);
        res.setHeader('Transfer-Encoding', 'chunked');
        
        // Stream the ZIP creation directly to response (this method handles object storage)
        await audiobookService.streamPartialAudiobookZip(audiobook.id, res);
      } catch (zipError: any) {
        console.error("Error creating partial audiobook ZIP:", zipError);
        if (!res.headersSent) {
          if (zipError.message.includes('ENOENT') || zipError.message.includes('no such file') || zipError.message.includes('No completed chapters found')) {
            return res.status(404).json({ 
              error: "No completed audio files found",
              details: "No chapters have been completed yet"
            });
          }
          return res.status(500).json({ 
            error: "Failed to create partial ZIP", 
            details: zipError.message 
          });
        }
        // If headers were sent, we can't send JSON response - just log and end
        console.error("Cannot send error response - headers already sent");
        return;
      }
    } catch (error: any) {
      console.error("Error downloading partial audiobook:", error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Failed to download partial audiobook",
          details: error?.message || "Unknown error"
        });
      }
    }
  });

  // Download audiobook in chunks (production-friendly)
  app.get("/api/audiobook/:id/download-chunked", isAuthenticated, async (req: any, res) => {
    try {
      const audiobookId = req.params.id;
      const userId = req.user?.claims?.sub;
      const chunkIndex = parseInt(req.query.chunk || '0');
      const chunkSize = parseInt(req.query.size || '20'); // Default 20 chapters per chunk
      
      const audiobook = await storage.getAudiobook(audiobookId);
      if (!audiobook) {
        return res.status(404).json({ error: "Audiobook not found" });
      }

      // Check ownership
      if (audiobook.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!['completed', 'partial_completed'].includes(audiobook.status)) {
        return res.status(400).json({ error: "Audiobook not ready for download" });
      }

      const { AudiobookService } = await import('./services/audiobookService');
      const audiobookService = new AudiobookService();
      
      try {
        console.log(`🚀 Chunked download request: audiobook=${audiobookId}, chunk=${chunkIndex}, size=${chunkSize}`);
        
        // STEP 1: Check for pre-generated chunk first (fast path)
        const preGeneratedChunkPath = await audiobookService.getPreGeneratedChunk(audiobookId, chunkIndex);
        
        if (preGeneratedChunkPath) {
          console.log(`✅ Found pre-generated chunk ${chunkIndex + 1}, serving directly from object storage`);
          
          // Serve pre-generated chunk directly from object storage
          res.setHeader('Content-Type', 'application/zip');
          res.setHeader('Content-Disposition', `attachment; filename="${audiobook.title.replace(/[^a-zA-Z0-9]/g, '_')}_part${chunkIndex + 1}.zip"`);
          res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
          
          // Get the object file and stream it directly
          const { ObjectStorageService } = await import('./objectStorage');
          const objectStorage = new ObjectStorageService();
          const file = await objectStorage.getObjectFile(preGeneratedChunkPath);
          
          // Stream the pre-generated chunk directly to response
          await objectStorage.downloadObject(file, res);
          return;
        }
        
        console.log(`⚡ No pre-generated chunk found for chunk ${chunkIndex + 1}, falling back to on-demand generation`);
        
        // STEP 2: Fallback to on-demand generation (using object storage)
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${audiobook.title.replace(/[^a-zA-Z0-9]/g, '_')}_part${chunkIndex + 1}.zip"`);
        res.setHeader('Transfer-Encoding', 'chunked');
        
        // Stream the chunked ZIP creation directly to response (now using object storage)
        await audiobookService.streamChunkedAudiobookZip(audiobook.id, res, chunkIndex, chunkSize);
      } catch (zipError: any) {
        console.error("Error in chunked audiobook download:", zipError);
        if (!res.headersSent) {
          return res.status(500).json({ 
            error: "Failed to download chunk", 
            details: zipError.message 
          });
        }
      }
    } catch (error: any) {
      console.error("Error downloading chunked audiobook:", error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Failed to download chunked audiobook",
          details: error?.message || "Unknown error"
        });
      }
    }
  });

  // Get audiobook chunk info
  app.get("/api/audiobook/:id/chunks", isAuthenticated, async (req: any, res) => {
    try {
      const audiobookId = req.params.id;
      const userId = req.user?.claims?.sub;
      const chunkSize = parseInt(req.query.size || '20');
      
      const audiobook = await storage.getAudiobook(audiobookId);
      if (!audiobook) {
        return res.status(404).json({ error: "Audiobook not found" });
      }

      if (audiobook.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { AudiobookService } = await import('./services/audiobookService');
      const audiobookService = new AudiobookService();
      
      // First check for pre-generated chunk manifest
      const chunkManifest = await audiobookService.getChunkManifest(audiobook.id);
      
      if (chunkManifest) {
        console.log(`📋 Using pre-generated chunk manifest for audiobook ${audiobook.id}`);
        
        // Return pre-generated chunk info with enhanced metadata
        const enhancedChunkInfo = {
          ...chunkManifest,
          isPreGenerated: true,
          chunks: chunkManifest.chunks.map((chunk: any) => ({
            ...chunk,
            isPreGenerated: true,
            downloadSpeed: 'fast' // Pre-generated chunks download instantly
          }))
        };
        
        res.json(enhancedChunkInfo);
      } else {
        console.log(`📊 No pre-generated chunks found, using dynamic chunk calculation for audiobook ${audiobook.id}`);
        
        // Fallback to dynamic chunk calculation
        const chunkInfo = await audiobookService.getAudiobookChunkInfo(audiobook.id, chunkSize);
        
        // Mark as on-demand generation
        const enhancedChunkInfo = {
          ...chunkInfo,
          isPreGenerated: false,
          chunks: chunkInfo.chunks.map((chunk: any) => ({
            ...chunk,
            isPreGenerated: false,
            downloadSpeed: 'slower' // On-demand chunks take time to generate
          }))
        };
        
        res.json(enhancedChunkInfo);
      }
    } catch (error: any) {
      console.error("Error getting chunk info:", error);
      res.status(500).json({ 
        error: "Failed to get chunk info",
        details: error?.message || "Unknown error"
      });
    }
  });

  // Stripe subscription routes
  app.post("/api/create-subscription", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const user = await storage.getUser(userId);
      const { tierId, billingPeriod = 'monthly' } = req.body;
      
      if (!user?.email) {
        return res.status(400).json({ error: 'User email required for subscription' });
      }

      // Map tier IDs to Stripe price IDs
      // Use test mode prices (price_1SDIom...) for testing, live prices (price_1SClwB...) for production
      const tierPriceMapping: Record<string, { priceId: string, annualPriceId?: string, tier: string, monthlyLimit: number }> = {
        'basic': {
          priceId: process.env.STRIPE_BASIC_PRICE_ID || 'price_1SDIomGy0KKwtFjRQ3iZHImu',
          annualPriceId: process.env.STRIPE_BASIC_ANNUAL_PRICE_ID || 'price_basic_annual_test',
          tier: 'basic',
          monthlyLimit: 5
        },
        'pro': {
          priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_1SDIomGy0KKwtFjRCIyUS7A4',
          annualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || 'price_pro_annual_test',
          tier: 'pro', 
          monthlyLimit: 20
        },
        'premium': {
          priceId: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_1SDIonGy0KKwtFjR8kl36IcR',
          annualPriceId: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID || 'price_premium_annual_test',
          tier: 'premium',
          monthlyLimit: 50
        },
        'founders': {
          priceId: process.env.STRIPE_FOUNDERS_PRICE_ID || 'price_founders_test',
          tier: 'founders',
          monthlyLimit: 100 // 100 novels per month for Founders
        }
      };

      const selectedTier = tierPriceMapping[tierId];
      if (!selectedTier) {
        return res.status(400).json({ error: 'Invalid tier selected' });
      }

      // Check if user already has an active subscription
      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
          expand: ['latest_invoice.payment_intent']
        });
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          // Extract client secret safely
          const latestInvoice = subscription.latest_invoice as any;
          const clientSecret = typeof latestInvoice === 'object' && latestInvoice?.payment_intent && typeof latestInvoice.payment_intent === 'object'
            ? latestInvoice.payment_intent.client_secret
            : null;
            
          return res.json({
            subscriptionId: subscription.id,
            clientSecret,
            status: 'already_active'
          });
        }
      }

      let customerId = user.stripeCustomerId;

      // Create Stripe customer if needed
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email,
        });
        customerId = customer.id;
        // Only update customer ID for now, subscription ID will be set later
        await storage.updateUserCustomerId(userId, customerId);
      }

      // Select price ID based on billing period
      // For annual billing, use annualPriceId if available, otherwise fall back to monthly
      // Note: Annual price IDs must be created in Stripe Dashboard with appropriate pricing
      let priceId = selectedTier.priceId;
      if (billingPeriod === 'annual') {
        if (selectedTier.annualPriceId && !selectedTier.annualPriceId.includes('_test')) {
          // Use annual price ID if it's configured (not a test placeholder)
          priceId = selectedTier.annualPriceId;
        } else {
          // Fall back to monthly price ID for annual billing if annual price not configured
          console.warn(`Annual price ID not configured for ${tierId}, using monthly price ID. Please set STRIPE_${tierId.toUpperCase()}_ANNUAL_PRICE_ID environment variable.`);
          priceId = selectedTier.priceId;
        }
      }

      // Create subscription with selected tier pricing
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: priceId,
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      // Save subscription ID and tier info but DO NOT activate until payment confirmed via webhook
      await storage.updateUserStripeInfo(userId, customerId, subscription.id);
      await storage.updateUserSubscriptionTier(userId, selectedTier.tier, selectedTier.monthlyLimit);
      // NOTE: We intentionally do NOT set status to 'active' here - webhooks will handle that

      // Extract client secret safely with proper type checking
      const latestInvoice = subscription.latest_invoice as any;
      const clientSecret = typeof latestInvoice === 'object' && latestInvoice?.payment_intent && typeof latestInvoice.payment_intent === 'object'
        ? latestInvoice.payment_intent.client_secret
        : null;
        
      if (!clientSecret) {
        throw new Error('Failed to create payment intent - subscription may be misconfigured');
      }

      res.json({
        subscriptionId: subscription.id,
        clientSecret: clientSecret,
        tier: selectedTier.tier,
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get Founders tier availability
  app.get("/api/founders/availability", async (req, res) => {
    try {
      const foundersCount = await storage.getFoundersCount();
      const foundersRemaining = await storage.getFoundersRemaining();
      
      res.json({
        total: 100,
        sold: foundersCount,
        remaining: foundersRemaining,
        available: foundersRemaining > 0
      });
    } catch (error: any) {
      console.error("Error getting Founders availability:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create Founders tier checkout (one-time payment of $2500)
  app.post("/api/create-founders-checkout", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.email) {
        return res.status(400).json({ error: 'User email required for checkout' });
      }

      // Check if user already has Founders tier
      if (user.subscriptionTier === 'founders') {
        return res.status(400).json({ error: 'You already have Founders tier access' });
      }

      // Check if Founders slots are available
      const remaining = await storage.getFoundersRemaining();
      if (remaining <= 0) {
        return res.status(400).json({ error: 'Founders tier is sold out' });
      }

      let customerId = user.stripeCustomerId;

      // Create Stripe customer if needed
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email,
        });
        customerId = customer.id;
        await storage.updateUserCustomerId(userId, customerId);
      }

      // Create checkout session for one-time payment
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'AI KDP Author - Founders Lifetime Access',
              description: 'Lifetime access with 100 novels/month. Limited to 100 members. Support platform development.',
            },
            unit_amount: 250000, // $2500.00
          },
          quantity: 1,
        }],
        success_url: `${req.headers.origin || 'https://' + req.headers.host}/subscribe?success=true&tier=founders`,
        cancel_url: `${req.headers.origin || 'https://' + req.headers.host}/subscribe?canceled=true`,
        metadata: {
          userId,
          tier: 'founders',
          monthlyLimit: '100',
        },
      });

      res.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error: any) {
      console.error("Error creating Founders checkout:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Setup Stripe products and prices (run once to initialize)
  app.post("/api/setup-stripe-products", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const user = await storage.getUser(userId);
      
      // Only allow admin users to set up products
      if (!user?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      console.log("Setting up Stripe products and prices...");

      // Create product
      const product = await stripe.products.create({
        name: 'AI KDP Author',
        description: 'Professional AI novel generation and publishing tools',
      });

      // Create prices for each tier
      const basicPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: 2900, // $29.00
        currency: 'usd',
        recurring: { interval: 'month' },
        nickname: 'Basic Plan - $29/month',
      });

      const proPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: 4900, // $49.00
        currency: 'usd',
        recurring: { interval: 'month' },
        nickname: 'Pro Plan - $49/month',
      });

      const premiumPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: 9900, // $99.00
        currency: 'usd',
        recurring: { interval: 'month' },
        nickname: 'Premium Plan - $99/month',
      });

      const priceIds = {
        basic: basicPrice.id,
        pro: proPrice.id,
        premium: premiumPrice.id,
      };

      console.log("✅ Stripe products created successfully:", priceIds);

      res.json({
        success: true,
        product: product.id,
        prices: priceIds,
        message: 'Stripe products and prices created successfully. Add these to your environment variables: STRIPE_BASIC_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_PREMIUM_PRICE_ID'
      });
    } catch (error: any) {
      console.error("Error setting up Stripe products:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get subscription status
  app.get("/api/subscription/status", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let subscriptionData = null;
      let hasActiveSubscription = false;
      
      if (user.stripeSubscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          subscriptionData = {
            id: subscription.id,
            status: subscription.status,
            current_period_end: new Date((subscription as any).current_period_end * 1000),
            cancel_at_period_end: subscription.cancel_at_period_end,
            items: subscription.items.data.map(item => ({
              price: item.price.nickname || 'AI KDP Author Pro',
              amount: item.price.unit_amount ? item.price.unit_amount / 100 : 0,
              currency: item.price.currency,
            })),
          };
          
          // Only consider subscription as active if Stripe says it's active or trialing
          hasActiveSubscription = subscription.status === 'active' || subscription.status === 'trialing';
        } catch (stripeError) {
          console.error("Error fetching subscription from Stripe:", stripeError);
        }
      }

      res.json({
        hasActiveSubscription,
        subscriptionStatus: subscriptionData?.status || user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate,
        subscriptionTier: user.subscriptionTier || 'trial',
        isAdmin: user.isAdmin || false,
        stripeSubscription: subscriptionData,
      });
    } catch (error: any) {
      console.error("Error getting subscription status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe webhook handler for subscription events
  app.post('/api/stripe/webhook', async (req, res) => {
    let event;
    
    try {
      event = req.body;
      
      // In production, verify the webhook signature
      // const signature = req.headers['stripe-signature'] as string;
      // event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`Processing Stripe webhook: ${event.type}`);

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object;
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          
          if (customer.deleted) {
            console.error('Customer was deleted, cannot update subscription');
            break;
          }
          
          // Find user by Stripe customer ID
          const userResults = await db.select().from(users).where(eq(users.stripeCustomerId, customer.id));
          const user = userResults[0];
          
          if (user) {
            await storage.updateUserSubscriptionStatus(
              user.id, 
              subscription.status,
              (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : undefined
            );
            console.log(`Updated user ${user.id} subscription status to: ${subscription.status}`);
          }
          break;
        }
        
        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          
          if (!customer.deleted) {
            // Find user by Stripe customer ID
            const userResults = await db.select().from(users).where(eq(users.stripeCustomerId, customer.id));
            const user = userResults[0];
            
            if (user) {
              await storage.updateUserSubscriptionStatus(user.id, 'canceled');
              console.log(`Canceled subscription for user ${user.id}`);
            }
          }
          break;
        }
        
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
            const customer = await stripe.customers.retrieve(subscription.customer as string);
            
            if (!customer.deleted) {
              // Find user by Stripe customer ID
              const userResults = await db.select().from(users).where(eq(users.stripeCustomerId, customer.id));
              const user = userResults[0];
              
              if (user) {
                await storage.updateUserSubscriptionStatus(
                  user.id, 
                  'active',
                  (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : undefined
                );
                console.log(`Activated subscription for user ${user.id} after successful payment`);
                
                // Send subscription confirmation email on first payment
                const isFirstPayment = invoice.billing_reason === 'subscription_create';
                if (isFirstPayment && user.email) {
                  const tier = user.subscriptionTier || 'basic';
                  const amount = invoice.amount_paid || 0;
                  const interval = (subscription as any).items?.data[0]?.price?.recurring?.interval || 'monthly';
                  const userName = user.firstName || user.email.split('@')[0];
                  
                  emailService.sendSubscriptionConfirmation(
                    user.email,
                    userName,
                    tier,
                    amount,
                    interval
                  ).catch(err => console.error('Failed to send subscription confirmation email:', err));
                }
              }
            }
          }
          break;
        }
        
        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
            const customer = await stripe.customers.retrieve(subscription.customer as string);
            
            if (!customer.deleted) {
              // Find user by Stripe customer ID
              const userResults = await db.select().from(users).where(eq(users.stripeCustomerId, customer.id));
              const user = userResults[0];
              
              if (user) {
                await storage.updateUserSubscriptionStatus(user.id, 'past_due');
                console.log(`Marked user ${user.id} subscription as past_due after payment failure`);
              }
            }
          }
          break;
        }
        
        case 'checkout.session.completed': {
          const session = event.data.object;
          
          // Check if this is a Founders tier purchase
          if (session.metadata?.tier === 'founders') {
            const userId = session.metadata.userId;
            const monthlyLimit = parseInt(session.metadata.monthlyLimit || '100');
            
            if (userId) {
              // Update user to Founders tier with lifetime access
              await storage.updateUserSubscriptionTier(userId, 'founders', monthlyLimit);
              await storage.updateUserSubscriptionStatus(userId, 'active'); // Lifetime = active
              console.log(`✨ Granted Founders lifetime access to user ${userId}`);
              
              // Send subscription confirmation email
              const user = await storage.getUser(userId);
              if (user?.email) {
                const userName = user.firstName || user.email.split('@')[0];
                emailService.sendSubscriptionConfirmation(
                  user.email,
                  userName,
                  'founders',
                  250000, // $2500 in cents
                  'lifetime'
                ).catch(err => console.error('Failed to send Founders confirmation email:', err));
              }
            }
          }
          break;
        }
        
        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error: any) {
      console.error('Error processing webhook:', error);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }

    res.json({ received: true });
  });

  // Admin authorization middleware
  const isAdmin = async (req: any, res: any, next: any) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      console.log('Admin middleware - checking user:', userId, user?.claims?.email);
      
      if (!user || !userId) {
        console.log('Admin middleware - No user or userId found, returning 401');
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Fetch user from database to check admin status
      const dbUser = await storage.getUser(userId);
      console.log('Admin middleware - DB user found:', dbUser?.id, dbUser?.email, 'isAdmin:', dbUser?.isAdmin);
      
      if (!dbUser || !dbUser.isAdmin) {
        console.log('Admin middleware - User not admin, returning 403');
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      console.log('Admin middleware - User is admin, proceeding');
      next();
    } catch (error: any) {
      console.error('Error checking admin status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Admin Setup Endpoint (One-time use for production setup)
  app.post('/api/admin/setup', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      const userEmail = user?.claims?.email;
      
      if (!userId || !userEmail) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Only allow setup for the specific authorized email
      if (userEmail !== 'wholefoo@gmail.com') {
        return res.status(403).json({ error: 'Not authorized to use admin setup' });
      }
      
      // Grant admin privileges
      await db.update(users)
        .set({ isAdmin: true })
        .where(eq(users.id, userId));
      
      console.log(`Admin privileges granted to ${userEmail} (${userId})`);
      
      res.json({ 
        success: true, 
        message: 'Admin privileges granted successfully',
        userId,
        email: userEmail
      });
    } catch (error: any) {
      console.error('Error in admin setup:', error);
      res.status(500).json({ error: 'Failed to grant admin privileges' });
    }
  });

  // Admin Dashboard Routes (Protected)
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  });

  app.get('/api/admin/recent-signups', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const recentUsers = await storage.getRecentSignups();
      res.json(recentUsers);
    } catch (error: any) {
      console.error('Error fetching recent signups:', error);
      res.status(500).json({ error: 'Failed to fetch recent signups' });
    }
  });

  // Create test subscriber (admin only)
  app.post('/api/admin/create-test-subscriber', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Validate request body
      const bodySchema = z.object({
        email: z.string().email('Invalid email address'),
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        subscriptionTier: z.enum(['trial', 'basic', 'pro', 'premium', 'founders'], {
          errorMap: () => ({ message: 'Invalid subscription tier' })
        })
      });

      const validationResult = bodySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: validationResult.error.errors[0].message 
        });
      }

      const { email, firstName, lastName, subscriptionTier } = validationResult.data;

      // Check if email already exists
      const existingUsers = await storage.getAllUsers();
      const emailExists = existingUsers.some(u => u.email === email);
      if (emailExists) {
        return res.status(409).json({ 
          error: `A user with email ${email} already exists` 
        });
      }

      // Determine monthly novel limit based on tier
      let monthlyLimit = 0;
      let subscriptionStatus = 'active';
      
      switch (subscriptionTier) {
        case 'trial':
          monthlyLimit = 0; // Trial users can only use Refine features
          subscriptionStatus = 'trial';
          break;
        case 'basic':
          monthlyLimit = 5;
          break;
        case 'pro':
          monthlyLimit = 20;
          break;
        case 'premium':
          monthlyLimit = 50;
          break;
        case 'founders':
          monthlyLimit = 100;
          subscriptionStatus = 'founders';
          break;
      }

      // Create test subscriber with properly typed data
      const testUserData: typeof users.$inferInsert = {
        id: `test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        email,
        firstName,
        lastName,
        subscriptionTier,
        subscriptionStatus,
        monthlyNovelLimit: monthlyLimit,
        novelsGeneratedThisMonth: 0,
        currentPeriodStart: new Date(),
        subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      };

      const testUser = await storage.upsertUser(testUserData);

      console.log(`✅ Test subscriber created: ${email} (${subscriptionTier})`);
      res.json({ success: true, user: testUser });
    } catch (error: any) {
      console.error('Error creating test subscriber:', error);
      
      // Handle database unique constraint errors
      if (error.message?.includes('unique') || error.code === '23505') {
        return res.status(409).json({ 
          error: 'A user with this email already exists' 
        });
      }
      
      res.status(500).json({ 
        error: error.message || 'Failed to create test subscriber' 
      });
    }
  });

  // About page routes
  app.get('/api/about', async (req, res) => {
    try {
      const aboutPage = await storage.getAboutPage();
      if (!aboutPage) {
        // Return default content if no About page exists
        return res.json({
          title: "About AI KDP Author",
          content: "Welcome to AI KDP Author - Your AI-powered novel writing assistant. We help authors create complete, publishable novels for Amazon KDP using advanced AI technology.",
          updatedAt: new Date().toISOString()
        });
      }
      res.json(aboutPage);
    } catch (error: any) {
      console.error('Error fetching about page:', error);
      res.status(500).json({ error: 'Failed to fetch about page' });
    }
  });

  app.put('/api/admin/about', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const { title, content } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const updatedPage = await storage.updateAboutPage({
        title: title || "About AI KDP Author",
        content,
        updatedBy: userId
      });

      res.json(updatedPage);
    } catch (error: any) {
      console.error('Error updating about page:', error);
      res.status(500).json({ error: 'Failed to update about page' });
    }
  });

  // Blog post routes
  // Public routes - get all published posts
  app.get('/api/blog/posts', async (req, res) => {
    try {
      const posts = await storage.getAllBlogPosts(true); // Only published posts
      res.json(posts);
    } catch (error: any) {
      console.error('Error fetching blog posts:', error);
      res.status(500).json({ error: 'Failed to fetch blog posts' });
    }
  });

  // Public routes - get single post by slug
  app.get('/api/blog/posts/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const post = await storage.getBlogPostBySlug(slug);
      
      if (!post) {
        return res.status(404).json({ error: 'Blog post not found' });
      }

      if (!post.published) {
        return res.status(404).json({ error: 'Blog post not found' });
      }

      // Increment view count
      await storage.incrementBlogPostViews(post.id);
      
      res.json(post);
    } catch (error: any) {
      console.error('Error fetching blog post:', error);
      res.status(500).json({ error: 'Failed to fetch blog post' });
    }
  });

  // Admin routes - get all posts (including unpublished)
  app.get('/api/admin/blog/posts', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const posts = await storage.getAllBlogPosts(false); // All posts
      res.json(posts);
    } catch (error: any) {
      console.error('Error fetching admin blog posts:', error);
      res.status(500).json({ error: 'Failed to fetch blog posts' });
    }
  });

  // Admin routes - get single post by ID
  app.get('/api/admin/blog/posts/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const post = await storage.getBlogPost(id);
      
      if (!post) {
        return res.status(404).json({ error: 'Blog post not found' });
      }
      
      res.json(post);
    } catch (error: any) {
      console.error('Error fetching blog post:', error);
      res.status(500).json({ error: 'Failed to fetch blog post' });
    }
  });

  // Admin routes - create new post
  app.post('/api/admin/blog/posts', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const postData = req.body;

      // Ensure required fields exist and are strings before processing
      const title = postData.title && typeof postData.title === 'string' ? postData.title : null;
      const content = postData.content && typeof postData.content === 'string' ? postData.content : null;
      const excerpt = postData.excerpt && typeof postData.excerpt === 'string' ? postData.excerpt : null;
      const category = postData.category && typeof postData.category === 'string' ? postData.category : null;

      if (!title || !content || !excerpt || !category) {
        return res.status(400).json({ 
          error: 'Title, content, excerpt, and category are required and must be strings' 
        });
      }

      // Generate slug from title if not provided
      let slug = postData.slug && typeof postData.slug === 'string' ? postData.slug : null;
      if (!slug) {
        slug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }

      // Check if slug already exists
      const existing = await storage.getBlogPostBySlug(slug);
      if (existing) {
        return res.status(409).json({ error: 'A post with this slug already exists' });
      }

      // Calculate read time (approx 200 words per minute)
      const wordCount = content.split(/\s+/).length;
      const readTime = Math.ceil(wordCount / 200);

      // Validate with Zod schema using safeParse
      const validationResult = insertBlogPostSchema.safeParse({
        title,
        slug,
        excerpt,
        content,
        coverImage: postData.coverImage || null,
        category,
        tags: Array.isArray(postData.tags) ? postData.tags : [],
        author: postData.author || "AI KDP Author Team",
        published: postData.published === true,
        publishedAt: postData.published ? new Date() : null,
        readTime,
        createdBy: userId,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        });
      }

      const post = await storage.createBlogPost(validationResult.data);

      console.log(`✅ Blog post created: ${post.title} (${post.slug})`);
      res.json(post);
    } catch (error: any) {
      console.error('Error creating blog post:', error);
      res.status(500).json({ error: error.message || 'Failed to create blog post' });
    }
  });

  // Admin routes - update post
  app.put('/api/admin/blog/posts/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Check if post exists
      const existing = await storage.getBlogPost(id);
      if (!existing) {
        return res.status(404).json({ error: 'Blog post not found' });
      }

      // Build update payload with type-safe checks
      const updatePayload: any = {};

      if (updates.title !== undefined) {
        if (typeof updates.title !== 'string') {
          return res.status(400).json({ error: 'Title must be a string' });
        }
        updatePayload.title = updates.title;
      }

      if (updates.content !== undefined) {
        if (typeof updates.content !== 'string') {
          return res.status(400).json({ error: 'Content must be a string' });
        }
        updatePayload.content = updates.content;
        // Recalculate read time if content changed
        const wordCount = updates.content.split(/\s+/).length;
        updatePayload.readTime = Math.ceil(wordCount / 200);
      }

      if (updates.excerpt !== undefined) {
        if (typeof updates.excerpt !== 'string') {
          return res.status(400).json({ error: 'Excerpt must be a string' });
        }
        updatePayload.excerpt = updates.excerpt;
      }

      if (updates.category !== undefined) {
        if (typeof updates.category !== 'string') {
          return res.status(400).json({ error: 'Category must be a string' });
        }
        updatePayload.category = updates.category;
      }

      if (updates.slug !== undefined) {
        if (typeof updates.slug !== 'string') {
          return res.status(400).json({ error: 'Slug must be a string' });
        }
        // Check for slug conflicts
        if (updates.slug !== existing.slug) {
          const slugConflict = await storage.getBlogPostBySlug(updates.slug);
          if (slugConflict) {
            return res.status(409).json({ error: 'A post with this slug already exists' });
          }
        }
        updatePayload.slug = updates.slug;
      }

      if (updates.coverImage !== undefined) {
        updatePayload.coverImage = updates.coverImage;
      }

      if (updates.tags !== undefined) {
        if (!Array.isArray(updates.tags)) {
          return res.status(400).json({ error: 'Tags must be an array' });
        }
        updatePayload.tags = updates.tags;
      }

      if (updates.author !== undefined) {
        if (typeof updates.author !== 'string') {
          return res.status(400).json({ error: 'Author must be a string' });
        }
        updatePayload.author = updates.author;
      }

      if (updates.published !== undefined) {
        updatePayload.published = updates.published === true;
        // Update publishedAt timestamp if publishing for the first time
        if (updatePayload.published && !existing.published) {
          updatePayload.publishedAt = new Date();
        }
      }

      if (updates.views !== undefined) {
        updatePayload.views = Number(updates.views) || 0;
      }

      // Validate with Zod schema using safeParse
      const validationResult = updateBlogPostSchema.safeParse(updatePayload);

      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        });
      }

      const post = await storage.updateBlogPost(id, validationResult.data);
      
      console.log(`✅ Blog post updated: ${post?.title}`);
      res.json(post);
    } catch (error: any) {
      console.error('Error updating blog post:', error);
      res.status(500).json({ error: error.message || 'Failed to update blog post' });
    }
  });

  // Admin routes - delete post
  app.delete('/api/admin/blog/posts/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const existing = await storage.getBlogPost(id);
      if (!existing) {
        return res.status(404).json({ error: 'Blog post not found' });
      }

      await storage.deleteBlogPost(id);
      
      console.log(`✅ Blog post deleted: ${existing.title}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting blog post:', error);
      res.status(500).json({ error: 'Failed to delete blog post' });
    }
  });

  // AI Blog Post Generation Routes (Admin only)
  app.post('/api/admin/blog/generate-titles', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { topic, category } = req.body;

      if (!topic) {
        return res.status(400).json({ error: 'Topic is required' });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "system",
          content: `You are a professional content writer specializing in Amazon KDP and self-publishing. Generate 5 compelling, SEO-friendly blog post titles for the category: ${category || 'General'}.`
        }, {
          role: "user",
          content: `Generate 5 different blog post title options for this topic: ${topic}. Make them engaging, actionable, and optimized for search engines. Return only the titles, one per line.`
        }],
        temperature: 0.8,
      });

      const titlesText = completion.choices[0]?.message?.content || "";
      const titles = titlesText.split('\n').filter(t => t.trim()).map(t => t.replace(/^\d+[\.\)]\s*/, '').trim());

      res.json({ titles });
    } catch (error: any) {
      console.error('Error generating titles:', error);
      res.status(500).json({ error: error.message || 'Failed to generate titles' });
    }
  });

  app.post('/api/admin/blog/generate-content', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { topic, outline, category } = req.body;

      if (!topic) {
        return res.status(400).json({ error: 'Topic is required' });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const systemPrompt = `You are a professional content writer specializing in Amazon KDP and self-publishing. Write comprehensive, SEO-optimized blog content in markdown format for the category: ${category || 'General'}.`;
      
      let userPrompt = `Write a detailed, engaging blog post about: ${topic}`;
      
      if (outline) {
        userPrompt += `\n\nFollow this outline:\n${outline}`;
      }
      
      userPrompt += `\n\nRequirements:
- Write in markdown format with proper headings (##, ###)
- Include actionable tips and practical advice
- Use bullet points and numbered lists where appropriate
- Make it SEO-friendly with natural keyword integration
- Aim for 800-1200 words
- Write in a friendly, authoritative tone
- Include examples where relevant`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "system",
          content: systemPrompt
        }, {
          role: "user",
          content: userPrompt
        }],
        temperature: 0.7,
        max_tokens: 3000,
      });

      const content = completion.choices[0]?.message?.content || "";

      res.json({ content });
    } catch (error: any) {
      console.error('Error generating content:', error);
      res.status(500).json({ error: error.message || 'Failed to generate content' });
    }
  });

  app.post('/api/admin/blog/generate-full-post', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { topic, category, keywords } = req.body;

      if (!topic) {
        return res.status(400).json({ error: 'Topic is required' });
      }

      if (!process.env.OPENAI_API_KEY) {
        console.error('Error: OPENAI_API_KEY not found');
        return res.status(500).json({ error: 'OpenAI API key not configured' });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const systemPrompt = `You are a professional content writer and SEO specialist for Amazon KDP and self-publishing. Generate a complete, publication-ready blog post with title, excerpt, content, and tags.`;
      
      let userPrompt = `Create a complete blog post about: ${topic}`;
      
      if (keywords) {
        userPrompt += `\n\nTarget keywords: ${keywords}`;
      }
      
      userPrompt += `\n\nCategory: ${category || 'General'}`;
      
      userPrompt += `\n\nGenerate a JSON response with:
1. "title": A compelling, SEO-friendly title (50-60 characters)
2. "excerpt": A brief summary (150-160 characters) that hooks readers
3. "content": Full blog post in markdown format (800-1200 words) with:
   - Engaging introduction
   - Clear headings and subheadings (##, ###)
   - Actionable tips and practical advice
   - Bullet points and lists where appropriate
   - Real examples and scenarios
   - Strong conclusion with call to action
4. "tags": Array of 5-8 relevant, SEO-friendly tags (lowercase, no special characters)

Return ONLY valid JSON, no additional text.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "system",
          content: systemPrompt
        }, {
          role: "user",
          content: userPrompt
        }],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      const result = JSON.parse(responseText);

      res.json({
        title: result.title || topic,
        excerpt: result.excerpt || "",
        content: result.content || "",
        tags: result.tags || []
      });
    } catch (error: any) {
      console.error('Error generating full post:', error);
      res.status(500).json({ error: error.message || 'Failed to generate full post' });
    }
  });

  app.post('/api/admin/blog/generate-tags', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "system",
          content: "You are an SEO specialist. Analyze content and generate relevant, SEO-friendly tags."
        }, {
          role: "user",
          content: `Analyze this blog post content and generate 6-8 relevant tags. Return only the tags as a JSON array of strings (lowercase, no special characters):\n\n${content.substring(0, 2000)}`
        }],
        temperature: 0.5,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      const result = JSON.parse(responseText);
      const tags = result.tags || [];

      res.json({ tags });
    } catch (error: any) {
      console.error('Error generating tags:', error);
      res.status(500).json({ error: error.message || 'Failed to generate tags' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function getContentType(format: string): string {
  switch (format) {
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'pdf':
      return 'application/pdf';
    case 'markdown':
      return 'text/markdown';
    case 'txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}
