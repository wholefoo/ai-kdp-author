import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "placeholder",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface ReadabilityMetrics {
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  averageSentenceLength: number;
  averageWordsPerSentence: number;
  averageSyllablesPerWord: number;
  passiveVoicePercentage: number;
  adverbPercentage: number;
  complexWordsPercentage: number;
}

export interface ReadabilityAnalysis {
  overallScore: number; // 0-100
  metrics: ReadabilityMetrics;
  readingLevel: string;
  targetAudience: string;
  strengths: string[];
  issues: Array<{
    type: 'sentence_length' | 'vocabulary' | 'passive_voice' | 'adverbs' | 'clarity' | 'flow';
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
    examples?: string[];
  }>;
  aiSuggestions: string[];
  estimatedReadingTime: number;
  wordCount: number;
}

export class ReadabilityService {
  
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  private calculateFleschReadingEase(avgSentenceLength: number, avgSyllablesPerWord: number): number {
    return 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  }

  private calculateFleschKincaidGrade(avgSentenceLength: number, avgSyllablesPerWord: number): number {
    return (0.39 * avgSentenceLength) + (11.8 * avgSyllablesPerWord) - 15.59;
  }

  private getReadingLevel(score: number): string {
    if (score >= 90) return "Very Easy (5th grade)";
    if (score >= 80) return "Easy (6th grade)";
    if (score >= 70) return "Fairly Easy (7th grade)";
    if (score >= 60) return "Standard (8th-9th grade)";
    if (score >= 50) return "Fairly Difficult (10th-12th grade)";
    if (score >= 30) return "Difficult (College level)";
    return "Very Difficult (Graduate level)";
  }

  private getTargetAudience(gradeLevel: number): string {
    if (gradeLevel <= 6) return "Elementary/Middle School";
    if (gradeLevel <= 9) return "High School";
    if (gradeLevel <= 13) return "College";
    return "Graduate/Professional";
  }

  private isPassiveVoice(sentence: string): boolean {
    const passiveIndicators = [
      /\b(was|were|is|are|am|be|been|being)\s+\w*ed\b/gi,
      /\b(was|were|is|are|am|be|been|being)\s+\w*en\b/gi
    ];
    return passiveIndicators.some(pattern => pattern.test(sentence));
  }

  private isComplexWord(word: string): boolean {
    return this.countSyllables(word) >= 3;
  }

  private countAdverbs(text: string): number {
    const adverbPattern = /\b\w+ly\b/gi;
    return (text.match(adverbPattern) || []).length;
  }

  async analyzeReadability(text: string): Promise<ReadabilityAnalysis> {
    // Basic text processing
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const wordCount = words.length;
    const sentenceCount = sentences.length;

    if (wordCount === 0 || sentenceCount === 0) {
      throw new Error("Text is too short for readability analysis");
    }

    // Calculate basic metrics
    const avgSentenceLength = wordCount / sentenceCount;
    const totalSyllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
    const avgSyllablesPerWord = totalSyllables / wordCount;
    
    // Calculate readability scores
    const fleschReadingEase = this.calculateFleschReadingEase(avgSentenceLength, avgSyllablesPerWord);
    const fleschKincaidGrade = this.calculateFleschKincaidGrade(avgSentenceLength, avgSyllablesPerWord);
    
    // Calculate additional metrics
    const passiveSentences = sentences.filter(s => this.isPassiveVoice(s)).length;
    const passiveVoicePercentage = (passiveSentences / sentenceCount) * 100;
    
    const adverbCount = this.countAdverbs(text);
    const adverbPercentage = (adverbCount / wordCount) * 100;
    
    const complexWords = words.filter(word => this.isComplexWord(word)).length;
    const complexWordsPercentage = (complexWords / wordCount) * 100;

    const metrics: ReadabilityMetrics = {
      fleschReadingEase: Math.round(fleschReadingEase * 10) / 10,
      fleschKincaidGrade: Math.round(fleschKincaidGrade * 10) / 10,
      averageSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      averageWordsPerSentence: Math.round(avgSentenceLength * 10) / 10,
      averageSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
      passiveVoicePercentage: Math.round(passiveVoicePercentage * 10) / 10,
      adverbPercentage: Math.round(adverbPercentage * 10) / 10,
      complexWordsPercentage: Math.round(complexWordsPercentage * 10) / 10
    };

    // Identify issues and generate suggestions
    const issues = this.identifyIssues(metrics, sentences, words);
    const strengths = this.identifyStrengths(metrics);
    
    // Calculate overall score (0-100)
    let overallScore = Math.max(0, Math.min(100, fleschReadingEase));
    
    // Adjust score based on other factors
    if (passiveVoicePercentage > 20) overallScore -= 10;
    if (adverbPercentage > 5) overallScore -= 5;
    if (avgSentenceLength > 25) overallScore -= 10;
    if (complexWordsPercentage > 15) overallScore -= 5;
    
    overallScore = Math.max(0, Math.round(overallScore));

    // Get AI-powered suggestions
    const aiSuggestions = await this.getAISuggestions(text, metrics, issues);

    return {
      overallScore,
      metrics,
      readingLevel: this.getReadingLevel(fleschReadingEase),
      targetAudience: this.getTargetAudience(fleschKincaidGrade),
      strengths,
      issues,
      aiSuggestions,
      estimatedReadingTime: Math.ceil(wordCount / 250), // 250 words per minute
      wordCount
    };
  }

  private identifyIssues(metrics: ReadabilityMetrics, sentences: string[], words: string[]) {
    const issues = [];

    // Sentence length issues
    if (metrics.averageSentenceLength > 25) {
      issues.push({
        type: 'sentence_length' as const,
        severity: 'high' as const,
        description: 'Sentences are too long on average',
        suggestion: 'Break long sentences into shorter ones. Aim for 15-20 words per sentence.',
        examples: sentences.filter(s => s.split(' ').length > 30).slice(0, 2)
      });
    } else if (metrics.averageSentenceLength > 20) {
      issues.push({
        type: 'sentence_length' as const,
        severity: 'medium' as const,
        description: 'Some sentences could be shorter',
        suggestion: 'Consider breaking some longer sentences for better flow.'
      });
    }

    // Passive voice issues
    if (metrics.passiveVoicePercentage > 25) {
      issues.push({
        type: 'passive_voice' as const,
        severity: 'high' as const,
        description: 'Excessive use of passive voice',
        suggestion: 'Convert passive voice to active voice for more engaging writing. Aim for less than 10% passive voice.'
      });
    } else if (metrics.passiveVoicePercentage > 15) {
      issues.push({
        type: 'passive_voice' as const,
        severity: 'medium' as const,
        description: 'Moderate use of passive voice',
        suggestion: 'Reduce passive voice usage for more direct and engaging prose.'
      });
    }

    // Adverb overuse
    if (metrics.adverbPercentage > 5) {
      issues.push({
        type: 'adverbs' as const,
        severity: 'medium' as const,
        description: 'Overuse of adverbs',
        suggestion: 'Replace adverbs with stronger verbs. Show actions rather than describing them.'
      });
    }

    // Complex vocabulary
    if (metrics.complexWordsPercentage > 20) {
      issues.push({
        type: 'vocabulary' as const,
        severity: 'medium' as const,
        description: 'High percentage of complex words',
        suggestion: 'Consider simpler alternatives for some complex words to improve accessibility.'
      });
    }

    // Reading ease
    if (metrics.fleschReadingEase < 30) {
      issues.push({
        type: 'clarity' as const,
        severity: 'high' as const,
        description: 'Text is very difficult to read',
        suggestion: 'Simplify sentence structure and vocabulary for broader accessibility.'
      });
    } else if (metrics.fleschReadingEase < 50) {
      issues.push({
        type: 'clarity' as const,
        severity: 'medium' as const,
        description: 'Text is somewhat difficult to read',
        suggestion: 'Consider simplifying some sentences and word choices.'
      });
    }

    return issues;
  }

  private identifyStrengths(metrics: ReadabilityMetrics): string[] {
    const strengths = [];

    if (metrics.fleschReadingEase >= 70) {
      strengths.push("Excellent readability - accessible to a wide audience");
    }
    
    if (metrics.averageSentenceLength >= 15 && metrics.averageSentenceLength <= 20) {
      strengths.push("Well-balanced sentence length");
    }
    
    if (metrics.passiveVoicePercentage <= 10) {
      strengths.push("Good use of active voice");
    }
    
    if (metrics.adverbPercentage <= 3) {
      strengths.push("Appropriate use of adverbs");
    }
    
    if (metrics.complexWordsPercentage <= 10) {
      strengths.push("Accessible vocabulary");
    }

    if (strengths.length === 0) {
      strengths.push("Text shows potential for improvement with targeted revisions");
    }

    return strengths;
  }

  private async getAISuggestions(text: string, metrics: ReadabilityMetrics, issues: any[]): Promise<string[]> {
    try {
      const prompt = `As a professional editor, analyze this text sample and provide 3-5 specific, actionable suggestions to improve readability.

Current metrics:
- Flesch Reading Ease: ${metrics.fleschReadingEase}
- Average sentence length: ${metrics.averageSentenceLength} words
- Passive voice: ${metrics.passiveVoicePercentage}%
- Complex words: ${metrics.complexWordsPercentage}%

Main issues identified: ${issues.map(i => i.description).join(', ')}

Text sample (first 500 words):
${text.substring(0, 2000)}

Provide specific, actionable suggestions that focus on:
1. Sentence structure improvements
2. Word choice optimizations
3. Flow and clarity enhancements
4. Engagement techniques

Format as bullet points, each starting with an action verb.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 800
      });

      const suggestions = response.choices[0]?.message?.content || "";
      return suggestions.split('\n')
        .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        .map(line => line.replace(/^[•\-\d\.]\s*/, '').trim())
        .filter(suggestion => suggestion.length > 20)
        .slice(0, 5);
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
      return [
        "Vary sentence length to create rhythm and maintain reader interest",
        "Replace weak verb-adverb combinations with stronger verbs",
        "Use active voice to create more direct and engaging prose",
        "Break complex ideas into digestible chunks with shorter sentences",
        "Choose specific, concrete words over abstract or complex terms"
      ];
    }
  }

  async improveReadability(text: string, targetLevel: 'elementary' | 'middle' | 'high' | 'college' = 'high'): Promise<string> {
    const analysis = await this.analyzeReadability(text);
    
    if (analysis.overallScore >= 70) {
      return text; // Already readable enough
    }

    const prompt = `Improve the readability of this text while maintaining its meaning and style. 

Target reading level: ${targetLevel} school
Current Flesch Reading Ease: ${analysis.metrics.fleschReadingEase}
Target Flesch Reading Ease: ${targetLevel === 'elementary' ? '80-90' : targetLevel === 'middle' ? '70-80' : targetLevel === 'high' ? '60-70' : '50-60'}

Key improvements needed:
${analysis.issues.map(issue => `- ${issue.description}: ${issue.suggestion}`).join('\n')}

Original text:
${text}

Provide the improved version that:
1. Reduces average sentence length
2. Simplifies complex vocabulary where appropriate
3. Converts passive voice to active voice
4. Maintains the original tone and meaning
5. Improves overall flow and clarity

Return only the improved text without explanations.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: Math.min(4000, text.length * 2)
      });

      return response.choices[0]?.message?.content || text;
    } catch (error) {
      console.error("Error improving readability:", error);
      return text;
    }
  }
}

export const readabilityService = new ReadabilityService();