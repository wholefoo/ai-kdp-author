import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TabStopPosition, TabStopType, PageBreak, TableOfContents, StyleLevel } from "docx";
import type { Novel, BibliographyEntry } from "@shared/schema";

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
  includeCopyright?: boolean;
  includeDedication?: boolean;
  includeAcknowledgements?: boolean;
  authorName?: string;
  isbn?: string;
  dedicationText?: string;
  acknowledgementsText?: string;
  // Non-fiction bibliography support
  includeBibliography?: boolean;
  bibliography?: BibliographyEntry[];
}

export class DocxExportService {
  
  private defaultOptions: DocxExportOptions = {
    fontSize: 24, // 12pt in half-points
    fontFamily: "Aptos",
    lineSpacing: 276, // 1.15 line spacing for professional look
    margins: {
      top: 1440, // 1 inch in twentieths of a point
      right: 1440,
      bottom: 1440,
      left: 1440
    },
    includeTitle: true,
    includeToc: true,
    pageSize: 'CREATESPACE_6x9',
    chapterStartsNewPage: true,
    includeCopyright: true,
    includeDedication: true,
    includeAcknowledgements: true,
    authorName: '',
    isbn: '',
    dedicationText: '',
    acknowledgementsText: '',
    includeBibliography: false,
    bibliography: []
  };

  async generateDocx(novel: Novel, options: Partial<DocxExportOptions> = {}): Promise<Buffer> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Parse the content to extract chapters
    const chapters = this.parseChapters(novel.manuscriptContent || "");
    
    // Create the document with professional styling
    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            basedOn: "Normal",
            next: "Normal",
            run: {
              font: opts.fontFamily,
              size: opts.fontSize
            },
            paragraph: {
              spacing: { line: opts.lineSpacing }
            }
          },
          {
            id: "Title",
            name: "Title",
            basedOn: "Normal",
            next: "Normal",
            run: {
              font: opts.fontFamily,
              size: 56, // 28pt
              bold: true
            },
            paragraph: {
              alignment: AlignmentType.CENTER,
              spacing: { after: 480 }
            }
          },
          {
            id: "Subtitle",
            name: "Subtitle",
            basedOn: "Normal",
            next: "Normal",
            run: {
              font: opts.fontFamily,
              size: 36, // 18pt
              italics: true
            },
            paragraph: {
              alignment: AlignmentType.CENTER,
              spacing: { after: 960 }
            }
          },
          {
            id: "ChapterTitle",
            name: "Chapter Title",
            basedOn: "Heading1",
            next: "Normal",
            run: {
              font: opts.fontFamily,
              size: 32, // 16pt
              bold: true
            },
            paragraph: {
              spacing: { before: 480, after: 480 }
            }
          },
          {
            id: "SectionHeader",
            name: "Section Header",
            basedOn: "Normal",
            next: "Normal",
            run: {
              font: opts.fontFamily,
              size: 28, // 14pt
              bold: true,
              allCaps: true
            },
            paragraph: {
              alignment: AlignmentType.CENTER,
              spacing: { before: 960, after: 480 }
            }
          }
        ]
      },
      sections: [{
        properties: {
          page: {
            margin: opts.margins,
            size: {
              orientation: "portrait",
              width: opts.pageSize === 'A4' ? 11906 : (opts.pageSize === 'CREATESPACE_6x9' ? 8640 : 12240),
              height: opts.pageSize === 'A4' ? 16838 : (opts.pageSize === 'CREATESPACE_6x9' ? 12960 : 15840)
            }
          }
        },
        children: this.buildDocumentContent(novel, chapters, opts)
      }]
    });

    // Generate the buffer
    return await Packer.toBuffer(doc);
  }

  private parseChapters(content: string): Array<{ title: string; chapterName: string; content: string }> {
    const chapters: Array<{ title: string; chapterName: string; content: string }> = [];
    
    // Clean content - remove front matter and page breaks
    let cleanContent = content
      .replace(/\[Page Break\]/g, '')
      .replace(/## Copyright[\s\S]*?(?=#{1,2}\s*Chapter|\*\*Chapter)/gi, '')
      .replace(/## Table of Contents[\s\S]*?(?=#{1,2}\s*Chapter|\*\*Chapter)/gi, '')
      .replace(/## About the Author[\s\S]*$/gi, '')
      .trim();

    // Remove book title at the very beginning (# Title line before chapters)
    cleanContent = cleanContent.replace(/^#\s+[^\n]+\n+/i, '');

    // PATTERN 1: Markdown heading format: # Chapter X: Title or ## Chapter X: Title
    const markdownChapterRegex = /#{1,2}\s*Chapter\s+(\d+)(?:\s*:\s*([^\n]+))?\n/gi;
    let match;
    const chapterMatches: Array<{ index: number; fullMatch: string; num: string; name: string }> = [];
    
    while ((match = markdownChapterRegex.exec(cleanContent)) !== null) {
      chapterMatches.push({
        index: match.index,
        fullMatch: match[0],
        num: match[1],
        name: (match[2] || '').trim()
      });
    }

    if (chapterMatches.length > 0) {
      for (let i = 0; i < chapterMatches.length; i++) {
        const startIndex = chapterMatches[i].index + chapterMatches[i].fullMatch.length;
        const endIndex = i < chapterMatches.length - 1 ? chapterMatches[i + 1].index : cleanContent.length;
        let chapterContent = cleanContent.substring(startIndex, endIndex).trim();
        
        chapterContent = this.removeDuplicateChapterHeaders(chapterContent);
        
        if (chapterContent) {
          const chapterNum = chapterMatches[i].num;
          const chapterName = chapterMatches[i].name;
          chapters.push({
            title: chapterName ? `CHAPTER ${chapterNum}: ${chapterName}` : `CHAPTER ${chapterNum}`,
            chapterName: chapterName,
            content: chapterContent
          });
        }
      }
      return chapters;
    }

    // PATTERN 2: Bold format: **Chapter X: Title** or **Chapter X**
    const boldChapterRegex = /\*\*Chapter\s+(\d+)(?:\s*:\s*([^*]+))?\*\*/gi;
    const boldMatches: Array<{ index: number; fullMatch: string; num: string; name: string }> = [];
    
    while ((match = boldChapterRegex.exec(cleanContent)) !== null) {
      boldMatches.push({
        index: match.index,
        fullMatch: match[0],
        num: match[1],
        name: (match[2] || '').trim()
      });
    }

    if (boldMatches.length > 0) {
      for (let i = 0; i < boldMatches.length; i++) {
        const startIndex = boldMatches[i].index + boldMatches[i].fullMatch.length;
        const endIndex = i < boldMatches.length - 1 ? boldMatches[i + 1].index : cleanContent.length;
        let chapterContent = cleanContent.substring(startIndex, endIndex).trim();
        
        chapterContent = this.removeDuplicateChapterHeaders(chapterContent);
        
        if (chapterContent) {
          const chapterNum = boldMatches[i].num;
          const chapterName = boldMatches[i].name;
          chapters.push({
            title: chapterName ? `CHAPTER ${chapterNum}: ${chapterName}` : `CHAPTER ${chapterNum}`,
            chapterName: chapterName,
            content: chapterContent
          });
        }
      }
      return chapters;
    }

    // PATTERN 3: Plain text format: Chapter X: Title or Chapter X
    const plainChapterRegex = /^Chapter\s+(\d+)(?:\s*:\s*(.+))?$/gim;
    const plainMatches: Array<{ index: number; fullMatch: string; num: string; name: string }> = [];
    
    while ((match = plainChapterRegex.exec(cleanContent)) !== null) {
      plainMatches.push({
        index: match.index,
        fullMatch: match[0],
        num: match[1],
        name: (match[2] || '').trim()
      });
    }

    if (plainMatches.length > 0) {
      for (let i = 0; i < plainMatches.length; i++) {
        const startIndex = plainMatches[i].index + plainMatches[i].fullMatch.length;
        const endIndex = i < plainMatches.length - 1 ? plainMatches[i + 1].index : cleanContent.length;
        let chapterContent = cleanContent.substring(startIndex, endIndex).trim();
        
        chapterContent = this.removeDuplicateChapterHeaders(chapterContent);
        
        if (chapterContent) {
          const chapterNum = plainMatches[i].num;
          const chapterName = plainMatches[i].name;
          chapters.push({
            title: chapterName ? `CHAPTER ${chapterNum}: ${chapterName}` : `CHAPTER ${chapterNum}`,
            chapterName: chapterName,
            content: chapterContent
          });
        }
      }
      return chapters;
    }

    // If no chapters found, treat entire content as one chapter
    if (chapters.length === 0 && cleanContent.trim()) {
      const processedContent = this.removeDuplicateChapterHeaders(cleanContent.trim());
      chapters.push({
        title: "CHAPTER 1",
        chapterName: "",
        content: processedContent
      });
    }

    return chapters;
  }

  private removeDuplicateChapterHeaders(content: string): string {
    return content
      .replace(/^#{1,6}\s*Chapter\s+\d+[^\n]*\n?/gmi, '')
      .replace(/^\*\*Chapter\s+\d+[^*]*\*\*\n?/gmi, '')
      .replace(/^Chapter\s+\d+[^\n]*\n?/gmi, '')
      .trim();
  }

  private buildDocumentContent(novel: Novel, chapters: Array<{ title: string; chapterName: string; content: string }>, opts: DocxExportOptions): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const currentYear = new Date().getFullYear();
    const authorName = opts.authorName || 'Author Name';

    // ===== TITLE PAGE =====
    if (opts.includeTitle && novel.title) {
      // Add vertical spacing to center title on page
      paragraphs.push(
        new Paragraph({ children: [], spacing: { after: 2400 } }),
        new Paragraph({ children: [], spacing: { after: 2400 } }),
        new Paragraph({ children: [], spacing: { after: 2400 } })
      );
      
      // Main Title
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: novel.title.toUpperCase(),
              font: opts.fontFamily,
              size: 56, // 28pt
              bold: true
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 480 }
        })
      );
      
      // Subtitle (if available from plot or genre)
      if (novel.genre) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `A ${novel.genre} Novel`,
                font: opts.fontFamily,
                size: 28, // 14pt
                italics: true
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 1920 }
          })
        );
      }
      
      // Author Name
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: authorName,
              font: opts.fontFamily,
              size: 32, // 16pt
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 480 }
        })
      );
      
      // Page break after title page
      paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
    }

    // ===== COPYRIGHT PAGE =====
    if (opts.includeCopyright) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Copyright © ${currentYear} ${authorName}`,
              font: opts.fontFamily,
              size: opts.fontSize
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "All rights reserved.",
              font: opts.fontFamily,
              size: opts.fontSize
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 480 }
        })
      );
      
      // ISBN if provided
      if (opts.isbn) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `ISBN: ${opts.isbn}`,
                font: opts.fontFamily,
                size: opts.fontSize
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 }
          })
        );
      }
      
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Independently published",
              font: opts.fontFamily,
              size: opts.fontSize
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 480 }
        }),
        new Paragraph({ children: [new PageBreak()] })
      );
    }

    // ===== DEDICATION PAGE =====
    if (opts.includeDedication) {
      const dedicationText = opts.dedicationText || 
        `To all the dreamers and storytellers who dare to bring their imagination to life.`;
      
      // Add vertical spacing
      paragraphs.push(
        new Paragraph({ children: [], spacing: { after: 2400 } }),
        new Paragraph({ children: [], spacing: { after: 2400 } })
      );
      
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "DEDICATION",
              font: opts.fontFamily,
              size: 28, // 14pt
              bold: true,
              allCaps: true
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 480 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: dedicationText,
              font: opts.fontFamily,
              size: opts.fontSize,
              italics: true
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 240, line: opts.lineSpacing }
        }),
        new Paragraph({ children: [new PageBreak()] })
      );
    }

    // ===== ACKNOWLEDGEMENTS PAGE =====
    if (opts.includeAcknowledgements) {
      const acknowledgementsText = opts.acknowledgementsText ||
        `This book exists because many people helped along the way.\n\nMy gratitude to the readers who give stories life, to the creative minds who inspire new worlds, and to everyone who supported this journey from the first word to the last.\n\nThank you for believing in the power of storytelling.`;
      
      // Add vertical spacing
      paragraphs.push(
        new Paragraph({ children: [], spacing: { after: 1200 } })
      );
      
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "ACKNOWLEDGEMENTS",
              font: opts.fontFamily,
              size: 28, // 14pt
              bold: true,
              allCaps: true
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 480 }
        })
      );
      
      // Split acknowledgements into paragraphs
      const ackParagraphs = acknowledgementsText.split('\n\n');
      ackParagraphs.forEach(ackPara => {
        if (ackPara.trim()) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: ackPara.trim(),
                  font: opts.fontFamily,
                  size: opts.fontSize
                })
              ],
              spacing: { after: 240, line: opts.lineSpacing }
            })
          );
        }
      });
      
      paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
    }

    // ===== TABLE OF CONTENTS =====
    if (opts.includeToc && chapters.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Table of Contents",
              font: opts.fontFamily,
              size: 32, // 16pt
              bold: true
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 480 }
        })
      );
      
      // Add chapter entries
      chapters.forEach((chapter, index) => {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: chapter.title,
                font: opts.fontFamily,
                size: opts.fontSize
              })
            ],
            spacing: { after: 120 }
          })
        );
      });
      
      // Add Bibliography to TOC if included
      if (opts.includeBibliography && opts.bibliography && opts.bibliography.length > 0) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Bibliography",
                font: opts.fontFamily,
                size: opts.fontSize
              })
            ],
            spacing: { after: 120 }
          })
        );
      }
      
      paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
    }

    // ===== CHAPTERS =====
    chapters.forEach((chapter, index) => {
      // Chapter title with proper page break
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: chapter.title,
              font: opts.fontFamily,
              size: 32, // 16pt for chapter titles
              bold: true
            })
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.LEFT,
          spacing: { 
            before: 960,
            after: 480,
            line: opts.lineSpacing
          },
          pageBreakBefore: index > 0 && opts.chapterStartsNewPage
        })
      );

      // Chapter content
      const cleanContent = this.cleanMarkdownFormatting(chapter.content);
      const paragraphTexts = this.splitIntoParagraphs(cleanContent);
      
      paragraphTexts.forEach((paragraphText, pIndex) => {
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
                after: 200,
                line: opts.lineSpacing
              },
              // No paragraph indentation per user preference
              indent: { firstLine: 0 }
            })
          );
        }
      });
    });

    // ===== BIBLIOGRAPHY (for non-fiction) =====
    if (opts.includeBibliography && opts.bibliography && opts.bibliography.length > 0) {
      paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
      
      // Bibliography header
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Bibliography",
              font: opts.fontFamily,
              size: 32, // 16pt
              bold: true
            })
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 480 }
        })
      );

      // Sort bibliography by author
      const sortedBibliography = [...opts.bibliography].sort((a, b) => 
        (a.author || 'Unknown').localeCompare(b.author || 'Unknown')
      );

      // Add each bibliography entry
      sortedBibliography.forEach((entry, index) => {
        const author = entry.author || 'Unknown Author';
        const year = entry.publishDate || 'n.d.';
        const title = entry.title;
        const source = entry.source;
        
        // Format: Author (Year). Title. Source.
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${index + 1}. `,
                font: opts.fontFamily,
                size: opts.fontSize || 24
              }),
              new TextRun({
                text: `${author} (${year}). `,
                font: opts.fontFamily,
                size: opts.fontSize || 24
              }),
              new TextRun({
                text: `${title}. `,
                font: opts.fontFamily,
                size: opts.fontSize || 24,
                italics: true
              }),
              new TextRun({
                text: source,
                font: opts.fontFamily,
                size: opts.fontSize || 24
              })
            ],
            spacing: { after: 200 },
            indent: { left: 360, hanging: 360 } // Hanging indent for bibliography
          })
        );
      });
    }

    return paragraphs;
  }

  private cleanMarkdownFormatting(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^#{1,6}\s*.*/gm, '')
      .replace(/\[Page Break\]/g, '')
      .replace(/^\s*-{3,}\s*$/gm, '')
      .replace(/^\s*\*{3,}\s*$/gm, '')
      .replace(/^Chapter\s+\d+.*$/gmi, '')
      .replace(/^\*\*Chapter\s+\d+.*?\*\*$/gmi, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s+/gm, '')
      .trim();
  }

  private splitIntoParagraphs(content: string): string[] {
    return content
      .split(/\n\s*\n/)
      .map(p => p.replace(/\n/g, ' ').trim())
      .filter(p => p.length > 0 && !p.match(/^(Copyright|Table of Contents|Chapter \d+)/));
  }

  // ===== PRESETS =====
  
  static getKdpPreset(): DocxExportOptions {
    return {
      fontSize: 22, // 11pt
      fontFamily: "Aptos",
      lineSpacing: 276, // 1.15 spacing
      margins: {
        top: 1080, // 0.75 inch
        right: 720, // 0.5 inch (outside)
        bottom: 1080, // 0.75 inch
        left: 1080 // 0.75 inch (inside/gutter)
      },
      includeTitle: true,
      includeToc: true,
      includeCopyright: true,
      includeDedication: true,
      includeAcknowledgements: true,
      pageSize: 'CREATESPACE_6x9',
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
      includeCopyright: false,
      includeDedication: false,
      includeAcknowledgements: false,
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
      includeCopyright: true,
      includeDedication: true,
      includeAcknowledgements: false,
      pageSize: 'A4',
      chapterStartsNewPage: false
    };
  }

  static getCreateSpacePreset(): DocxExportOptions {
    return {
      fontSize: 22, // 11pt for 6x9 format
      fontFamily: "Aptos",
      lineSpacing: 276, // 1.15 spacing for optimal readability
      margins: {
        top: 1080, // 0.75 inch
        right: 720, // 0.5 inch outside margin
        bottom: 1080, // 0.75 inch
        left: 1080 // 0.75 inch inside margin (gutter for binding)
      },
      includeTitle: true,
      includeToc: true,
      includeCopyright: true,
      includeDedication: true,
      includeAcknowledgements: true,
      pageSize: 'CREATESPACE_6x9',
      chapterStartsNewPage: true
    };
  }

  static getProfessionalNovelPreset(): DocxExportOptions {
    return {
      fontSize: 22, // 11pt
      fontFamily: "Aptos",
      lineSpacing: 276, // 1.15 spacing
      margins: {
        top: 1080, // 0.75 inch
        right: 720, // 0.5 inch
        bottom: 1080, // 0.75 inch  
        left: 1080 // 0.75 inch
      },
      includeTitle: true,
      includeToc: true,
      includeCopyright: true,
      includeDedication: true,
      includeAcknowledgements: true,
      pageSize: 'CREATESPACE_6x9',
      chapterStartsNewPage: true
    };
  }
}

export const docxExportService = new DocxExportService();
