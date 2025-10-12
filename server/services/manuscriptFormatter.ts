import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, Header, Footer, convertInchesToTwip } from "docx";
import * as fs from 'fs/promises';
import * as path from 'path';
import { isWrittenNumberChapterHeading } from '../utils/numberParser';

export interface FormattingSettings {
  fontSize: number;
  lineSpacing: number;
  margins: { top: number; bottom: number; left: number; right: number };
  fontFamily: string;
  pageSize: string;
  includePageNumbers: boolean;
  chapterBreaks: boolean;
  headerFooter: boolean;
}

export interface FormattingOptions {
  includeMetadata: boolean;
  optimizeForPrint: boolean;
  includeTableOfContents: boolean;
}

export class ManuscriptFormatterService {
  
  async formatManuscript(
    content: string,
    title: string,
    preset: string,
    format: string,
    settings: FormattingSettings,
    options: FormattingOptions
  ): Promise<{ filePath: string; mimeType: string }> {
    
    switch (format.toLowerCase()) {
      case 'docx':
        return this.formatToDocx(content, title, settings, options);
      case 'pdf':
        return this.formatToPdf(content, title, settings, options);
      case 'html':
        return this.formatToHtml(content, title, settings, options);
      case 'markdown':
        return this.formatToMarkdown(content, title, settings, options);
      case 'epub':
        return this.formatToEpub(content, title, settings, options);
      case 'mobi':
        return this.formatToMobi(content, title, settings, options);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private async formatToDocx(
    content: string,
    title: string,
    settings: FormattingSettings,
    options: FormattingOptions
  ): Promise<{ filePath: string; mimeType: string }> {
    
    const sections = this.parseContent(content);
    
    // Create paragraphs for document content
    const docParagraphs: Paragraph[] = [];
    
    // Add title if requested and not already in content
    if (options.includeMetadata) {
      const contentHasTitle = sections.some(section => 
        section.type === 'heading' && 
        section.level === 1 && 
        section.content.toLowerCase().replace(/[^\w\s]/g, '').trim() === 
        title.toLowerCase().replace(/[^\w\s]/g, '').trim()
      );
      
      if (!contentHasTitle) {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                font: settings.fontFamily,
                size: (settings.fontSize + 6) * 2,
                bold: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              before: 0,
              after: convertInchesToTwip(0.5),
            },
          })
        );
      }
    }

    // Process content sections
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      if (section.type === 'heading') {
        // Add page break for chapters if enabled
        if (settings.chapterBreaks && section.level === 2 && i > 0) {
          docParagraphs.push(
            new Paragraph({
              children: [new PageBreak()],
            })
          );
        }
        
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: section.content,
                font: settings.fontFamily,
                size: (settings.fontSize + (section.level === 1 ? 6 : 2)) * 2,
                bold: true,
              }),
            ],
            alignment: section.level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: {
              before: convertInchesToTwip(0.25),
              after: convertInchesToTwip(0.15),
            },
          })
        );
      } else {
        // Split paragraphs by double line breaks
        const paragraphs = section.content.split('\n\n').filter(p => p.trim());
        
        for (const paragraph of paragraphs) {
          if (paragraph.trim()) {
            docParagraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: paragraph.trim(),
                    font: settings.fontFamily,
                    size: settings.fontSize * 2,
                  }),
                ],
                spacing: {
                  line: Math.round(settings.lineSpacing * 240),
                  after: convertInchesToTwip(0.08),
                },
                alignment: AlignmentType.LEFT, // Changed from JUSTIFIED to LEFT
                // Removed firstLine indent
              })
            );
          }
        }
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(settings.margins.top),
                bottom: convertInchesToTwip(settings.margins.bottom),
                left: convertInchesToTwip(settings.margins.left),
                right: convertInchesToTwip(settings.margins.right),
              },
              size: this.getPageSize(settings.pageSize),
            },
          },
          children: docParagraphs,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const fileName = `${title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}_formatted.docx`;
    const filePath = path.join(process.cwd(), 'uploads', fileName);
    
    await fs.writeFile(filePath, buffer);
    
    return {
      filePath,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  private async formatToHtml(
    content: string,
    title: string,
    settings: FormattingSettings,
    options: FormattingOptions
  ): Promise<{ filePath: string; mimeType: string }> {
    
    const sections = this.parseContent(content);
    
    const css = `
      body {
        font-family: ${settings.fontFamily}, serif;
        font-size: ${settings.fontSize}pt;
        line-height: ${settings.lineSpacing};
        margin: ${settings.margins.top}in ${settings.margins.right}in ${settings.margins.bottom}in ${settings.margins.left}in;
        max-width: ${settings.pageSize === 'responsive' ? '800px' : 'none'};
        margin: ${settings.pageSize === 'responsive' ? '0 auto' : 'initial'};
        padding: ${settings.pageSize === 'responsive' ? '2rem' : '0'};
      }
      
      h1 {
        font-size: ${settings.fontSize + 6}pt;
        text-align: center;
        margin: 2em 0 1.5em 0;
        font-weight: bold;
      }
      
      h2 {
        font-size: ${settings.fontSize + 2}pt;
        margin: 1.5em 0 1em 0;
        font-weight: bold;
        ${settings.chapterBreaks ? 'page-break-before: always;' : ''}
      }
      
      p {
        margin: 0 0 1em 0;
        text-indent: 1.5em;
        text-align: justify;
      }
      
      .chapter-break {
        page-break-before: always;
      }
      
      @media print {
        body {
          margin: ${settings.margins.top}in ${settings.margins.right}in ${settings.margins.bottom}in ${settings.margins.left}in;
        }
        
        @page {
          size: ${this.getPageSizeForCSS(settings.pageSize)};
          margin: 0;
        }
      }
    `;

    let html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>${css}</style>
      </head>
      <body>
    `;

    if (options.includeMetadata) {
      html += `<h1>${title}</h1>\n`;
    }

    for (const section of sections) {
      if (section.type === 'heading') {
        const level = section.level || 1;
        const breakClass = settings.chapterBreaks && level === 1 ? ' class="chapter-break"' : '';
        html += `<h${level}${breakClass}>${this.escapeHtml(section.content)}</h${level}>\n`;
      } else {
        const paragraphs = section.content.split('\n\n');
        for (const paragraph of paragraphs) {
          if (paragraph.trim()) {
            html += `<p>${this.escapeHtml(paragraph.trim())}</p>\n`;
          }
        }
      }
    }

    html += `
      </body>
      </html>
    `;

    const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_formatted.html`;
    const filePath = path.join(process.cwd(), 'uploads', fileName);
    
    await fs.writeFile(filePath, html, 'utf8');
    
    return {
      filePath,
      mimeType: 'text/html',
    };
  }

  private async formatToMarkdown(
    content: string,
    title: string,
    settings: FormattingSettings,
    options: FormattingOptions
  ): Promise<{ filePath: string; mimeType: string }> {
    
    const sections = this.parseContent(content);
    let markdown = '';

    if (options.includeMetadata) {
      markdown += `# ${title}\n\n`;
    }

    for (const section of sections) {
      if (section.type === 'heading') {
        const level = section.level || 1;
        markdown += `${'#'.repeat(level)} ${section.content}\n\n`;
      } else {
        markdown += `${section.content}\n\n`;
      }
    }

    const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_formatted.md`;
    const filePath = path.join(process.cwd(), 'uploads', fileName);
    
    await fs.writeFile(filePath, markdown, 'utf8');
    
    return {
      filePath,
      mimeType: 'text/markdown',
    };
  }

  private async formatToPdf(
    content: string,
    title: string,
    settings: FormattingSettings,
    options: FormattingOptions
  ): Promise<{ filePath: string; mimeType: string }> {
    // Generate HTML with print-optimized CSS for PDF conversion
    const htmlResult = await this.formatToHtml(content, title, settings, options);
    
    // For now, return HTML that's optimized for printing to PDF
    // Users can print to PDF from their browser
    const fileName = `${title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}_print_ready.html`;
    const newFilePath = path.join(process.cwd(), 'uploads', fileName);
    
    // Add print-specific CSS
    const htmlContent = await fs.readFile(htmlResult.filePath, 'utf8');
    const printOptimizedHtml = htmlContent.replace(
      '</style>',
      `
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          h1, h2 {
            page-break-after: avoid;
          }
          
          p {
            orphans: 3;
            widows: 3;
          }
        }
      </style>`
    );
    
    await fs.writeFile(newFilePath, printOptimizedHtml, 'utf8');
    
    return {
      filePath: newFilePath,
      mimeType: 'text/html',
    };
  }

  private async formatToEpub(
    content: string,
    title: string,
    settings: FormattingSettings,
    options: FormattingOptions
  ): Promise<{ filePath: string; mimeType: string }> {
    // Simplified EPUB structure - in production, use epub-gen or similar
    const htmlResult = await this.formatToHtml(content, title, settings, options);
    return {
      filePath: htmlResult.filePath,
      mimeType: 'text/html', // Would be 'application/epub+zip' with proper EPUB generation
    };
  }

  private async formatToMobi(
    content: string,
    title: string,
    settings: FormattingSettings,
    options: FormattingOptions
  ): Promise<{ filePath: string; mimeType: string }> {
    // MOBI format requires specialized tools like kindlegen
    const htmlResult = await this.formatToHtml(content, title, settings, options);
    return {
      filePath: htmlResult.filePath,
      mimeType: 'text/html', // Would be 'application/x-mobipocket-ebook' with proper MOBI generation
    };
  }

  /**
   * Validate if a string is a proper Roman numeral
   */
  private isValidRomanNumeral(roman: string): boolean {
    // Basic validation - check if it matches common Roman numeral patterns
    const romanPattern = /^(?=[MDCLXVI])M{0,3}(C[MD]|D?C{0,3})(X[CL]|L?X{0,3})(I[XV]|V?I{0,3})$/i;
    return romanPattern.test(roman);
  }


  /**
   * Enhanced heading detection with support for various chapter and title formats
   */
  private detectHeading(text: string): { isHeading: boolean; content: string; level: number } {
    if (!text || text.length === 0) {
      return { isHeading: false, content: text, level: 1 };
    }

    const trimmed = text.trim();

    // 1. Markdown headers (# ## ###)
    if (trimmed.startsWith('#')) {
      const level = trimmed.match(/^#+/)?.[0].length || 1;
      const headingText = trimmed.replace(/^#+\s*/, '').trim();
      return { isHeading: true, content: headingText, level: Math.min(level, 6) };
    }

    // 2. Roman numerals (comprehensive pattern including larger numerals)
    const romanNumerals = /^(?:Chapter\s+)?([IVXLCDM]+)(?:\s*[:.-]\s*(.*))?$/i;
    if (romanNumerals.test(trimmed)) {
      // Validate it's actually a valid roman numeral, not just random letters
      const romanPart = trimmed.match(romanNumerals)?.[1];
      if (romanPart && this.isValidRomanNumeral(romanPart)) {
        return { isHeading: true, content: trimmed, level: 2 };
      }
    }

    // 3. Written numbers (using comprehensive parser)
    if (isWrittenNumberChapterHeading(trimmed)) {
      return { isHeading: true, content: trimmed, level: 2 };
    }

    // 4. Various chapter formats (Chapter 1, CHAPTER 1, Ch. 1, Ch 1, etc.)
    const chapterVariants = [
      /^Chapter\s+\d+(?:\s*[:.-]\s*.*)?$/i,
      /^CHAPTER\s+\d+(?:\s*[:.-]\s*.*)?$/i,
      /^Ch\.?\s+\d+(?:\s*[:.-]\s*.*)?$/i,
      /^Chap\.?\s+\d+(?:\s*[:.-]\s*.*)?$/i,
      /^\d+\.?\s+.*$/,  // Just numbers: "1. Title" or "1 Title"
    ];

    for (const regex of chapterVariants) {
      if (regex.test(trimmed)) {
        return { isHeading: true, content: trimmed, level: 2 };
      }
    }

    // 5. Special sections (Prologue, Epilogue, Introduction, etc.)
    const specialSections = /^(Prologue|Epilogue|Introduction|Preface|Foreword|Afterword|Conclusion|Acknowledgments?|Bibliography|Index|Appendix[^\w]*[A-Z]?|Glossary|References?)(?:\s*[:.-].*)?$/i;
    if (specialSections.test(trimmed)) {
      return { isHeading: true, content: trimmed, level: 2 };
    }

    // 6. Parts and Books (Part I, Book 1, Section A, etc.)
    const partsBooks = /^(Part|Book|Section|Volume)\s+([IVXLCDM]+|\d+|[A-Z])(?:\s*[:.-]\s*.*)?$/i;
    if (partsBooks.test(trimmed)) {
      // For roman numerals, validate them
      const romanMatch = trimmed.match(/^(Part|Book|Section|Volume)\s+([IVXLCDM]+)/i);
      if (romanMatch && romanMatch[2]) {
        if (this.isValidRomanNumeral(romanMatch[2])) {
          return { isHeading: true, content: trimmed, level: 1 };  // Higher level for parts/books
        }
      } else {
        // Non-roman (numeric or alphabetic)
        return { isHeading: true, content: trimmed, level: 1 };
      }
    }

    // 7. Standalone titles (very restrictive to avoid false positives)
    if (trimmed.length > 0 && trimmed.length < 80) {  // Reasonable title length
      // Check for all caps (potential title) - exclude any sentences with punctuation
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /^[A-Z\s\d\W]+$/.test(trimmed)) {
        // Exclude any dialogue, punctuation, or sentence-like patterns
        const hasSentencePunctuation = trimmed.includes('.') || trimmed.includes(',') ||
                                      trimmed.includes('!') || trimmed.includes('?') || 
                                      trimmed.includes('"') || trimmed.includes("'") ||
                                      trimmed.includes(':') || trimmed.includes(';');
        
        if (!hasSentencePunctuation && trimmed.split(/\s+/).length <= 6) {
          // Additional check: must have at least one space (multi-word titles)
          if (trimmed.includes(' ')) {
            return { isHeading: true, content: trimmed, level: 2 };
          }
        }
      }

      // Check for title-like patterns (short lines, no periods except at end)
      if (trimmed.length < 50 && !trimmed.includes('.') && /^[A-Z]/.test(trimmed)) {
        // Look for title indicators: length, capitalization, lack of typical sentence structure
        const words = trimmed.split(/\s+/);
        if (words.length <= 6 && words.every(word => 
          word.length === 0 || 
          /^[A-Z]/.test(word) || 
          ['a', 'an', 'and', 'but', 'or', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with'].includes(word.toLowerCase())
        )) {
          // Additional check: not dialogue or exclamatory
          if (!trimmed.includes('!') && !trimmed.includes('?') && !trimmed.includes('"')) {
            return { isHeading: true, content: trimmed, level: 2 };
          }
        }
      }
    }

    // 8. Numeric patterns (1., 2., etc. at start of line)
    const numericPattern = /^(\d+)\.?\s+(.+)$/;
    const numMatch = numericPattern.exec(trimmed);
    if (numMatch && numMatch[2].length < 100) {  // Not too long to be a regular paragraph
      const num = parseInt(numMatch[1]);
      if (num <= 100) {  // Reasonable chapter/section number
        return { isHeading: true, content: trimmed, level: 2 };
      }
    }

    return { isHeading: false, content: text, level: 1 };
  }

  private parseContent(content: string): Array<{ type: 'heading' | 'paragraph'; content: string; level?: number }> {
    // Split content into clean lines and remove duplicates at the line level first
    const rawLines = content.split('\n');
    const uniqueLines: string[] = [];
    const seenNormalizedLines = new Set<string>();
    
    for (const line of rawLines) {
      const trimmed = line.trim();
      if (!trimmed) {
        uniqueLines.push(line); // Keep empty lines for structure
        continue;
      }
      
      // Normalize line for duplicate detection
      const normalized = trimmed.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
      if (!seenNormalizedLines.has(normalized)) {
        seenNormalizedLines.add(normalized);
        uniqueLines.push(line);
      }
    }
    
    // Now parse the cleaned content
    const sections: Array<{ type: 'heading' | 'paragraph'; content: string; level?: number }> = [];
    let currentParagraph = '';

    for (const line of uniqueLines) {
      const trimmed = line.trim();
      
      if (!trimmed) {
        if (currentParagraph) {
          sections.push({ type: 'paragraph', content: currentParagraph.trim() });
          currentParagraph = '';
        }
        continue;
      }
      
      // Enhanced heading detection - check for various chapter and title patterns
      const headingResult = this.detectHeading(trimmed);
      
      if (headingResult.isHeading) {
        // Found a heading, finalize current paragraph first
        if (currentParagraph) {
          sections.push({ type: 'paragraph', content: currentParagraph.trim() });
          currentParagraph = '';
        }
        sections.push({ type: 'heading', content: headingResult.content, level: headingResult.level });
      } else {
        // Everything else is content
        currentParagraph += (currentParagraph ? ' ' : '') + trimmed;
      }
    }

    if (currentParagraph) {
      sections.push({ type: 'paragraph', content: currentParagraph.trim() });
    }

    return sections;
  }

  private createDocxContent(
    sections: Array<{ type: 'heading' | 'paragraph'; content: string; level?: number }>,
    settings: FormattingSettings,
    options: FormattingOptions
  ): Array<any> {
    const children: Array<any> = [];

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      if (section.type === 'heading') {
        if (settings.chapterBreaks && section.level === 2 && i > 0) {
          children.push(new PageBreak());
        }
        
        children.push(
          new Paragraph({
            text: section.content,
            heading: section.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
            alignment: section.level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
          })
        );
      } else {
        const paragraphs = section.content.split('\n\n');
        for (const paragraph of paragraphs) {
          if (paragraph.trim()) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: paragraph.trim(),
                    font: settings.fontFamily,
                    size: settings.fontSize * 2,
                  }),
                ],
                spacing: {
                  line: Math.round(settings.lineSpacing * 240),
                  after: 200,
                },
                alignment: AlignmentType.LEFT, // No indentation, left aligned
              })
            );
          }
        }
      }
    }

    return children;
  }

  private inchesToTwips(inches: number): number {
    return convertInchesToTwip(inches);
  }

  private getPageSize(pageSize: string): any {
    switch (pageSize) {
      case '6x9':
        return { width: convertInchesToTwip(6), height: convertInchesToTwip(9) };
      case '5.5x8.5':
        return { width: convertInchesToTwip(5.5), height: convertInchesToTwip(8.5) };
      case '8.5x11':
        return { width: convertInchesToTwip(8.5), height: convertInchesToTwip(11) };
      default:
        return { width: convertInchesToTwip(8.5), height: convertInchesToTwip(11) };
    }
  }

  private getPageSizeForCSS(pageSize: string): string {
    switch (pageSize) {
      case '6x9':
        return '6in 9in';
      case '5.5x8.5':
        return '5.5in 8.5in';
      case '8.5x11':
        return '8.5in 11in';
      case 'responsive':
        return 'auto';
      default:
        return '8.5in 11in';
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}