import OpenAI from "openai";
import { ManuscriptProcessor } from "./manuscriptProcessor";
import { aiService } from "./aiService";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ContentSection {
  id: string;
  type: 'chapter' | 'introduction' | 'outline' | 'characters' | 'notes';
  title: string;
  content: string;
}

interface NovelComposerOptions {
  title: string;
  genre: string;
  targetWordCount: number;
  targetChapters: number;
  sections: ContentSection[];
}

export class NovelComposerService {
  async analyzeSourceContent(sections: ContentSection[]): Promise<{
    analysis: string;
    keyElements: string[];
    suggestions: string[];
  }> {
    const contentSummary = sections.map(section => 
      `${section.type.toUpperCase()}: ${section.title}\n${section.content.substring(0, 500)}${section.content.length > 500 ? '...' : ''}`
    ).join('\n\n');

    try {
      console.log('Analyzing source content with AI service (GPT-5.1 primary, GPT-4o fallback)...');
      
      const result = await aiService.generateJSON({
        messages: [
          {
            role: "system",
            content: `You are an expert literary analyst and novel development assistant. Analyze the provided content sections and provide insights for novel generation.`
          },
          {
            role: "user",
            content: `Analyze this source content for novel development:\n\n${contentSummary}\n\nProvide:
1. A comprehensive analysis of the content
2. Key story elements identified
3. Suggestions for expanding into a full novel

Respond in JSON format:
{
  "analysis": "detailed analysis of the content",
  "keyElements": ["element1", "element2", "element3"],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}`
          }
        ]
      });
      return {
        analysis: result.analysis || "Unable to analyze content",
        keyElements: result.keyElements || [],
        suggestions: result.suggestions || []
      };
    } catch (error) {
      console.error("Error analyzing source content:", error);
      return {
        analysis: "Error analyzing content",
        keyElements: [],
        suggestions: []
      };
    }
  }

  async generateDetailedOutline(options: NovelComposerOptions): Promise<{
    premise: string;
    outline: Array<{
      chapter: number;
      title: string;
      summary: string;
      keyEvents: string[];
      wordCount: number;
    }>;
    characters: Array<{
      name: string;
      role: string;
      description: string;
    }>;
    themes: string[];
  }> {
    const sourceContent = options.sections.map(section => 
      `${section.type}: ${section.content}`
    ).join('\n\n');

    const avgWordsPerChapter = Math.round(options.targetWordCount / options.targetChapters);

    try {
      console.log('Generating detailed outline with AI service (GPT-5.1 primary, GPT-4o fallback)...');
      
      const result = await aiService.generateJSON({
        messages: [
          {
            role: "system",
            content: `You are a master storyteller and novel architect. Create a detailed, compelling outline for a ${options.genre} novel based on the provided source material.`
          },
          {
            role: "user",
            content: `Create a detailed outline for a ${options.genre} novel titled "${options.title}".

MANDATORY REQUIREMENTS:
- EXACTLY ${options.targetChapters} chapters (no more, no less)
- ${options.targetWordCount} words total
- Target ${avgWordsPerChapter} words per chapter

Source material to incorporate:
${sourceContent.substring(0, 8000)}${sourceContent.length > 8000 ? '...[truncated for API call]' : ''}

CRITICAL EXTENSION REQUIREMENTS (if this is a manuscript extension):
- If the source material contains existing chapters, this outline is for ADDITIONAL chapters only
- Extract and preserve ALL character names exactly as they appear in the source material
- Continue the story naturally from where the original manuscript ended
- Do NOT change any character names or major plot elements from the source

Create a comprehensive outline with:
1. An engaging premise that incorporates and continues the source material
2. Detailed chapter breakdown with titles, summaries, key events, and target word counts
3. Character profiles (PRESERVE existing character names exactly from source material)
4. Key themes that continue from the source material

CRITICAL: You MUST generate exactly ${options.targetChapters} chapters in the outline array. Number them 1 through ${options.targetChapters}.

Respond in JSON format:
{
  "premise": "compelling story premise that continues the source material",
  "outline": [
    ${Array.from({length: options.targetChapters}, (_, i) => `{
      "chapter": ${i + 1},
      "title": "chapter ${i + 1} title",
      "summary": "chapter ${i + 1} summary",
      "keyEvents": ["event1", "event2"],
      "wordCount": ${avgWordsPerChapter}
    }`).join(',\n    ')}
  ],
  "characters": [
    {
      "name": "character name (PRESERVE exact names from source if extending)",
      "role": "protagonist/antagonist/supporting",
      "description": "character description"
    }
  ],
  "themes": ["theme1", "theme2"]
}`
          }
        ]
      });

      // Ensure all outline entries have required fields
      const sanitizedOutline = (result.outline || []).map((chapter: any, index: number) => ({
        chapter: chapter.chapter || (index + 1),
        title: chapter.title || `Chapter ${index + 1}`,
        summary: chapter.summary || `Chapter ${index + 1} content`,
        keyEvents: Array.isArray(chapter.keyEvents) ? chapter.keyEvents : ['Continue the story'],
        wordCount: chapter.wordCount || Math.round(options.targetWordCount / options.targetChapters)
      }));

      return {
        premise: result.premise || `A ${options.genre} novel`,
        outline: sanitizedOutline,
        characters: result.characters || [],
        themes: result.themes || []
      };
    } catch (error) {
      console.error("Error generating outline:", error);
      throw new Error("Failed to generate novel outline");
    }
  }

  async generateChapter(
    chapterInfo: {
      chapter: number;
      title: string;
      summary: string;
      keyEvents: string[];
      wordCount: number;
    },
    novelContext: {
      title: string;
      genre: string;
      premise: string;
      characters: Array<{ name: string; role: string; description: string; }>;
      previousChapters?: string[];
      isExtension?: boolean;
      originalChapterCount?: number;
    }
  ): Promise<string> {
    const actualChapterNumber = novelContext.isExtension ? 
      (novelContext.originalChapterCount || 0) + chapterInfo.chapter : 
      chapterInfo.chapter;
      
    const contextInfo = [
      `Novel: ${novelContext.title} (${novelContext.genre})`,
      `Premise: ${novelContext.premise}`,
      `Characters: ${novelContext.characters.map(c => `${c.name} (${c.role}): ${c.description}`).join('; ')}`,
      novelContext.previousChapters ? `Previous chapters context: ${novelContext.previousChapters.join(' ')}` : ''
    ].filter(Boolean).join('\n');

    try {
      console.log(`Generating Chapter ${actualChapterNumber} with AI service (GPT-5.1 primary, GPT-4o fallback)...`);
      
      const response = await aiService.generateContent({
        messages: [
          {
            role: "system",
            content: `You are a professional novelist writing a ${novelContext.genre} novel. Write engaging, well-crafted chapters that advance the story and develop characters naturally. ${novelContext.isExtension ? 'CRITICAL: This is an extension - maintain absolute consistency with character names and established plot elements from the source material.' : ''}`
          },
          {
            role: "user",
            content: `${contextInfo}

Write Chapter ${actualChapterNumber}: "${chapterInfo.title}"

Chapter requirements:
- Summary: ${chapterInfo.summary}
- Key events to include: ${chapterInfo.keyEvents?.join(', ') || 'Continue the story naturally'}
- Target word count: ${chapterInfo.wordCount} words (±100 words acceptable)
- Write in third person past tense
- Include dialogue, character development, and vivid descriptions
- Ensure the chapter flows naturally and advances the overall story
${novelContext.isExtension ? `- CRITICAL: Use exact character names from source material - do not change any names
- Continue naturally from the existing story without contradictions
- Maintain absolute consistency with established character names and plot elements` : ''}

Write the complete chapter with:
- Proper chapter heading: # Chapter ${actualChapterNumber}: ${chapterInfo.title}
- Rich narrative with dialogue, descriptions, and character development
- Natural chapter ending that leads to the next chapter

Format as markdown with the chapter heading followed by the chapter content.`
          }
        ],
        maxTokens: Math.min(4000, Math.round(chapterInfo.wordCount * 1.2)),
      });

      return response.content || '';
    } catch (error) {
      console.error(`Error generating chapter ${chapterInfo.chapter}:`, error);
      throw new Error(`Failed to generate chapter ${chapterInfo.chapter}`);
    }
  }

  async generateSpecialSections(options: {
    sourceContent: string;
    type: 'upload' | 'plot';
    title: string;
    genre: string;
    sections: ('introduction' | 'prologue' | 'epilogue' | 'sample-dedication' | 'sample-acknowledgments' | '10-book-titles' | 'kdp-metadata' | 'table-of-contents' | 'about-the-author')[];
    fileBuffer?: Buffer;
  }): Promise<{
    introduction?: string;
    prologue?: string;
    epilogue?: string;
    'sample-dedication'?: string;
    'sample-acknowledgments'?: string;
    '10-book-titles'?: string;
    'kdp-metadata'?: string;
    'table-of-contents'?: string;
    'about-the-author'?: string;
  }> {
    const results: any = {};

    for (const sectionType of options.sections) {
      try {
        const content = await this.generateSpecialSection({
          sourceContent: options.sourceContent,
          type: options.type,
          sectionType,
          title: options.title,
          genre: options.genre,
          fileBuffer: options.fileBuffer
        });
        results[sectionType] = content;
      } catch (error) {
        console.error(`Error generating ${sectionType}:`, error);
        results[sectionType] = `Error generating ${sectionType}`;
      }
    }

    return results;
  }

  private async generateSpecialSection(options: {
    sourceContent: string;
    type: 'upload' | 'plot';
    sectionType: 'introduction' | 'prologue' | 'epilogue' | 'sample-dedication' | 'sample-acknowledgments' | '10-book-titles' | 'kdp-metadata' | 'table-of-contents' | 'about-the-author';
    title: string;
    genre: string;
    fileBuffer?: Buffer;
  }): Promise<string> {
    const isManuscript = options.type === 'upload';
    const sectionInstructions = this.getSpecialSectionInstructions(options.sectionType, isManuscript);

    // For table of contents, try to detect actual page numbers
    let pageNumbers: { [chapterNumber: number]: number } = {};
    if (options.sectionType === 'table-of-contents' && options.fileBuffer) {
      try {
        const manuscriptProcessor = new ManuscriptProcessor();
        pageNumbers = await manuscriptProcessor.extractChapterPageNumbers(options.fileBuffer);
        console.log('Detected page numbers:', pageNumbers);
      } catch (error) {
        console.error('Error detecting page numbers:', error);
      }
    }

    try {
      console.log(`Generating ${options.sectionType} with AI service (GPT-5.1 primary, GPT-4o fallback)...`);
      
      const response = await aiService.generateContent({
        messages: [
          {
            role: "system",
            content: `You are a professional author specializing in ${options.genre} literature. You excel at crafting compelling ${options.sectionType}s that perfectly complement the main narrative.`
          },
          {
            role: "user",
            content: `${isManuscript ? 'Based on this manuscript:' : 'Based on this plot description:'}

Title: "${options.title}"
Genre: ${options.genre}

${isManuscript ? 'MANUSCRIPT CONTENT:' : 'PLOT DESCRIPTION:'}
${options.sectionType === 'table-of-contents' 
  ? options.sourceContent
  : options.sourceContent.substring(0, 12000) + (options.sourceContent.length > 12000 ? '...[truncated]' : '')}

${options.sectionType === 'table-of-contents' && Object.keys(pageNumbers).length > 0 
  ? `\nDETECTED PAGE NUMBERS FOR CHAPTERS:\n${Object.entries(pageNumbers).map(([ch, page]) => `Chapter ${ch}: Page ${page}`).join('\n')}\n\nUse these detected page numbers in your output.\n`
  : ''}

${sectionInstructions}

Write a compelling ${options.sectionType} that:
- Fits perfectly with the ${options.genre} genre
- ${isManuscript ? 'Complements the existing manuscript' : 'Sets up the plot described'}
- ${options.sectionType === 'sample-dedication' ? 'Is very brief (1-3 sentences)' : 
   options.sectionType === 'sample-acknowledgments' ? 'Is 200-400 words' : 
   options.sectionType === '10-book-titles' ? 'Provides exactly 10 titles' :
   options.sectionType === 'kdp-metadata' ? 'Includes complete metadata sections' :
   options.sectionType === 'about-the-author' ? 'Is 100-200 words' :
   'Is approximately 500-800 words'}
- Uses professional, engaging prose
- ${options.sectionType === 'prologue' ? 'Sets the stage for the main story' : 
   options.sectionType === 'introduction' ? 'Introduces the world and tone' : 
   'Provides satisfying closure and reflection'}

${options.sectionType === 'table-of-contents' 
  ? 'Return ONLY the chapter listings in plain text with no markdown formatting, no headers, no additional text.'
  : `Format as clean markdown with a heading: # ${options.sectionType.charAt(0).toUpperCase() + options.sectionType.slice(1)}`}`
          }
        ],
        maxTokens: options.sectionType === 'table-of-contents' ? 3000 : options.sectionType === '10-book-titles' || options.sectionType === 'kdp-metadata' ? 2000 : 1200,
      });

      return response.content || '';
    } catch (error) {
      console.error(`Error generating ${options.sectionType}:`, error);
      throw new Error(`Failed to generate ${options.sectionType}`);
    }
  }

  private getSpecialSectionInstructions(sectionType: string, isManuscript: boolean): string {
    const base = isManuscript ? 'existing manuscript' : 'described plot';
    
    switch (sectionType) {
      case 'prologue':
        return `Create a prologue that sets the stage for the ${base}. This should:
- Establish the world, atmosphere, or historical context
- Introduce key themes or conflicts
- Hook the reader with intrigue or compelling setup
- ${isManuscript ? 'Chronologically precede or provide context for the manuscript events' : 'Lead naturally into the main plot'}`;
        
      case 'introduction':
        return `Write an introduction that welcomes readers to the story world. This should:
- Establish the tone and genre expectations
- Introduce the setting and atmosphere
- ${isManuscript ? 'Seamlessly lead into the existing narrative' : 'Set up the characters and world described in the plot'}
- Create immediate engagement and immersion`;
        
      case 'epilogue':
        return `Craft an epilogue that provides closure and reflection. This should:
- ${isManuscript ? 'Continue from where the manuscript ends' : 'Conclude the story arc described in the plot'}
- Show the aftermath or long-term consequences
- Provide emotional resolution for characters
- Leave readers with a sense of completion and satisfaction`;

      case 'sample-dedication':
        return `Create a professional book dedication. This should:
- Be personal and heartfelt but appropriate for publication
- Be brief (1-3 sentences or phrases)
- Reference the genre and theme of the work
- Sound authentic and meaningful
- Include formatting suggestions (centered, italicized text)`;

      case 'sample-acknowledgments':
        return `Write professional acknowledgments for the book. This should:
- Thank appropriate people (editors, beta readers, family, etc.)
- Be gracious and professional
- Be 200-400 words
- Include standard publishing acknowledgments
- Mention inspiration for the work if relevant
- Express genuine gratitude without being overly personal`;

      case '10-book-titles':
        return `Generate 10 alternative book titles for this ${isManuscript ? 'manuscript' : 'story concept'}. Each title should:
- Be directly inspired by key themes, characters, or plot elements from the content
- Use engaging, thought-provoking language that sparks curiosity
- Follow current trending patterns in book titles (mysterious phrases, emotional hooks, intriguing questions)
- Appeal to modern readers with contemporary phrasing
- Vary in style: some mysterious/atmospheric, some emotional/personal, some action-oriented
- Be memorable and distinctive in the marketplace
- Consider commercial appeal for the genre
- Be formatted as a clean numbered list (1-10)`;

      case 'kdp-metadata':
        return `Create complete Amazon KDP metadata for this book. Include:
- Compelling book description (150-300 words) that hooks readers
- Relevant keywords and categories for the genre
- Suggested book series information if applicable
- Target age range and content warnings if needed
- Comparison to similar successful books
- Marketing taglines and selling points
- Format as sections with clear headers`;

      case 'table-of-contents':
        return `Extract ALL chapters from this manuscript. Use this EXACT format with NO additional text:

REQUIRED FORMAT (copy exactly):
Chapter 1: [Title Only] ..................... [number]
Chapter 2: [Title Only] ..................... [number]
Chapter 3: [Title Only] ..................... [number]

STRICT REQUIREMENTS:
- Find ALL chapters in the manuscript (scan from beginning to absolute end)
- Extract ONLY the chapter title - NO summaries, NO descriptions, NO explanations
- Use the provided page numbers from the analysis (if available)
- Use ONLY the page number (no "Page " prefix)
- Do NOT include any other text, content, or sections

CRITICAL: This manuscript likely contains 50 chapters. You must scan the ENTIRE document to find every single chapter title and use the provided page numbers.`;

      case 'about-the-author':
        return `Write a professional "About the Author" section. This should:
- Be written in third person
- Be 100-200 words
- Include relevant writing credentials or experience
- Mention connection to the genre
- Include personal details that relate to the work
- Be suitable for book back covers and marketing
- Sound professional yet approachable
- Include a placeholder for author photo mention`;
        
      default:
        return 'Create compelling content that enhances the overall narrative.';
    }
  }

  countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}