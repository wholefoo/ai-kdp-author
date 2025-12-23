import { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak, Header, Footer } from "docx";
import PDFDocument from "pdfkit";
import * as fs from "fs/promises";
import * as path from "path";
import { storage } from "../storage";

export interface ExportOptions {
  format: "docx" | "pdf" | "txt" | "markdown";
  fontSize: number;
  fontFamily: string;
  lineSpacing: number;
  marginSize: "narrow" | "normal" | "wide";
  pageSize: "letter" | "a4" | "legal" | "6x9";
  includePageNumbers: boolean;
  includeHeader: boolean;
  includeFooter: boolean;
  chapterPageBreaks: boolean;
  indentParagraphs: boolean;
  customTitle?: string;
  customAuthor?: string;
}

interface ExportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export class ExportService {
  private getMarginInTwips(size: string): number {
    switch (size) {
      case "narrow": return 720; // 0.5 inch
      case "wide": return 1800; // 1.25 inch
      default: return 1440; // 1 inch (normal)
    }
  }

  private getPageSize(size: string): { width: number; height: number } {
    switch (size) {
      case "a4":
        return { width: 11906, height: 16838 }; // A4 in twips
      case "legal":
        return { width: 12240, height: 20160 }; // Legal in twips
      case "6x9":
        return { width: 8640, height: 12960 }; // 6x9 CreateSpace in twips
      default:
        return { width: 12240, height: 15840 }; // Letter in twips
    }
  }

  private parseContent(content: string): Array<{ type: 'chapter' | 'paragraph', content: string }> {
    // Clean content by removing HTML tags, markdown formatting, and normalizing whitespace
    let cleanedContent = content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      // Remove markdown formatting while preserving content
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold **text**
      .replace(/\*(.*?)\*/g, '$1') // Remove italic *text*
      .replace(/^#{1,6}\s+(.+)$/gm, '$1') // Convert markdown headers to plain text (# Chapter 1 -> Chapter 1)
      .replace(/^\s*-{3,}\s*$/gm, '') // Remove horizontal rules (---)
      .replace(/^\s*\*{3,}\s*$/gm, '') // Remove horizontal rules (***)
      .replace(/\[Page Break\]/g, ''); // Remove page break markers
    
    const lines = cleanedContent.split('\n').filter(line => line.trim());
    const parsed: Array<{ type: 'chapter' | 'paragraph', content: string }> = [];
    const seenChapterTitles = new Set<string>(); // Track both original and formatted chapter titles to prevent duplicates
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines or very short lines (likely formatting artifacts)
      if (trimmedLine.length < 3) continue;
      
      // Enhanced chapter detection - matches upload and analyzer logic
      const isChapterHeading = (
        /^chapter\s+\d+/i.test(trimmedLine) || 
        /^ch\.\s*\d+/i.test(trimmedLine) ||
        /^chapter\s+[ivxlcdm]+/i.test(trimmedLine) ||
        /^\d+\s+[A-Z]/.test(trimmedLine) || // Number followed by uppercase text (e.g., "12 VILLAGE REVELRY")
        /^\d+\.\s*[A-Z]/.test(trimmedLine) || // Number with dot (e.g., "12. Village Revelry")
        /^[IVXLCDM]+\.\s*[A-Z]/i.test(trimmedLine) // Roman numerals with dot
      ) && trimmedLine.length < 100; // Chapter titles should be reasonably short
      
      if (isChapterHeading) {
        // Format chapter title to clean style: "1 TITLE"
        const formattedTitle = this.formatChapterTitle(trimmedLine);
        
        // Check for duplicate chapter titles using both original and formatted versions
        const normalizedOriginal = trimmedLine.toLowerCase().replace(/\s+/g, ' ').replace(/[\"\':]+/g, '').trim();
        const normalizedFormatted = formattedTitle.toLowerCase().replace(/\s+/g, ' ');
        
        // Skip if we've seen either version of this chapter
        if (seenChapterTitles.has(normalizedOriginal) || seenChapterTitles.has(normalizedFormatted)) {
          continue;
        }
        seenChapterTitles.add(normalizedOriginal);
        seenChapterTitles.add(normalizedFormatted);
        
        parsed.push({ type: 'chapter', content: formattedTitle });
      } else if (trimmedLine.length > 0) {
        // Add all paragraph content without duplicate checking (to preserve refrains, dialogue callbacks, etc.)
        parsed.push({ type: 'paragraph', content: trimmedLine });
      }
    }
    
    return parsed;
  }

  /**
   * Format chapter title to professional "Chapter X: Title" format
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
        // Format as "Chapter X: Title Name"
        return `Chapter ${chapterNum}: ${cleanName}`;
      } else {
        return `Chapter ${chapterNum}`;
      }
    }
    
    // Fallback - return original
    return title;
  }

  private createDocumentContent(parsedContent: Array<{ type: 'chapter' | 'paragraph', content: string }>, options: ExportOptions): Paragraph[] {
    const elements: Paragraph[] = [];
    const titleNormalized = (options.customTitle || '').toLowerCase().replace(/\s+/g, ' ').trim();
    
    for (let i = 0; i < parsedContent.length; i++) {
      const item = parsedContent[i];
      
      // Skip content that matches the book title (to prevent duplication)
      if (titleNormalized && item.content.toLowerCase().replace(/\s+/g, ' ').trim() === titleNormalized) {
        continue;
      }
      
      if (item.type === 'chapter') {
        // Add page break before chapter (except for the first one)
        // Only add page break if we have content elements before this chapter
        if (options.chapterPageBreaks && elements.length > 0) {
          elements.push(new Paragraph({
            children: [new PageBreak()],
          }));
        }
        
        // Add chapter heading
        elements.push(new Paragraph({
          children: [new TextRun({
            text: item.content,
            bold: true,
            size: (options.fontSize + 2) * 2,
            font: options.fontFamily,
          })],
          alignment: AlignmentType.CENTER,
          spacing: { 
            before: options.chapterPageBreaks && elements.length > 0 ? 200 : 400, 
            after: 400,
            line: Math.round(options.lineSpacing * 240),
          },
        }));
      } else {
        // Add paragraph content
        elements.push(new Paragraph({
          children: [new TextRun({
            text: item.content,
            size: options.fontSize * 2,
            font: options.fontFamily,
          })],
          indent: options.indentParagraphs ? { firstLine: 720 } : undefined,
          spacing: {
            line: Math.round(options.lineSpacing * 240),
            after: 120,
          },
        }));
      }
    }
    
    return elements;
  }

  async exportToDOCX(manuscriptId: string, options: ExportOptions): Promise<ExportResult> {
    const manuscript = await storage.getManuscript(manuscriptId);
    if (!manuscript) {
      throw new Error("Manuscript not found");
    }

    const margin = this.getMarginInTwips(options.marginSize);
    const pageSize = this.getPageSize(options.pageSize);
    const parsedContent = this.parseContent(manuscript.cleanedText || manuscript.originalText);

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: {
              width: pageSize.width,
              height: pageSize.height,
            },
            margin: {
              top: margin,
              right: margin,
              bottom: margin,
              left: margin,
            },
          },
        },
        headers: options.includeHeader ? {
          default: new Header({
            children: [new Paragraph({
              children: [new TextRun({
                text: options.customTitle || manuscript.title,
                size: (options.fontSize - 2) * 2, // Convert to half-points
                font: options.fontFamily,
              })],
              alignment: AlignmentType.CENTER,
            })],
          }),
        } : undefined,
        footers: options.includePageNumbers ? {
          default: new Footer({
            children: [new Paragraph({
              children: [new TextRun({
                text: "Page ",
                font: options.fontFamily,
                size: options.fontSize * 2,
              })],
              alignment: AlignmentType.CENTER,
            })],
          }),
        } : undefined,
        children: [
          // Title page
          new Paragraph({
            children: [new TextRun({
              text: options.customTitle || manuscript.title,
              bold: true,
              size: (options.fontSize + 4) * 2,
              font: options.fontFamily,
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({
              text: `by ${options.customAuthor || 'Unknown Author'}`,
              size: options.fontSize * 2,
              font: options.fontFamily,
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 800 },
          }),
          new Paragraph({
            children: [new PageBreak()],
          }),
          
          // Content
          ...this.createDocumentContent(parsedContent, options),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `${manuscript.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;

    return {
      buffer,
      filename,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }

  async exportToPDF(manuscriptId: string, options: ExportOptions): Promise<ExportResult> {
    const manuscript = await storage.getManuscript(manuscriptId);
    if (!manuscript) {
      throw new Error("Manuscript not found");
    }

    const parsedContent = this.parseContent(manuscript.cleanedText || manuscript.originalText);
    
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: options.pageSize.toUpperCase() as any,
        margins: this.getPDFMargins(options.marginSize),
      });

      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const filename = `${manuscript.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
        resolve({
          buffer,
          filename,
          mimeType: "application/pdf",
        });
      });
      doc.on('error', reject);

      // Set font
      doc.font('Times-Roman').fontSize(options.fontSize);
      
      // Title page
      doc.fontSize(options.fontSize + 4);
      doc.text(options.customTitle || manuscript.title, {
        align: 'center',
      });
      
      doc.moveDown(2);
      doc.fontSize(options.fontSize);
      doc.text(`by ${options.customAuthor || 'Unknown Author'}`, {
        align: 'center',
      });
      
      doc.addPage();

      // Content
      parsedContent.forEach((item, index) => {
        if (item.type === 'chapter') {
          if (options.chapterPageBreaks && index > 0) {
            doc.addPage();
          }
          doc.fontSize(options.fontSize + 2);
          doc.text(item.content, {
            align: 'center',
            lineGap: options.lineSpacing * 2,
          });
          doc.moveDown(1);
          doc.fontSize(options.fontSize);
        } else {
          doc.text(item.content, {
            indent: options.indentParagraphs ? 36 : 0, // 0.5 inch
            lineGap: options.lineSpacing * 2,
          });
          doc.moveDown(0.5);
        }
      });

      // Add page numbers if requested
      if (options.includePageNumbers) {
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          doc.text(`Page ${i + 1}`, 0, doc.page.height - 50, { align: 'center' });
        }
      }

      doc.end();
    });
  }

  private getPDFMargins(size: string): { top: number; bottom: number; left: number; right: number } {
    switch (size) {
      case "narrow":
        return { top: 36, bottom: 36, left: 36, right: 36 }; // 0.5 inch
      case "wide":
        return { top: 90, bottom: 90, left: 90, right: 90 }; // 1.25 inch
      default:
        return { top: 72, bottom: 72, left: 72, right: 72 }; // 1 inch
    }
  }

  async exportToText(manuscriptId: string, options: ExportOptions): Promise<ExportResult> {
    const manuscript = await storage.getManuscript(manuscriptId);
    if (!manuscript) {
      throw new Error("Manuscript not found");
    }

    let content = `${options.customTitle || manuscript.title}\n`;
    content += `by ${options.customAuthor || 'Unknown Author'}\n`;
    content += '='.repeat(50) + '\n\n';
    
    const parsedContent = this.parseContent(manuscript.cleanedText || manuscript.originalText);
    
    parsedContent.forEach((item, index) => {
      if (item.type === 'chapter') {
        if (options.chapterPageBreaks && index > 0) {
          content += '\n\n' + '='.repeat(50) + '\n\n';
        }
        content += item.content.toUpperCase() + '\n\n';
      } else {
        const indent = options.indentParagraphs ? '    ' : '';
        content += indent + item.content + '\n\n';
      }
    });

    const buffer = Buffer.from(content, 'utf-8');
    const filename = `${manuscript.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;

    return {
      buffer,
      filename,
      mimeType: "text/plain",
    };
  }

  async exportToMarkdown(manuscriptId: string, options: ExportOptions): Promise<ExportResult> {
    const manuscript = await storage.getManuscript(manuscriptId);
    if (!manuscript) {
      throw new Error("Manuscript not found");
    }

    let content = `# ${options.customTitle || manuscript.title}\n\n`;
    content += `**by ${options.customAuthor || 'Unknown Author'}**\n\n`;
    content += '---\n\n';
    
    const parsedContent = this.parseContent(manuscript.cleanedText || manuscript.originalText);
    
    parsedContent.forEach((item, index) => {
      if (item.type === 'chapter') {
        if (options.chapterPageBreaks && index > 0) {
          content += '\n---\n\n';
        }
        content += `## ${item.content}\n\n`;
      } else {
        content += item.content + '\n\n';
      }
    });

    const buffer = Buffer.from(content, 'utf-8');
    const filename = `${manuscript.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;

    return {
      buffer,
      filename,
      mimeType: "text/markdown",
    };
  }

  async exportManuscript(manuscriptId: string, options: ExportOptions): Promise<ExportResult> {
    switch (options.format) {
      case "docx":
        return this.exportToDOCX(manuscriptId, options);
      case "pdf":
        return this.exportToPDF(manuscriptId, options);
      case "txt":
        return this.exportToText(manuscriptId, options);
      case "markdown":
        return this.exportToMarkdown(manuscriptId, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }
}