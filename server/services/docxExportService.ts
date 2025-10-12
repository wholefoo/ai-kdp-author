import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TabStopPosition, TabStopType } from "docx";
import type { Novel } from "@shared/schema";

export interface DocxExportOptions {
  fontSize?: number;
  fontFamily?: string;
  lineSpacing?: number;
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  includeTitle?: boolean;
  includeToc?: boolean;
  pageSize?: 'A4' | 'US_LETTER' | 'CREATESPACE_6x9';
  chapterStartsNewPage?: boolean;
}

export class DocxExportService {
  
  private defaultOptions: DocxExportOptions = {
    fontSize: 24, // 12pt in half-points
    fontFamily: "Aptos",
    lineSpacing: 360, // Double spacing (240 = single, 360 = 1.5, 480 = double)
    margins: {
      top: 1440, // 1 inch in twentieths of a point
      right: 1440,
      bottom: 1440,
      left: 1440
    },
    includeTitle: true,
    includeToc: false,
    pageSize: 'US_LETTER',
    chapterStartsNewPage: true
  };

  async generateDocx(novel: Novel, options: Partial<DocxExportOptions> = {}): Promise<Buffer> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Parse the content to extract chapters
    const chapters = this.parseChapters(novel.manuscriptContent || "");
    
    // Create the document
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: opts.margins,
            size: {
              orientation: "portrait",
              width: opts.pageSize === 'A4' ? 11906 : (opts.pageSize === 'CREATESPACE_6x9' ? 8640 : 12240), // A4: 8.27", 6x9: 6", Letter: 8.5"
              height: opts.pageSize === 'A4' ? 16838 : (opts.pageSize === 'CREATESPACE_6x9' ? 12960 : 15840)  // A4: 11.69", 6x9: 9", Letter: 11"
            }
          }
        },
        children: this.buildDocumentContent(novel, chapters, opts)
      }]
    });

    // Generate the buffer
    return await Packer.toBuffer(doc);
  }

  private parseChapters(content: string): Array<{ title: string; content: string }> {
    const chapters: Array<{ title: string; content: string }> = [];
    
    // Remove copyright and table of contents sections
    let cleanContent = content
      .replace(/^#[\s\S]*?(?=\*\*Chapter\s+1\*\*)/g, '') // Remove title and front matter
      .replace(/## Copyright[\s\S]*?(?=\*\*Chapter)/g, '') // Remove copyright section
      .replace(/## Table of Contents[\s\S]*?(?=\*\*Chapter)/g, '') // Remove TOC
      .replace(/\[Page Break\]/g, '') // Remove page break markers
      .trim();

    // Split by chapter markers - look for **Chapter X** format
    const chapterRegex = /\*\*(Chapter\s+\d+)\*\*/gi;
    const parts = cleanContent.split(chapterRegex);
    
    // Process chapter titles and content
    for (let i = 1; i < parts.length; i += 2) {
      if (parts[i] && parts[i + 1]) {
        const title = this.formatChapterTitle(parts[i].trim());
        let chapterContent = parts[i + 1].trim();
        
        // Remove duplicate chapter headers from content
        chapterContent = this.removeDuplicateChapterHeaders(chapterContent);
        
        if (chapterContent) {
          chapters.push({
            title: title,
            content: chapterContent
          });
        }
      }
    }

    // If no chapters found with **Chapter** format, try other formats
    if (chapters.length === 0) {
      const altRegex = /^(Chapter\s+\d+)/gim;
      const altParts = cleanContent.split(altRegex);
      
      for (let i = 1; i < altParts.length; i += 2) {
        if (altParts[i] && altParts[i + 1]) {
          const title = this.formatChapterTitle(altParts[i].trim());
          let chapterContent = altParts[i + 1].trim();
          
          // Remove duplicate chapter headers from content
          chapterContent = this.removeDuplicateChapterHeaders(chapterContent);
          
          if (chapterContent) {
            chapters.push({
              title: title,
              content: chapterContent
            });
          }
        }
      }
    }

    // If still no chapters found, treat entire content as one chapter
    if (chapters.length === 0 && cleanContent.trim()) {
      const processedContent = this.removeDuplicateChapterHeaders(cleanContent.trim());
      chapters.push({
        title: "1 CHAPTER",
        content: processedContent
      });
    }

    return chapters;
  }

  /**
   * Format chapter title to match KDP template style: "1 CHAPTER NAME"
   */
  private formatChapterTitle(title: string): string {
    // Extract chapter number and any additional title
    const match = title.match(/Chapter\s+(\d+)(?:\s*:?\s*(.*))?/i);
    
    if (match) {
      const chapterNum = match[1];
      const chapterName = match[2]?.trim();
      
      if (chapterName && chapterName.length > 0) {
        return `${chapterNum} CHAPTER ${chapterName.toUpperCase()}`;
      } else {
        return `${chapterNum} CHAPTER`;
      }
    }
    
    // Fallback - just return uppercase version
    return title.toUpperCase();
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

  /**
   * Add placeholder chapters for missing content (CreateSpace template only)
   */
  private addPlaceholderChapters(existingChapters: Array<{ title: string; content: string }>, targetCount: number): Array<{ title: string; content: string }> {
    const chapters = [...existingChapters];
    const currentCount = chapters.length;
    
    // Add placeholders for missing chapters
    for (let i = currentCount + 1; i <= targetCount; i++) {
      chapters.push({
        title: `Chapter ${i}`,
        content: `[This chapter has not been generated yet]\n\nThis is a placeholder for Chapter ${i}. The content for this chapter will be added when the novel generation is completed.\n\nTo complete your novel:\n1. Return to the Novel Generator\n2. Continue or restart the generation process\n3. Re-download the manuscript once complete\n\n---\n\nPage intentionally left blank for future content.`
      });
    }
    
    return chapters;
  }

  private buildDocumentContent(novel: Novel, chapters: Array<{ title: string; content: string }>, opts: DocxExportOptions): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    // Handle placeholder content for CreateSpace preset
    const isCreateSpace = opts.pageSize === 'CREATESPACE_6x9';
    const targetCount = novel.targetChapterCount || 0;
    const shouldAddPlaceholders = isCreateSpace && targetCount > 0 && chapters.length < targetCount;
    
    let finalChapters = chapters;
    if (shouldAddPlaceholders) {
      finalChapters = this.addPlaceholderChapters(chapters, targetCount);
    }

    // Add title page if requested
    if (opts.includeTitle && novel.title) {
      paragraphs.push(
        // Title
        new Paragraph({
          children: [
            new TextRun({
              text: novel.title,
              font: opts.fontFamily,
              size: 36, // 18pt
              bold: true
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 960 } // 48pt spacing after
        }),
        
        // Page break
        new Paragraph({
          children: [new TextRun({ text: "" })],
          pageBreakBefore: true
        })
      );
    }

    // Add chapters (including placeholders for CreateSpace)
    finalChapters.forEach((chapter, index) => {
      // Chapter title with proper page break
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: chapter.title,
              font: opts.fontFamily,
              size: (opts.fontSize || 24) + 4, // Slightly larger for chapter titles
              bold: true
            })
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { 
            before: 0,
            after: 480,
            line: opts.lineSpacing
          },
          pageBreakBefore: index > 0 && opts.chapterStartsNewPage
        })
      );

      // Chapter content - clean up any remaining markdown formatting
      const cleanContent = this.cleanMarkdownFormatting(chapter.content);
      const paragraphTexts = this.splitIntoParagraphs(cleanContent);
      
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
                after: 240, // 12pt spacing after each paragraph
                line: opts.lineSpacing
              },
              // No paragraph indentation for clean left-aligned text
              indent: { firstLine: 0 }
            })
          );
        }
      });
    });

    return paragraphs;
  }

  private cleanMarkdownFormatting(content: string): string {
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
    // Clean up the content and split into paragraphs
    return content
      .split(/\n\s*\n/) // Split on double line breaks
      .map(p => p.replace(/\n/g, ' ').trim()) // Replace single line breaks with spaces
      .filter(p => p.length > 0 && !p.match(/^(Copyright|Table of Contents|Chapter \d+)/)); // Filter out unwanted lines
  }

  // Preset configurations for different use cases
  static getKdpPreset(): DocxExportOptions {
    return {
      fontSize: 24, // 12pt
      fontFamily: "Times New Roman",
      lineSpacing: 240, // Single spacing for KDP
      margins: {
        top: 1440, // 1 inch
        right: 1440,
        bottom: 1440,
        left: 1440
      },
      includeTitle: true,
      includeToc: false,
      pageSize: 'US_LETTER',
      chapterStartsNewPage: true
    };
  }

  static getManuscriptPreset(): DocxExportOptions {
    return {
      fontSize: 24, // 12pt
      fontFamily: "Times New Roman",
      lineSpacing: 480, // Double spacing for manuscripts
      margins: {
        top: 1440, // 1 inch
        right: 1440,
        bottom: 1440,
        left: 1440
      },
      includeTitle: true,
      includeToc: false,
      pageSize: 'US_LETTER',
      chapterStartsNewPage: true
    };
  }

  static getEbookPreset(): DocxExportOptions {
    return {
      fontSize: 22, // 11pt
      fontFamily: "Arial",
      lineSpacing: 240, // Single spacing
      margins: {
        top: 720, // 0.5 inch
        right: 720,
        bottom: 720,
        left: 720
      },
      includeTitle: true,
      includeToc: true,
      pageSize: 'A4',
      chapterStartsNewPage: false
    };
  }

  static getCreateSpacePreset(): DocxExportOptions {
    return {
      fontSize: 20, // 10pt for better readability in small format
      fontFamily: "Aptos", // Using requested Aptos font
      lineSpacing: 264, // 1.1 spacing for optimal readability in 6x9
      margins: {
        top: 1080, // 0.75 inch
        right: 720, // 0.5 inch outside margin
        bottom: 1080, // 0.75 inch
        left: 1080 // 0.75 inch inside margin (gutter for binding)
      },
      includeTitle: true,
      includeToc: false,
      pageSize: 'CREATESPACE_6x9',
      chapterStartsNewPage: true
    };
  }
}

export const docxExportService = new DocxExportService();