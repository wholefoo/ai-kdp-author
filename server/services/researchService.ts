import { UnifiedAIService } from "./aiService";

const aiService = new UnifiedAIService();

// Sources that are always excluded from research
const EXCLUDED_SOURCES = [
  "wikipedia.org",
  "wiki",
  "reddit.com",
  "quora.com",
  "yahoo answers",
  "ask.com",
  "answers.com",
  "ehow.com",
  "buzzfeed.com",
  "huffpost.com",
  "medium.com personal blogs",
  "uncited blog posts",
];

export interface ResearchFinding {
  finding: string;
  significance: string;
  supportingEvidence: string;
}

export interface ResearchSource {
  title: string;
  author: string;
  year: string;
  type: string; // journal | book | report | academic paper | documentary | official publication
  publisher: string;
  keyInsight: string;
}

export interface ResearchTheme {
  theme: string;
  description: string;
  examples: string;
}

export interface ResearchAngle {
  angle: string;
  description: string;
  targetAudience: string;
}

export interface ResearchData {
  topic: string;
  summary: string;
  keyFindings: ResearchFinding[];
  themes: ResearchTheme[];
  sources: ResearchSource[];
  suggestedAngles: ResearchAngle[];
  controversies: string[];
  historicalContext: string;
  currentRelevance: string;
  keyFigures: string[];
  statistics: string[];
}

export interface FictionPlot {
  title: string;
  genre: string;
  premise: string;
  thematicElements: string[];
  protagonist: {
    name: string;
    background: string;
    motivation: string;
    arc: string;
  };
  antagonistOrConflict: string;
  plotSummary: string;
  actStructure: {
    act1: string;
    act2: string;
    act3: string;
  };
  settingAndWorld: string;
  researchTies: string;
  suggestedChapters: Array<{ number: number; title: string; summary: string }>;
}

export interface NonfictionOutline {
  title: string;
  subtitle: string;
  premise: string;
  uniqueAngle: string;
  targetAudience: string;
  learningObjectives: string[];
  chapters: Array<{
    number: number;
    title: string;
    summary: string;
    keyPoints: string[];
    sources: string[];
  }>;
  introduction: string;
  conclusion: string;
}

export class ResearchService {
  async conductResearch(topic: string, contentType: "fiction" | "non-fiction", genre?: string): Promise<ResearchData> {
    const excludedList = EXCLUDED_SOURCES.join(", ");

    const systemPrompt = `You are an expert research analyst and academic librarian conducting thorough, rigorous subject matter research. Your research draws on peer-reviewed academic papers, published books, official government and institutional publications, reputable newspapers (New York Times, Washington Post, The Guardian, etc.), scientific journals, and expert-authored works.

EXCLUDED SOURCES — never cite or reference: ${excludedList}.

You produce structured, fact-based research reports with legitimate citations. All sources you cite must be real, verifiable publications — books, journal articles, academic papers, official reports, or credible news sources that actually exist. Do not fabricate sources.

Respond ONLY with valid JSON matching the specified format.`;

    const contextHint = contentType === "fiction"
      ? `\n\nNote: This research will be used to inspire a ${genre || "fiction"} novel. Include themes, historical context, human drama, conflict, and narrative elements that could enrich a compelling story grounded in real facts.`
      : `\n\nNote: This research will be used to structure a non-fiction book. Focus on educational depth, verified facts, expert perspectives, and a logical progression of knowledge.`;

    const userPrompt = `Conduct thorough, rigorous research on the following topic: "${topic}"${contextHint}

Return a JSON object with this exact structure:
{
  "topic": "${topic}",
  "summary": "2-3 paragraph executive summary of the most important findings",
  "keyFindings": [
    {
      "finding": "A specific, factual finding",
      "significance": "Why this finding matters",
      "supportingEvidence": "The specific evidence or data that supports this"
    }
  ],
  "themes": [
    {
      "theme": "Major theme or pattern identified",
      "description": "Detailed description of this theme",
      "examples": "Concrete examples illustrating this theme"
    }
  ],
  "sources": [
    {
      "title": "Full title of the work",
      "author": "Author name(s)",
      "year": "Publication year",
      "type": "Type: journal article / book / official report / academic paper / documentary",
      "publisher": "Publisher or journal name",
      "keyInsight": "The most valuable insight this source provides on the topic"
    }
  ],
  "suggestedAngles": [
    {
      "angle": "A compelling angle for exploring this topic",
      "description": "How to approach this angle and what makes it unique",
      "targetAudience": "Who would find this angle most compelling"
    }
  ],
  "controversies": [
    "Any debates, disputes, or contested areas within this topic"
  ],
  "historicalContext": "A concise historical background of this topic",
  "currentRelevance": "How this topic connects to current events, trends, or concerns",
  "keyFigures": [
    "Names of important people, researchers, or experts associated with this topic"
  ],
  "statistics": [
    "Notable statistics or data points about this topic with their sources"
  ]
}

Provide at least 6 key findings, 4 themes, 8 credible sources, and 4 suggested angles. Make all content detailed, specific, and factually grounded.`;

    const response = await aiService.generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      responseFormat: { type: "json_object" },
    });

    const parsed = JSON.parse(response.content);
    return parsed as ResearchData;
  }

  async generateFictionPlot(researchData: ResearchData, genre: string, additionalContext?: string): Promise<FictionPlot> {
    const systemPrompt = `You are an expert fiction editor and narrative architect. You transform real research findings into compelling, believable fiction plots grounded in authentic detail. You create plots that feel deeply real because they are rooted in genuine facts, history, and human experience drawn from legitimate research.

Respond ONLY with valid JSON matching the specified format.`;

    const researchSummary = JSON.stringify({
      topic: researchData.topic,
      summary: researchData.summary,
      keyFindings: researchData.keyFindings.slice(0, 5),
      themes: researchData.themes.slice(0, 4),
      historicalContext: researchData.historicalContext,
      keyFigures: researchData.keyFigures,
      controversies: researchData.controversies,
      suggestedAngles: researchData.suggestedAngles,
    }, null, 2);

    const userPrompt = `Using the following research on "${researchData.topic}", craft a compelling ${genre} fiction plot:

RESEARCH MATERIAL:
${researchSummary}

${additionalContext ? `ADDITIONAL AUTHOR NOTES: ${additionalContext}` : ""}

Create a plot that:
- Is authentically grounded in the research findings and real-world context
- Weaves research themes naturally into the narrative without being didactic
- Has a compelling protagonist whose journey explores the research material organically
- Leverages the controversies and human drama found in the research
- Feels original and fresh while being informed by real facts

Return a JSON object with this exact structure:
{
  "title": "A compelling working title for the novel",
  "genre": "${genre}",
  "premise": "A vivid 2-3 sentence premise that captures the core conflict and stakes",
  "thematicElements": [
    "List of 4-6 major themes drawn from the research"
  ],
  "protagonist": {
    "name": "Character name",
    "background": "Backstory rooted in the research context",
    "motivation": "What drives them — tied to research themes",
    "arc": "How they change throughout the story"
  },
  "antagonistOrConflict": "Description of the main antagonist, systemic conflict, or opposing force",
  "plotSummary": "A detailed 4-6 sentence summary of the full plot",
  "actStructure": {
    "act1": "Setup — how the story begins, the inciting incident",
    "act2": "Confrontation — complications, turning points, escalation",
    "act3": "Resolution — climax and how the story ends"
  },
  "settingAndWorld": "Detailed description of the setting and world-building elements from the research",
  "researchTies": "Explanation of how specific research findings are woven into the story",
  "suggestedChapters": [
    { "number": 1, "title": "Chapter title", "summary": "What happens in this chapter" }
  ]
}

Provide 15-20 suggested chapters. Make the plot feel organic and compelling, not like a textbook.`;

    const response = await aiService.generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      responseFormat: { type: "json_object" },
    });

    return JSON.parse(response.content) as FictionPlot;
  }

  async generateNonfictionOutline(researchData: ResearchData, subtype: string, targetAudience?: string, additionalContext?: string): Promise<NonfictionOutline> {
    const systemPrompt = `You are an expert non-fiction editor and book architect. You transform research findings into well-structured, authoritative non-fiction book outlines. You create book structures that are clear, comprehensive, and take readers on a logical journey of discovery — from foundational knowledge to advanced insights.

Respond ONLY with valid JSON matching the specified format.`;

    const researchSummary = JSON.stringify({
      topic: researchData.topic,
      summary: researchData.summary,
      keyFindings: researchData.keyFindings,
      themes: researchData.themes,
      sources: researchData.sources.slice(0, 6),
      suggestedAngles: researchData.suggestedAngles,
      statistics: researchData.statistics,
      keyFigures: researchData.keyFigures,
      historicalContext: researchData.historicalContext,
      currentRelevance: researchData.currentRelevance,
    }, null, 2);

    const audienceContext = targetAudience ? `TARGET AUDIENCE: ${targetAudience}` : "";

    const userPrompt = `Using the following research on "${researchData.topic}", create a comprehensive ${subtype} book outline:

RESEARCH MATERIAL:
${researchSummary}

${audienceContext}
${additionalContext ? `ADDITIONAL AUTHOR NOTES: ${additionalContext}` : ""}

Create a book that:
- Covers the topic thoroughly using the verified research findings
- Organizes information logically from foundational to advanced
- Integrates credible sources as supporting material for each chapter
- Provides practical value and genuine insight to the reader
- Has a clear, compelling angle that differentiates it from existing books

Return a JSON object with this exact structure:
{
  "title": "A compelling, marketable book title",
  "subtitle": "A descriptive subtitle that clarifies the book's value",
  "premise": "What this book promises to deliver and why it matters",
  "uniqueAngle": "What makes this book different from others on the topic",
  "targetAudience": "Who this book is for and what background they need",
  "learningObjectives": [
    "What readers will know or be able to do after reading this book"
  ],
  "introduction": "What the introduction will cover — setting up the problem and promise",
  "chapters": [
    {
      "number": 1,
      "title": "Chapter title",
      "summary": "What this chapter covers and why it matters",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
      "sources": ["Source citation from the research relevant to this chapter"]
    }
  ],
  "conclusion": "What the conclusion will cover — synthesis, call to action, final insights"
}

Provide 15-20 chapters. Each chapter should have 3-5 key points and 1-3 relevant sources from the research. Make the outline comprehensive and commercially viable.`;

    const response = await aiService.generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      responseFormat: { type: "json_object" },
    });

    return JSON.parse(response.content) as NonfictionOutline;
  }
}

export const researchService = new ResearchService();
