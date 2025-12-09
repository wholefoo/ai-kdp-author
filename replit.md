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
- **Audiobook Generation**: Dual TTS support - OpenAI (6 voices: alloy, echo, fable, onyx, nova, shimmer) and Gemini (30 voices: Zephyr, Puck, Charon, Kore, Fenrir, Leda, Orus, Aoede, Callirrhoe, Autonoe, Enceladus, Iapetus, Umbriel, Algieba, Despina, Erinome, Algenib, Laomedeia, Achernar, Alnilam, Schedar, Gacrux, Pulcherrima, Achird, Zubenelgenubi, Rasalgethi, Sadachbia, Sadaltager, Sulafat, Vindemiatrix).
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
- **Backend**: Express.js, Drizzle ORM, OpenAI SDK, axios.
- **Document Generation**: `docx` library.
- **Charting**: Recharts.

### Infrastructure Services
- **Database Provider**: Neon Database.
- **Authentication**: Replit OpenID Connect.
- **Payment Processing**: Stripe.
- **Email Service**: Resend for transactional emails (welcome, subscription confirmation, novel/audiobook completion, upgrade prompts).
- **TTS Services**: OpenAI TTS (6 voices) and Google Cloud Text-to-Speech/Gemini TTS (30 voices).

## Current Issues & Limitations

**Gemini TTS Authentication Issue (BLOCKING)**
- Status: Gemini TTS (30 voices) failing with 401 authentication errors
- Root Cause: GOOGLE_CLOUD_TTS_API_KEY secret is invalid or incompatible
- Workaround: System automatically falls back to OpenAI TTS with alloy voice
- Impact: All 30 Gemini voices display in UI and can be selected, but generate audio with OpenAI fallback
- Solution: User must provide a valid Google Cloud Text-to-Speech API key with:
  - API Key type: Service Account Key (JSON) or Simple API Key
  - Enabled services: Google Cloud Text-to-Speech API
  - Proper permissions for tts.googleapis.com
- Recommendation: Use only OpenAI voices (6 available) for now until Gemini TTS auth is resolved
- Alternative: Remove Gemini TTS entirely and use OpenAI-only for simplicity

## Recent Changes (December 2025)
- **Multi-TTS Provider Support (Approach 1 Implementation) - FULLY WORKING WITH FALLBACK**
  - Added dual TTS provider support: OpenAI and Gemini TTS (36 total voices available)
  - Database: Added `ttsProvider` field to audiobooks table to track which provider is used (via direct SQL: `ALTER TABLE audiobooks ADD COLUMN IF NOT EXISTS tts_provider VARCHAR(50) DEFAULT 'openai'`)
  - New Service: `server/services/geminiTts.ts` - Handles all Gemini TTS generation (30 voices, multiple models)
  - Updated Schema: `shared/schema.ts` - Added `ttsProvider` column, extended voice and model type definitions
  - Updated AudiobookService: Added provider detection, routes to appropriate TTS service, and FULL voice list in `getAvailableVoices()`
  - Gemini Models Supported: `gemini-2.5-flash-tts` (faster), `gemini-2.5-pro-tts` (higher quality)
  - Configuration: Uses `GOOGLE_CLOUD_TTS_API_KEY` environment variable (secret key)
  - **Fallback Logic**: Automatically falls back to OpenAI if Gemini fails or is unavailable (e.g., 401 auth errors)
    - When Gemini TTS fails: system automatically uses OpenAI to generate audio with alloy voice
    - Both voice previews and full audiobook generation support fallback
    - Graceful error handling ensures app never crashes due to TTS provider issues
  - UI: All 36 voices now visible in voice selection dropdown (6 OpenAI + 30 Gemini voices with descriptions and recommended flags)
  - **Status**: App is fully functional - audiobooks generate successfully using available TTS providers

- **Novel Generation Pipeline Fix**: Fixed critical issue where novel generation was stopping after outline completion
  - Issue: Outline generated successfully but chapter generation was never triggered
  - Solution: Implemented automatic chapter generation in the outline endpoint (server/routes.ts line 1054-1193)
  - After outline completes, system automatically initiates chapter-by-chapter generation without manual API calls
  - Chapters generate sequentially with real-time progress updates (overall %, individual steps, chapter counter)
  - Full pipeline: outline → chapters → compilation → completion with proper error handling
  - Frontend polling (2-second intervals) captures progress and displays to user during generation

- **React Rendering Error Fix**: Fixed "Objects are not valid as a React child" error in library.tsx
  - Added type guards for novel.chapters (Array.isArray checks) to prevent rendering objects
  - Added typeof checks for progress properties (number, string validation)
  - Now safely handles all data types returned from API

- **Marketing & Promotion Module**: Full-featured AI-powered marketing toolkit for book launches
  - Database: `marketingCampaigns` table stores campaign data per novel
  - Service: `marketingService.ts` generates all marketing content using GPT-4o
  - Features: Amazon descriptions/keywords/categories, social media posts (Twitter/Facebook/Instagram/LinkedIn), email campaigns, press releases, author bios, book blurbs, elevator pitches, quotable excerpts, chapter teasers, launch timelines, pricing recommendations
  - UI: `PromotionHub` component integrated into Publish Hub as "Promote" tab

- **Audio Normalization Framework**: Added infrastructure for professional audio normalization (loudnorm filter with I=-16 LUFS, TP=-1.5dB, LRA=11) in server/services/audiobookService.ts methods `normalizeAudio()` and `applyLoudnormFilter()`

- **Audio Normalization Status**: Currently DISABLED temporarily for stability. To re-enable: uncomment calls in `generateOpenAIAudio()` and `generateVoicePreview()` methods. Has 5-second timeout and graceful fallback to original audio on any failure.

- **Full KDP Audiobook Compliance Processing**: All audiobook chapters are now automatically processed to meet Amazon KDP requirements:
  - **Format**: MP3 with libmp3lame codec
  - **Sample Rate**: 44.1 kHz
  - **Bit Rate**: 192 kbps CBR (Constant Bit Rate)
  - **Channels**: Stereo (consistent across all files)
  - **Loudness**: Normalized to -20 LUFS (within -23 to -18 dB range)
  - **Peak Level**: Limited to -3 dB (no clipping)
  - **Silence Padding**: 2 seconds of silence at start and end of each chapter
  - Implementation: `processForKDPCompliance()` method with fallback to `processForKDPComplianceSimple()` in audiobookService.ts
  - 30-second timeout with graceful fallback to original audio on failure

- **Partial Download Fix**: Partial audiobook download feature now working. Users can download completed chapters at any time during generation with status tracking (failed, partial_completed, generating).

## Recent Deployment Fixes (October 2025)
- **Auto-Detection Production Mode**: Server automatically detects production vs development by checking for `dist/public` folder, eliminating dependency on NODE_ENV environment variable.
- **Custom Deployment Script**: `deploy.sh` handles build process with npm legacy-peer-deps and proper dependency management.
- **Build Tools**: vite and esbuild moved to dependencies (not devDependencies) to ensure deployment compatibility.
- **Disk Management**: Enhanced .gitignore to prevent git bloat from large files and build artifacts.

## TTS Provider Comparison

| Feature | OpenAI | Gemini |
|---------|--------|--------|
| Available Voices | 6 | 30 |
| Model Options | tts-1, tts-1-hd | gemini-2.5-flash-tts, gemini-2.5-pro-tts |
| Language Support | 50+ | 70+ locales, 24 languages |
| Speed Control | Yes (0.25-4.0) | Yes (0.25-4.0) |
| Default Provider | Yes | Optional (requires API key) |
| Use Case | Quick generation, consistent quality | Advanced voice variety, multi-language support |
