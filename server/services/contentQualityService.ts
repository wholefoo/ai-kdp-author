import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "placeholder",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface QualityStandards {
  chapterMinWords: number;
  chapterMaxWords: number;
  quotationStyle: "straight" | "curly";
  chapterNumberFormat: "numeric" | "roman" | "word";
  headingFormat: "centered" | "left" | "title-case";
  dialogueStyle: "traditional" | "modern";
}

export interface ContentValidation {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
  wordCount: number;
  estimatedReadingTime: number;
}

export class ContentQualityService {
  private defaultStandards: QualityStandards = {
    chapterMinWords: 2000,
    chapterMaxWords: 4000,
    quotationStyle: "straight",
    chapterNumberFormat: "numeric",
    headingFormat: "centered",
    dialogueStyle: "traditional"
  };

  async enhanceChapterContent(
    content: string, 
    chapterNumber: number, 
    standards: Partial<QualityStandards> = {}
  ): Promise<string> {
    const appliedStandards = { ...this.defaultStandards, ...standards };
    
    const prompt = `You are a professional editor enhancing a chapter for publication. Apply these strict formatting standards:

CHAPTER FORMATTING RULES:
- Chapter heading: "Chapter ${chapterNumber}" (${appliedStandards.chapterNumberFormat} format)
- Heading style: ${appliedStandards.headingFormat}
- Target length: ${appliedStandards.chapterMinWords}-${appliedStandards.chapterMaxWords} words
- Quotation marks: ${appliedStandards.quotationStyle === 'straight' ? 'Use straight quotes "like this"' : 'Use curly quotes "like this"'}
- Dialogue format: ${appliedStandards.dialogueStyle === 'traditional' ? 'Traditional with proper attribution and paragraph breaks' : 'Modern streamlined style'}

QUALITY REQUIREMENTS:
1. Ensure consistent quotation mark style throughout
2. Proper dialogue formatting with clear speaker attribution
3. Consistent paragraph structure and spacing
4. No typos or grammatical errors
5. Smooth narrative flow and pacing
6. Appropriate chapter length (expand if too short, tighten if too long)

CONTENT TO ENHANCE:
${content}

Return the enhanced chapter with consistent formatting, proper length, and professional quality. Maintain the original story and characters while improving technical quality.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_completion_tokens: 16000
      });

      return response.choices[0]?.message?.content || content;
    } catch (error) {
      console.error("Error enhancing chapter content:", error);
      return content;
    }
  }

  async validateContent(content: string, standards: Partial<QualityStandards> = {}): Promise<ContentValidation> {
    const appliedStandards = { ...this.defaultStandards, ...standards };
    const wordCount = this.countWords(content);
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check word count
    if (wordCount < appliedStandards.chapterMinWords) {
      issues.push(`Chapter too short: ${wordCount} words (minimum: ${appliedStandards.chapterMinWords})`);
      suggestions.push("Expand scenes, add more descriptive details, or develop character interactions");
    }
    if (wordCount > appliedStandards.chapterMaxWords) {
      issues.push(`Chapter too long: ${wordCount} words (maximum: ${appliedStandards.chapterMaxWords})`);
      suggestions.push("Tighten prose, remove unnecessary details, or split into multiple chapters");
    }

    // Check quotation consistency
    const straightQuotes = (content.match(/"/g) || []).length;
    const curlyQuotes = (content.match(/[""]/g) || []).length;
    if (straightQuotes > 0 && curlyQuotes > 0) {
      issues.push("Mixed quotation mark styles detected");
      suggestions.push(`Standardize to ${appliedStandards.quotationStyle} quotes throughout`);
    }

    // Check chapter heading format
    const chapterHeadings = content.match(/^chapter\s+\d+/gmi);
    if (!chapterHeadings || chapterHeadings.length === 0) {
      issues.push("Missing or inconsistent chapter heading");
      suggestions.push("Add proper chapter heading at the beginning");
    }

    // Check dialogue formatting
    const dialogueLines = content.match(/["""].+?["""]/g) || [];
    const improperlyClosed = content.match(/["""][^"""]*$/gm);
    if (improperlyClosed && improperlyClosed.length > 0) {
      issues.push("Unclosed dialogue detected");
      suggestions.push("Ensure all dialogue is properly closed with matching quotation marks");
    }

    // Check for potential typos (basic patterns)
    const commonTypos = [
      /\bteh\b/gi,
      /\brecieve\b/gi,
      /\boccur\s+red\b/gi,
      /\btheir\s+are\b/gi
    ];
    
    for (const pattern of commonTypos) {
      if (pattern.test(content)) {
        issues.push("Potential typos detected");
        suggestions.push("Run spell check and proofread carefully");
        break;
      }
    }

    // Estimate reading time (250 words per minute average)
    const estimatedReadingTime = Math.ceil(wordCount / 250);

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
      wordCount,
      estimatedReadingTime
    };
  }

  async generateEnhancedChapter(
    outline: string,
    chapterNumber: number,
    previousChapter: string = "",
    standards: Partial<QualityStandards> = {}
  ): Promise<string> {
    const appliedStandards = { ...this.defaultStandards, ...standards };
    
    const prompt = `You are a professional novelist writing a high-quality chapter for publication. Follow these strict standards:

FORMATTING REQUIREMENTS:
- Start with "Chapter ${chapterNumber}" as the heading
- Target length: ${appliedStandards.chapterMinWords}-${appliedStandards.chapterMaxWords} words
- Use ${appliedStandards.quotationStyle} quotation marks consistently: ${appliedStandards.quotationStyle === 'straight' ? '"like this"' : '"like this"'}
- ${appliedStandards.dialogueStyle === 'traditional' ? 'Traditional dialogue: "Hello," she said. New speaker gets new paragraph.' : 'Modern dialogue style with clear attribution'}

QUALITY STANDARDS:
1. Consistent quotation mark style throughout
2. Proper dialogue formatting and clear speaker attribution
3. Rich, descriptive prose with varied sentence structure
4. Smooth transitions and natural pacing
5. No typos, grammatical errors, or inconsistencies
6. Engaging narrative that advances the plot
7. Well-developed character interactions and emotions

CHAPTER OUTLINE:
${outline}

${previousChapter ? `PREVIOUS CHAPTER CONTEXT:\n${previousChapter.slice(-500)}...` : ''}

Write a complete, polished chapter that meets all quality standards. Focus on:
- Vivid descriptions and atmospheric details
- Natural, believable dialogue
- Character development and emotional depth
- Proper chapter length and pacing (MUST be ${appliedStandards.chapterMinWords}+ words)
- Professional formatting with clear paragraph breaks
- Each new scene, dialogue exchange, or major action should start a new paragraph

CRITICAL FORMATTING REQUIREMENTS:
- Use double line breaks (\\n\\n) between ALL paragraphs
- Each new scene, dialogue exchange, or action MUST start a new paragraph
- Break up long descriptions - no paragraph should exceed 200 words
- Minimum 8-12 paragraphs per chapter
- Example format:
  Chapter 1
  
  First paragraph here with scene setting.
  
  Second paragraph with character action.
  
  "Dialogue here," character said.
  
  New paragraph for response or action.

Return ONLY the chapter content with strict paragraph formatting.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_completion_tokens: 16000 // Increased for longer chapters
      });

      let generatedContent = response.choices[0]?.message?.content || "";
      
      // Ensure proper paragraph formatting
      generatedContent = this.formatParagraphs(generatedContent);
      
      // Validate and enhance if needed
      const validation = await this.validateContent(generatedContent, standards);
      if (!validation.isValid) {
        console.log(`Chapter ${chapterNumber} validation issues:`, validation.issues);
        generatedContent = await this.enhanceChapterContent(generatedContent, chapterNumber, standards);
      }
      
      // Final paragraph formatting check
      return this.formatParagraphs(generatedContent);
    } catch (error) {
      console.error("Error generating enhanced chapter:", error);
      throw error;
    }
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  async fixCommonIssues(content: string): Promise<string> {
    const fixes = [
      // Standardize quotation marks to straight quotes
      [/[""]/g, '"'],
      [/['']/g, "'"],
      
      // Fix common dialogue formatting issues
      [/"\s*([A-Z])/g, '"$1'], // Remove space after opening quote
      [/([.!?])\s*"/g, '$1"'], // Remove space before closing quote
      
      // Fix chapter headings
      [/^chapter\s+(\d+)/gmi, 'Chapter $1'],
      
      // Fix double spaces
      [/\s{2,}/g, ' '],
      
      // Fix paragraph spacing
      [/\n{3,}/g, '\n\n'],
      
      // Common typo fixes
      [/\bteh\b/gi, 'the'],
      [/\brecieve\b/gi, 'receive'],
      [/\boccur\s+red\b/gi, 'occurred'],
    ];

    let fixedContent = content;
    for (const [pattern, replacement] of fixes) {
      fixedContent = fixedContent.replace(pattern as RegExp, replacement as string);
    }

    return fixedContent;
  }

  private formatParagraphs(content: string): string {
    // First, normalize line breaks and clean content
    let formatted = content
      .replace(/\r\n/g, '\n') // Normalize line breaks
      .replace(/\r/g, '\n')   // Handle old Mac line breaks
      .trim();

    // If content has no paragraph breaks at all, force them
    if (!formatted.includes('\n\n')) {
      // Split long content into paragraphs at natural break points
      formatted = formatted
        .replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2') // Period + capital letter
        .replace(/("\s*[.!?])\s+([A-Z])/g, '$1\n\n$2') // Quoted dialogue endings
        .replace(/([.!?])\s+(He |She |They |It |The |A |An )/g, '$1\n\n$2') // Common sentence starters
        .replace(/\n{3,}/g, '\n\n'); // Clean up excessive breaks
    }

    // Split into paragraphs and clean up
    const paragraphs = formatted
      .split('\n\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    // If still too few paragraphs for the content length, force more breaks
    if (paragraphs.length < 3 && formatted.length > 1000) {
      const sentences = formatted.split(/([.!?])\s+/).filter(s => s.trim());
      const newParagraphs = [];
      let currentParagraph = '';
      
      for (let i = 0; i < sentences.length; i += 2) {
        const sentence = (sentences[i] + (sentences[i + 1] || '')).trim();
        if (sentence) {
          currentParagraph += (currentParagraph ? ' ' : '') + sentence;
          
          // Start new paragraph every 2-4 sentences or 200+ words
          if ((i % 6 === 4) || currentParagraph.split(' ').length > 200) {
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
}