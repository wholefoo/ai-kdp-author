import OpenAI from "openai";
import { grammarChecker } from "./grammar";
import { readabilityService } from "./readabilityService";
import { styleConsistencyService } from "./styleChecker";
import { ManuscriptAnalyzer } from "./manuscriptAnalyzer";
import { ContentQualityService } from "./contentQualityService";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface ProofreadingIssue {
  id: string;
  type: 'spelling' | 'grammar' | 'punctuation' | 'flow' | 'cohesion' | 'readability' | 'style' | 'consistency' | 'structure';
  severity: 'critical' | 'high' | 'medium' | 'low';
  position: {
    line: number;
    column: number;
    length: number;
  };
  originalText: string;
  suggestedText: string;
  explanation: string;
  rule?: string;
}

export interface CohesionAnalysis {
  score: number; // 0-100
  issues: {
    type: 'logical_flow' | 'transition' | 'paragraph_connection' | 'argument_structure';
    description: string;
    location: string;
    suggestion: string;
  }[];
  strengths: string[];
  recommendations: string[];
  proofreadingIssues?: ProofreadingIssue[];
}

export interface FlowAnalysis {
  overallScore: number; // 0-100
  pacing: {
    score: number;
    issues: string[];
    recommendations: string[];
  };
  rhythm: {
    score: number;
    variability: 'monotonous' | 'varied' | 'excellent';
    issues: string[];
  };
  transitions: {
    score: number;
    weakTransitions: { from: string; to: string; suggestion: string; }[];
  };
}

export interface ComprehensiveProofreadingReport {
  overallScore: number; // 0-100
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
  issues: ProofreadingIssue[];
  
  // Detailed analysis sections
  spellingAndGrammar: {
    score: number;
    errors: number;
    commonMistakes: string[];
  };
  
  flowAndCohesion: {
    flowAnalysis: FlowAnalysis;
    cohesionAnalysis: CohesionAnalysis;
  };
  
  readabilityAnalysis: {
    score: number;
    gradeLevel: number;
    targetAudience: string;
    improvements: string[];
  };
  
  styleConsistency: {
    score: number;
    voice: { score: number; issues: string[]; };
    tone: { score: number; issues: string[]; };
    pov: { score: number; issues: string[]; };
  };
  
  structuralAnalysis: {
    score: number;
    chapterStructure: string;
    paragraphFlow: string;
    dialogueQuality: string;
  };
  
  recommendations: {
    immediate: string[]; // Critical fixes needed
    important: string[]; // High-priority improvements
    suggestions: string[]; // Nice-to-have enhancements
  };
  
  processedText?: string; // Optionally include corrected version
}

export class ProofreadingService {
  private manuscriptAnalyzer: ManuscriptAnalyzer;
  private contentQualityService: ContentQualityService;

  constructor() {
    this.manuscriptAnalyzer = new ManuscriptAnalyzer();
    this.contentQualityService = new ContentQualityService();
  }

  /**
   * Comprehensive proofreading analysis of a manuscript
   */
  async proofreadManuscript(
    content: string,
    options: {
      includeProcessedText?: boolean;
      targetAudience?: string;
      genre?: string;
      focusAreas?: ('spelling' | 'grammar' | 'flow' | 'cohesion' | 'readability' | 'style')[];
    } = {}
  ): Promise<ComprehensiveProofreadingReport> {
    
    if (!content || content.trim().length < 100) {
      throw new Error("Content must be at least 100 characters long for proofreading");
    }

    console.log("Starting comprehensive proofreading analysis...");

    try {
      // Run all analyses in parallel for efficiency
      const [
        grammarAnalysis,
        readabilityAnalysis,
        styleAnalysis,
        structuralAnalysis,
        spellingCheck,
        flowAnalysis,
        cohesionAnalysis
      ] = await Promise.all([
        this.performGrammarAnalysis(content),
        this.performReadabilityAnalysis(content),
        this.performStyleAnalysis(content, options.genre),
        this.performStructuralAnalysis(content),
        this.performSpellingAndPunctuationCheck(content),
        this.analyzeManuscriptFlow(content),
        this.analyzeCohesion(content)
      ]);

      // Compile all issues
      const allIssues: ProofreadingIssue[] = [
        ...grammarAnalysis.issues,
        ...spellingCheck.issues,
        ...flowAnalysis.issues,
        ...(cohesionAnalysis as any).proofreadingIssues || []
      ];

      // Calculate overall score
      const overallScore = this.calculateOverallScore({
        grammar: grammarAnalysis.score,
        readability: readabilityAnalysis.overallScore,
        style: styleAnalysis.overallScore,
        structure: structuralAnalysis.overallScore,
        flow: flowAnalysis.overallScore,
        cohesion: cohesionAnalysis.score
      });

      // Generate recommendations
      const recommendations = this.generateRecommendations(allIssues, {
        grammarAnalysis,
        readabilityAnalysis,
        styleAnalysis,
        structuralAnalysis
      });

      // Optionally generate corrected text
      let processedText: string | undefined;
      if (options.includeProcessedText) {
        processedText = await this.generateCorrectedText(content, allIssues);
      }

      const report: ComprehensiveProofreadingReport = {
        overallScore,
        summary: {
          totalIssues: allIssues.length,
          criticalIssues: allIssues.filter(i => i.severity === 'critical').length,
          highIssues: allIssues.filter(i => i.severity === 'high').length,
          mediumIssues: allIssues.filter(i => i.severity === 'medium').length,
          lowIssues: allIssues.filter(i => i.severity === 'low').length,
        },
        issues: allIssues,
        
        spellingAndGrammar: {
          score: grammarAnalysis.score,
          errors: grammarAnalysis.issues.length + spellingCheck.issues.length,
          commonMistakes: [...grammarAnalysis.commonMistakes, ...spellingCheck.commonMistakes]
        },
        
        flowAndCohesion: {
          flowAnalysis,
          cohesionAnalysis
        },
        
        readabilityAnalysis: {
          score: readabilityAnalysis.overallScore,
          gradeLevel: (readabilityAnalysis as any).gradeLevel || 8,
          targetAudience: (readabilityAnalysis as any).targetAudience || "General",
          improvements: (readabilityAnalysis as any).suggestions || []
        },
        
        styleConsistency: {
          score: styleAnalysis.overallScore,
          voice: {
            score: styleAnalysis.consistency.voice.score,
            issues: styleAnalysis.consistency.voice.issues
          },
          tone: {
            score: styleAnalysis.consistency.tone.score,
            issues: styleAnalysis.consistency.tone.issues
          },
          pov: {
            score: styleAnalysis.consistency.pov.score,
            issues: styleAnalysis.consistency.pov.issues
          }
        },
        
        structuralAnalysis: {
          score: structuralAnalysis.overallScore,
          chapterStructure: this.assessChapterStructure(structuralAnalysis),
          paragraphFlow: this.assessParagraphFlow(structuralAnalysis),
          dialogueQuality: this.assessDialogueQuality(structuralAnalysis)
        },
        
        recommendations,
        processedText
      };

      console.log(`Proofreading complete. Overall score: ${overallScore}/100, ${allIssues.length} issues found.`);
      return report;

    } catch (error) {
      console.error("Error in proofreading analysis:", error);
      throw new Error(`Proofreading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze manuscript flow and pacing
   */
  private async analyzeManuscriptFlow(content: string): Promise<FlowAnalysis & { issues: ProofreadingIssue[] }> {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    // Analyze sentence length variability
    const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((acc, len) => acc + Math.pow(len - avgLength, 2), 0) / sentenceLengths.length;
    
    let pacingScore = 85;
    let rhythmScore = 85;
    const issues: ProofreadingIssue[] = [];
    
    // Check for monotonous sentence structure
    if (variance < 10) {
      rhythmScore -= 20;
      issues.push({
        id: `flow-rhythm-${Date.now()}`,
        type: 'flow',
        severity: 'medium',
        position: { line: 1, column: 1, length: 100 },
        originalText: sentences[0]?.slice(0, 100) || '',
        suggestedText: 'Vary sentence lengths for better rhythm',
        explanation: 'Sentences are too similar in length, creating a monotonous reading experience',
        rule: 'Sentence Length Variation'
      });
    }

    // Analyze transitions between paragraphs
    const transitionWords = ['however', 'therefore', 'meanwhile', 'consequently', 'furthermore', 'moreover', 'nevertheless'];
    let poorTransitions = 0;
    
    for (let i = 1; i < paragraphs.length; i++) {
      const currentParagraph = paragraphs[i].toLowerCase();
      const hasTransition = transitionWords.some(word => currentParagraph.includes(word));
      
      if (!hasTransition && paragraphs[i].length > 100) {
        poorTransitions++;
      }
    }

    const transitionScore = Math.max(50, 100 - (poorTransitions / paragraphs.length) * 100);
    
    if (poorTransitions > paragraphs.length * 0.3) {
      issues.push({
        id: `flow-transition-${Date.now()}`,
        type: 'flow',
        severity: 'medium',
        position: { line: Math.floor(paragraphs.length / 2), column: 1, length: 50 },
        originalText: 'Multiple paragraphs lack transitions',
        suggestedText: 'Add transitional phrases between paragraphs',
        explanation: 'Many paragraphs lack smooth transitions, making the text feel choppy',
        rule: 'Paragraph Transitions'
      });
    }

    const overallScore = Math.round((pacingScore + rhythmScore + transitionScore) / 3);

    return {
      overallScore,
      pacing: {
        score: pacingScore,
        issues: pacingScore < 70 ? ['Pacing issues detected in narrative flow'] : [],
        recommendations: pacingScore < 70 ? ['Consider varying sentence structures and paragraph lengths'] : []
      },
      rhythm: {
        score: rhythmScore,
        variability: variance > 20 ? 'excellent' : variance > 10 ? 'varied' : 'monotonous',
        issues: rhythmScore < 70 ? ['Sentence rhythm lacks variation'] : []
      },
      transitions: {
        score: transitionScore,
        weakTransitions: poorTransitions > 0 ? [
          {
            from: 'Previous paragraph',
            to: 'Next paragraph',
            suggestion: 'Add transitional phrases or connecting sentences'
          }
        ] : []
      },
      issues
    };
  }

  /**
   * Analyze text cohesion and logical flow
   */
  private async analyzeCohesion(content: string): Promise<CohesionAnalysis & { issues: ProofreadingIssue[] }> {
    const prompt = `Analyze this text for cohesion and logical flow. Look for:

1. Logical progression of ideas
2. Clear connections between sentences and paragraphs  
3. Consistent argumentation or narrative flow
4. Appropriate use of cohesive devices (pronouns, conjunctions, etc.)
5. Clear topic sentences and supporting details

Text to analyze:
${content.slice(0, 4000)}${content.length > 4000 ? '...' : ''}

Provide analysis in JSON format:
{
  "score": number (0-100),
  "strengths": ["specific strengths in cohesion"],
  "issues": [
    {
      "type": "logical_flow|transition|paragraph_connection|argument_structure",
      "description": "specific issue description",
      "location": "paragraph/section reference",
      "suggestion": "how to fix this issue"
    }
  ],
  "recommendations": ["overall recommendations for improving cohesion"]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 2000
      });

      const analysisText = response.choices[0]?.message?.content;
      if (!analysisText) {
        throw new Error("No cohesion analysis received");
      }

      // Clean the response to remove markdown code blocks
      const cleanedText = analysisText.replace(/```json\s*\n?/g, '').replace(/```\s*$/g, '').trim();
      const analysis = JSON.parse(cleanedText);
      
      // Convert issues to ProofreadingIssue format
      const issues: ProofreadingIssue[] = analysis.issues.map((issue: any, index: number) => ({
        id: `cohesion-${index}-${Date.now()}`,
        type: 'cohesion' as const,
        severity: 'medium' as const,
        position: { line: index + 1, column: 1, length: 100 },
        originalText: issue.location,
        suggestedText: issue.suggestion,
        explanation: issue.description,
        rule: `Cohesion: ${issue.type}`
      }));

      return {
        score: analysis.score,
        issues: analysis.issues,
        strengths: analysis.strengths,
        recommendations: analysis.recommendations,
        proofreadingIssues: issues
      };

    } catch (error) {
      console.error("Error in cohesion analysis:", error);
      return {
        score: 75,
        issues: [],
        strengths: ["Analysis unavailable"],
        recommendations: ["Manual review recommended"],
        proofreadingIssues: []
      };
    }
  }

  /**
   * Comprehensive spelling and punctuation check
   */
  private async performSpellingAndPunctuationCheck(content: string): Promise<{
    issues: ProofreadingIssue[];
    commonMistakes: string[];
  }> {
    const prompt = `Perform a detailed spelling and punctuation check on this text. Focus on:

1. Spelling errors (including commonly confused words)
2. Punctuation mistakes (commas, apostrophes, quotation marks, etc.)
3. Capitalization errors
4. Missing or incorrect punctuation
5. Dialogue punctuation specifically

Text to check:
${content.slice(0, 3000)}${content.length > 3000 ? '...' : ''}

For each error found, provide:
- The incorrect text
- The corrected version
- The type of error
- A brief explanation

Respond in JSON format:
{
  "errors": [
    {
      "type": "spelling|punctuation|capitalization",
      "severity": "high|medium|low",
      "incorrect": "original text",
      "correct": "corrected text",
      "explanation": "why this is wrong and rule",
      "position": estimated character position
    }
  ],
  "commonMistakes": ["list of recurring error patterns"]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 2500
      });

      const analysisText = response.choices[0]?.message?.content;
      if (!analysisText) {
        return { issues: [], commonMistakes: [] };
      }

      // Clean the response to remove markdown code blocks
      const cleanedText = analysisText.replace(/```json\s*\n?/g, '').replace(/```\s*$/g, '').trim();
      const analysis = JSON.parse(cleanedText);
      
      const issues: ProofreadingIssue[] = analysis.errors.map((error: any, index: number) => ({
        id: `spelling-${index}-${Date.now()}`,
        type: error.type === 'spelling' ? 'spelling' : 'punctuation',
        severity: error.severity,
        position: {
          line: Math.floor(error.position / 80) + 1,
          column: error.position % 80,
          length: error.incorrect.length
        },
        originalText: error.incorrect,
        suggestedText: error.correct,
        explanation: error.explanation,
        rule: `${error.type} correction`
      }));

      return {
        issues,
        commonMistakes: analysis.commonMistakes || []
      };

    } catch (error) {
      console.error("Error in spelling/punctuation check:", error);
      return { issues: [], commonMistakes: [] };
    }
  }

  /**
   * Perform grammar analysis using existing service
   */
  private async performGrammarAnalysis(content: string): Promise<{
    score: number;
    issues: ProofreadingIssue[];
    commonMistakes: string[];
  }> {
    try {
      // Create a mock novel object for the existing grammar checker
      const mockNovel = {
        manuscriptContent: content
      } as any;

      const grammarAnalysis = await grammarChecker.analyzeManuscript(mockNovel);
      
      // Convert grammar issues to ProofreadingIssue format
      const issues: ProofreadingIssue[] = grammarAnalysis.issues.map((issue, index) => ({
        id: `grammar-${index}-${Date.now()}`,
        type: 'grammar',
        severity: issue.severity as any,
        position: {
          line: Math.floor(index / 10) + 1,
          column: (index % 10) * 10,
          length: issue.originalText?.length || 50
        },
        originalText: issue.originalText || '',
        suggestedText: (issue as any).suggestedFix || '',
        explanation: issue.explanation || '',
        rule: issue.type || 'Grammar'
      }));

      return {
        score: grammarAnalysis.overallScore,
        issues,
        commonMistakes: grammarAnalysis.suggestions || []
      };
    } catch (error) {
      console.error("Error in grammar analysis:", error);
      return {
        score: 75,
        issues: [],
        commonMistakes: []
      };
    }
  }

  /**
   * Perform readability analysis using existing service
   */
  private async performReadabilityAnalysis(content: string) {
    try {
      return await readabilityService.analyzeReadability(content);
    } catch (error) {
      console.error("Error in readability analysis:", error);
      return {
        overallScore: 75,
        gradeLevel: 8,
        targetAudience: "General",
        suggestions: []
      };
    }
  }

  /**
   * Perform style analysis using existing service
   */
  private async performStyleAnalysis(content: string, genre?: string) {
    try {
      const sections = [{
        id: '1',
        title: 'Sample Section',
        content: content.slice(0, 3000),
        wordCount: content.split(/\s+/).length,
        type: 'chapter' as const
      }];

      return await styleConsistencyService.analyzeManuscriptStyle(sections, {
        genre: genre || "general"
      });
    } catch (error) {
      console.error("Error in style analysis:", error);
      return {
        overallScore: 75,
        consistency: {
          voice: { score: 75, issues: [], recommendations: [] },
          tone: { score: 75, issues: [], recommendations: [] },
          style: { score: 75, issues: [], recommendations: [] },
          pov: { score: 75, issues: [], recommendations: [] }
        }
      };
    }
  }

  /**
   * Perform structural analysis using existing service
   */
  private async performStructuralAnalysis(content: string) {
    try {
      return await this.manuscriptAnalyzer.analyzeManuscript(content);
    } catch (error) {
      console.error("Error in structural analysis:", error);
      return {
        overallScore: 75,
        wordCount: content.split(/\s+/).length,
        chapterCount: 1,
        issues: [],
        recommendations: [],
        summary: { criticalIssues: 0, highIssues: 0, mediumIssues: 0, lowIssues: 0 }
      };
    }
  }

  /**
   * Generate corrected version of the text
   */
  private async generateCorrectedText(content: string, issues: ProofreadingIssue[]): Promise<string> {
    if (issues.length === 0) {
      return content;
    }

    // Sort issues by position (reverse order to avoid position shifts)
    const sortedIssues = issues
      .filter(issue => issue.originalText && issue.suggestedText)
      .sort((a, b) => b.position.line - a.position.line || b.position.column - a.position.column);

    let correctedText = content;
    
    // Apply corrections (limited to prevent excessive API usage)
    for (const issue of sortedIssues.slice(0, 20)) {
      if (issue.originalText && issue.suggestedText && issue.originalText !== issue.suggestedText) {
        correctedText = correctedText.replace(issue.originalText, issue.suggestedText);
      }
    }

    return correctedText;
  }

  /**
   * Calculate overall proofreading score
   */
  private calculateOverallScore(scores: {
    grammar: number;
    readability: number;
    style: number;
    structure: number;
    flow: number;
    cohesion: number;
  }): number {
    const weights = {
      grammar: 0.25,      // 25% - Critical for correctness
      readability: 0.20,  // 20% - Important for audience
      style: 0.15,        // 15% - Professional quality
      structure: 0.15,    // 15% - Organization
      flow: 0.15,         // 15% - Reading experience
      cohesion: 0.10      // 10% - Logical connection
    };

    const weightedScore = 
      scores.grammar * weights.grammar +
      scores.readability * weights.readability +
      scores.style * weights.style +
      scores.structure * weights.structure +
      scores.flow * weights.flow +
      scores.cohesion * weights.cohesion;

    return Math.round(weightedScore);
  }

  /**
   * Generate comprehensive recommendations
   */
  private generateRecommendations(issues: ProofreadingIssue[], analyses: any): {
    immediate: string[];
    important: string[];
    suggestions: string[];
  } {
    const immediate: string[] = [];
    const important: string[] = [];
    const suggestions: string[] = [];

    // Critical issues
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      immediate.push(`Fix ${criticalIssues.length} critical spelling/grammar errors immediately`);
    }

    // High priority issues
    const highIssues = issues.filter(i => i.severity === 'high');
    if (highIssues.length > 5) {
      immediate.push(`Address ${highIssues.length} high-priority issues affecting readability`);
    }

    // Grammar score
    if (analyses.grammarAnalysis?.score < 70) {
      immediate.push("Comprehensive grammar review needed - consider professional editing");
    } else if (analyses.grammarAnalysis?.score < 85) {
      important.push("Grammar improvements recommended for professional quality");
    }

    // Readability
    if (analyses.readabilityAnalysis?.overallScore < 60) {
      important.push("Readability improvements needed for target audience");
    }

    // Style consistency
    if (analyses.styleAnalysis?.overallScore < 70) {
      important.push("Style consistency issues detected - review voice and tone");
    }

    // Structure
    if (analyses.structuralAnalysis?.overallScore < 70) {
      important.push("Structural improvements needed - review chapter and paragraph organization");
    }

    // General suggestions
    suggestions.push("Consider professional proofreading for final polish");
    suggestions.push("Beta reader feedback recommended before publication");
    suggestions.push("Final spelling and punctuation check advised");

    return { immediate, important, suggestions };
  }

  /**
   * Assessment helper methods
   */
  private assessChapterStructure(structuralAnalysis: any): string {
    if (structuralAnalysis.overallScore > 85) return "Excellent chapter structure";
    if (structuralAnalysis.overallScore > 70) return "Good chapter structure with minor improvements needed";
    if (structuralAnalysis.overallScore > 50) return "Chapter structure needs improvement";
    return "Significant chapter structure issues detected";
  }

  private assessParagraphFlow(structuralAnalysis: any): string {
    const flowScore = structuralAnalysis.overallScore;
    if (flowScore > 85) return "Smooth paragraph transitions and flow";
    if (flowScore > 70) return "Generally good flow with some rough transitions";
    if (flowScore > 50) return "Paragraph flow needs improvement";
    return "Poor paragraph flow - extensive revision needed";
  }

  private assessDialogueQuality(structuralAnalysis: any): string {
    const dialogueIssues = structuralAnalysis.issues?.filter((issue: any) => 
      issue.type === 'formatting' && issue.description?.toLowerCase().includes('dialogue')
    ) || [];
    
    if (dialogueIssues.length === 0) return "Well-formatted dialogue";
    if (dialogueIssues.length < 3) return "Minor dialogue formatting issues";
    return "Dialogue formatting needs attention";
  }
}

export const proofreadingService = new ProofreadingService();