# AI KDP Author

An AI-powered full-stack web application that automates the creation of complete, publish-ready books for Amazon Kindle Direct Publishing (KDP). From a simple idea or topic, the app generates full manuscripts (50,000–80,000 words, 20–30 chapters) using OpenAI GPT-5.2, formats them to KDP standards, and provides a full suite of authoring tools.

**Live at:** [aikdpauthor.com](https://aikdpauthor.com)

---

## Features

### Book Generation
- **Fiction** — Outline-first, chapter-by-chapter generation across dozens of genres (thriller, fantasy, romance, sci-fi, mystery, literary fiction, and more). Supports 10–50 chapters and 30K–120K word targets.
- **Non-Fiction** — Fact-checked content with automatic APA-style bibliography generation. 17 categories. Excludes low-quality sources (Wikipedia, Reddit, Quora).
- **Educational (K–12)** — Dedicated generator for grades K–12 with age-appropriate vocabulary, Lexile targeting, and automatic fact-checking for applicable subjects (STEM, History, Biography, Geography, Civics). Supports series generation (1–8 books) with a shared AI-generated Series Bible for narrative coherence.

### Manuscript Formatting & Export
All exports conform to KDP trade paperback standards (6×9, Aptos 11pt):
- **DOCX** — Full front matter (Title, Copyright, Dedication, Acknowledgements, Table of Contents), chapter-per-page layout, proper margins
- **PDF**, **Markdown**, **Plain Text**

### Quality & Analysis Tools
- Grammar & Style Checker
- Style and Tone Consistency Checker
- Comprehensive Quality Analyzer (readability, pacing, coherence)
- Proofreading pass
- Character Consistency Checker

### Character Development Workshop
- AI-powered Interview Mode
- Emotional Journey Mapping (visual arc across chapters)
- Character Growth Suggestions
- Narrative Arc Visualization (Recharts)

### Research Module
Conducts deep research from credible academic and journalistic sources, then feeds results directly into the manuscript generator as a pre-filled plot structure or non-fiction outline.

### Marketing & Promotion Toolkit
Uses GPT-4.1-mini to generate: Amazon book descriptions, email subject lines, newsletter templates, social media posts, press releases, author bios, ARC request emails, and full launch strategies.

### Video Trailer Script Generator
Generates cinematic book trailer scripts (30 seconds to 10 minutes) with scene-by-scene breakdowns: visuals, voiceover, on-screen text, sound direction, call to action, and production notes.

### Audiobook Generation *(Admin only)*
Converts manuscripts to KDP-compliant audiobooks using Deepgram Aura-2 (45+ voices). Output: MP3, 44.1 kHz, 192 kbps CBR, –20 LUFS, stereo.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI | shadcn/ui (Radix UI), Tailwind CSS |
| State | TanStack React Query |
| Routing | Wouter |
| Forms | React Hook Form + Zod |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL (Neon), Drizzle ORM |
| Auth | Replit OpenID Connect (OIDC) |
| AI | OpenAI GPT-5.2 (primary), GPT-4.1-mini (marketing) |
| TTS | Deepgram Aura-2 |
| Payments | Stripe |
| Email | Resend |
| Export | `docx`, `pdfkit` |

---

## Subscription Plans

| Plan | Price | Books/Month |
|---|---|---|
| Trial | Free | Refine (analyze & improve) only |
| Pro | $49/month | 1 book/month |
| Founders | $2,500 one-time | 5 books/month, lifetime access |

---

## Project Structure

```
├── client/               # React frontend (Vite)
│   └── src/
│       ├── components/   # UI components
│       ├── pages/        # Route-level pages
│       ├── hooks/        # Custom React hooks
│       └── lib/          # Shared utilities
├── server/               # Express backend
│   ├── services/         # AI, export, email, TTS services
│   ├── routes.ts         # All API routes
│   ├── storage.ts        # Database access layer
│   └── replitAuth.ts     # OIDC authentication
├── shared/
│   └── schema.ts         # Drizzle schema + Zod types (shared)
├── deploy.sh             # Production build script
└── drizzle.config.ts     # Database config
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database (connection string in `DATABASE_URL`)
- OpenAI API key

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI base URL (optional override) |
| `DEEPGRAM_API_KEY` | Deepgram API key (audiobooks, admin only) |
| `SESSION_SECRET` | Express session secret |
| `REPLIT_DOMAINS` | Allowed domains for OIDC |

### Development

```bash
npm install
npm run dev
```

The app runs on port 5000. Vite dev server and Express backend start together.

### Database

```bash
npm run db:push     # Push schema changes to the database
```

Never write SQL migrations manually — always use `db:push` with Drizzle.

### Production Build

```bash
bash deploy.sh
```

Runs `npm ci`, builds the Vite frontend, and bundles the server with esbuild.

---

## Key Design Decisions

- **Single-port architecture**: Vite dev server and Express API run on the same port via the Replit Vite plugin — no proxy configuration needed.
- **Shared schema**: `shared/schema.ts` is the single source of truth for all types, used by both frontend and backend.
- **Educational Series Bible**: When generating a multi-book series, GPT-5.2 first produces a Series Bible (themes, characters, per-book objectives) before generating any individual book, ensuring coherence across the entire series.
- **Chunked TTS**: Audiobook generation chunks manuscripts and caches each PCM chunk independently with a 7-day TTL, enabling resume and retry without regenerating completed segments.
- **Subscription gating**: The three workflow stages (Create, Refine, Publish) map directly to subscription tiers — Trial users can only Refine, Pro and Founders users get full access.
