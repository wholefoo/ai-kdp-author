import type { Novel, Outline } from "@shared/schema";

export class ExportService {
  async exportManuscript(novel: Novel, format: string): Promise<Buffer> {
    switch (format) {
      case 'docx':
        return this.exportToDocx(novel);
      case 'pdf':
        return this.exportToPdf(novel);
      case 'markdown':
        return this.exportToMarkdown(novel);
      case 'txt':
        return this.exportToText(novel);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async exportToDocx(novel: Novel): Promise<Buffer> {
    // Generate DOCX content with proper KDP formatting
    const content = this.generateManuscriptContent(novel);
    
    // For now, return a simple text buffer
    // In production, use a library like docx or mammoth to generate proper DOCX
    const docxContent = this.formatForKDP(content);
    return Buffer.from(docxContent, 'utf-8');
  }

  private async exportToPdf(novel: Novel): Promise<Buffer> {
    const content = this.generateManuscriptContent(novel);
    // In production, use a library like puppeteer or jsPDF
    return Buffer.from(content, 'utf-8');
  }

  private async exportToMarkdown(novel: Novel): Promise<Buffer> {
    const content = this.generateManuscriptContent(novel);
    return Buffer.from(content, 'utf-8');
  }

  private async exportToText(novel: Novel): Promise<Buffer> {
    const content = this.generateManuscriptContent(novel);
    // Strip markdown formatting for plain text
    const plainText = content.replace(/[#*_`]/g, '');
    return Buffer.from(plainText, 'utf-8');
  }

  private generateManuscriptContent(novel: Novel): string {
    const content = [];

    // Title Page
    content.push(`# ${novel.title}\n\n`);
    content.push(`**Genre:** ${novel.genre}\n\n`);
    content.push(`**Word Count:** ${novel.targetWordCount?.toLocaleString()} words\n\n`);
    content.push(`**Chapters:** ${novel.targetChapterCount}\n\n`);
    content.push(`---\n\n`);

    // Copyright Page
    content.push(`## Copyright\n\n`);
    content.push(`Copyright © ${new Date().getFullYear()}\n\n`);
    content.push(`All rights reserved. No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher.\n\n`);
    content.push(`---\n\n`);

    // Table of Contents
    content.push(`## Table of Contents\n\n`);
    const outline = novel.outline as Outline;
    if (outline?.chapters) {
      outline.chapters.forEach((chapter, index) => {
        content.push(`Chapter ${index + 1}: ${chapter.title} .................. ${(index + 1) * 10}\n\n`);
      });
    }
    content.push(`---\n\n`);

    // Chapters
    if (outline?.chapters) {
      outline.chapters.forEach((chapter, index) => {
        content.push(`# Chapter ${index + 1}: ${chapter.title}\n\n`);
        content.push(`${chapter.summary}\n\n`);
        
        // Generate sample content based on target length
        const targetLength = novel.targetChapterLength || 2600;
        const sampleText = this.generateSampleChapterContent(chapter.summary, targetLength);
        content.push(`${sampleText}\n\n`);
        content.push(`---\n\n`);
      });
    }

    // About the Author
    content.push(`## About the Author\n\n`);
    content.push(`This novel was generated using advanced AI technology, crafted with attention to narrative structure, character development, and engaging storytelling.\n\n`);

    return content.join('');
  }

  private generateSampleChapterContent(summary: string, targetLength: number): string {
    // Generate sample content based on the chapter summary
    // In production, this would use the actual generated chapter content
    const words = Math.floor(targetLength / 5); // Approximate word count
    
    const sampleContent = `${summary}\n\nThis chapter develops the story further, introducing new elements and advancing the plot. The narrative unfolds with careful attention to character development and pacing, ensuring that readers remain engaged throughout.\n\nThe story continues to build tension and develop the central themes, with detailed descriptions and dialogue that bring the characters to life. Each scene is crafted to contribute meaningfully to the overall narrative arc.\n\n[This is a preview of the chapter content. The full manuscript would contain the complete, professionally written chapters with the exact word count specified in your parameters.]`;
    
    return sampleContent;
  }

  private formatForKDP(content: string): string {
    // Apply KDP-specific formatting rules
    let formatted = content;
    
    // Ensure proper page breaks
    formatted = formatted.replace(/---/g, '\n\n[PAGE BREAK]\n\n');
    
    // Format chapter headings
    formatted = formatted.replace(/^# (.+)$/gm, '\n\n$1\n\n');
    
    // Format subheadings
    formatted = formatted.replace(/^## (.+)$/gm, '\n\n$1\n\n');
    
    // Ensure proper paragraph spacing
    formatted = formatted.replace(/\n\n\n+/g, '\n\n');
    
    return formatted;
  }
}

export const exportService = new ExportService();