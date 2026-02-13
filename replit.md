# AI KDP Author - Replit Guide

## Overview
The AI KDP Author is a full-stack web application designed to generate complete, publishable fiction and non-fiction books (50,000-80,000 words, 20-30 chapters) for Amazon KDP. It automates manuscript creation from minimal user input (genre/category, title, plot idea or topic) using a multi-step, AI-driven process. The application also includes a Plot Inspiration Vault and a Manuscript Quality Analyzer. The project's ambition is to significantly streamline the book writing and publishing process for authors.

## User Preferences
Preferred communication style: Simple, everyday language.
Manuscript formatting preference: Aptos font instead of Times New Roman for DOCX exports.
Download preferences: Remove unformatted DOCX download option from manuscripts (only TXT and MD needed).
Library preferences: Completely removed manuscript library - only book library should be used for all functionality.
Subscription model preference: Trial users get only "Refine (Analyze & improve)" feature, while "Create (Generate your book)" and "Publish (Export & share)" require Pro subscription.
Content types: Both fiction (novels) and non-fiction are supported with dedicated generation flows.
Paragraph indentation: No paragraph indentation in DOCX exports (clean left-aligned text).

## Professional DOCX Format Standard (Based on "FRICTIONLESS" template)
Chapter format: "Chapter X: Title Name" (e.g., "Chapter 1: The Glass Monolith")
Front matter includes (in order):
1. Title Page - Book title (large caps), subtitle, author name
2. Copyright Page - Copyright notice, "All rights reserved.", ISBN, "Independently published"
3. Dedication Page - "DEDICATION" header with customizable text
4. Acknowledgements Page - "ACKNOWLEDGEMENTS" header with customizable text
5. Table of Contents - Lists all chapters
Page settings: 6x9 (trade paperback), Aptos 11pt font, 0.75" top/bottom margins, 0.75" inside (gutter), 0.5" outside
Each chapter starts on a new page.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite).
- **UI/UX**: shadcn/ui (Radix UI), Tailwind CSS.
- **State Management**: TanStack React Query.
- **Routing**: Wouter.
- **Form Handling**: React Hook Form with Zod.

### Backend
- **Runtime**: Node.js with Express.js REST API.
- **Language**: TypeScript (ES modules).
- **API Design**: RESTful for fiction and non-fiction book creation and content generation.
- **Production Mode**: Auto-detects by checking for dist/public folder existence.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM.
- **Schema**: Centralized with Zod validation.

### Authentication
- **Method**: Replit OpenID Connect for user authentication.
- **User Management**: User profiles in PostgreSQL.

### Core Features
- **Fiction Generation**: Multi-step AI-driven process (outline, chapter-by-chapter generation, compilation) for novels across multiple genres.
- **Non-Fiction Generation**: Fact-checked content with multi-source verification, automatic bibliography generation (APA-style), 17 categories, and excluded biased sources (Wikipedia, Reddit, Quora, etc.).
- **AI Integration**: OpenAI GPT-5.2 for core generation and analysis tasks, GPT-4.1-mini for marketing and budget tasks.
- **Character Development**: AI-powered Interview Mode, Emotional Journey Mapping, Character Growth Suggestions.
- **Manuscript Analysis**: Advanced Grammar & Style Checker, Style and Tone Consistency Checker, Comprehensive Quality Analyzer.
- **Audiobook Generation**: Deepgram Aura-2 as sole TTS provider (45+ voices), with advanced text processing for natural narration, KDP compliance, and a unified job manager for persistence and resume capabilities.
- **Customization**: Adjustable word count (30K-120K), chapter count (10-50), chapter length (1.5K-5K words).
- **Export & Preview**: DOCX (native JS library), PDF, Markdown, TXT with customizable formatting.
- **Development Workflow**: Monorepo structure with end-to-end TypeScript.
- **Marketing & Promotion Module**: AI-powered toolkit for generating marketing content (descriptions, social media, emails, etc.) using GPT-4.1-mini.

### UI/UX Decisions
- **Design System**: Tailwind CSS with custom variables.
- **Interactive Tools**: Interactive Genre Exploration Wizard, Narrative Arc Visualization Tool (Recharts), AI-powered revision wizards.
- **Admin Dashboard**: Tabbed navigation for subscriber statistics, About page editor, blog management, and blog generation tools.

### System Design Choices
- **TTS Job Management**: Unified `ttsJobManager.ts` provides provider-agnostic job persistence, per-chunk PCM caching, 7-day TTL, retry capability, and progress tracking for all TTS providers.
- **Audio Normalization**: Infrastructure for professional audio normalization (loudnorm filter) to meet KDP audiobook compliance.
- **KDP Audiobook Compliance**: Automatic processing for MP3 format, 44.1 kHz sample rate, 192 kbps CBR, stereo, -20 LUFS loudness, -3 dB peak level, and 2 seconds silence padding.

## External Dependencies

### Core Technologies
- **Database**: PostgreSQL (hosted on Neon Database).
- **AI Service**: OpenAI API (GPT-5.2 primary, GPT-4.1-mini fallback/budget).
- **Hosting Platform**: Replit.

### Key Libraries
- **Frontend**: React, TanStack React Query, Radix UI, Tailwind CSS, Wouter, React Hook Form, Zod, React-Markdown.
- **Backend**: Express.js, Drizzle ORM, OpenAI SDK, axios.
- **Document Generation**: `docx` library.
- **Charting**: Recharts.

### Infrastructure Services
- **Database Provider**: Neon Database.
- **Authentication**: Replit OpenID Connect.
- **Payment Processing**: Stripe.
- **Email Service**: Resend for transactional emails.
- **TTS Services**:
    - Deepgram Aura-2 (sole provider, 45+ voices).