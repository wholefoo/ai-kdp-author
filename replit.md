# AI KDP Author - Replit Guide

## Overview
The AI KDP Author is a full-stack web application designed to generate complete, publishable novels (50,000-80,000 words, 20-30 chapters) for Amazon KDP. It automates manuscript creation based on minimal user input (genre, title, plot idea) using a multi-step, AI-driven process. The application also includes a Plot Inspiration Vault for managing ideas and a Manuscript Quality Analyzer for evaluating and improving existing manuscripts. Its ambition is to significantly streamline the novel writing and publishing process for authors.

## User Preferences
Preferred communication style: Simple, everyday language.
Manuscript formatting preference: Aptos font instead of Times New Roman for DOCX exports.
Download preferences: Remove unformatted DOCX download option from manuscripts (only TXT and MD needed).
Library preferences: Completely removed manuscript library - only novel library should be used for all functionality.
Subscription model preference: Trial users get only "Refine (Analyze & improve)" feature, while "Create (Generate your novel)" and "Publish (Export & share)" require Pro subscription.

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
- **API Design**: RESTful for novel creation and content generation.
- **Production Mode**: Auto-detects by checking for dist/public folder existence (no need for NODE_ENV variable).

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM.
- **Schema**: Centralized with Zod validation.

### Authentication
- **Method**: Replit OpenID Connect for user authentication.
- **User Management**: User profiles in PostgreSQL.

### Core Features
- **Novel Generation**: Multi-step AI-driven process (outline, chapter-by-chapter generation, compilation).
- **AI Integration**: OpenAI GPT-5 for all core generation and analysis tasks.
- **Character Development**: AI-powered Interview Mode, Emotional Journey Mapping, Character Growth Suggestions.
- **Manuscript Analysis**: Advanced Grammar & Style Checker, Manuscript Style and Tone Consistency Checker, Comprehensive Manuscript Quality Analyzer.
- **Audiobook Generation**: Uses OpenAI TTS for text-to-speech conversion with multiple voices and HD quality.
- **Customization**: Adjustable word count (30K-120K), chapter count (10-50), chapter length (1.5K-5K words).
- **Export & Preview**: DOCX (native JS library), PDF, Markdown, TXT with customizable formatting.
- **Development Workflow**: Monorepo structure with end-to-end TypeScript.

### UI/UX Decisions
- **Design System**: Tailwind CSS with custom variables for consistent branding.
- **Interactive Tools**: Features like Interactive Genre Exploration Wizard, Narrative Arc Visualization Tool (with Recharts), and AI-powered revision wizards aim for engaging user experience.
- **Admin Dashboard**: Tabbed navigation for better organization of features like subscriber statistics, About page editor, blog management, and blog generation tools.

## External Dependencies

### Core Technologies
- **Database**: PostgreSQL (hosted on Neon Database).
- **AI Service**: OpenAI API (GPT-5, GPT-4o for blog generation).
- **Hosting Platform**: Replit.

### Key Libraries
- **Frontend**: React, TanStack React Query, Radix UI, Tailwind CSS, Wouter, React Hook Form, Zod, React-Markdown.
- **Backend**: Express.js, Drizzle ORM, OpenAI SDK.
- **Document Generation**: `docx` library.
- **Charting**: Recharts.

### Infrastructure Services
- **Database Provider**: Neon Database.
- **Authentication**: Replit OpenID Connect.
- **Payment Processing**: Stripe.
- **Email Service**: Resend for transactional emails (welcome, subscription confirmation, novel/audiobook completion, upgrade prompts).
- **TTS Services**: OpenAI TTS exclusively.

## Recent Deployment Fixes (October 2025)
- **Auto-Detection Production Mode**: Server automatically detects production vs development by checking for `dist/public` folder, eliminating dependency on NODE_ENV environment variable.
- **Custom Deployment Script**: `deploy.sh` handles build process with npm legacy-peer-deps and proper dependency management.
- **Build Tools**: vite and esbuild moved to dependencies (not devDependencies) to ensure deployment compatibility.
- **Disk Management**: Enhanced .gitignore to prevent git bloat from large files and build artifacts.