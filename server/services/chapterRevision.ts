import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface RevisionOptions {
  type: 'dialogue' | 'descriptions' | 'pacing' | 'plot_holes' | 'general';
  intensity: 'light' | 'moderate' | 'heavy';
  focusAreas: string[];
  customInstructions?: string;
  genre?: string;
}

export interface RevisionResult {
  originalText: string;
  revisedText: string;
  changes: string[];
  suggestions: string[];
  confidence: number;
}

export class ChapterRevisionService {
  
  async reviseChapter(chapterText: string, options: RevisionOptions): Promise<RevisionResult> {
    const systemPrompt = this.buildSystemPrompt(options);
    const userPrompt = this.buildUserPrompt(chapterText, options);

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });

      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from AI service');
      }

      return this.parseRevisionResponse(chapterText, responseText);
    } catch (error) {
      console.error('Chapter revision error:', error);
      throw new Error('Failed to revise chapter: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private buildSystemPrompt(options: RevisionOptions): string {
    const { type, intensity, focusAreas, genre } = options;
    
    let systemPrompt = `You are a professional book editor with expertise in improving fiction manuscripts. Your task is to revise a chapter while maintaining the author's voice and story flow.

REVISION TYPE: ${this.getRevisionTypeDescription(type)}
INTENSITY LEVEL: ${intensity} - ${this.getIntensityDescription(intensity)}`;

    if (genre) {
      systemPrompt += `\nGENRE: ${genre} - Apply genre-appropriate conventions and expectations.`;
    }

    if (focusAreas.length > 0) {
      systemPrompt += `\nFOCUS AREAS: Pay special attention to: ${focusAreas.join(', ')}`;
    }

    systemPrompt += `

IMPORTANT GUIDELINES:
- Preserve the original plot points and character motivations
- Maintain consistency with established characters and world-building
- Keep the same narrative perspective (POV)
- Preserve dialogue attribution and character voices
- Do not add new plot elements or characters unless fixing plot holes
- Focus on improving writing quality, not changing the story

RESPONSE FORMAT:
Provide your response in this exact JSON structure:
{
  "revisedText": "The complete revised chapter text here",
  "changes": ["List of specific changes made", "Another change description"],
  "suggestions": ["Additional improvement suggestions", "Future writing tips"],
  "confidence": 85
}

The confidence score should be 1-100 based on how much the revision improves the original text.`;

    return systemPrompt;
  }

  private buildUserPrompt(chapterText: string, options: RevisionOptions): string {
    let prompt = `Please revise the following chapter text according to the specified guidelines:

ORIGINAL CHAPTER:
${chapterText}`;

    if (options.customInstructions) {
      prompt += `\n\nCUSTOM INSTRUCTIONS:
${options.customInstructions}`;
    }

    prompt += `\n\nPlease provide the revised chapter along with a summary of changes made and suggestions for future improvement.`;

    return prompt;
  }

  private getRevisionTypeDescription(type: RevisionOptions['type']): string {
    const descriptions = {
      dialogue: 'Improve character conversations, speech patterns, and dialogue tags',
      descriptions: 'Enhance scene setting, character descriptions, and sensory details',
      pacing: 'Balance action, dialogue, and narrative flow for better story rhythm',
      plot_holes: 'Address inconsistencies, logical gaps, and continuity issues',
      general: 'Overall writing quality improvement including prose, clarity, and engagement'
    };
    return descriptions[type];
  }

  private getIntensityDescription(intensity: RevisionOptions['intensity']): string {
    const descriptions = {
      light: 'Minor improvements, preserving most of the original text structure',
      moderate: 'Balanced changes that improve quality while maintaining the original style',
      heavy: 'Significant revisions for substantial improvement, may restructure paragraphs'
    };
    return descriptions[intensity];
  }

  private parseRevisionResponse(originalText: string, response: string): RevisionResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.revisedText || !Array.isArray(parsed.changes)) {
        throw new Error('Invalid response format');
      }

      return {
        originalText,
        revisedText: parsed.revisedText,
        changes: parsed.changes || [],
        suggestions: parsed.suggestions || [],
        confidence: Math.max(1, Math.min(100, parsed.confidence || 75))
      };

    } catch (error) {
      console.error('Failed to parse revision response:', error);
      
      // Fallback: treat the entire response as revised text
      return {
        originalText,
        revisedText: response,
        changes: ['AI revision applied - manual review recommended'],
        suggestions: ['Please review the revision manually for quality'],
        confidence: 50
      };
    }
  }

  // Utility method to analyze chapter for potential improvements
  async analyzeChapter(chapterText: string, genre?: string): Promise<{
    suggestions: string[];
    issues: string[];
    strengths: string[];
  }> {
    const systemPrompt = `You are a professional manuscript editor. Analyze the following chapter and provide:
1. Issues that need attention
2. Strengths to preserve
3. Specific improvement suggestions

Focus on: dialogue quality, pacing, descriptions, character consistency, and plot flow.
${genre ? `Consider this is a ${genre} novel.` : ''}

Respond in JSON format:
{
  "issues": ["List of issues found"],
  "strengths": ["List of strengths to preserve"],
  "suggestions": ["Specific improvement suggestions"]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: chapterText }
        ],
        temperature: 0.5,
        max_tokens: 1000
      });

      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No analysis response');
      }

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          issues: parsed.issues || [],
          strengths: parsed.strengths || [],
          suggestions: parsed.suggestions || []
        };
      }

      // Fallback parsing
      return {
        issues: ['Analysis could not be parsed properly'],
        strengths: ['Manual review recommended'],
        suggestions: ['Consider professional editing review']
      };

    } catch (error) {
      console.error('Chapter analysis error:', error);
      return {
        issues: ['Analysis failed - please try again'],
        strengths: [],
        suggestions: ['Consider manual review of this chapter']
      };
    }
  }
}

export const chapterRevisionService = new ChapterRevisionService();