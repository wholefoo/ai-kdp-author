import OpenAI from "openai";
import type { Character } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface CharacterSuggestions {
  physicalDescription: string;
  personality: string;
  backstory: string;
  motivation: string;
  goals: string;
  fears: string;
  quirks: string;
  voiceAndSpeech: string;
  characterArc: CharacterArc;
  relationships: CharacterRelationship[];
}

interface CharacterArc {
  startingPoint: string;
  incitingIncident: string;
  midpointCrisis: string;
  climax: string;
  resolution: string;
  characterGrowth: string;
}

interface CharacterRelationship {
  characterName: string;
  relationshipType: string;
  description: string;
  dynamics: string;
  conflictPoints?: string;
}

interface CharacterAnalysis {
  consistencyScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  arcAssessment: string;
  relationshipAnalysis: string;
}

export class CharacterDevelopmentService {
  async generateCharacterProfile(
    name: string,
    role: string,
    genre: string,
    basicInfo?: Partial<Character>
  ): Promise<CharacterSuggestions> {
    const prompt = `Create a comprehensive character profile for a ${genre} novel. Generate detailed information for a ${role} character named "${name}".

${basicInfo ? `Existing information to build upon:
- Age: ${basicInfo.age || 'Not specified'}
- Gender: ${basicInfo.gender || 'Not specified'}
- Occupation: ${basicInfo.occupation || 'Not specified'}
- Basic description: ${basicInfo.physicalDescription || 'Not provided'}
` : ''}

Create a rich, multi-dimensional character with:

1. Physical Description: Detailed appearance including distinctive features, build, mannerisms
2. Personality: Core traits, contradictions, emotional patterns, behavioral tendencies
3. Backstory: Key formative experiences, family background, education, past relationships
4. Motivation: What drives them, internal and external motivations
5. Goals: Short-term and long-term objectives, both stated and hidden
6. Fears: Deep-seated fears, phobias, insecurities that create vulnerability
7. Quirks: Unique habits, speech patterns, mannerisms that make them memorable
8. Voice and Speech: How they speak, vocabulary level, accent, verbal tics
9. Character Arc: Their journey from beginning to end of the story
10. Relationships: Suggested connections to other character types

Ensure the character is:
- Authentic and relatable despite any extraordinary circumstances
- Internally consistent with believable contradictions
- Appropriate for the ${genre} genre
- Has clear potential for growth and conflict

Respond in JSON format:
{
  "physicalDescription": "detailed description",
  "personality": "complex personality profile",
  "backstory": "compelling background story",
  "motivation": "driving forces and desires",
  "goals": "specific objectives and aspirations",
  "fears": "vulnerabilities and insecurities",
  "quirks": "memorable habits and mannerisms",
  "voiceAndSpeech": "how they communicate",
  "characterArc": {
    "startingPoint": "where they begin",
    "incitingIncident": "what sets their journey in motion",
    "midpointCrisis": "major challenge or revelation",
    "climax": "ultimate test or confrontation",
    "resolution": "how they end up",
    "characterGrowth": "how they've changed"
  },
  "relationships": [
    {
      "characterName": "suggested character type/name",
      "relationshipType": "mentor/rival/love interest/family/etc",
      "description": "nature of relationship",
      "dynamics": "how they interact",
      "conflictPoints": "potential sources of tension"
    }
  ]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2", // Updated to ChatGPT 5.2
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.8
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Character generation error:', error);
      throw new Error("Failed to generate character profile");
    }
  }

  async analyzeCharacterConsistency(character: Character): Promise<CharacterAnalysis> {
    const prompt = `Analyze this character for consistency, depth, and narrative potential. Evaluate their development as a fictional character.

Character Information:
Name: ${character.name}
Role: ${character.role}
Age: ${character.age || 'Not specified'}
Occupation: ${character.occupation || 'Not specified'}

Physical Description: ${character.physicalDescription || 'Not provided'}
Personality: ${character.personality || 'Not provided'}
Backstory: ${character.backstory || 'Not provided'}
Motivation: ${character.motivation || 'Not provided'}
Goals: ${character.goals || 'Not provided'}
Fears: ${character.fears || 'Not provided'}
Quirks: ${character.quirks || 'Not provided'}
Voice/Speech: ${character.voiceAndSpeech || 'Not provided'}

Character Arc: ${character.characterArc ? JSON.stringify(character.characterArc) : 'Not provided'}
Relationships: ${character.relationships ? JSON.stringify(character.relationships) : 'Not provided'}

Analyze for:
1. Internal consistency - do all elements work together logically?
2. Character depth - is this a multi-dimensional character?
3. Narrative potential - will this character drive compelling story?
4. Character arc viability - does their journey make sense?
5. Relationship dynamics - are their connections meaningful?

Provide a consistency score (0-100) and detailed feedback.

Respond in JSON format:
{
  "consistencyScore": number,
  "strengths": ["list of character strengths"],
  "weaknesses": ["areas that need improvement"],
  "suggestions": ["specific recommendations for enhancement"],
  "arcAssessment": "evaluation of character's journey potential",
  "relationshipAnalysis": "assessment of their relationship dynamics"
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
      console.error('Character analysis error:', error);
      throw new Error("Failed to analyze character");
    }
  }

  async generateCharacterRelationships(
    characters: Character[],
    genre: string,
    plotSummary?: string
  ): Promise<Record<string, CharacterRelationship[]>> {
    if (characters.length < 2) {
      return {};
    }

    const characterNames = characters.map(c => c.name).join(', ');
    const characterInfo = characters.map(c => 
      `${c.name} (${c.role}): ${c.personality || 'Personality not defined'}`
    ).join('\n');

    const prompt = `Create meaningful relationships between these characters for a ${genre} story.

Characters:
${characterInfo}

${plotSummary ? `Plot Context: ${plotSummary}` : ''}

For each character, suggest relationships with the other characters that will:
1. Create interesting dynamics and potential conflicts
2. Support character development and growth
3. Serve the story's dramatic needs
4. Feel authentic and believable

Consider different relationship types:
- Allies and enemies
- Mentors and students  
- Romantic interests
- Family connections
- Professional relationships
- Friendships and rivalries

Respond in JSON format where each character name is a key:
{
  "Character Name": [
    {
      "characterName": "other character name",
      "relationshipType": "specific type of relationship",
      "description": "nature of their connection",
      "dynamics": "how they interact with each other",
      "conflictPoints": "potential sources of tension or drama"
    }
  ]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2", // Updated to ChatGPT 5.2
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Relationship generation error:', error);
      throw new Error("Failed to generate character relationships");
    }
  }

  async suggestCharacterImprovement(character: Character): Promise<string[]> {
    const prompt = `Suggest specific improvements for this character to make them more compelling and well-developed.

Character: ${character.name}
Role: ${character.role}
Current Development Level: ${this.assessDevelopmentLevel(character)}

Current Information:
- Physical: ${character.physicalDescription || 'Minimal'}
- Personality: ${character.personality || 'Basic'}
- Backstory: ${character.backstory || 'Limited'}
- Motivation: ${character.motivation || 'Unclear'}
- Goals: ${character.goals || 'Vague'}
- Fears: ${character.fears || 'Not defined'}

Provide 5-8 specific, actionable suggestions to enhance this character.

Respond in JSON format:
{
  "suggestions": ["specific improvement suggestions"]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2", // Updated to ChatGPT 5.2
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4
      });

      const result = JSON.parse(response.choices[0].message.content || '{"suggestions": []}');
      return result.suggestions || [];
    } catch (error) {
      console.error('Character improvement error:', error);
      return ["Add more specific details to personality and backstory"];
    }
  }

  async conductCharacterInterview(character: Character, interviewType: "personality" | "backstory" | "motivation" | "relationships" = "personality"): Promise<{
    questions: Array<{ question: string; response: string; insight: string }>;
    summary: string;
    revelations: string[];
    developmentSuggestions: string[];
  }> {
    const interviewPrompt = `You are conducting a character interview to develop deeper insights. Character: ${character.name}

Current character profile:
- Role: ${character.role}
- Personality: ${character.personality || "Not specified"}
- Backstory: ${character.backstory || "Not specified"}
- Motivation: ${character.motivation || "Not specified"}
- Fears: ${character.fears || "Not specified"}
- Goals: ${character.goals || "Not specified"}

Interview focus: ${interviewType}

Conduct a ${interviewType}-focused interview with 8-10 probing questions. For each question:
1. Ask a thoughtful question that reveals character depth
2. Provide the character's authentic response (stay true to their established traits)
3. Extract key insights from their response

After the interview, provide:
- A summary of key discoveries
- Revelations about the character that weren't apparent before
- Specific suggestions for character development

Format your response as JSON:
{
  "questions": [
    {
      "question": "What keeps you awake at 3am when the world is quiet?",
      "response": "Character's authentic response here...",
      "insight": "This reveals their deep fears/anxieties..."
    }
  ],
  "summary": "Key discoveries from this interview...",
  "revelations": ["Unexpected trait or background detail..."],
  "developmentSuggestions": ["Specific ways to develop this character further..."]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2", // Updated to ChatGPT 5.2
        messages: [{ role: "user", content: interviewPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error) {
      console.error('Character interview error:', error);
      throw new Error("Failed to conduct character interview");
    }
  }

  async mapEmotionalJourney(character: Character, storyStructure?: {
    acts: Array<{
      name: string;
      events: string[];
      emotionalTone: string;
    }>;
  }): Promise<{
    baseline: {
      dominantEmotions: string[];
      emotionalState: string;
      triggers: string[];
      coping: string[];
    };
    journey: Array<{
      phase: string;
      events: string[];
      emotionalShifts: Array<{
        from: string;
        to: string;
        trigger: string;
        impact: "minor" | "moderate" | "major" | "transformative";
      }>;
      internalConflicts: string[];
      growth: string[];
    }>;
    emotionalArc: {
      startingPoint: string;
      lowPoint: string;
      turningPoint: string;
      resolution: string;
      transformation: string;
    };
    consistencyNotes: string[];
  }> {
    const emotionalPrompt = `Create a detailed emotional journey map for this character throughout their story arc.

Character: ${character.name}
- Role: ${character.role}
- Personality: ${character.personality || "Not specified"}
- Backstory: ${character.backstory || "Not specified"}
- Motivation: ${character.motivation || "Not specified"}
- Fears: ${character.fears || "Not specified"}
- Goals: ${character.goals || "Not specified"}

${storyStructure ? `Story Structure: ${JSON.stringify(storyStructure)}` : ""}

Create a comprehensive emotional journey that shows:
1. Baseline emotional state and patterns
2. How they change through different story phases
3. Key emotional turning points and triggers
4. Internal conflicts and growth moments
5. Overall emotional arc and transformation

Ensure emotional changes are realistic and consistent with their established personality and experiences.

Format as JSON matching the expected structure with baseline, journey phases, emotional arc, and consistency notes.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2", // Updated to ChatGPT 5.2
        messages: [{ role: "user", content: emotionalPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.6
      });

      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error) {
      console.error('Emotional journey mapping error:', error);
      throw new Error("Failed to map emotional journey");
    }
  }

  async generateCharacterGrowthSuggestions(character: Character, currentEmotionalJourney?: any): Promise<{
    growthOpportunities: Array<{
      area: string;
      current: string;
      potential: string;
      catalysts: string[];
      obstacles: string[];
    }>;
    developmentExercises: Array<{
      title: string;
      description: string;
      purpose: string;
      questions: string[];
    }>;
    arcEnhancements: string[];
    relationshipDynamics: Array<{
      relationship: string;
      currentDynamic: string;
      potentialEvolution: string;
      keyMoments: string[];
    }>;
  }> {
    const growthPrompt = `Analyze this character and suggest growth opportunities and development paths.

Character: ${character.name}
- Role: ${character.role}
- Personality: ${character.personality || "Not specified"}
- Backstory: ${character.backstory || "Not specified"}
- Current Arc: ${character.characterArc ? JSON.stringify(character.characterArc) : "Not specified"}
- Emotional Journey: ${currentEmotionalJourney ? JSON.stringify(currentEmotionalJourney) : "Not mapped"}

Provide specific, actionable suggestions for:
1. Growth opportunities (what could change/develop)
2. Development exercises (writing prompts to flesh out the character)
3. Arc enhancements (ways to strengthen their story journey)
4. Relationship dynamics (how they could evolve with others)

Focus on realistic, character-driven development that emerges naturally from their established traits and circumstances.

Format as JSON matching the expected structure.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2", // Updated to ChatGPT 5.2
        messages: [{ role: "user", content: growthPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error) {
      console.error('Character growth analysis error:', error);
      throw new Error("Failed to generate growth suggestions");
    }
  }

  private assessDevelopmentLevel(character: Character): string {
    const fields = [
      character.physicalDescription,
      character.personality,
      character.backstory,
      character.motivation,
      character.goals,
      character.fears,
      character.quirks,
      character.voiceAndSpeech
    ];

    const completedFields = fields.filter(field => field && field.length > 50).length;
    const totalFields = fields.length;
    const completionRate = completedFields / totalFields;

    if (completionRate >= 0.8) return "Well-developed";
    if (completionRate >= 0.5) return "Moderately developed";
    if (completionRate >= 0.25) return "Basic development";
    return "Minimal development";
  }
}

export const characterService = new CharacterDevelopmentService();