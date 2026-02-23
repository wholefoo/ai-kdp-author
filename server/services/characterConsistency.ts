import OpenAI from 'openai';
import { aiService } from "./aiService";

// Updated to use unified AI service with GPT-5.1 primary and GPT-4o fallback
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface CharacterMention {
  name: string;
  chapter: number;
  context: string;
  description?: string;
  traits?: string[];
  relationships?: string[];
}

export interface CharacterInconsistency {
  characterName: string;
  type: 'physical_description' | 'personality' | 'background' | 'relationships' | 'name_variation' | 'behavioral';
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  locations: {
    chapter: number;
    context: string;
  }[];
  suggestion: string;
}

export interface CharacterConsistencyReport {
  totalCharacters: number;
  inconsistenciesFound: number;
  characters: {
    name: string;
    appearances: number;
    firstAppearance: number;
    lastAppearance: number;
    inconsistencies: CharacterInconsistency[];
  }[];
  overallScore: number; // 0-100
  recommendations: string[];
}

export class CharacterConsistencyService {
  async analyzeCharacterConsistency(
    chapters: string[],
    title?: string
  ): Promise<CharacterConsistencyReport> {
    try {
      console.log(`Analyzing character consistency across ${chapters.length} chapters`);

      // Step 1: Extract character mentions from all chapters
      const characterMentions = await this.extractCharacterMentions(chapters);

      // Step 2: Analyze inconsistencies
      const inconsistencies = await this.findInconsistencies(characterMentions);

      // Step 3: Generate comprehensive report
      const report = await this.generateConsistencyReport(
        characterMentions,
        inconsistencies,
        title
      );

      return report;
    } catch (error) {
      console.error('Error in character consistency analysis:', error);
      throw new Error('Failed to analyze character consistency');
    }
  }

  private async extractCharacterMentions(chapters: string[]): Promise<CharacterMention[]> {
    const allMentions: CharacterMention[] = [];

    for (let i = 0; i < chapters.length; i++) {
      const chapterContent = chapters[i];
      const chapterNum = i + 1;

      try {
        console.log(`Extracting characters from chapter ${chapterNum} with AI service (GPT-5.1 primary, GPT-4o fallback)...`);
        
        const aiResponse = await aiService.generateJSON({
          messages: [
            {
              role: 'system',
              content: `You are a literary analysis expert specializing in character tracking. Extract all character mentions from the given chapter, focusing on:

1. Character names (including nicknames, titles, variations)
2. Physical descriptions
3. Personality traits
4. Background information
5. Relationships with other characters
6. Notable actions or dialogue

Return a JSON object with a "mentions" array containing character mentions with this structure:
{
  "mentions": [
    {
      "name": "character name",
      "context": "relevant excerpt from text",
      "description": "physical description if mentioned",
      "traits": ["personality trait 1", "trait 2"],
      "relationships": ["relationship description"]
    }
  ]
}

Focus on named characters and significant unnamed characters (like "the old shopkeeper"). Ignore very minor mentions.`
            },
            {
              role: 'user',
              content: `Chapter ${chapterNum}:\n\n${chapterContent}`
            }
          ],
          maxTokens: 2000,
          temperature: 0.3
        });

        const mentions = aiResponse.mentions || aiResponse.characters || [];

        if (Array.isArray(mentions)) {
          for (const mention of mentions) {
            allMentions.push({
              ...mention,
              chapter: chapterNum
            });
          }
        }
      } catch (error) {
        console.error(`Error extracting characters from chapter ${chapterNum}:`, error);
        // Continue with other chapters even if one fails
      }
    }

    return allMentions;
  }

  private async findInconsistencies(mentions: CharacterMention[]): Promise<CharacterInconsistency[]> {
    // Group mentions by character name (handling variations)
    const characterGroups = this.groupCharacterMentions(mentions);
    const inconsistencies: CharacterInconsistency[] = [];

    for (const [characterName, characterMentions] of characterGroups.entries()) {
      if (characterMentions.length < 2) continue; // Need multiple mentions to find inconsistencies

      try {
        console.log(`Analyzing inconsistencies for ${characterName} with AI service (GPT-5.1 primary, GPT-4o fallback)...`);
        
        const aiResponse = await aiService.generateJSON({
          messages: [
            {
              role: 'system',
              content: `You are a literary editor specializing in character consistency. Analyze the following character mentions for inconsistencies in:

1. Physical appearance (height, hair color, eye color, age, etc.)
2. Personality traits
3. Background/history
4. Relationships with other characters
5. Name variations or spelling errors
6. Behavioral patterns

Rate severity as:
- minor: Small inconsistencies that don't affect story
- moderate: Noticeable inconsistencies that could confuse readers
- major: Significant contradictions that damage story credibility

Return a JSON object with an "inconsistencies" array containing:
{
  "inconsistencies": [
    {
      "type": "physical_description|personality|background|relationships|name_variation|behavioral",
      "severity": "minor|moderate|major",
      "description": "clear description of the inconsistency",
      "locations": [{"chapter": number, "context": "relevant text"}],
      "suggestion": "specific recommendation to fix"
    }
  ]
}

Return empty array [] if no inconsistencies found.`
            },
            {
              role: 'user',
              content: `Character: ${characterName}\n\nMentions:\n${characterMentions.map(m => 
                `Chapter ${m.chapter}: ${m.context}\n${m.description ? `Description: ${m.description}\n` : ''}${m.traits?.length ? `Traits: ${m.traits.join(', ')}\n` : ''}${m.relationships?.length ? `Relationships: ${m.relationships.join(', ')}\n` : ''}`
              ).join('\n---\n')}`
            }
          ],
          maxTokens: 1500,
          temperature: 0.3
        });

        const characterInconsistencies = aiResponse.inconsistencies || [];

        if (Array.isArray(characterInconsistencies)) {
          for (const inconsistency of characterInconsistencies) {
            inconsistencies.push({
              ...inconsistency,
              characterName
            });
          }
        }
      } catch (error) {
        console.error(`Error analyzing inconsistencies for ${characterName}:`, error);
      }
    }

    return inconsistencies;
  }

  private groupCharacterMentions(mentions: CharacterMention[]): Map<string, CharacterMention[]> {
    const groups = new Map<string, CharacterMention[]>();

    for (const mention of mentions) {
      // Normalize character name (handle variations)
      const normalizedName = this.normalizeCharacterName(mention.name);
      
      if (!groups.has(normalizedName)) {
        groups.set(normalizedName, []);
      }
      groups.get(normalizedName)!.push(mention);
    }

    return groups;
  }

  private normalizeCharacterName(name: string): string {
    // Basic normalization - could be enhanced with more sophisticated matching
    return name.toLowerCase()
      .replace(/\b(mr|mrs|ms|dr|prof|sir|lady|lord)\.\s*/gi, '')
      .replace(/['"]/g, '')
      .trim();
  }

  private async generateConsistencyReport(
    mentions: CharacterMention[],
    inconsistencies: CharacterInconsistency[],
    title?: string
  ): Promise<CharacterConsistencyReport> {
    const characterGroups = this.groupCharacterMentions(mentions);
    const characters = [];

    // Build character summary
    for (const [name, characterMentions] of characterGroups.entries()) {
      const characterInconsistencies = inconsistencies.filter(i => 
        this.normalizeCharacterName(i.characterName) === name
      );

      const chapters = characterMentions.map(m => m.chapter);
      
      characters.push({
        name: characterMentions[0].name, // Use original name format
        appearances: characterMentions.length,
        firstAppearance: Math.min(...chapters),
        lastAppearance: Math.max(...chapters),
        inconsistencies: characterInconsistencies
      });
    }

    // Calculate overall consistency score
    const totalInconsistencies = inconsistencies.length;
    const majorInconsistencies = inconsistencies.filter(i => i.severity === 'major').length;
    const moderateInconsistencies = inconsistencies.filter(i => i.severity === 'moderate').length;
    const minorInconsistencies = inconsistencies.filter(i => i.severity === 'minor').length;

    // Score: 100 - (major*10 + moderate*5 + minor*2), minimum 0
    const overallScore = Math.max(0, 100 - (majorInconsistencies * 10 + moderateInconsistencies * 5 + minorInconsistencies * 2));

    // Generate recommendations
    const recommendations = await this.generateRecommendations(inconsistencies, characters.length);

    return {
      totalCharacters: characters.length,
      inconsistenciesFound: totalInconsistencies,
      characters: characters.sort((a, b) => b.appearances - a.appearances), // Sort by most appearances
      overallScore,
      recommendations
    };
  }

  private async generateRecommendations(
    inconsistencies: CharacterInconsistency[],
    totalCharacters: number
  ): Promise<string[]> {
    if (inconsistencies.length === 0) {
      return [
        'Excellent character consistency throughout the story!',
        'All character descriptions and behaviors remain consistent.',
        'Consider creating a character style guide for future works.'
      ];
    }

    const recommendations = [];
    const majorIssues = inconsistencies.filter(i => i.severity === 'major');
    const moderateIssues = inconsistencies.filter(i => i.severity === 'moderate');

    if (majorIssues.length > 0) {
      recommendations.push(`Address ${majorIssues.length} major character inconsistencies immediately - these significantly impact story credibility.`);
    }

    if (moderateIssues.length > 0) {
      recommendations.push(`Review ${moderateIssues.length} moderate inconsistencies that may confuse readers.`);
    }

    // Add specific recommendations based on inconsistency types
    const physicalIssues = inconsistencies.filter(i => i.type === 'physical_description').length;
    const personalityIssues = inconsistencies.filter(i => i.type === 'personality').length;
    const nameIssues = inconsistencies.filter(i => i.type === 'name_variation').length;

    if (physicalIssues > 0) {
      recommendations.push('Create detailed physical description notes for each character to maintain consistency.');
    }

    if (personalityIssues > 0) {
      recommendations.push('Develop clear personality profiles and behavioral patterns for main characters.');
    }

    if (nameIssues > 0) {
      recommendations.push('Standardize character names and create a character name reference sheet.');
    }

    recommendations.push('Consider using character development worksheets to track character details.');
    recommendations.push('Review character arcs to ensure growth feels natural and consistent.');

    return recommendations;
  }
}