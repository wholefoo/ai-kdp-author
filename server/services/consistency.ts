import OpenAI from "openai";
import type { Novel, Outline } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface ConsistencyAnalysis {
  overallScore: number;
  issues: ConsistencyIssue[];
  strengths: string[];
  recommendations: string[];
  categories: {
    style: ConsistencyCategory;
    tone: ConsistencyCategory;
    voice: ConsistencyCategory;
    pacing: ConsistencyCategory;
    characterization: ConsistencyCategory;
  };
}

interface ConsistencyIssue {
  type: 'style' | 'tone' | 'voice' | 'pacing' | 'characterization';
  severity: 'low' | 'medium' | 'high';
  location: string;
  description: string;
  suggestion: string;
  examples?: string[];
}

interface ConsistencyCategory {
  score: number;
  description: string;
  issues: number;
  improvements: string[];
}

export class ConsistencyChecker {
  async analyzeManuscript(novel: Novel): Promise<ConsistencyAnalysis> {
    if (!novel.manuscriptContent) {
      throw new Error("No manuscript content available for analysis");
    }

    // Split manuscript into chapters for analysis
    const chapters = this.extractChapters(novel.manuscriptContent);
    
    // Analyze each category
    const [styleAnalysis, toneAnalysis, voiceAnalysis, pacingAnalysis, characterAnalysis] = await Promise.all([
      this.analyzeStyle(chapters, novel),
      this.analyzeTone(chapters, novel),
      this.analyzeVoice(chapters, novel),
      this.analyzePacing(chapters, novel),
      this.analyzeCharacterization(chapters, novel)
    ]);

    // Compile overall analysis
    return this.compileAnalysis(styleAnalysis, toneAnalysis, voiceAnalysis, pacingAnalysis, characterAnalysis);
  }

  private extractChapters(manuscript: string): string[] {
    // Split by chapter markers
    const chapterMarkers = /# Chapter \d+/gi;
    const chapters = manuscript.split(chapterMarkers).filter(chapter => chapter.trim().length > 100);
    return chapters.slice(1); // Remove content before first chapter
  }

  private async analyzeStyle(chapters: string[], novel: Novel): Promise<Partial<ConsistencyCategory & { issues: ConsistencyIssue[] }>> {
    const prompt = `Analyze the writing style consistency across these ${chapters.length} chapters. The intended style is "${novel.writingStyle || 'balanced'}".

Expected characteristics:
- Writing Style: ${novel.writingStyle || 'balanced'}
- Point of View: ${novel.pointOfView || 'third-person-limited'}
- Content Rating: ${novel.contentRating || 'pg-13'}

Sample chapters (first 3):
${chapters.slice(0, 3).map((chapter, i) => `Chapter ${i + 1}:\n${chapter.substring(0, 1000)}...`).join('\n\n')}

Analyze for:
1. Sentence structure consistency
2. Vocabulary level consistency
3. Descriptive language patterns
4. Dialogue style consistency
5. Narrative technique adherence

Respond in JSON format:
{
  "score": 0-100,
  "description": "brief assessment",
  "issues": [
    {
      "type": "style",
      "severity": "low|medium|high",
      "location": "Chapter X",
      "description": "specific issue",
      "suggestion": "how to fix",
      "examples": ["example text"]
    }
  ],
  "improvements": ["specific suggestions"]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2", // Updated to ChatGPT 5.2
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Style analysis error:', error);
      return { score: 75, description: "Analysis unavailable", issues: [], improvements: [] };
    }
  }

  private async analyzeTone(chapters: string[], novel: Novel): Promise<Partial<ConsistencyCategory & { issues: ConsistencyIssue[] }>> {
    const prompt = `Analyze the tone consistency across these chapters. The intended tone is "${novel.toneAndMood || 'adventurous'}".

Expected tone characteristics:
- Tone & Mood: ${novel.toneAndMood || 'adventurous'}
- Genre: ${novel.genre}
- Content Rating: ${novel.contentRating || 'pg-13'}

Sample chapters:
${chapters.slice(0, 3).map((chapter, i) => `Chapter ${i + 1}:\n${chapter.substring(0, 800)}...`).join('\n\n')}

Analyze for:
1. Emotional consistency
2. Mood transitions
3. Atmosphere maintenance
4. Genre-appropriate tone
5. Reader engagement level

Respond in JSON format with score, description, issues array, and improvements array.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2", // Updated to ChatGPT 5.2
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Tone analysis error:', error);
      return { score: 75, description: "Analysis unavailable", issues: [], improvements: [] };
    }
  }

  private async analyzeVoice(chapters: string[], novel: Novel): Promise<Partial<ConsistencyCategory & { issues: ConsistencyIssue[] }>> {
    const prompt = `Analyze narrative voice consistency across chapters.

Point of View: ${novel.pointOfView || 'third-person-limited'}
Writing Style: ${novel.writingStyle || 'balanced'}

Sample text:
${chapters.slice(0, 2).map((chapter, i) => `Chapter ${i + 1}:\n${chapter.substring(0, 1000)}...`).join('\n\n')}

Check for:
1. POV consistency (no perspective shifts)
2. Narrator voice consistency
3. Character voice distinctiveness
4. Internal monologue consistency
5. Narrative distance consistency

Respond in JSON format with score, description, issues array, and improvements array.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2", // Updated to ChatGPT 5.2
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Voice analysis error:', error);
      return { score: 75, description: "Analysis unavailable", issues: [], improvements: [] };
    }
  }

  private async analyzePacing(chapters: string[], novel: Novel): Promise<Partial<ConsistencyCategory & { issues: ConsistencyIssue[] }>> {
    const prompt = `Analyze pacing consistency across chapters.

Target chapter length: ~${novel.targetChapterLength || 2600} words
Genre: ${novel.genre}
Total chapters: ${novel.targetChapterCount}

Chapter lengths and content:
${chapters.slice(0, 4).map((chapter, i) => `Chapter ${i + 1} (${chapter.split(' ').length} words):\nOpening: ${chapter.substring(0, 300)}...\nClosing: ...${chapter.substring(chapter.length - 300)}`).join('\n\n')}

Analyze for:
1. Chapter length consistency
2. Scene transition smoothness
3. Tension building patterns
4. Action/reflection balance
5. Story progression rhythm

Respond in JSON format with score, description, issues array, and improvements array.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2", // Updated to ChatGPT 5.2
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Pacing analysis error:', error);
      return { score: 75, description: "Analysis unavailable", issues: [], improvements: [] };
    }
  }

  private async analyzeCharacterization(chapters: string[], novel: Novel): Promise<Partial<ConsistencyCategory & { issues: ConsistencyIssue[] }>> {
    const prompt = `Analyze character consistency across chapters.

Genre: ${novel.genre}
Point of View: ${novel.pointOfView || 'third-person-limited'}

Sample chapters:
${chapters.slice(0, 3).map((chapter, i) => `Chapter ${i + 1}:\n${chapter.substring(0, 1000)}...`).join('\n\n')}

Analyze for:
1. Character voice consistency
2. Personality trait consistency
3. Character development progression
4. Dialogue style consistency per character
5. Character motivation consistency

Respond in JSON format with score, description, issues array, and improvements array.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2", // Updated to ChatGPT 5.2
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Character analysis error:', error);
      return { score: 75, description: "Analysis unavailable", issues: [], improvements: [] };
    }
  }

  private compileAnalysis(
    style: any, 
    tone: any, 
    voice: any, 
    pacing: any, 
    character: any
  ): ConsistencyAnalysis {
    const allIssues = [
      ...(style.issues || []),
      ...(tone.issues || []),
      ...(voice.issues || []),
      ...(pacing.issues || []),
      ...(character.issues || [])
    ];

    const scores = [
      style.score || 75,
      tone.score || 75,
      voice.score || 75,
      pacing.score || 75,
      character.score || 75
    ];

    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    // Generate strengths and recommendations
    const strengths = [];
    const recommendations = [];

    if (overallScore >= 85) {
      strengths.push("Excellent overall consistency across all categories");
    }
    if (style.score >= 80) {
      strengths.push("Strong writing style consistency");
    }
    if (tone.score >= 80) {
      strengths.push("Well-maintained tone and mood");
    }

    if (overallScore < 70) {
      recommendations.push("Consider comprehensive manuscript revision focusing on consistency");
    }
    if (allIssues.filter(i => i.severity === 'high').length > 0) {
      recommendations.push("Address high-severity issues before publication");
    }

    return {
      overallScore,
      issues: allIssues,
      strengths,
      recommendations,
      categories: {
        style: {
          score: style.score || 75,
          description: style.description || "Style analysis completed",
          issues: (style.issues || []).length,
          improvements: style.improvements || []
        },
        tone: {
          score: tone.score || 75,
          description: tone.description || "Tone analysis completed",
          issues: (tone.issues || []).length,
          improvements: tone.improvements || []
        },
        voice: {
          score: voice.score || 75,
          description: voice.description || "Voice analysis completed",
          issues: (voice.issues || []).length,
          improvements: voice.improvements || []
        },
        pacing: {
          score: pacing.score || 75,
          description: pacing.description || "Pacing analysis completed",
          issues: (pacing.issues || []).length,
          improvements: pacing.improvements || []
        },
        characterization: {
          score: character.score || 75,
          description: character.description || "Character analysis completed",
          issues: (character.issues || []).length,
          improvements: character.improvements || []
        }
      }
    };
  }
}

export const consistencyChecker = new ConsistencyChecker();