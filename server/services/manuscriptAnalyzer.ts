import { ManuscriptProcessor } from './manuscriptProcessor';

export interface QualityIssue {
  type: 'formatting' | 'content' | 'structure' | 'consistency' | 'language';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  suggestion: string;
  count?: number;
}

export interface ManuscriptQualityReport {
  overallScore: number; // 0-100
  wordCount: number;
  chapterCount: number;
  issues: QualityIssue[];
  recommendations: string[];
  summary: {
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
}

export class ManuscriptAnalyzer {
  private manuscriptProcessor: ManuscriptProcessor;

  constructor() {
    this.manuscriptProcessor = new ManuscriptProcessor();
  }

  async analyzeManuscript(content: string): Promise<ManuscriptQualityReport> {
    const issues: QualityIssue[] = [];
    const recommendations: string[] = [];

    // Basic metrics
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    const lines = content.split('\n');
    
    // Analyze different aspects
    issues.push(...this.analyzeStructure(content, lines));
    issues.push(...this.analyzeFormatting(content, lines));
    issues.push(...this.analyzeContentQuality(content, words));
    issues.push(...this.analyzeConsistency(content, lines));
    issues.push(...this.analyzeLanguageQuality(content, words));

    // Count chapters
    const chapterCount = this.countChapters(lines);

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(issues, wordCount, chapterCount));

    // Calculate overall score
    const overallScore = this.calculateOverallScore(issues, wordCount);

    // Summarize issues by severity
    const summary = {
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      highIssues: issues.filter(i => i.severity === 'high').length,
      mediumIssues: issues.filter(i => i.severity === 'medium').length,
      lowIssues: issues.filter(i => i.severity === 'low').length,
    };

    return {
      overallScore,
      wordCount,
      chapterCount,
      issues,
      recommendations,
      summary,
    };
  }

  private analyzeStructure(content: string, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Check for chapter structure
    const chapterLines = lines.filter(line => 
      /^Chapter\s+\d+/i.test(line.trim()) || 
      /^#+\s*Chapter\s+\d+/i.test(line.trim())
    );

    if (chapterLines.length === 0) {
      issues.push({
        type: 'structure',
        severity: 'high',
        description: 'No clear chapter structure detected',
        suggestion: 'Add chapter headings to organize the manuscript properly',
      });
    } else if (chapterLines.length < 5) {
      issues.push({
        type: 'structure',
        severity: 'medium',
        description: 'Very few chapters detected',
        count: chapterLines.length,
        suggestion: 'Consider breaking content into more chapters for better readability',
      });
    }

    // Check for inconsistent chapter numbering
    const chapterNumbers = chapterLines
      .map(line => {
        const match = line.match(/Chapter\s+(\d+)/i);
        return match ? parseInt(match[1]) : null;
      })
      .filter(num => num !== null)
      .sort((a, b) => a! - b!);

    for (let i = 0; i < chapterNumbers.length - 1; i++) {
      if (chapterNumbers[i + 1]! - chapterNumbers[i]! !== 1) {
        issues.push({
          type: 'structure',
          severity: 'medium',
          description: 'Inconsistent or missing chapter numbers',
          suggestion: 'Ensure chapters are numbered consecutively without gaps',
        });
        break;
      }
    }

    // Check for empty chapters
    const chapterContent = this.getChapterContent(lines);
    chapterContent.forEach((chapter, index) => {
      if (chapter.content.trim().length < 500) {
        issues.push({
          type: 'structure',
          severity: 'high',
          description: `Chapter ${index + 1} appears too short`,
          location: `Chapter ${index + 1}`,
          suggestion: 'Expand the chapter content or consider merging with adjacent chapters',
        });
      }
    });

    return issues;
  }

  private analyzeFormatting(content: string, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Check for inconsistent line breaks
    const consecutiveEmptyLines = lines.reduce((acc, line, index) => {
      if (line.trim() === '' && lines[index - 1]?.trim() === '') {
        acc++;
      }
      return acc;
    }, 0);

    if (consecutiveEmptyLines > 10) {
      issues.push({
        type: 'formatting',
        severity: 'medium',
        description: 'Excessive blank lines found',
        count: consecutiveEmptyLines,
        suggestion: 'Remove extra blank lines to improve document formatting',
      });
    }

    // Check for inconsistent spacing around dialogue
    const dialogueLines = lines.filter(line => line.includes('"') || line.includes('"') || line.includes('"'));
    const improperlySeparatedDialogue = dialogueLines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !(/^\s*"/.test(line) || /^\s*"/.test(line));
    });

    if (improperlySeparatedDialogue.length > 0) {
      issues.push({
        type: 'formatting',
        severity: 'medium',
        description: 'Inconsistent dialogue formatting',
        count: improperlySeparatedDialogue.length,
        suggestion: 'Ensure dialogue is properly formatted and separated from narrative text',
      });
    }

    // Check for inconsistent paragraph structure
    const shortParagraphs = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && trimmed.length < 50 && !this.isHeading(trimmed);
    });

    if (shortParagraphs.length > lines.length * 0.3) {
      issues.push({
        type: 'formatting',
        severity: 'low',
        description: 'Many very short paragraphs detected',
        count: shortParagraphs.length,
        suggestion: 'Consider combining short paragraphs for better flow',
      });
    }

    return issues;
  }

  private analyzeContentQuality(content: string, words: string[]): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Check for repetitive words
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      const normalized = word.toLowerCase().replace(/[^\w]/g, '');
      if (normalized.length > 3) {
        wordFreq.set(normalized, (wordFreq.get(normalized) || 0) + 1);
      }
    });

    const overusedWords = Array.from(wordFreq.entries())
      .filter(([word, count]) => count > words.length * 0.01 && !this.isCommonWord(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (overusedWords.length > 0) {
      issues.push({
        type: 'content',
        severity: 'medium',
        description: 'Repetitive word usage detected',
        suggestion: `Consider varying vocabulary. Most repeated words: ${overusedWords.map(([word, count]) => `"${word}" (${count} times)`).join(', ')}`,
      });
    }

    // Check for sentence length variation
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((acc, len) => acc + Math.pow(len - avgLength, 2), 0) / sentenceLengths.length;

    if (variance < 10) {
      issues.push({
        type: 'content',
        severity: 'low',
        description: 'Limited sentence length variation',
        suggestion: 'Vary sentence lengths to improve rhythm and readability',
      });
    }

    // Check for very long sentences
    const longSentences = sentenceLengths.filter(len => len > 40);
    if (longSentences.length > sentences.length * 0.1) {
      issues.push({
        type: 'content',
        severity: 'medium',
        description: 'Many overly long sentences',
        count: longSentences.length,
        suggestion: 'Break down long sentences for better readability',
      });
    }

    return issues;
  }

  private analyzeConsistency(content: string, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Check for inconsistent quotation marks
    const smartQuotes = (content.match(/[""]/g) || []).length;
    const straightQuotes = (content.match(/"/g) || []).length;

    if (smartQuotes > 0 && straightQuotes > 0) {
      issues.push({
        type: 'consistency',
        severity: 'medium',
        description: 'Mixed quotation mark styles',
        suggestion: 'Use either smart quotes (" ") or straight quotes (") consistently throughout',
      });
    }

    // Check for inconsistent chapter heading formats
    const chapterHeadings = lines.filter(line => /chapter\s+\d+/i.test(line.trim()));
    const headingFormats = new Set(chapterHeadings.map(heading => {
      return heading.trim().replace(/\d+/g, 'X'); // Replace numbers with X for pattern matching
    }));

    if (headingFormats.size > 2) {
      issues.push({
        type: 'consistency',
        severity: 'medium',
        description: 'Inconsistent chapter heading formats',
        suggestion: 'Standardize chapter heading format throughout the manuscript',
      });
    }

    // Check for inconsistent name capitalization
    const names = this.extractNames(content);
    const inconsistentNames = names.filter(name => {
      const variations = names.filter(n => n.toLowerCase() === name.toLowerCase());
      return variations.length > 1 && new Set(variations).size > 1;
    });

    if (inconsistentNames.length > 0) {
      const uniqueNames = Array.from(new Set(inconsistentNames));
      issues.push({
        type: 'consistency',
        severity: 'high',
        description: 'Inconsistent character name capitalization',
        suggestion: `Check capitalization for: ${uniqueNames.join(', ')}`,
      });
    }

    return issues;
  }

  private analyzeLanguageQuality(content: string, words: string[]): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Check for potential typos (words with repeated characters)
    const possibleTypos = words.filter(word => {
      const clean = word.replace(/[^\w]/g, '').toLowerCase();
      return /(.)\1{2,}/.test(clean) && clean.length > 4;
    });

    if (possibleTypos.length > 0) {
      issues.push({
        type: 'language',
        severity: 'medium',
        description: 'Potential typos detected',
        count: possibleTypos.length,
        suggestion: `Review words with repeated characters: ${possibleTypos.slice(0, 5).join(', ')}`,
      });
    }

    // Check for adverb overuse
    const adverbs = words.filter(word => word.toLowerCase().endsWith('ly') && word.length > 3);
    const adverbRatio = adverbs.length / words.length;

    if (adverbRatio > 0.02) {
      issues.push({
        type: 'language',
        severity: 'low',
        description: 'High adverb usage',
        count: adverbs.length,
        suggestion: 'Consider replacing some adverbs with stronger verbs or more descriptive language',
      });
    }

    // Check for passive voice indicators
    const passiveIndicators = ['was', 'were', 'been', 'being'];
    const passiveCount = words.filter(word => 
      passiveIndicators.includes(word.toLowerCase())
    ).length;

    if (passiveCount > words.length * 0.02) {
      issues.push({
        type: 'language',
        severity: 'low',
        description: 'Frequent passive voice usage',
        suggestion: 'Consider converting some passive voice to active voice for stronger writing',
      });
    }

    return issues;
  }

  private generateRecommendations(issues: QualityIssue[], wordCount: number, chapterCount: number): string[] {
    const recommendations: string[] = [];

    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;

    if (criticalIssues > 0) {
      recommendations.push('Address critical structural issues before proceeding with cleanup');
    }

    if (highIssues > 0) {
      recommendations.push('Focus on high-priority issues first for maximum impact');
    }

    if (wordCount < 50000) {
      recommendations.push('Consider expanding content to meet standard novel length (50,000+ words)');
    }

    if (chapterCount > 0 && wordCount / chapterCount < 2000) {
      recommendations.push('Chapters may be too short - consider expanding or merging');
    }

    const structureIssues = issues.filter(i => i.type === 'structure').length;
    if (structureIssues > 0) {
      recommendations.push('Run the cleanup tool with focus on structure improvements');
    }

    const formattingIssues = issues.filter(i => i.type === 'formatting').length;
    if (formattingIssues > 0) {
      recommendations.push('Apply formatting cleanup to standardize document appearance');
    }

    return recommendations;
  }

  private calculateOverallScore(issues: QualityIssue[], wordCount: number): number {
    let score = 100;

    // Deduct points based on issue severity
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    });

    // Bonus for good word count
    if (wordCount >= 50000 && wordCount <= 100000) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  private countChapters(lines: string[]): number {
    const seenChapterTitles = new Set<string>();
    let count = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Enhanced chapter detection - matches ExportService and upload logic
      const isChapterHeading = (
        /^chapter\s+\d+/i.test(trimmedLine) || 
        /^ch\.\s*\d+/i.test(trimmedLine) ||
        /^chapter\s+[ivxlcdm]+/i.test(trimmedLine) ||
        /^\d+\s+[A-Z]/.test(trimmedLine) || // Number followed by uppercase text
        /^\d+\.\s*[A-Z]/.test(trimmedLine) || // Number with dot
        /^[IVXLCDM]+\.\s*[A-Z]/i.test(trimmedLine) || // Roman numerals with dot
        /^#+\s*Chapter\s+\d+/i.test(trimmedLine) // Markdown headers
      ) && trimmedLine.length < 100; // Chapter titles should be reasonably short
      
      if (isChapterHeading) {
        // Check for duplicates
        const normalizedChapter = trimmedLine.toLowerCase().replace(/\s+/g, ' ').replace(/[\"':]+/g, '').trim();
        if (!seenChapterTitles.has(normalizedChapter)) {
          seenChapterTitles.add(normalizedChapter);
          count++;
        }
      }
    }
    
    return count;
  }

  private getChapterContent(lines: string[]): Array<{ title: string; content: string }> {
    const chapters: Array<{ title: string; content: string }> = [];
    const seenChapterTitles = new Set<string>();
    let currentChapter = { title: '', content: '' };

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Enhanced chapter detection - matches all other services
      const isChapterHeading = (
        /^chapter\s+\d+/i.test(trimmedLine) || 
        /^ch\.\s*\d+/i.test(trimmedLine) ||
        /^chapter\s+[ivxlcdm]+/i.test(trimmedLine) ||
        /^\d+\s+[A-Z]/.test(trimmedLine) || // Number followed by uppercase text
        /^\d+\.\s*[A-Z]/.test(trimmedLine) || // Number with dot
        /^[IVXLCDM]+\.\s*[A-Z]/i.test(trimmedLine) || // Roman numerals with dot
        /^#+\s*Chapter\s+\d+/i.test(trimmedLine) // Markdown headers
      ) && trimmedLine.length < 100; // Chapter titles should be reasonably short
      
      if (isChapterHeading) {
        // Check for duplicates
        const normalizedChapter = trimmedLine.toLowerCase().replace(/\s+/g, ' ').replace(/[\"':]+/g, '').trim();
        if (seenChapterTitles.has(normalizedChapter)) continue;
        seenChapterTitles.add(normalizedChapter);
        
        if (currentChapter.title) {
          chapters.push(currentChapter);
        }
        currentChapter = { title: trimmedLine, content: '' };
      } else {
        currentChapter.content += line + '\n';
      }
    }

    if (currentChapter.title) {
      chapters.push(currentChapter);
    }

    return chapters;
  }

  private isHeading(text: string): boolean {
    return /^Chapter\s+\d+/i.test(text) || 
           /^#+\s/.test(text) ||
           /^(Prologue|Epilogue)\s*:?$/i.test(text);
  }

  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but',
      'his', 'from', 'they', 'she', 'her', 'been', 'than', 'its', 'who', 'did',
      'said', 'was', 'were', 'had', 'him', 'them', 'their', 'would', 'could',
      'what', 'when', 'where', 'why', 'how', 'will', 'can', 'may', 'might'
    ]);
    return commonWords.has(word.toLowerCase());
  }

  private extractNames(content: string): string[] {
    // Simple name extraction - looks for capitalized words that appear multiple times
    const words = content.match(/\b[A-Z][a-z]+\b/g) || [];
    const wordCounts = new Map<string, number>();
    
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });

    const entries = Array.from(wordCounts.entries());
    return entries
      .filter(([word, count]) => count > 2 && word.length > 2)
      .map(([word]) => word);
  }
}