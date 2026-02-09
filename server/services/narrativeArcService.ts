import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface ChapterAnalysis {
  chapterIndex: number;
  chapterTitle: string;
  wordCount: number;
  emotionalTone: number; // -100 to 100 (negative to positive)
  tension: number; // 0 to 100
  pacing: number; // 0 to 100 (slow to fast)
  dialogueRatio: number; // 0 to 100 percentage
  actionLevel: number; // 0 to 100
  characterFocus: string[]; // main characters in this chapter
  plotElements: {
    conflict: number;
    resolution: number;
    mystery: number;
    romance: number;
    action: number;
  };
  keyMoments: string[];
  readingTime: number; // estimated minutes
}

export interface NarrativeArc {
  overallStructure: {
    exposition: number;
    risingAction: number;
    climax: number;
    fallingAction: number;
    resolution: number;
  };
  emotionalJourney: ChapterAnalysis[];
  pacing: {
    averagePacing: number;
    pacingVariance: number;
    slowChapters: number[];
    fastChapters: number[];
  };
  characterArcs: {
    [character: string]: {
      appearances: number[];
      development: number; // 0 to 100
      significance: number; // 0 to 100
    };
  };
  thematicElements: {
    [theme: string]: {
      strength: number;
      distribution: number[];
    };
  };
}

export interface AnalysisSettings {
  focusMetric?: string;
  smoothing?: number;
  showTrendLines?: boolean;
}

export class NarrativeArcService {
  
  async analyzeNarrativeArc(chapters: string[], genre?: string, settings: AnalysisSettings = {}): Promise<NarrativeArc> {
    try {
      // Step 1: Analyze each chapter individually
      const chapterAnalyses = await this.analyzeChapters(chapters, genre);
      
      // Step 2: Analyze overall structure
      const overallStructure = await this.analyzeOverallStructure(chapters, genre);
      
      // Step 3: Extract character arcs
      const characterArcs = this.extractCharacterArcs(chapterAnalyses);
      
      // Step 4: Analyze pacing patterns
      const pacing = this.analyzePacing(chapterAnalyses);
      
      // Step 5: Extract thematic elements
      const thematicElements = await this.analyzeThemes(chapters, genre);

      return {
        overallStructure,
        emotionalJourney: chapterAnalyses,
        pacing,
        characterArcs,
        thematicElements
      };

    } catch (error) {
      console.error('Narrative arc analysis error:', error);
      throw new Error('Failed to analyze narrative arc: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async analyzeChapters(chapters: string[], genre?: string): Promise<ChapterAnalysis[]> {
    const analyses: ChapterAnalysis[] = [];
    
    // For performance: if there are too many chapters, sample strategically
    const maxChaptersToAnalyze = 20;
    const shouldSample = chapters.length > maxChaptersToAnalyze;
    
    let chaptersToAnalyze: Array<{text: string, originalIndex: number}> = [];
    
    if (shouldSample) {
      // Sample key chapters: first, last, and evenly distributed middle chapters
      const sampleIndices = this.getSampleIndices(chapters.length, maxChaptersToAnalyze);
      chaptersToAnalyze = sampleIndices.map(i => ({
        text: chapters[i],
        originalIndex: i
      }));
      console.log(`Analyzing ${chaptersToAnalyze.length} sampled chapters out of ${chapters.length} total`);
    } else {
      chaptersToAnalyze = chapters.map((text, i) => ({
        text,
        originalIndex: i
      }));
    }

    for (const {text, originalIndex} of chaptersToAnalyze) {
      const analysis = await this.analyzeSingleChapter(text, originalIndex, genre);
      analyses.push(analysis);
    }
    
    // If we sampled, interpolate data for missing chapters
    if (shouldSample) {
      return this.interpolateAnalyses(analyses, chapters.length);
    }

    return analyses;
  }
  
  private getSampleIndices(totalChapters: number, maxSamples: number): number[] {
    const indices: number[] = [];
    
    // Always include first and last chapters
    indices.push(0);
    if (totalChapters > 1) {
      indices.push(totalChapters - 1);
    }
    
    // Add evenly distributed middle chapters
    const remainingSamples = maxSamples - 2;
    if (remainingSamples > 0 && totalChapters > 2) {
      const step = (totalChapters - 2) / (remainingSamples + 1);
      for (let i = 1; i <= remainingSamples; i++) {
        const index = Math.round(step * i);
        if (index > 0 && index < totalChapters - 1) {
          indices.push(index);
        }
      }
    }
    
    return [...new Set(indices)].sort((a, b) => a - b);
  }
  
  private interpolateAnalyses(sampledAnalyses: ChapterAnalysis[], totalChapters: number): ChapterAnalysis[] {
    const result: ChapterAnalysis[] = [];
    
    for (let i = 0; i < totalChapters; i++) {
      const exactMatch = sampledAnalyses.find(a => a.chapterIndex === i);
      if (exactMatch) {
        result.push(exactMatch);
      } else {
        // Interpolate between nearest samples
        const interpolated = this.interpolateSingleAnalysis(sampledAnalyses, i);
        result.push(interpolated);
      }
    }
    
    return result;
  }
  
  private interpolateSingleAnalysis(sampledAnalyses: ChapterAnalysis[], targetIndex: number): ChapterAnalysis {
    // Find nearest analyses before and after target index
    const before = sampledAnalyses.filter(a => a.chapterIndex < targetIndex).slice(-1)[0];
    const after = sampledAnalyses.filter(a => a.chapterIndex > targetIndex)[0];
    
    if (!before && !after) {
      // Fallback to first sample
      const sample = sampledAnalyses[0];
      return { ...sample, chapterIndex: targetIndex, chapterTitle: `Chapter ${targetIndex + 1}` };
    }
    
    if (!before) {
      return { ...after, chapterIndex: targetIndex, chapterTitle: `Chapter ${targetIndex + 1}` };
    }
    
    if (!after) {
      return { ...before, chapterIndex: targetIndex, chapterTitle: `Chapter ${targetIndex + 1}` };
    }
    
    // Linear interpolation between before and after
    const weight = (targetIndex - before.chapterIndex) / (after.chapterIndex - before.chapterIndex);
    
    return {
      chapterIndex: targetIndex,
      chapterTitle: `Chapter ${targetIndex + 1}`,
      wordCount: Math.round(before.wordCount + (after.wordCount - before.wordCount) * weight),
      readingTime: Math.round(before.readingTime + (after.readingTime - before.readingTime) * weight),
      emotionalTone: Math.round(before.emotionalTone + (after.emotionalTone - before.emotionalTone) * weight),
      tension: Math.round(before.tension + (after.tension - before.tension) * weight),
      pacing: Math.round(before.pacing + (after.pacing - before.pacing) * weight),
      dialogueRatio: Math.round(before.dialogueRatio + (after.dialogueRatio - before.dialogueRatio) * weight),
      actionLevel: Math.round(before.actionLevel + (after.actionLevel - before.actionLevel) * weight),
      characterFocus: targetIndex % 2 === 0 ? before.characterFocus : after.characterFocus, // Alternate character focus
      plotElements: {
        conflict: Math.round(before.plotElements.conflict + (after.plotElements.conflict - before.plotElements.conflict) * weight),
        resolution: Math.round(before.plotElements.resolution + (after.plotElements.resolution - before.plotElements.resolution) * weight),
        mystery: Math.round(before.plotElements.mystery + (after.plotElements.mystery - before.plotElements.mystery) * weight),
        romance: Math.round(before.plotElements.romance + (after.plotElements.romance - before.plotElements.romance) * weight),
        action: Math.round(before.plotElements.action + (after.plotElements.action - before.plotElements.action) * weight)
      },
      keyMoments: weight < 0.5 ? before.keyMoments : after.keyMoments
    };
  }

  private async analyzeSingleChapter(chapterText: string, index: number, genre?: string): Promise<ChapterAnalysis> {
    const systemPrompt = `You are a literary analyst specializing in narrative structure analysis. Analyze the provided chapter and return a detailed assessment.

ANALYSIS FOCUS:
- Emotional tone (-100 to 100): negative emotions to positive emotions
- Tension level (0-100): low tension/calm to high tension/suspenseful
- Pacing (0-100): slow/contemplative to fast/action-packed
- Dialogue ratio (0-100): percentage of chapter that is dialogue
- Action level (0-100): amount of physical action and movement
- Plot elements (0-100 each): conflict, resolution, mystery, romance, action intensity
- Character focus: main characters featured in this chapter
- Key moments: 2-3 most important events or revelations

${genre ? `GENRE CONTEXT: This is a ${genre} novel - consider genre conventions in your analysis.` : ''}

RESPONSE FORMAT - Return valid JSON only:
{
  "emotionalTone": -25,
  "tension": 75,
  "pacing": 60,
  "dialogueRatio": 40,
  "actionLevel": 80,
  "characterFocus": ["John", "Sarah"],
  "plotElements": {
    "conflict": 85,
    "resolution": 10,
    "mystery": 30,
    "romance": 5,
    "action": 80
  },
  "keyMoments": ["Battle scene", "Character revelation", "Plot twist"]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze Chapter ${index + 1}:\n\n${chapterText.slice(0, 4000)}` }
        ],
        max_completion_tokens: 1500
      });

      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        console.warn(`No OpenAI response for Chapter ${index + 1}, using fallback analysis`);
        // Use fallback analysis immediately instead of throwing error
        const wordCount = chapterText.split(/\s+/).length;
        return {
          chapterIndex: index,
          chapterTitle: `Chapter ${index + 1}`,
          wordCount,
          readingTime: Math.round(wordCount / 250),
          emotionalTone: 0,
          tension: 50,
          pacing: 50,
          dialogueRatio: 30,
          actionLevel: 30,
          characterFocus: [],
          plotElements: {
            conflict: 30,
            resolution: 10,
            mystery: 20,
            romance: 10,
            action: 30
          },
          keyMoments: []
        };
      }

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn(`Invalid JSON format for Chapter ${index + 1}, using fallback analysis`);
        // Use fallback analysis for invalid JSON
        const wordCount = chapterText.split(/\s+/).length;
        return {
          chapterIndex: index,
          chapterTitle: `Chapter ${index + 1}`,
          wordCount,
          readingTime: Math.round(wordCount / 250),
          emotionalTone: 0,
          tension: 50,
          pacing: 50,
          dialogueRatio: 30,
          actionLevel: 30,
          characterFocus: [],
          plotElements: {
            conflict: 30,
            resolution: 10,
            mystery: 20,
            romance: 10,
            action: 30
          },
          keyMoments: []
        };
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.warn(`JSON parse error for Chapter ${index + 1}:`, parseError);
        // Use fallback analysis for parse errors
        const wordCount = chapterText.split(/\s+/).length;
        return {
          chapterIndex: index,
          chapterTitle: `Chapter ${index + 1}`,
          wordCount,
          readingTime: Math.round(wordCount / 250),
          emotionalTone: 0,
          tension: 50,
          pacing: 50,
          dialogueRatio: 30,
          actionLevel: 30,
          characterFocus: [],
          plotElements: {
            conflict: 30,
            resolution: 10,
            mystery: 20,
            romance: 10,
            action: 30
          },
          keyMoments: []
        };
      }
      
      // Calculate additional metrics
      const wordCount = chapterText.split(/\s+/).length;
      const readingTime = Math.round(wordCount / 250); // 250 words per minute average
      
      return {
        chapterIndex: index,
        chapterTitle: `Chapter ${index + 1}`,
        wordCount,
        readingTime,
        emotionalTone: this.clamp(parsed.emotionalTone || 0, -100, 100),
        tension: this.clamp(parsed.tension || 50, 0, 100),
        pacing: this.clamp(parsed.pacing || 50, 0, 100),
        dialogueRatio: this.clamp(parsed.dialogueRatio || 30, 0, 100),
        actionLevel: this.clamp(parsed.actionLevel || 30, 0, 100),
        characterFocus: Array.isArray(parsed.characterFocus) ? parsed.characterFocus : [],
        plotElements: {
          conflict: this.clamp(parsed.plotElements?.conflict || 30, 0, 100),
          resolution: this.clamp(parsed.plotElements?.resolution || 10, 0, 100),
          mystery: this.clamp(parsed.plotElements?.mystery || 20, 0, 100),
          romance: this.clamp(parsed.plotElements?.romance || 10, 0, 100),
          action: this.clamp(parsed.plotElements?.action || 30, 0, 100)
        },
        keyMoments: Array.isArray(parsed.keyMoments) ? parsed.keyMoments : []
      };

    } catch (error) {
      console.error(`Chapter ${index + 1} analysis error:`, error);
      
      // Fallback analysis
      const wordCount = chapterText.split(/\s+/).length;
      return {
        chapterIndex: index,
        chapterTitle: `Chapter ${index + 1}`,
        wordCount,
        readingTime: Math.round(wordCount / 250),
        emotionalTone: 0,
        tension: 50,
        pacing: 50,
        dialogueRatio: 30,
        actionLevel: 30,
        characterFocus: [],
        plotElements: {
          conflict: 30,
          resolution: 10,
          mystery: 20,
          romance: 10,
          action: 30
        },
        keyMoments: []
      };
    }
  }

  private async analyzeOverallStructure(chapters: string[], genre?: string): Promise<NarrativeArc['overallStructure']> {
    const totalChapters = chapters.length;
    const sampleText = chapters.slice(0, 3).join('\n\n') + '\n\n...\n\n' + chapters.slice(-3).join('\n\n');

    const systemPrompt = `Analyze the overall story structure and determine what percentage of the narrative is devoted to each dramatic element.

The five elements should total 100%:
- Exposition: Character and world introduction, setup
- Rising Action: Building conflict and complications
- Climax: The main crisis/turning point
- Falling Action: Consequences and resolution setup
- Resolution: Conclusion and wrap-up

Consider the full ${totalChapters}-chapter structure. ${genre ? `This is a ${genre} novel.` : ''}

Return only valid JSON:
{
  "exposition": 15,
  "risingAction": 60,
  "climax": 10,
  "fallingAction": 10,
  "resolution": 5
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this ${totalChapters}-chapter story structure:\n\n${sampleText.slice(0, 3000)}` }
        ],
        max_completion_tokens: 500
      });

      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No structure analysis response');
      }

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Ensure percentages are valid and sum to ~100%
        const total = Object.values(parsed).reduce((sum: number, val) => sum + (Number(val) || 0), 0);
        const scale = total > 0 ? 100 / total : 1;
        
        return {
          exposition: Math.round((parsed.exposition || 20) * scale),
          risingAction: Math.round((parsed.risingAction || 50) * scale),
          climax: Math.round((parsed.climax || 15) * scale),
          fallingAction: Math.round((parsed.fallingAction || 10) * scale),
          resolution: Math.round((parsed.resolution || 5) * scale)
        };
      }

      throw new Error('Invalid structure analysis response');

    } catch (error) {
      console.error('Structure analysis error:', error);
      
      // Fallback to typical structure percentages
      return {
        exposition: 20,
        risingAction: 50,
        climax: 15,
        fallingAction: 10,
        resolution: 5
      };
    }
  }

  private extractCharacterArcs(analyses: ChapterAnalysis[]): NarrativeArc['characterArcs'] {
    const characterArcs: NarrativeArc['characterArcs'] = {};

    // Collect all characters and their appearances
    analyses.forEach((analysis) => {
      analysis.characterFocus.forEach((character) => {
        if (!characterArcs[character]) {
          characterArcs[character] = {
            appearances: [],
            development: 0,
            significance: 0
          };
        }
        characterArcs[character].appearances.push(analysis.chapterIndex);
      });
    });

    // Calculate development and significance scores
    Object.keys(characterArcs).forEach((character) => {
      const appearances = characterArcs[character].appearances;
      const appearanceCount = appearances.length;
      const totalChapters = analyses.length;
      
      // Significance based on frequency and distribution of appearances
      characterArcs[character].significance = Math.round(
        (appearanceCount / totalChapters) * 100
      );
      
      // Development based on appearance span (characters in first and last chapters show more development)
      const hasEarlyAppearance = appearances.some(ch => ch < totalChapters * 0.3);
      const hasLateAppearance = appearances.some(ch => ch > totalChapters * 0.7);
      const development = hasEarlyAppearance && hasLateAppearance ? 80 : 
                         appearanceCount > totalChapters * 0.5 ? 60 : 40;
      
      characterArcs[character].development = Math.min(100, development);
    });

    return characterArcs;
  }

  private analyzePacing(analyses: ChapterAnalysis[]): NarrativeArc['pacing'] {
    const pacingScores = analyses.map(ch => ch.pacing);
    const averagePacing = pacingScores.reduce((sum, score) => sum + score, 0) / pacingScores.length;
    
    // Calculate variance
    const variance = pacingScores.reduce((sum, score) => sum + Math.pow(score - averagePacing, 2), 0) / pacingScores.length;
    const pacingVariance = Math.sqrt(variance);
    
    // Identify slow and fast chapters (more than 1 standard deviation from mean)
    const slowChapters = analyses
      .filter(ch => ch.pacing < averagePacing - pacingVariance)
      .map(ch => ch.chapterIndex);
    
    const fastChapters = analyses
      .filter(ch => ch.pacing > averagePacing + pacingVariance)
      .map(ch => ch.chapterIndex);

    return {
      averagePacing: Math.round(averagePacing),
      pacingVariance: Math.round(pacingVariance),
      slowChapters,
      fastChapters
    };
  }

  private async analyzeThemes(chapters: string[], genre?: string): Promise<NarrativeArc['thematicElements']> {
    const sampleText = chapters.slice(0, 5).join('\n\n') + '\n\n...\n\n' + chapters.slice(-3).join('\n\n');

    const systemPrompt = `Identify the main themes in this story and rate their strength (0-100) and how evenly they're distributed throughout.

Return only valid JSON with up to 5 main themes:
{
  "themeName1": {
    "strength": 85,
    "distribution": [20, 30, 40, 50, 60]
  },
  "themeName2": {
    "strength": 60,
    "distribution": [10, 15, 25, 20, 30]
  }
}

Distribution array should have 5 values representing theme presence across story segments.
${genre ? `Consider typical ${genre} themes.` : ''}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze themes in this story:\n\n${sampleText.slice(0, 3000)}` }
        ],
        max_completion_tokens: 800
      });

      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No theme analysis response');
      }

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate and clean the response
        const cleanedThemes: NarrativeArc['thematicElements'] = {};
        Object.keys(parsed).forEach(theme => {
          if (parsed[theme] && typeof parsed[theme] === 'object') {
            cleanedThemes[theme] = {
              strength: this.clamp(parsed[theme].strength || 50, 0, 100),
              distribution: Array.isArray(parsed[theme].distribution) 
                ? parsed[theme].distribution.slice(0, 5).map((val: any) => this.clamp(Number(val) || 20, 0, 100))
                : [20, 20, 20, 20, 20]
            };
          }
        });
        
        return cleanedThemes;
      }

      throw new Error('Invalid theme analysis response');

    } catch (error) {
      console.error('Theme analysis error:', error);
      
      // Fallback themes based on genre
      const fallbackThemes: NarrativeArc['thematicElements'] = {};
      
      if (genre?.toLowerCase().includes('romance')) {
        fallbackThemes['Love and Relationships'] = { strength: 80, distribution: [20, 40, 60, 80, 70] };
      } else if (genre?.toLowerCase().includes('mystery')) {
        fallbackThemes['Truth and Justice'] = { strength: 75, distribution: [30, 50, 70, 80, 90] };
      } else {
        fallbackThemes['Growth and Change'] = { strength: 70, distribution: [40, 50, 60, 70, 80] };
      }
      
      return fallbackThemes;
    }
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

export const narrativeArcService = new NarrativeArcService();