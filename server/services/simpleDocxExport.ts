import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import type { Novel } from "@shared/schema";

export interface SimpleDocxOptions {
  fontSize?: number;
  fontFamily?: string;
  lineSpacing?: number;
  includeTitle?: boolean;
  chapterStartsNewPage?: boolean;
}

export class SimpleDocxExportService {
  
  private defaultOptions: SimpleDocxOptions = {
    fontSize: 24, // 12pt in half-points
    fontFamily: "Aptos",
    lineSpacing: 240, // Single spacing
    includeTitle: true,
    chapterStartsNewPage: true
  };

  async generateFromText(content: string, title: string, options: Partial<SimpleDocxOptions> = {}): Promise<Buffer> {
    const opts = { ...this.defaultOptions, ...options };
    
    const paragraphs: Paragraph[] = [];
    
    // Add title page if requested
    if (opts.includeTitle && title) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: title,
              font: opts.fontFamily,
              size: 32, // 16pt
              bold: true
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 960 }
        })
      );
    }

    // Split content into paragraphs and add them
    const textParagraphs = content.split('\n\n').filter(p => p.trim());
    
    textParagraphs.forEach(paragraph => {
      // Check if it's a chapter heading
      if (paragraph.trim().toLowerCase().startsWith('chapter ') || 
          /^chapter\s+\d+/i.test(paragraph.trim())) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: paragraph.trim(),
                font: opts.fontFamily,
                size: (opts.fontSize || 24) + 4,
                bold: true
              })
            ],
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { 
              before: 720,
              after: 480,
              line: opts.lineSpacing
            },
            pageBreakBefore: opts.chapterStartsNewPage || false
          })
        );
      } else {
        // Regular paragraph
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: paragraph.trim(),
                font: opts.fontFamily,
                size: opts.fontSize
              })
            ],
            spacing: { 
              line: opts.lineSpacing,
              after: 240
            },
            alignment: AlignmentType.LEFT
          })
        );
      }
    });

    const doc = new Document({
      sections: [{
        children: paragraphs
      }]
    });

    return Buffer.from(await Packer.toBuffer(doc));
  }

  async generateDocx(novel: Novel, options: Partial<SimpleDocxOptions> = {}): Promise<Buffer> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Parse the content to extract chapters - try individual chapters first
    let chapters = this.parseChaptersFromArray((novel.chapters as any[]) || []);
    
    // If no chapters from array, try parsing from manuscript content
    if (chapters.length === 0 && novel.manuscriptContent) {
      chapters = this.parseChapters(novel.manuscriptContent);
    }
    
    console.log(`Found ${chapters.length} chapters to export`);
    
    const paragraphs: Paragraph[] = [];
    
    // Add title page if requested
    if (opts.includeTitle && novel.title) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: novel.title,
              font: opts.fontFamily,
              size: 32, // 16pt
              bold: true
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 960 }
        })
      );
    }

    // Add chapters
    chapters.forEach((chapter, index) => {
      // Add page break before chapter title (not separate blank page)
      if (index > 0 && opts.chapterStartsNewPage) {
        // Chapter title with page break
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: chapter.title,
                font: opts.fontFamily,
                size: (opts.fontSize || 24) + 4,
                bold: true
              })
            ],
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { 
              before: 720, // More space at top of new page
              after: 480,
              line: opts.lineSpacing
            },
            pageBreakBefore: true
          })
        );
      } else {
        // First chapter or no page breaks
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: chapter.title,
                font: opts.fontFamily,
                size: (opts.fontSize || 24) + 4,
                bold: true
              })
            ],
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { 
              before: index === 0 ? 240 : 720,
              after: 480,
              line: opts.lineSpacing
            }
          })
        );
      }

      // Chapter content paragraphs
      const paragraphTexts = this.splitIntoParagraphs(chapter.content);
      
      paragraphTexts.forEach(paragraphText => {
        if (paragraphText.trim()) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: paragraphText,
                  font: opts.fontFamily,
                  size: opts.fontSize || 24
                })
              ],
              spacing: { 
                after: 240,
                line: opts.lineSpacing
              }
            })
          );
        }
      });
    });

    // Create the document
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children: paragraphs
      }]
    });

    // Generate the buffer
    return await Packer.toBuffer(doc);
  }

  private parseChapters(content: string): Array<{ title: string; content: string }> {
    const chapters: Array<{ title: string; content: string }> = [];
    
    // Clean the content first
    let cleanContent = content
      .replace(/^#.*$/gm, '') // Remove markdown headers
      .replace(/## Copyright.*$/gm, '') // Remove copyright
      .replace(/## Table of Contents.*$/gm, '') // Remove TOC  
      .replace(/\[Page Break\]/g, '') // Remove page breaks
      .trim();

    // Try different chapter patterns
    let chapterRegex = /\*\*(Chapter\s+\d+)\*\*/gi;
    let parts = cleanContent.split(chapterRegex);
    
    // If that doesn't work, try simpler pattern
    if (parts.length < 3) {
      chapterRegex = /^(Chapter\s+\d+)/gim;
      parts = cleanContent.split(chapterRegex);
    }
    
    console.log(`Split content into ${parts.length} parts`);
    
    // Process chapter titles and content
    for (let i = 1; i < parts.length; i += 2) {
      if (parts[i] && parts[i + 1]) {
        const title = parts[i].trim();
        const chapterContent = parts[i + 1].trim();
        
        if (chapterContent) {
          chapters.push({
            title: title,
            content: this.cleanContent(chapterContent)
          });
        }
      }
    }

    // If no chapters found but we have content, try different parsing
    if (chapters.length === 0 && cleanContent.trim()) {
      console.log('No chapters found, trying alternative parsing');
      
      // Try to find chapter boundaries in manuscript content
      const chapterBoundaries = cleanContent.split(/(?=Chapter\s+\d+)/i);
      
      if (chapterBoundaries.length > 1) {
        for (let i = 1; i < chapterBoundaries.length; i++) {
          const chapterText = chapterBoundaries[i].trim();
          if (chapterText) {
            const match = chapterText.match(/^(Chapter\s+\d+)/i);
            const title = match ? this.formatChapterTitle(match[1]) : this.formatChapterTitle(`Chapter ${i}`);
            const content = this.removeDuplicateChapterHeaders(chapterText.replace(/^Chapter\s+\d+[:\-\s]*/i, '').trim());
            
            chapters.push({
              title: title,
              content: this.cleanContent(content)
            });
          }
        }
      } else {
        // Last resort: create one chapter from all content
        chapters.push({
          title: this.formatChapterTitle("Chapter 1"),
          content: this.cleanContent(this.removeDuplicateChapterHeaders(cleanContent))
        });
      }
    }

    return chapters;
  }

  private cleanContent(content: string): string {
    return content
      // Remove bold and italic formatting
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold **text**
      .replace(/\*(.*?)\*/g, '$1') // Remove italic *text*
      
      // Remove all markdown headers (including any remaining chapter headers)
      .replace(/^#{1,6}\s*.*/gm, '') // Remove all markdown headers
      
      // Remove other markdown elements
      .replace(/\[Page Break\]/g, '') // Remove page break markers
      .replace(/^\s*-{3,}\s*$/gm, '') // Remove horizontal rules (---)
      .replace(/^\s*\*{3,}\s*$/gm, '') // Remove horizontal rules (***)
      
      // Remove any remaining chapter references that got through
      .replace(/^Chapter\s+\d+.*$/gmi, '') // Remove any remaining "Chapter X" lines
      .replace(/^\*\*Chapter\s+\d+.*?\*\*$/gmi, '') // Remove any remaining bold chapter headers
      
      // Clean up excessive whitespace
      .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with 2
      .replace(/^\s+/gm, '') // Remove leading whitespace from lines
      
      .trim();
  }

  private splitIntoParagraphs(content: string): string[] {
    // First, clean up the content
    let cleanedContent = content
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
      .replace(/^#{1,6}\s*/gm, '') // Remove headers
      .replace(/\[Page Break\]/g, '') // Remove page breaks
      .trim();

    // Split on double line breaks or paragraph indicators
    let paragraphs = cleanedContent.split(/\n\s*\n|\n\s*---\s*\n|\n\s*\*\*\*\s*\n/);
    
    // If we didn't get good paragraph breaks, try splitting on single line breaks
    // but only if they seem to be natural paragraph breaks
    if (paragraphs.length < 3) {
      paragraphs = cleanedContent.split(/\n(?=[A-Z]|\s*["'])/); // Split before capital letters or quotes
    }
    
    // Clean and filter paragraphs
    return paragraphs
      .map(p => p.replace(/\s+/g, ' ').trim()) // Normalize whitespace
      .filter(p => p.length > 20); // Filter out very short fragments
  }

  // New method to parse chapters from the database chapters array
  private parseChaptersFromArray(chaptersArray: any[]): Array<{ title: string; content: string }> {
    const chapters: Array<{ title: string; content: string }> = [];
    
    if (!Array.isArray(chaptersArray)) {
      return chapters;
    }

    chaptersArray.forEach((chapterContent, index) => {
      if (chapterContent && typeof chapterContent === 'string' && chapterContent.trim()) {
        const chapterNum = index + 1;
        let title = `Chapter ${chapterNum}`;
        let content = chapterContent.trim();
        
        // Try to extract actual chapter title from content if it exists
        const titlePatterns = [
          /^(Chapter\s+\d+[:\-\s]*[^\n]*)/i,
          /^(CHAPTER\s+\d+[:\-\s]*[^\n]*)/i,
          /^(Chapter\s+[IVXLCDM]+[:\-\s]*[^\n]*)/i,
          /^\*\*(Chapter\s+\d+[:\-\s]*[^\n]*)\*\*/i
        ];
        
        let extractedTitle = null;
        for (const pattern of titlePatterns) {
          const match = content.match(pattern);
          if (match) {
            extractedTitle = match[1].trim().replace(/[:\-\s]*$/, '');
            content = content.replace(pattern, '').trim();
            break;
          }
        }
        
        // Use extracted title if found, otherwise use default
        if (extractedTitle) {
          title = this.formatChapterTitle(extractedTitle);
        } else {
          title = this.formatChapterTitle(`Chapter ${chapterNum}`);
        }
        
        // Remove duplicate chapter headers from content
        content = this.removeDuplicateChapterHeaders(content);
        
        // Clean remaining content but preserve structure
        content = content.replace(/^\s*\n+/, ''); // Remove leading empty lines
        
        // Only add if there's actual content after cleaning
        if (content && content.length > 20) {
          chapters.push({
            title: title,
            content: this.cleanContent(content)
          });
        }
      }
    });
    
    return chapters;
  }

  /**
   * Format chapter title to match professional KDP style: "CHAPTER X: Title Name"
   */
  private formatChapterTitle(title: string): string {
    // Extract chapter number and any additional title
    const match = title.match(/Chapter\s+(\d+)(?:\s*:?\s*(.*))?/i);
    
    if (match) {
      const chapterNum = match[1];
      const chapterName = match[2]?.trim();
      
      if (chapterName && chapterName.length > 0) {
        // Clean up chapter name - remove quotes and extra formatting
        const cleanName = chapterName.replace(/^[\"\']+|[\"\']+$/g, '').trim();
        // Format as "CHAPTER X: Title Name" (professional format)
        return `CHAPTER ${chapterNum}: ${cleanName}`;
      } else {
        return `CHAPTER ${chapterNum}`;
      }
    }
    
    // Fallback - check if it's just a number with title
    const numMatch = title.match(/^(\d+)\s*:?\s*(.*)$/);
    if (numMatch) {
      const num = numMatch[1];
      const name = numMatch[2]?.trim();
      return name ? `CHAPTER ${num}: ${name}` : `CHAPTER ${num}`;
    }
    
    return title;
  }

  /**
   * Remove duplicate chapter headers from content
   */
  private removeDuplicateChapterHeaders(content: string): string {
    return content
      // Remove any remaining markdown chapter headers at the start
      .replace(/^#{1,6}\s*Chapter\s+\d+.*?\n?/gmi, '')
      // Remove bold chapter headers at the start
      .replace(/^\*\*Chapter\s+\d+.*?\*\*\n?/gmi, '')
      // Remove plain chapter headers at the start
      .replace(/^Chapter\s+\d+.*?\n?/gmi, '')
      .trim();
  }
}

export const simpleDocxExportService = new SimpleDocxExportService();