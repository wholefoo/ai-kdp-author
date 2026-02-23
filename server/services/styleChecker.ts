import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface StyleAnalysis {
  overallScore: number;
  consistency: {
    voice: {
      score: number;
      issues: string[];
      recommendations: string[];
    };
    tone: {
      score: number;
      issues: string[];
      recommendations: string[];
    };
    style: {
      score: number;
      issues: string[];
      recommendations: string[];
    };
    pov: {
      score: number;
      issues: string[];
      recommendations: string[];
    };
  };
  writingMetrics: {
    averageSentenceLength: number;
    vocabularyLevel: string;
    readabilityScore: number;
    pacing: string;
  };
  styleSuggestions: Array<{
    type: "voice" | "tone" | "style" | "pov" | "pacing" | "vocabulary";
    severity: "low" | "medium" | "high";
    issue: string;
    suggestion: string;
    examples: string[];
  }>;
  strengthsAndWeaknesses: {
    strengths: string[];
    weaknesses: string[];
    improvementAreas: string[];
  };
}

export interface ManuscriptSection {
  id: string;
  title: string;
  content: string;
  chapter?: number;
  section?: string;
  wordCount: number;
}

export class StyleConsistencyService {
  async analyzeManuscriptStyle(
    sections: ManuscriptSection[],
    targetStyle?: {
      voice?: string;
      tone?: string;
      pov?: string;
      genre?: string;
    }
  ): Promise<StyleAnalysis> {
    const totalWords = sections.reduce((acc, section) => acc + section.wordCount, 0);
    const sampleText = this.extractRepresentativeSamples(sections, 3000); // Sample ~3000 words for analysis
    
    const analysisPrompt = `Analyze this manuscript for style and tone consistency. 

Total manuscript length: ${totalWords} words
Number of sections: ${sections.length}

${targetStyle ? `Target Style Parameters:
- Voice: ${targetStyle.voice || 'Not specified'}
- Tone: ${targetStyle.tone || 'Not specified'}
- POV: ${targetStyle.pov || 'Not specified'}
- Genre: ${targetStyle.genre || 'Not specified'}` : ''}

Sample text from manuscript:
${sampleText}

Analyze for:
1. Voice consistency (narrator's personality, speaking style, vocabulary choices)
2. Tone consistency (mood, attitude, emotional atmosphere)
3. Writing style consistency (sentence structure, paragraph flow, descriptive language)
4. Point of view consistency (1st/2nd/3rd person, perspective shifts)
5. Pacing and rhythm consistency
6. Vocabulary and register consistency

Provide specific examples of inconsistencies and actionable recommendations.

Respond in JSON format:
{
  "overallScore": number (1-100),
  "consistency": {
    "voice": {
      "score": number (1-100),
      "issues": ["specific voice inconsistency examples"],
      "recommendations": ["actionable suggestions"]
    },
    "tone": {
      "score": number (1-100),
      "issues": ["specific tone inconsistency examples"],
      "recommendations": ["actionable suggestions"]
    },
    "style": {
      "score": number (1-100),
      "issues": ["specific style inconsistency examples"],
      "recommendations": ["actionable suggestions"]
    },
    "pov": {
      "score": number (1-100),
      "issues": ["specific POV inconsistency examples"],
      "recommendations": ["actionable suggestions"]
    }
  },
  "writingMetrics": {
    "averageSentenceLength": number,
    "vocabularyLevel": "elementary|intermediate|advanced|sophisticated",
    "readabilityScore": number (1-100),
    "pacing": "slow|moderate|fast|varied"
  },
  "styleSuggestions": [
    {
      "type": "voice|tone|style|pov|pacing|vocabulary",
      "severity": "low|medium|high",
      "issue": "description of the issue",
      "suggestion": "specific recommendation",
      "examples": ["example text snippets showing the issue"]
    }
  ],
  "strengthsAndWeaknesses": {
    "strengths": ["writing strengths identified"],
    "weaknesses": ["areas needing improvement"],
    "improvementAreas": ["specific focus areas for enhancement"]
  }
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2", // Updated to ChatGPT 5.1
        messages: [{ role: "user", content: analysisPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Style analysis error:', error);
      throw new Error("Failed to analyze manuscript style");
    }
  }

  async checkSectionConsistency(
    previousSection: ManuscriptSection,
    currentSection: ManuscriptSection,
    targetStyle?: any
  ): Promise<{
    consistencyScore: number;
    transitions: {
      voice: boolean;
      tone: boolean;
      style: boolean;
      pov: boolean;
    };
    issues: string[];
    suggestions: string[];
  }> {
    const transitionPrompt = `Compare these two consecutive manuscript sections for style consistency:

Previous Section (${previousSection.title}):
${previousSection.content.slice(0, 1500)}

Current Section (${currentSection.title}):
${currentSection.content.slice(0, 1500)}

Check for smooth transitions and consistency in:
1. Narrative voice
2. Tone and mood
3. Writing style
4. Point of view
5. Character voice (if applicable)

Identify any jarring shifts or inconsistencies between sections.

Respond in JSON format:
{
  "consistencyScore": number (1-100),
  "transitions": {
    "voice": boolean,
    "tone": boolean,
    "style": boolean,
    "pov": boolean
  },
  "issues": ["specific consistency issues between sections"],
  "suggestions": ["recommendations for smoother transitions"]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2", // Updated to ChatGPT 5.1
        messages: [{ role: "user", content: transitionPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Section consistency check error:', error);
      throw new Error("Failed to check section consistency");
    }
  }

  async generateStyleGuide(
    sections: ManuscriptSection[],
    genre?: string
  ): Promise<{
    voice: {
      characteristics: string[];
      examples: string[];
      guidelines: string[];
    };
    tone: {
      primaryTone: string;
      secondaryTones: string[];
      moodGuidelines: string[];
    };
    style: {
      sentenceStructure: string;
      vocabularyLevel: string;
      descriptiveStyle: string;
      dialogueStyle: string;
    };
    consistency: {
      povGuidelines: string[];
      tenseForms: string[];
      characterVoiceNotes: string[];
    };
  }> {
    const sampleText = this.extractRepresentativeSamples(sections, 2500);
    
    const styleGuidePrompt = `Based on this manuscript sample, generate a comprehensive style guide for consistency:

Genre: ${genre || 'Not specified'}
Sample text:
${sampleText}

Create a detailed style guide that captures:
1. Narrative voice characteristics and patterns
2. Tone and mood patterns
3. Writing style preferences
4. Consistency guidelines for future writing

This guide should help maintain consistency throughout the manuscript and in future writing.

Respond in JSON format with specific, actionable guidelines.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2", // Updated to ChatGPT 5.1
        messages: [{ role: "user", content: styleGuidePrompt }],
        response_format: { type: "json_object" },
        temperature: 0.4
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Style guide generation error:', error);
      throw new Error("Failed to generate style guide");
    }
  }

  async suggestStyleImprovements(
    text: string,
    targetStyle: {
      voice?: string;
      tone?: string;
      pov?: string;
      genre?: string;
    }
  ): Promise<{
    improvedText: string;
    changes: Array<{
      original: string;
      improved: string;
      reason: string;
      type: string;
    }>;
    explanation: string;
  }> {
    const improvementPrompt = `Improve this text to better match the target style while maintaining its core content and meaning:

Target Style:
- Voice: ${targetStyle.voice || 'Not specified'}
- Tone: ${targetStyle.tone || 'Not specified'}  
- POV: ${targetStyle.pov || 'Not specified'}
- Genre: ${targetStyle.genre || 'Not specified'}

Original text:
${text}

Provide:
1. The improved version of the text
2. Specific changes made with explanations
3. Overall explanation of improvements

Focus on enhancing consistency while preserving the author's intent and story elements.

Respond in JSON format:
{
  "improvedText": "the enhanced version",
  "changes": [
    {
      "original": "original phrase/sentence",
      "improved": "improved version", 
      "reason": "explanation of why this change improves consistency",
      "type": "voice|tone|style|pov|pacing"
    }
  ],
  "explanation": "overall summary of improvements made"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2", // Updated to ChatGPT 5.1
        messages: [{ role: "user", content: improvementPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.5
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Style improvement error:', error);
      throw new Error("Failed to suggest style improvements");
    }
  }

  private extractRepresentativeSamples(sections: ManuscriptSection[], maxWords: number): string {
    const totalWords = sections.reduce((acc, section) => acc + section.wordCount, 0);
    
    if (totalWords <= maxWords) {
      return sections.map(s => `[${s.title}]\n${s.content}`).join('\n\n');
    }

    // Take samples from beginning, middle, and end
    const samplesPerSection = Math.floor(maxWords / sections.length / 3);
    let samples: string[] = [];

    sections.forEach(section => {
      const words = section.content.split(/\s+/);
      const beginning = words.slice(0, samplesPerSection).join(' ');
      const middle = words.slice(
        Math.floor(words.length / 2) - Math.floor(samplesPerSection / 2),
        Math.floor(words.length / 2) + Math.floor(samplesPerSection / 2)
      ).join(' ');
      const end = words.slice(-samplesPerSection).join(' ');

      samples.push(`[${section.title} - Beginning]\n${beginning}`);
      samples.push(`[${section.title} - Middle]\n${middle}`);
      samples.push(`[${section.title} - End]\n${end}`);
    });

    return samples.join('\n\n');
  }

  calculateReadabilityScore(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = this.countSyllables(text);

    if (sentences.length === 0 || words.length === 0) return 0;

    // Flesch Reading Ease Score
    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    
    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private countSyllables(text: string): number {
    const words = text.toLowerCase().match(/[a-z]+/g) || [];
    return words.reduce((total, word) => {
      // Simple syllable counting heuristic
      const vowels = word.match(/[aeiouy]+/g) || [];
      let syllableCount = vowels.length;
      if (word.endsWith('e')) syllableCount--;
      return total + Math.max(1, syllableCount);
    }, 0);
  }
}

export const styleConsistencyService = new StyleConsistencyService();