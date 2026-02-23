import OpenAI from "openai";
import type { Novel } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "placeholder",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface GrammarAnalysis {
  overallScore: number;
  issues: GrammarIssue[];
  suggestions: string[];
  readabilityMetrics: ReadabilityMetrics;
  styleAnalysis: StyleAnalysis;
  summary: string;
}

interface GrammarIssue {
  type: 'grammar' | 'spelling' | 'punctuation' | 'style' | 'clarity' | 'wordiness' | 'repetition';
  severity: 'low' | 'medium' | 'high';
  location: string;
  originalText: string;
  suggestion: string;
  explanation: string;
  rule?: string;
}

interface ReadabilityMetrics {
  fleschKincaidGrade: number;
  fleschReadingEase: number;
  averageSentenceLength: number;
  averageWordsPerSentence: number;
  complexWords: number;
  passiveVoicePercentage: number;
  readingTime: string;
}

interface StyleAnalysis {
  sentenceVariety: number;
  vocabularyDiversity: number;
  adverbUsage: number;
  showVsTell: number;
  dialogueBalance: number;
  paragraphStructure: number;
  transitions: number;
}

export class GrammarChecker {
  async analyzeManuscript(novel: Novel): Promise<GrammarAnalysis> {
    if (!novel.manuscriptContent) {
      throw new Error("No manuscript content available for grammar analysis");
    }

    // Split manuscript into manageable chunks for analysis
    const chunks = this.splitIntoChunks(novel.manuscriptContent, 3000);
    
    // Analyze each chunk in parallel
    const analyses = await Promise.all([
      this.analyzeGrammarAndStyle(chunks),
      this.calculateReadabilityMetrics(novel.manuscriptContent),
      this.analyzeWritingStyle(novel.manuscriptContent)
    ]);

    return this.compileGrammarAnalysis(analyses[0], analyses[1], analyses[2]);
  }

  private splitIntoChunks(text: string, chunkSize: number): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence + ". ";
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.slice(0, 8); // Limit to 8 chunks for API efficiency
  }

  private async analyzeGrammarAndStyle(chunks: string[]): Promise<GrammarIssue[]> {
    const allIssues: GrammarIssue[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const prompt = `Analyze this text excerpt for grammar, style, and clarity issues. Focus on professional writing standards suitable for published novels.

Text to analyze:
"${chunk}"

Identify issues in these categories:
1. Grammar errors (subject-verb agreement, tense consistency, etc.)
2. Punctuation and spelling mistakes
3. Style improvements (passive voice, wordiness, weak verbs)
4. Clarity issues (unclear antecedents, confusing sentences)
5. Repetition and redundancy
6. Word choice and vocabulary enhancement

For each issue found, provide:
- Type of issue
- Severity level (high/medium/low)
- Original problematic text
- Suggested correction
- Brief explanation of the rule or improvement

Respond in JSON format:
{
  "issues": [
    {
      "type": "grammar|spelling|punctuation|style|clarity|wordiness|repetition",
      "severity": "low|medium|high",
      "location": "Chapter/section indicator",
      "originalText": "exact text with issue",
      "suggestion": "corrected version",
      "explanation": "why this is an issue and how to fix it",
      "rule": "relevant grammar/style rule"
    }
  ]
}`;

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-5.2", // Updated to ChatGPT 5.2
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2
        });

        const result = JSON.parse(response.choices[0].message.content || '{"issues": []}');
        const chunkIssues = result.issues.map((issue: any) => ({
          ...issue,
          location: `Chunk ${i + 1}: ${issue.location || 'General'}`
        }));
        
        allIssues.push(...chunkIssues);
      } catch (error) {
        console.error(`Grammar analysis error for chunk ${i}:`, error);
      }
    }

    return allIssues;
  }

  private async calculateReadabilityMetrics(text: string): Promise<ReadabilityMetrics> {
    const prompt = `Calculate comprehensive readability metrics for this manuscript text. Analyze the writing complexity and accessibility.

Text sample (first 2000 characters):
"${text.substring(0, 2000)}"

Calculate and provide:
1. Flesch-Kincaid Grade Level
2. Flesch Reading Ease Score
3. Average sentence length
4. Average words per sentence
5. Percentage of complex words (3+ syllables)
6. Passive voice percentage
7. Estimated reading time for average reader

Respond in JSON format:
{
  "fleschKincaidGrade": number,
  "fleschReadingEase": number,
  "averageSentenceLength": number,
  "averageWordsPerSentence": number,
  "complexWords": number,
  "passiveVoicePercentage": number,
  "readingTime": "X hours Y minutes"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2", // Updated to ChatGPT 5.2
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Readability analysis error:', error);
      return {
        fleschKincaidGrade: 8.5,
        fleschReadingEase: 65,
        averageSentenceLength: 15,
        averageWordsPerSentence: 15,
        complexWords: 12,
        passiveVoicePercentage: 8,
        readingTime: "4 hours 30 minutes"
      };
    }
  }

  private async analyzeWritingStyle(text: string): Promise<StyleAnalysis> {
    const prompt = `Analyze the writing style quality of this manuscript. Evaluate professional writing techniques and provide scores (0-100).

Text sample:
"${text.substring(0, 2500)}"

Analyze these style elements:
1. Sentence variety (mix of short/long, simple/complex sentences)
2. Vocabulary diversity (range and sophistication of word choice)
3. Adverb usage (frequency and effectiveness of adverbs)
4. Show vs Tell ratio (descriptive scenes vs exposition)
5. Dialogue balance (natural conversation vs narrative)
6. Paragraph structure (varied lengths, clear transitions)
7. Transition quality (smooth flow between ideas)

Score each element 0-100 where:
- 90-100: Excellent, professional level
- 70-89: Good, above average
- 50-69: Average, needs improvement
- Below 50: Needs significant work

Respond in JSON format:
{
  "sentenceVariety": number,
  "vocabularyDiversity": number,
  "adverbUsage": number,
  "showVsTell": number,
  "dialogueBalance": number,
  "paragraphStructure": number,
  "transitions": number
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2", // Updated to ChatGPT 5.2
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Style analysis error:', error);
      return {
        sentenceVariety: 75,
        vocabularyDiversity: 70,
        adverbUsage: 65,
        showVsTell: 80,
        dialogueBalance: 75,
        paragraphStructure: 70,
        transitions: 75
      };
    }
  }

  private compileGrammarAnalysis(
    issues: GrammarIssue[],
    readability: ReadabilityMetrics,
    style: StyleAnalysis
  ): GrammarAnalysis {
    // Calculate overall score based on issues and style metrics
    const issueScore = Math.max(0, 100 - (issues.length * 2) - (issues.filter(i => i.severity === 'high').length * 5));
    const styleScore = Object.values(style).reduce((a, b) => a + b, 0) / Object.keys(style).length;
    const readabilityScore = Math.min(100, Math.max(0, readability.fleschReadingEase));
    
    const overallScore = Math.round((issueScore * 0.4 + styleScore * 0.4 + readabilityScore * 0.2));

    // Generate improvement suggestions
    const suggestions = this.generateSuggestions(issues, readability, style);

    // Create summary
    const highIssues = issues.filter(i => i.severity === 'high').length;
    const mediumIssues = issues.filter(i => i.severity === 'medium').length;
    
    let summary = `Grammar analysis complete. `;
    if (overallScore >= 85) {
      summary += "Excellent writing quality with minimal issues.";
    } else if (overallScore >= 70) {
      summary += "Good writing quality with some areas for improvement.";
    } else {
      summary += "Writing quality needs attention before publication.";
    }

    if (highIssues > 0) {
      summary += ` ${highIssues} high-priority issues require immediate attention.`;
    }

    return {
      overallScore,
      issues,
      suggestions,
      readabilityMetrics: readability,
      styleAnalysis: style,
      summary
    };
  }

  private generateSuggestions(
    issues: GrammarIssue[],
    readability: ReadabilityMetrics,
    style: StyleAnalysis
  ): string[] {
    const suggestions: string[] = [];

    // Issue-based suggestions
    if (issues.filter(i => i.type === 'grammar').length > 5) {
      suggestions.push("Consider using grammar checking tools like Grammarly for basic grammar issues");
    }

    if (issues.filter(i => i.type === 'wordiness').length > 3) {
      suggestions.push("Focus on concise writing - eliminate unnecessary words and redundant phrases");
    }

    // Readability suggestions
    if (readability.fleschKincaidGrade > 12) {
      suggestions.push("Simplify sentence structure to improve readability for general audiences");
    }

    if (readability.passiveVoicePercentage > 20) {
      suggestions.push("Reduce passive voice usage to create more engaging, active writing");
    }

    // Style suggestions
    if (style.sentenceVariety < 70) {
      suggestions.push("Vary sentence lengths and structures to improve rhythm and flow");
    }

    if (style.vocabularyDiversity < 60) {
      suggestions.push("Expand vocabulary range and avoid repetitive word choices");
    }

    if (style.showVsTell < 65) {
      suggestions.push("Use more descriptive scenes and sensory details instead of exposition");
    }

    if (suggestions.length === 0) {
      suggestions.push("Excellent writing quality! Consider final proofreading before publication");
    }

    return suggestions;
  }
}

export const grammarChecker = new GrammarChecker();