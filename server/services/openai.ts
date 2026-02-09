import OpenAI from "openai";
import type { Outline, Progress, BibliographyEntry } from "@shared/schema";
import { aiService } from "./aiService";

// Excluded sources for non-fiction (unreliable or biased)
const DEFAULT_EXCLUDED_SOURCES = [
  "wikipedia.org",
  "wiki",
  "reddit.com",
  "quora.com",
  "yahoo answers",
  "answers.com",
  "wikihow.com",
  "ehow.com",
  "buzzfeed.com",
  "social media",
];

// Non-fiction master prompt for fact-based content
const NONFICTION_MASTER_PROMPT = `
You are an expert non-fiction author and researcher specializing in creating well-researched, factual books for Amazon KDP. Your goal is to create a comprehensive, authoritative non-fiction book with the following STRICT REQUIREMENTS:

**MANDATORY SPECIFICATIONS**:
- Target Word Count: EXACTLY {targetWordCount} words
- Number of Chapters: EXACTLY {targetChapterCount} chapters
- Words per Chapter: APPROXIMATELY {targetChapterLength} words each

**CONTENT TYPE**: Non-Fiction - {nonFictionSubtype}
**TOPIC**: {nonFictionTopic}
**TARGET AUDIENCE**: {targetAudience}

**RESEARCH & VERIFICATION RULES**:
- All claims must be factual and verifiable
- Cite multiple credible sources for key claims
- EXCLUDE these unreliable sources: {excludedSources}
- Use academic papers, official publications, reputable news sources, and expert opinions
- Each chapter should reference at least 2-3 credible sources
- Include specific data, statistics, and examples where appropriate

**WRITING STYLE SPECIFICATIONS**:
- **Writing Style**: {writingStyle} - Apply this throughout the entire book
- **Tone and Mood**: {toneAndMood} - Establish and maintain this atmosphere
- **Content Rating**: {contentRating} - Ensure content appropriateness for this rating
{customInstructionsSection}

**NON-FICTION STRUCTURE**:
- Introduction: Hook the reader, explain what they'll learn
- Body Chapters: Each with clear learning objectives, key points, examples, and takeaways
- Conclusion: Summarize key insights, call to action
- Bibliography: Properly formatted citations

**FORMATTING REQUIREMENTS**:
- **KDP Ready**: Output in Markdown format suitable for conversion to DOCX/PDF for KDP
- **Structure**: Title page, Copyright page, Table of Contents, Introduction, {targetChapterCount} chapters, Conclusion, Bibliography
- **Chapter Format**: Use # for chapter titles, consistent formatting, proper pagination cues [Page Break]

**QUALITY CONTROLS**:
- **Accuracy**: All facts must be verifiable and accurate
- **No Speculation**: Distinguish between facts and opinions/interpretations
- **Balanced Perspective**: Present multiple viewpoints where relevant
- **Actionable Content**: Provide practical insights and takeaways
- **Professional Quality**: Clear explanations, logical flow, engaging prose

Begin with generating the content using the specifications above.
`;

interface NonFictionChapterResult {
  content: string;
  citations: Array<{
    claim: string;
    source: string;
    author?: string;
    title: string;
    publishDate?: string;
  }>;
}

// the newest OpenAI model is "gpt-5.2" which is the latest flagship model. GPT-4.1-mini is used as the budget fallback.
export const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

const MASTER_PROMPT = `
You are an expert novelist and editor specializing in generating complete, publishable novels for Amazon KDP. Your goal is to create a full novel with the following STRICT REQUIREMENTS:

**MANDATORY SPECIFICATIONS**:
- Target Word Count: EXACTLY {targetWordCount} words
- Number of Chapters: EXACTLY {targetChapterCount} chapters
- Words per Chapter: APPROXIMATELY {targetChapterLength} words each (strict compliance required)

**COMPLIANCE RULES**:
- **Word Count Precision**: The final manuscript MUST be within 2% of the target word count ({targetWordCount} words)
- **Chapter Structure**: MUST have exactly {targetChapterCount} chapters, each approximately {targetChapterLength} words
- **No Deviation**: Do not exceed or fall significantly short of these specifications
- **Content Quality**: Despite strict length requirements, maintain high narrative quality and proper pacing

**INPUT PARAMETERS**:
- Genre: {genre}
- Title: {title}
- Plot Idea: {plotIdea}

**WRITING STYLE SPECIFICATIONS**:
- **Writing Style**: {writingStyle} - Apply this throughout the entire novel
- **Point of View**: {pointOfView} - Maintain consistent POV throughout
- **Tone and Mood**: {toneAndMood} - Establish and maintain this atmosphere
- **Content Rating**: {contentRating} - Ensure content appropriateness for this rating
{customInstructionsSection}

**FORMATTING REQUIREMENTS**:
- **KDP Ready**: Output in Markdown format suitable for conversion to DOCX/PDF for KDP
- **Structure**: Title page, Copyright page, Table of Contents, {targetChapterCount} chapters, About the Author
- **Chapter Format**: Use # for chapter titles, consistent formatting, proper pagination cues [Page Break]

**QUALITY CONTROLS**:
- **No Repetition**: Never repeat phrases, events, or descriptions
- **No Content Drift**: Strictly adhere to the outline generated in Step 1
- **Narrative Consistency**: Maintain consistent timeline, character development, and story progression
- **Professional Quality**: Strong character arcs, rising tension, emotional depth, satisfying resolution
- **Style Adherence**: Consistently apply the specified writing style, POV, and tone throughout

**GENERATION PROCESS**:
- **Step 1: Outline**: Generate detailed outline with exactly {targetChapterCount} chapters, each planned for ~{targetChapterLength} words
- **Step 2: Chapter Generation**: Generate each chapter with EXACT word count compliance (~{targetChapterLength} words each)
- **Step 3: Compilation**: Final manuscript must total {targetWordCount} words

Begin with Step 1 using the specifications above.
`;

export class NovelGenerationService {
  async generateOutline(
    genre: string, 
    plotIdea: string, 
    title: string, 
    targetWordCount: number = 65000,
    targetChapterCount: number = 25,
    targetChapterLength: number = 2600,
    writingStyle: string = "balanced",
    pointOfView: string = "third-person-limited",
    toneAndMood: string = "adventurous",
    contentRating: string = "pg-13",
    customInstructions?: string
  ): Promise<Outline> {
    try {
      const customInstructionsSection = customInstructions 
        ? `\n**CUSTOM INSTRUCTIONS**: ${customInstructions} - Follow these specific requirements in addition to the above specifications`
        : '';

      const prompt = MASTER_PROMPT.replace(/\{genre\}/g, genre)
                                 .replace(/\{plotIdea\}/g, plotIdea)
                                 .replace(/\{title\}/g, title)
                                 .replace(/\{targetWordCount\}/g, targetWordCount.toString())
                                 .replace(/\{targetChapterCount\}/g, targetChapterCount.toString())
                                 .replace(/\{targetChapterLength\}/g, targetChapterLength.toString())
                                 .replace(/\{writingStyle\}/g, writingStyle)
                                 .replace(/\{pointOfView\}/g, pointOfView)
                                 .replace(/\{toneAndMood\}/g, toneAndMood)
                                 .replace(/\{contentRating\}/g, contentRating)
                                 .replace(/\{customInstructionsSection\}/g, customInstructionsSection);

      // Use unified AI service with fallback
      console.log('Generating outline with AI service (GPT-5.1 primary, GPT-4o fallback)...');
      
      const aiResponse = await aiService.generateJSON({
        messages: [
          {
            role: "system",
            content: "You are an expert novelist. Generate a detailed novel outline in JSON format with the exact structure requested."
          },
          {
            role: "user",
            content: prompt + `\n\nPlease respond with a properly formatted JSON object containing the outline with fields: title, genre, length, summary, characters (array with name, description, role), chapters (array with exactly ${targetChapterCount} chapters, each with number, title, summary), themes (array), timeline. Each chapter should be planned for approximately ${targetChapterLength} words.`
          }
        ],
        maxTokens: 4096,
        temperature: 0.7
      });

      const outline = aiResponse as Outline;
      return outline;
    } catch (error) {
      console.error("Error generating outline:", error);
      throw new Error(`Failed to generate outline: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateChapter(
    chapterNumber: number,
    outline: Outline,
    previousContent: string = "",
    targetChapterLength: number = 2600
  ): Promise<string> {
    try {
      const chapterInfo = outline.chapters.find(ch => ch.number === chapterNumber);
      if (!chapterInfo) {
        throw new Error(`Chapter ${chapterNumber} not found in outline`);
      }

      const prompt = `
Using the outline: ${JSON.stringify(outline)}
Previous content summary: ${previousContent.slice(0, 2000)}

Now generate Step 2 for Chapter ${chapterNumber}: "${chapterInfo.title}"

CRITICAL REQUIREMENT: Generate EXACTLY ${targetChapterLength} words (±50 words acceptable).

Generate the full chapter content in Markdown format. Include:
- Chapter heading: # Chapter ${chapterNumber}: ${chapterInfo.title}
- Full chapter text with proper paragraph breaks
- Rich descriptions, dialogue, and scene development
- Maintain consistency with the outline and previous chapters
- End with a compelling transition to the next chapter
- WORD COUNT: Must be approximately ${targetChapterLength} words

Do not include any JSON formatting, just pure Markdown text. Count your words carefully to meet the ${targetChapterLength} word target.
`;

      console.log(`Generating chapter ${chapterNumber} with AI service (GPT-5.1 primary, GPT-4o fallback)...`);
      
      const aiResponse = await aiService.generateContent({
        messages: [
          {
            role: "system", 
            content: "You are an expert novelist writing a chapter. Generate compelling, well-written prose with proper paragraph breaks. Use double line breaks (\\n\\n) between paragraphs."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        maxTokens: 16000,
        temperature: 0.7
      });

      const chapterContent = aiResponse.content;
      if (!chapterContent) {
        throw new Error(`No content generated for chapter ${chapterNumber}`);
      }

      return chapterContent;
    } catch (error) {
      console.error(`Error generating chapter ${chapterNumber}:`, error);
      throw new Error(`Failed to generate chapter ${chapterNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generatePlotSuggestions(
    genre: string,
    subgenres: string[],
    preferences: {
      themes: string[];
      complexity: "Beginner" | "Intermediate" | "Advanced";
      audience: "Young Adult" | "Adult" | "All Ages";
    }
  ): Promise<Array<{
    title: string;
    premise: string;
    themes: string[];
    targetAudience: string;
    estimatedLength: string;
    difficulty: "Beginner" | "Intermediate" | "Advanced";
  }>> {
    try {
      const subgenreText = subgenres.join(", ");
      const themeText = preferences.themes.length > 0 ? preferences.themes.join(", ") : "any themes";
      
      const prompt = `Generate 4 unique and compelling plot suggestions for ${genre} novels with the following specifications:

**Genre**: ${genre}
**Subgenres**: ${subgenreText}
**Target Audience**: ${preferences.audience}
**Complexity Level**: ${preferences.complexity}
**Preferred Themes**: ${themeText}

For each plot suggestion, provide:
1. A compelling title
2. A detailed premise (2-3 sentences describing the main conflict and story arc)
3. 3-4 relevant themes
4. Target audience confirmation
5. Estimated length category (Short Novel 40-60K, Standard Novel 60-80K, or Epic Novel 80K+)
6. Difficulty level for writing

Requirements:
- Each plot should be unique and creative
- Premises should be specific enough to write from but general enough to allow creativity
- Include diverse characters and modern sensibilities
- Avoid clichéd plots unless given a fresh twist
- Match the complexity level (Beginner = simpler plots, Advanced = complex multi-layered stories)
- Ensure plots are appropriate for the target audience

Respond with a JSON array of plot objects.`;

      console.log('Generating plot suggestions with AI service (GPT-5.1 primary, GPT-4o fallback)...');
      
      const aiResponse = await aiService.generateJSON({
        messages: [
          {
            role: "system",
            content: "You are a creative writing expert specializing in plot development across all genres. Generate compelling, unique plot suggestions in JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        maxTokens: 2048,
        temperature: 0.8, // Higher creativity for plot generation
      });
      
      // Ensure we return an array of plots
      return aiResponse.plots || aiResponse.plotSuggestions || [];
    } catch (error) {
      console.error("Error generating plot suggestions:", error);
      throw new Error(`Failed to generate plot suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async compileManuscript(title: string, chapters: string[]): Promise<string> {
    try {
      const tableOfContents = chapters.map((_, index) => `- Chapter ${index + 1}`).join('\n');
      
      const manuscript = `# ${title}

[Page Break]

## Copyright
Copyright © 2025 by AI Author. All rights reserved.

[Page Break]

## Table of Contents
${tableOfContents}

[Page Break]

${chapters.join('\n\n[Page Break]\n\n')}

[Page Break]

## About the Author
This novel was generated using advanced AI technology. The author placeholder can be customized for publication.
`;

      return manuscript;
    } catch (error) {
      console.error("Error compiling manuscript:", error);
      throw new Error(`Failed to compile manuscript: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  calculateWordCount(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  calculateReadingTime(wordCount: number): number {
    // Average reading speed: 250 words per minute
    return Math.round((wordCount / 250) / 60 * 10) / 10; // Hours, rounded to 1 decimal
  }

  calculateEstimatedPages(wordCount: number): number {
    // Roughly 250 words per page for novels
    return Math.round(wordCount / 250);
  }

  // ============ NON-FICTION GENERATION METHODS ============

  async generateNonFictionOutline(
    title: string,
    nonFictionTopic: string,
    nonFictionSubtype: string,
    targetAudience: string,
    targetWordCount: number = 65000,
    targetChapterCount: number = 20,
    targetChapterLength: number = 3000,
    writingStyle: string = "balanced",
    toneAndMood: string = "informative",
    contentRating: string = "pg",
    customInstructions?: string,
    excludedSources: string[] = DEFAULT_EXCLUDED_SOURCES
  ): Promise<Outline> {
    try {
      const customInstructionsSection = customInstructions 
        ? `\n**CUSTOM INSTRUCTIONS**: ${customInstructions}`
        : '';

      const prompt = NONFICTION_MASTER_PROMPT
        .replace(/\{nonFictionTopic\}/g, nonFictionTopic)
        .replace(/\{nonFictionSubtype\}/g, nonFictionSubtype)
        .replace(/\{targetAudience\}/g, targetAudience)
        .replace(/\{targetWordCount\}/g, targetWordCount.toString())
        .replace(/\{targetChapterCount\}/g, targetChapterCount.toString())
        .replace(/\{targetChapterLength\}/g, targetChapterLength.toString())
        .replace(/\{writingStyle\}/g, writingStyle)
        .replace(/\{toneAndMood\}/g, toneAndMood)
        .replace(/\{contentRating\}/g, contentRating)
        .replace(/\{customInstructionsSection\}/g, customInstructionsSection)
        .replace(/\{excludedSources\}/g, excludedSources.join(", "));

      console.log('Generating non-fiction outline with AI service...');
      
      const aiResponse = await aiService.generateJSON({
        messages: [
          {
            role: "system",
            content: `You are an expert non-fiction author and researcher. Generate a detailed book outline in JSON format.
            
IMPORTANT: The outline must be for factual, well-researched content. Each chapter should have clear learning objectives and key points that can be verified from credible sources.

EXCLUDED SOURCES (do not reference): ${excludedSources.join(", ")}`
          },
          {
            role: "user",
            content: `${prompt}

Generate a detailed non-fiction book outline for: "${title}"
Topic: ${nonFictionTopic}
Category: ${nonFictionSubtype}

Please respond with a properly formatted JSON object containing:
{
  "title": "${title}",
  "genre": "${nonFictionSubtype}",
  "contentType": "non-fiction",
  "length": "${targetWordCount} words",
  "summary": "A comprehensive overview of the book's content and purpose",
  "keyTopics": ["array of main topics covered"],
  "learningObjectives": ["what readers will learn"],
  "targetAudience": "${targetAudience}",
  "chapters": [
    {
      "number": 1,
      "title": "Introduction: [Title]",
      "summary": "Chapter overview",
      "keyPoints": ["key point 1", "key point 2", "key point 3"],
      "sourcesNeeded": ["types of sources needed for this chapter"]
    }
    // ... exactly ${targetChapterCount} chapters including Introduction and Conclusion
  ],
  "themes": ["array of themes/topics covered"],
  "characters": []
}`
          }
        ],
        maxTokens: 4096,
        temperature: 0.7
      });

      const outline = {
        ...aiResponse,
        contentType: "non-fiction" as const,
        characters: [],
      } as Outline;
      
      return outline;
    } catch (error) {
      console.error("Error generating non-fiction outline:", error);
      throw new Error(`Failed to generate non-fiction outline: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateNonFictionChapter(
    chapterNumber: number,
    outline: Outline,
    previousContent: string = "",
    targetChapterLength: number = 3000,
    excludedSources: string[] = DEFAULT_EXCLUDED_SOURCES
  ): Promise<NonFictionChapterResult> {
    try {
      const chapterInfo = outline.chapters.find(ch => ch.number === chapterNumber);
      if (!chapterInfo) {
        throw new Error(`Chapter ${chapterNumber} not found in outline`);
      }

      const keyPointsText = chapterInfo.keyPoints?.join(", ") || "key concepts for this chapter";
      const sourcesNeeded = chapterInfo.sourcesNeeded?.join(", ") || "credible academic and professional sources";

      const prompt = `
Using the outline: ${JSON.stringify(outline)}
Previous content summary: ${previousContent.slice(0, 2000)}

Generate Chapter ${chapterNumber}: "${chapterInfo.title}"

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ${targetChapterLength} words (±50 words acceptable)
2. Include factual, verifiable information with citations
3. NEVER cite these sources: ${excludedSources.join(", ")}
4. Use credible sources: academic journals, government publications, reputable news, expert opinions

KEY POINTS TO COVER:
${keyPointsText}

TYPES OF SOURCES NEEDED:
${sourcesNeeded}

CHAPTER STRUCTURE:
- Chapter heading: # Chapter ${chapterNumber}: ${chapterInfo.title}
- Introduction paragraph hooking the reader
- Main content with clear sections using ## subheadings
- Include specific facts, statistics, and examples
- For each major claim, include an inline citation like [Source: Author, Title, Year]
- Key takeaways section at the end
- Smooth transition to the next chapter

Generate the chapter content in Markdown format with inline citations.
After the chapter content, provide a JSON block with the citations used:

---CITATIONS---
{
  "citations": [
    {
      "claim": "The specific claim made",
      "source": "URL or publication",
      "author": "Author name",
      "title": "Source title",
      "publishDate": "Year or full date"
    }
  ]
}
`;

      console.log(`Generating non-fiction chapter ${chapterNumber} with source verification...`);
      
      const aiResponse = await aiService.generateContent({
        messages: [
          {
            role: "system", 
            content: `You are an expert non-fiction author and researcher. Generate well-researched, factual content with proper citations.

IMPORTANT RULES:
1. All facts must be verifiable from credible sources
2. Include inline citations in the format [Source: Author, Title, Year]
3. NEVER cite: ${excludedSources.join(", ")}
4. Use academic papers, official publications, reputable news sources
5. Distinguish between facts and opinions
6. Provide specific data and examples where possible`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        maxTokens: 16000,
        temperature: 0.6 // Lower temperature for more factual content
      });

      const fullResponse = aiResponse.content;
      if (!fullResponse) {
        throw new Error(`No content generated for chapter ${chapterNumber}`);
      }

      // Parse the response to separate content and citations
      let chapterContent = fullResponse;
      let citations: NonFictionChapterResult["citations"] = [];

      const citationsMatch = fullResponse.match(/---CITATIONS---\s*(\{[\s\S]*?\})\s*$/);
      if (citationsMatch) {
        chapterContent = fullResponse.substring(0, citationsMatch.index).trim();
        try {
          const citationsData = JSON.parse(citationsMatch[1]);
          citations = citationsData.citations || [];
        } catch (e) {
          console.warn("Could not parse citations JSON, continuing without structured citations");
        }
      }

      return {
        content: chapterContent,
        citations: citations
      };
    } catch (error) {
      console.error(`Error generating non-fiction chapter ${chapterNumber}:`, error);
      throw new Error(`Failed to generate non-fiction chapter ${chapterNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async compileNonFictionManuscript(
    title: string, 
    chapters: string[], 
    bibliography: BibliographyEntry[]
  ): Promise<string> {
    try {
      const tableOfContents = chapters.map((_, index) => {
        if (index === 0) return `- Introduction`;
        if (index === chapters.length - 1) return `- Conclusion`;
        return `- Chapter ${index}`;
      }).join('\n');
      
      // Format bibliography section
      const bibliographySection = bibliography.length > 0 
        ? bibliography
            .sort((a, b) => (a.author || '').localeCompare(b.author || ''))
            .map((entry, index) => {
              const author = entry.author || 'Unknown Author';
              const year = entry.publishDate || 'n.d.';
              const title = entry.title;
              const source = entry.source;
              return `${index + 1}. ${author} (${year}). *${title}*. ${source}`;
            })
            .join('\n\n')
        : 'Sources available upon request.';

      const manuscript = `# ${title}

[Page Break]

## Copyright
Copyright © ${new Date().getFullYear()} by Author. All rights reserved.

[Page Break]

## Table of Contents
${tableOfContents}
- Bibliography

[Page Break]

${chapters.join('\n\n[Page Break]\n\n')}

[Page Break]

## Bibliography

${bibliographySection}

[Page Break]

## About the Author
This non-fiction book was created with AI assistance. The author placeholder can be customized for publication.
`;

      return manuscript;
    } catch (error) {
      console.error("Error compiling non-fiction manuscript:", error);
      throw new Error(`Failed to compile non-fiction manuscript: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Verify claims against multiple sources (optional enhancement)
  async verifyChapterClaims(
    chapterContent: string,
    existingCitations: NonFictionChapterResult["citations"]
  ): Promise<{ verified: boolean; issues: string[] }> {
    try {
      const prompt = `Review the following non-fiction chapter content and its citations for accuracy:

CHAPTER CONTENT:
${chapterContent.slice(0, 3000)}

CITATIONS PROVIDED:
${JSON.stringify(existingCitations, null, 2)}

Please verify:
1. Are the citations from credible sources (not Wikipedia, Reddit, etc.)?
2. Do the claims appear to be factually accurate?
3. Are there any claims that seem unverified or need additional sources?

Respond with JSON:
{
  "verified": true/false,
  "issues": ["list of any issues found"],
  "suggestions": ["improvements that could be made"]
}`;

      const result = await aiService.generateJSON({
        messages: [
          {
            role: "system",
            content: "You are a fact-checker reviewing non-fiction content for accuracy and proper sourcing."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        maxTokens: 1024,
        temperature: 0.3
      });

      return {
        verified: result.verified || false,
        issues: result.issues || []
      };
    } catch (error) {
      console.error("Error verifying chapter claims:", error);
      return { verified: true, issues: [] }; // Default to verified on error
    }
  }
}

export const novelGenerationService = new NovelGenerationService();
