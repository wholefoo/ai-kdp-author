import mammoth from "mammoth";
import OpenAI from "openai";
import * as fs from "fs/promises";
import * as path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ManuscriptCleanupOptions {
  genre?: string;
  writingStyle?: "narrative" | "descriptive" | "dialogue-heavy" | "balanced";
  pointOfView?: "first-person" | "third-person-limited" | "third-person-omniscient";
  toneAndMood?: "dark" | "light" | "humorous" | "serious" | "adventurous" | "romantic" | "mysterious" | "epic";
  contentRating?: "g" | "pg" | "pg-13" | "r";
  targetWordCount?: number;
  customInstructions?: string;
}

export interface CleanupResult {
  originalText: string;
  cleanedText: string;
  wordCount: number;
  changes: Array<{
    type: "formatting" | "style" | "grammar" | "consistency" | "structure";
    description: string;
    before: string;
    after: string;
  }>;
  summary: {
    totalChanges: number;
    wordsAdded: number;
    wordsRemoved: number;
    improvementAreas: string[];
  };
}

export class ManuscriptProcessor {
  async extractChapterPageNumbers(buffer: Buffer): Promise<{ [chapterNumber: number]: number }> {
    try {
      // Extract text with HTML conversion to preserve structure
      const result = await mammoth.convertToHtml({ buffer });
      const htmlContent = result.value;
      
      // Split content by paragraphs to analyze structure
      const paragraphs = htmlContent.split(/<\/p>|<br\s*\/?>/i);
      
      const chapterPages: { [chapterNumber: number]: number } = {};
      let wordCount = 0;
      const wordsPerPage = 250; // Typical words per manuscript page (double-spaced, 12pt font)
      
      for (const paragraph of paragraphs) {
        // Clean HTML tags
        const cleanText = paragraph.replace(/<[^>]*>/g, '').trim();
        if (!cleanText) continue;
        
        // Check if this paragraph is a chapter heading
        const chapterMatch = cleanText.match(/^Chapter\s+(\d+)/i);
        if (chapterMatch) {
          const chapterNum = parseInt(chapterMatch[1]);
          // Calculate page based on accumulated word count
          const estimatedPage = Math.max(1, Math.floor(wordCount / wordsPerPage) + 1);
          chapterPages[chapterNum] = estimatedPage;
        }
        
        // Count words in this paragraph
        const words = cleanText.split(/\s+/).filter(word => word.length > 0);
        wordCount += words.length;
      }
      
      return chapterPages;
    } catch (error) {
      console.error('Error extracting chapter page numbers:', error);
      return {};
    }
  }

  async extractTextFromDocx(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    // Use convertToHtml to preserve more formatting information
    const result = await mammoth.convertToHtml({ buffer: fileBuffer });
    let htmlText = result.value;

    if (!htmlText || htmlText.trim().length === 0) {
      throw new Error("No text content found in the DOCX file");
    }

    // Convert HTML to formatted text while preserving structure
    const formattedText = htmlText
      .replace(/<h[1-6][^>]*>/gi, '\n\n') // Headers get double newlines before
      .replace(/<\/h[1-6]>/gi, '\n\n') // Headers get double newlines after
      .replace(/<p[^>]*>/gi, '') // Remove paragraph opening tags
      .replace(/<\/p>/gi, '\n\n') // Replace paragraph closing with double newlines
      .replace(/<br\s*\/?>/gi, '\n') // Line breaks become single newlines
      .replace(/<[^>]*>/g, '') // Remove all other HTML tags
      .replace(/&nbsp;/g, ' ') // Convert non-breaking spaces
      .replace(/&amp;/g, '&') // Convert HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\n\n+/g, '\n\n') // Normalize multiple newlines to double
      .trim();

    return formattedText;
  }

  async processDocxFile(filePath: string, options: ManuscriptCleanupOptions): Promise<CleanupResult> {
    const originalText = await this.extractTextFromDocx(filePath);
    
    // Clean up the manuscript using AI with chunking for large texts
    const cleanupResult = await this.cleanupManuscriptChunked(originalText, options);
    
    return cleanupResult;
  }

  private async cleanupManuscript(text: string, options: ManuscriptCleanupOptions): Promise<CleanupResult> {
    const cleanupPrompt = `You are a CONSERVATIVE manuscript formatter. Your job is to make MINIMAL formatting fixes while preserving the author's original text, style, and voice completely.

CRITICAL REQUIREMENTS - FOLLOW EXACTLY:
- PRESERVE ALL CONTENT: Do not change, remove, summarize, or shorten ANY text
- PRESERVE AUTHOR'S VOICE: Do not change writing style, vocabulary, or sentence structure
- PRESERVE WORD COUNT: Output must have the exact same word count as input
- MINIMAL CHANGES ONLY: Make only essential formatting fixes, nothing more

ALLOWED MINIMAL FIXES ONLY:
1. Fix obvious typos (misspelled words only)
2. Correct basic punctuation errors (missing periods, commas)
3. Fix paragraph spacing (ensure consistent double line breaks)
4. Standardize dialogue quotation marks (" vs ')
5. Fix obvious capitalization errors at sentence starts

STRICTLY FORBIDDEN - DO NOT DO:
- Do not change sentence structure or vocabulary
- Do not improve or enhance the writing style
- Do not change point of view consistency
- Do not alter dialogue tags or narrative voice
- Do not change content rating or genre elements
- Do not reorganize or restructure text
- Do not add or remove words for "improvement"

ORIGINAL MANUSCRIPT:
${text}

Make ONLY the minimal formatting fixes listed above. Preserve the author's exact writing style, voice, vocabulary, and content. The output should be nearly identical to the input with only essential typo and punctuation fixes.

IMPORTANT JSON FORMATTING RULES:
- Escape all quotes within text content using \"
- Keep JSON response under 15,000 characters to avoid truncation
- Use concise change descriptions and text snippets
- Ensure valid JSON structure without syntax errors

Respond in JSON format:
{
  "cleanedText": "the improved manuscript text with proper escaping",
  "changes": [
    {
      "type": "formatting|style|grammar|consistency|structure",
      "description": "brief description of change",
      "before": "short original snippet",
      "after": "short improved snippet"
    }
  ],
  "summary": {
    "totalChanges": number,
    "wordsAdded": number,
    "wordsRemoved": number,
    "improvementAreas": ["concise list of areas improved"]
  }
}`;

    try {
      // Retry logic for rate limits and temporary quota issues
      let response;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          response = await openai.chat.completions.create({
            model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 2025. Updated per user request.
            messages: [{ role: "user", content: cleanupPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 16384 // Ensure we get complete responses
          });
          break; // Success, exit retry loop
        } catch (retryError: any) {
          attempts++;
          console.log(`Cleanup attempt ${attempts}/${maxAttempts} failed:`, retryError.message);
          
          if (attempts >= maxAttempts || !retryError.message?.includes('quota')) {
            throw retryError; // Re-throw if max attempts reached or not a quota error
          }
          
          // Wait before retrying (exponential backoff)
          const waitTime = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      const rawContent = response?.choices[0].message.content || '{}';
      
      // Try to parse JSON with better error handling
      let result;
      try {
        result = JSON.parse(rawContent);
      } catch (jsonError) {
        console.error('JSON parsing failed, attempting to fix:', jsonError);
        // Try to fix common JSON issues
        let fixedContent = rawContent
          .replace(/[\u0000-\u001f\u007f-\u009f]/g, '') // Remove control characters
          .replace(/\\/g, '\\\\') // Escape backslashes
          .replace(/"/g, '\\"') // Escape quotes in content
          .replace(/\\"/g, '"'); // Restore proper quotes
        
        // If still failing, create a minimal valid response
        if (!fixedContent.includes('cleanedText')) {
          result = {
            cleanedText: text, // Use original text if parsing fails
            changes: [],
            summary: {
              totalChanges: 0,
              wordsAdded: 0,
              wordsRemoved: 0,
              improvementAreas: ['Formatting preserved due to processing error']
            }
          };
        } else {
          try {
            result = JSON.parse(fixedContent);
          } catch {
            // Final fallback
            result = {
              cleanedText: text,
              changes: [],
              summary: { totalChanges: 0, wordsAdded: 0, wordsRemoved: 0, improvementAreas: [] }
            };
          }
        }
      }
      
      const cleanedText = result.cleanedText || text;
      
      // Calculate actual word differences
      const originalWordCount = this.countWords(text);
      const cleanedWordCount = this.countWords(cleanedText);
      const actualWordsAdded = Math.max(0, cleanedWordCount - originalWordCount);
      const actualWordsRemoved = Math.max(0, originalWordCount - cleanedWordCount);
      
      return {
        originalText: text,
        cleanedText,
        wordCount: cleanedWordCount,
        changes: result.changes || [],
        summary: {
          totalChanges: result.summary?.totalChanges || 0,
          wordsAdded: actualWordsAdded,
          wordsRemoved: actualWordsRemoved,
          improvementAreas: result.summary?.improvementAreas || []
        }
      };
    } catch (error) {
      console.error('Manuscript cleanup error:', error);
      // Return original text with error indication instead of throwing
      return {
        originalText: text,
        cleanedText: text,
        wordCount: this.countWords(text),
        changes: [],
        summary: {
          totalChanges: 0,
          wordsAdded: 0,
          wordsRemoved: 0,
          improvementAreas: ['Processing error - original text preserved']
        }
      };
    }
  }

  async analyzeManuscriptBasic(text: string): Promise<{
    wordCount: number;
    characterCount: number;
    paragraphCount: number;
    estimatedReadingTime: number;
    detectedGenre: string;
    detectedPOV: string;
    detectedTone: string;
    qualityIssues: string[];
    strengths: string[];
  }> {
    // For very large texts, do basic analysis without AI first
    const wordCount = this.countWords(text);
    const characterCount = text.length;
    const paragraphCount = text.split('\n\n').filter(p => p.trim().length > 0).length;
    const estimatedReadingTime = Math.ceil(wordCount / 250);
    
    // If text is too large (>15000 words), only use sample for AI analysis
    const sampleText = wordCount > 15000 ? text.slice(0, 10000) + "..." : text;
    
    return this.analyzeManuscript(sampleText, {
      wordCount,
      characterCount,
      paragraphCount,
      estimatedReadingTime
    });
  }

  async analyzeManuscript(text: string, precomputedStats?: {
    wordCount: number;
    characterCount: number;
    paragraphCount: number;
    estimatedReadingTime: number;
  }): Promise<{
    wordCount: number;
    characterCount: number;
    paragraphCount: number;
    estimatedReadingTime: number;
    detectedGenre: string;
    detectedPOV: string;
    detectedTone: string;
    qualityIssues: string[];
    strengths: string[];
  }> {
    const analysisPrompt = `Analyze this manuscript sample and provide detailed quality assessment:

MANUSCRIPT TEXT:
${text.slice(0, 3000)}${text.length > 3000 ? '\n[Sample truncated for analysis]' : ''}

Provide comprehensive analysis including writing quality, style consistency, and genre detection.

Respond in JSON format:
{
  "detectedGenre": "most likely genre",
  "detectedPOV": "detected point of view",
  "detectedTone": "primary tone/mood",
  "qualityIssues": ["list of issues found"],
  "strengths": ["list of manuscript strengths"]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 2025. Updated per user request.
        messages: [{ role: "user", content: analysisPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const aiResult = JSON.parse(response.choices[0].message.content || '{}');

      return {
        wordCount: precomputedStats?.wordCount || this.countWords(text),
        characterCount: precomputedStats?.characterCount || text.length,
        paragraphCount: precomputedStats?.paragraphCount || text.split('\n\n').filter(p => p.trim().length > 0).length,
        estimatedReadingTime: precomputedStats?.estimatedReadingTime || Math.ceil(this.countWords(text) / 250),
        detectedGenre: aiResult.detectedGenre || 'Unknown',
        detectedPOV: aiResult.detectedPOV || 'Unknown',
        detectedTone: aiResult.detectedTone || 'Unknown',
        qualityIssues: aiResult.qualityIssues || [],
        strengths: aiResult.strengths || []
      };
    } catch (error) {
      console.error('Manuscript analysis error:', error);
      // Return basic stats if AI analysis fails
      return {
        wordCount: precomputedStats?.wordCount || this.countWords(text),
        characterCount: precomputedStats?.characterCount || text.length,
        paragraphCount: precomputedStats?.paragraphCount || text.split('\n\n').filter(p => p.trim().length > 0).length,
        estimatedReadingTime: precomputedStats?.estimatedReadingTime || Math.ceil(this.countWords(text) / 250),
        detectedGenre: 'Unknown',
        detectedPOV: 'Unknown',
        detectedTone: 'Unknown',
        qualityIssues: ['Analysis temporarily unavailable'],
        strengths: ['Manual review recommended']
      };
    }
  }

  async cleanupManuscriptChunked(text: string, options: ManuscriptCleanupOptions): Promise<CleanupResult> {
    const maxChunkSize = 12000; // Increased chunk size for GPT-4o
    const wordCount = this.countWords(text);
    
    // If text is small enough, process normally
    if (wordCount <= maxChunkSize) {
      return this.cleanupManuscript(text, options);
    }
    
    // For very large manuscripts, use a different approach:
    // Process in larger, overlapping chunks to maintain context
    const paragraphs = text.split('\n\n');
    const chunks: string[] = [];
    let currentChunk = '';
    let currentWordCount = 0;
    
    for (const paragraph of paragraphs) {
      const paragraphWordCount = this.countWords(paragraph);
      
      if (currentWordCount + paragraphWordCount > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        // Keep last paragraph for context continuity
        const lastParagraphs = currentChunk.split('\n\n').slice(-2);
        currentChunk = lastParagraphs.join('\n\n') + '\n\n' + paragraph;
        currentWordCount = this.countWords(currentChunk);
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        currentWordCount += paragraphWordCount;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    
    // Process chunks with better preservation
    const processedChunks: string[] = [];
    const allChanges: any[] = [];
    let totalChanges = 0;
    const improvementAreas = new Set<string>();
    
    for (let i = 0; i < chunks.length; i++) {
      try {
        // Add context about chunk position for better continuity
        const contextualOptions = {
          ...options,
          customInstructions: (options.customInstructions || '') + 
            ` [CHUNK ${i + 1}/${chunks.length}: Maintain narrative flow and formatting consistency.]`
        };
        
        const chunkResult = await this.cleanupManuscript(chunks[i], contextualOptions);
        
        // Remove overlap from previous chunks (except first chunk)
        let cleanedChunk = chunkResult.cleanedText;
        if (i > 0 && chunks.length > 1) {
          // Remove potential duplicated content from overlap
          const chunkParts = cleanedChunk.split('\n\n');
          cleanedChunk = chunkParts.slice(2).join('\n\n'); // Skip first 2 paragraphs that were overlap
        }
        
        processedChunks.push(cleanedChunk);
        allChanges.push(...chunkResult.changes);
        totalChanges += chunkResult.summary.totalChanges;
        chunkResult.summary.improvementAreas.forEach(area => improvementAreas.add(area));
        
      } catch (error) {
        console.error(`Error processing chunk ${i + 1}:`, error);
        // Use original chunk if processing fails
        let fallbackChunk = chunks[i];
        if (i > 0) {
          const chunkParts = fallbackChunk.split('\n\n');
          fallbackChunk = chunkParts.slice(2).join('\n\n');
        }
        processedChunks.push(fallbackChunk);
      }
    }
    
    const cleanedText = processedChunks.join('\n\n');
    
    // Calculate actual word differences for the entire document
    const originalWordCount = this.countWords(text);
    const finalWordCount = this.countWords(cleanedText);
    const actualWordsAdded = Math.max(0, finalWordCount - originalWordCount);
    const actualWordsRemoved = Math.max(0, originalWordCount - finalWordCount);
    
    return {
      originalText: text,
      cleanedText,
      wordCount: finalWordCount,
      changes: allChanges,
      summary: {
        totalChanges,
        wordsAdded: actualWordsAdded,
        wordsRemoved: actualWordsRemoved,
        improvementAreas: Array.from(improvementAreas)
      }
    };
  }

  countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  async exportCleanedManuscript(cleanedText: string, format: 'docx' | 'txt' | 'md'): Promise<Buffer> {
    switch (format) {
      case 'txt':
        // Ensure proper line breaks for text format
        const formattedText = cleanedText
          .replace(/\n\n\n+/g, '\n\n') // Normalize paragraph breaks
          .replace(/\n(?!\n)/g, ' ') // Join single line breaks within paragraphs
          .replace(/\n\n/g, '\n\n'); // Keep paragraph breaks
        return Buffer.from(formattedText, 'utf8');
      
      case 'md':
        // Convert to markdown with proper formatting
        const markdown = cleanedText
          .split('\n\n')
          .map(paragraph => {
            const trimmed = paragraph.trim();
            if (!trimmed) return '';
            
            // Detect chapter headings or titles
            if (trimmed.length < 100 && (
              trimmed.match(/^(chapter|part|book|section)\s+\d+/i) ||
              trimmed.match(/^[A-Z\s]+$/) ||
              trimmed.startsWith('Chapter') ||
              trimmed.startsWith('CHAPTER')
            )) {
              return `## ${trimmed}\n`;
            }
            
            return trimmed;
          })
          .filter(p => p.length > 0)
          .join('\n\n');
        return Buffer.from(markdown, 'utf8');
      
      case 'docx':
      default:
        // For DOCX export with better formatting
        const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
        
        const docElements = cleanedText
          .split('\n\n')
          .map(text => text.trim())
          .filter(text => text.length > 0)
          .map(text => {
            // Detect chapter headings
            if (text.length < 100 && (
              text.match(/^(chapter|part|book|section)\s+\d+/i) ||
              text.match(/^[A-Z\s]+$/) ||
              text.startsWith('Chapter') ||
              text.startsWith('CHAPTER')
            )) {
              return new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun({ text, bold: true, size: 24 })]
              });
            }
            
            // Regular paragraph
            return new Paragraph({
              children: [new TextRun({ text, size: 22 })],
              spacing: { after: 240 } // Add spacing after paragraphs
            });
          });

        const doc = new Document({
          sections: [{
            properties: {
              page: {
                margin: {
                  top: 1440, // 1 inch = 1440 twips
                  right: 1440,
                  bottom: 1440,
                  left: 1440
                }
              }
            },
            children: docElements
          }]
        });

        return await Packer.toBuffer(doc);
    }
  }
}

export const manuscriptProcessor = new ManuscriptProcessor();