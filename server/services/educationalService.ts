import { UnifiedAIService } from "./aiService";

const ai = new UnifiedAIService();

export const AGE_GROUP_CONFIGS = {
  "elementary-k2": {
    label: "Elementary (K–2)",
    ages: "Ages 5–7",
    lexile: "Lexile 100–300",
    defaultWordCount: 5000,
    defaultChapters: 6,
    defaultChapterLength: 800,
    vocabGuidance: "Use simple sentences (5-10 words), sight words, very basic vocabulary. Short paragraphs of 2-3 sentences. Concrete concepts only. Repetition and rhythm are encouraged.",
    formatGuidance: "Each chapter should be very short (700-900 words). Use vivid sensory descriptions. Include age-appropriate dialogue.",
  },
  "elementary-35": {
    label: "Elementary (3–5)",
    ages: "Ages 8–11",
    lexile: "Lexile 400–700",
    defaultWordCount: 15000,
    defaultChapters: 12,
    defaultChapterLength: 1250,
    vocabGuidance: "Use compound and complex sentences. Introduce new vocabulary in context. Paragraphs of 3-5 sentences. Age-appropriate idioms and figurative language.",
    formatGuidance: "Chapters of 1,000-1,500 words. Balance action with description. Clear chapter hooks and endings.",
  },
  "middle-school": {
    label: "Middle School (6–8)",
    ages: "Ages 11–14",
    lexile: "Lexile 600–1000",
    defaultWordCount: 35000,
    defaultChapters: 20,
    defaultChapterLength: 1750,
    vocabGuidance: "Use sophisticated vocabulary including academic and discipline-specific terms (explain in context). Complex sentence structures. Multiple viewpoints and nuanced themes.",
    formatGuidance: "Chapters of 1,500-2,000 words. Include subtext and character development. Themes can be morally complex.",
  },
  "high-school": {
    label: "High School (9–12)",
    ages: "Ages 14–18",
    lexile: "Lexile 900–1200",
    defaultWordCount: 60000,
    defaultChapters: 25,
    defaultChapterLength: 2400,
    vocabGuidance: "Adult-level vocabulary including discipline-specific terminology. Sophisticated syntax, rhetorical devices, and literary techniques. Abstract and philosophical concepts.",
    formatGuidance: "Chapters of 2,000-3,000 words. Full narrative complexity. Themes can be mature (within educational context).",
  },
};

export const EDUCATIONAL_SUBJECTS = {
  fiction: [
    { value: "historical-fiction", label: "Historical Fiction", factCheck: true },
    { value: "science-adventure", label: "Science Adventure", factCheck: false },
    { value: "environmental", label: "Environmental & Nature", factCheck: false },
    { value: "cultural-fiction", label: "Cultural & Social Fiction", factCheck: false },
    { value: "biography-fiction", label: "Biographical Fiction", factCheck: true },
    { value: "mystery-solving", label: "Mystery & Problem-Solving", factCheck: false },
    { value: "fantasy-educational", label: "Educational Fantasy", factCheck: false },
    { value: "social-emotional", label: "Social-Emotional Learning", factCheck: false },
  ],
  nonfiction: [
    { value: "stem", label: "STEM (Science, Technology, Engineering, Math)", factCheck: true },
    { value: "history-social", label: "History & Social Studies", factCheck: true },
    { value: "biography", label: "Biography & Memoir", factCheck: true },
    { value: "geography", label: "Geography & Culture", factCheck: true },
    { value: "health-wellness", label: "Health & Wellness", factCheck: true },
    { value: "language-arts", label: "Language Arts & Literature", factCheck: false },
    { value: "arts-music", label: "Arts & Music", factCheck: false },
    { value: "civics", label: "Civics & Government", factCheck: true },
  ],
};

export const EXCLUDED_SOURCES = [
  "wikipedia.org", "wiki", "reddit.com", "quora.com", "yahoo.com",
  "answers.com", "ask.com", "ehow.com", "about.com",
];

export function requiresFactChecking(educationalSubject: string): boolean {
  const allSubjects = [...EDUCATIONAL_SUBJECTS.fiction, ...EDUCATIONAL_SUBJECTS.nonfiction];
  return allSubjects.find(s => s.value === educationalSubject)?.factCheck ?? false;
}

export async function generateSeriesBible(params: {
  seriesTitle: string;
  subject: string;
  contentType: "educational-fiction" | "educational-nonfiction";
  ageGroup: string;
  topic: string;
  numberOfBooks: number;
  customInstructions?: string;
}): Promise<any> {
  const ageConfig = AGE_GROUP_CONFIGS[params.ageGroup as keyof typeof AGE_GROUP_CONFIGS];
  const subjectLabel = [...EDUCATIONAL_SUBJECTS.fiction, ...EDUCATIONAL_SUBJECTS.nonfiction]
    .find(s => s.value === params.subject)?.label || params.subject;
  const factCheck = requiresFactChecking(params.subject);

  const prompt = `You are a master curriculum designer and award-winning children's/YA author creating a cohesive ${params.numberOfBooks}-book educational series.

SERIES INFORMATION:
- Series Title: "${params.seriesTitle}"
- Subject/Genre: ${subjectLabel}
- Content Type: ${params.contentType === "educational-fiction" ? "Educational Fiction" : "Educational Non-Fiction"}
- Age Group: ${ageConfig.label} (${ageConfig.ages})
- Topic/Theme: ${params.topic}
- Number of Books: ${params.numberOfBooks}
${factCheck ? "- Fact-Checking: REQUIRED — all factual claims must be accurate and verifiable\n" : ""}
${params.customInstructions ? `- Additional Instructions: ${params.customInstructions}\n` : ""}

VOCABULARY GUIDANCE: ${ageConfig.vocabGuidance}

Create a comprehensive Series Bible that ensures every book in the series is cohesive, builds on the previous book, and progressively deepens the educational content.

Return a JSON object with this exact structure:
{
  "seriesTitle": "${params.seriesTitle}",
  "seriesTagline": "A one-sentence tagline for the whole series",
  "seriesDescription": "2-3 sentence description of the overall series",
  "educationalObjectives": ["3-5 overarching educational goals for the entire series"],
  "recurringCharacters": [
    {
      "name": "Character name",
      "role": "protagonist/mentor/etc",
      "description": "Physical and personality description",
      "growth": "How this character grows across the series"
    }
  ],
  "recurringThemes": ["themes that run through all books"],
  "seriesProgression": "How complexity and depth increases from book 1 to book ${params.numberOfBooks}",
  "books": [
    {
      "position": 1,
      "title": "Individual book title (distinct from series title)",
      "subtitle": "Optional subtitle",
      "educationalFocus": "Specific educational topic for this book",
      "plotSummary": "3-4 sentence summary of this book's story or content",
      "learningObjectives": ["2-3 specific learning objectives for this book"],
      "keyTopics": ["main topics covered in this book"],
      "connectionToPrevious": "How this connects to the previous book (N/A for book 1)",
      "connectionToNext": "How this sets up the next book (N/A for last book)",
      "characterDevelopment": "What happens to recurring characters in this book"
    }
  ]
}

Make each book distinct with its own focus while maintaining strong series cohesion. Ensure educational depth appropriate for ${ageConfig.ages}.`;

  const response = await ai.generateJSON({
    messages: [
      {
        role: "system",
        content: "You are a master curriculum designer and educational author. Return only valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
  });

  return response;
}

export async function generateEducationalOutline(params: {
  novelTitle: string;
  seriesTitle: string;
  seriesPosition: number;
  totalBooks: number;
  seriesBible: any;
  subject: string;
  contentType: "educational-fiction" | "educational-nonfiction";
  ageGroup: string;
  topic: string;
  targetWordCount: number;
  targetChapterCount: number;
  targetChapterLength: number;
  customInstructions?: string;
}): Promise<any> {
  const ageConfig = AGE_GROUP_CONFIGS[params.ageGroup as keyof typeof AGE_GROUP_CONFIGS];
  const bookBible = params.seriesBible.books?.[params.seriesPosition - 1] || {};
  const factCheck = requiresFactChecking(params.subject);
  const isNonfiction = params.contentType === "educational-nonfiction";

  const subjectLabel = [...EDUCATIONAL_SUBJECTS.fiction, ...EDUCATIONAL_SUBJECTS.nonfiction]
    .find(s => s.value === params.subject)?.label || params.subject;

  const prompt = `You are an expert educational author creating Book ${params.seriesPosition} of ${params.totalBooks} in the "${params.seriesTitle}" series.

BOOK DETAILS:
- Book Title: "${params.novelTitle}"
- Series: "${params.seriesTitle}" (Book ${params.seriesPosition} of ${params.totalBooks})
- Subject: ${subjectLabel}
- Age Group: ${ageConfig.label} (${ageConfig.ages}, ${ageConfig.lexile})
- Target Word Count: ${params.targetWordCount.toLocaleString()} words
- Target Chapters: ${params.targetChapterCount}
- Target Chapter Length: ~${params.targetChapterLength} words per chapter
${factCheck ? "- ALL facts must be accurate and verifiable from academic/credible sources\n" : ""}

VOCABULARY GUIDANCE: ${ageConfig.vocabGuidance}
FORMAT GUIDANCE: ${ageConfig.formatGuidance}

SERIES BIBLE CONTEXT:
${JSON.stringify({ 
  seriesObjectives: params.seriesBible.educationalObjectives, 
  recurringCharacters: params.seriesBible.recurringCharacters,
  recurringThemes: params.seriesBible.recurringThemes,
  thisBook: bookBible,
}, null, 2)}

${params.customInstructions ? `ADDITIONAL INSTRUCTIONS: ${params.customInstructions}\n` : ""}

Create a detailed outline for this book. Return a JSON object:
{
  "summary": "2-3 sentence summary of the book",
  "educationalGoals": ["specific learning objectives for this book"],
  "themes": ["main themes"],
  "characters": [
    {
      "name": "Name",
      "role": "Role",
      "description": "Brief description",
      "isRecurring": true/false
    }
  ],
  "chapters": [
    {
      "number": 1,
      "title": "Chapter title",
      "summary": "What happens in this chapter (3-4 sentences)",
      "educationalContent": "What educational concept is covered",
      "wordTarget": ${params.targetChapterLength}
    }
  ]
}

Ensure exactly ${params.targetChapterCount} chapters. Each chapter must advance the story AND the educational content.`;

  const response = await ai.generateJSON({
    messages: [
      { role: "system", content: "You are an expert educational author. Return only valid JSON." },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
  });

  return response;
}

export async function generateEducationalChapter(params: {
  chapterNumber: number;
  chapterTitle: string;
  chapterSummary: string;
  educationalContent: string;
  novelTitle: string;
  seriesTitle: string;
  seriesPosition: number;
  subject: string;
  ageGroup: string;
  contentType: "educational-fiction" | "educational-nonfiction";
  outline: any;
  previousContent: string;
  targetLength: number;
  factCheck: boolean;
}): Promise<{ content: string; citations: any[] }> {
  const ageConfig = AGE_GROUP_CONFIGS[params.ageGroup as keyof typeof AGE_GROUP_CONFIGS];
  const isNonfiction = params.contentType === "educational-nonfiction";

  const citationInstruction = params.factCheck
    ? `\n\nFACT-CHECKING REQUIRED: For every factual claim, date, statistic, or historical event, add an inline citation in the format [Source: Author/Organization, Title, Year]. At the very end of the chapter, add a JSON block:\n<<<CITATIONS_START>>>\n[{"claim": "...", "source": "URL or publication", "author": "...", "title": "...", "publishDate": "Year", "chapterNumber": ${params.chapterNumber}}]\n<<<CITATIONS_END>>>`
    : "";

  const systemPrompt = `You are an expert ${isNonfiction ? "educational author" : "children's/YA fiction author"} writing for ${ageConfig.label} (${ageConfig.ages}).

CRITICAL LANGUAGE REQUIREMENTS:
${ageConfig.vocabGuidance}
${ageConfig.formatGuidance}

${params.factCheck ? "ACCURACY REQUIREMENT: All facts, dates, names, and events must be historically/scientifically accurate. Never invent statistics or misrepresent events.\n" : ""}Write engaging, age-appropriate content that seamlessly integrates educational value with compelling ${isNonfiction ? "informational" : "narrative"} writing. Make learning feel natural, not like a textbook.`;

  const userPrompt = `Write Chapter ${params.chapterNumber}: "${params.chapterTitle}"

BOOK: "${params.novelTitle}" (Book ${params.seriesPosition} of the ${params.seriesTitle} series)
TARGET LENGTH: approximately ${params.targetLength} words
CHAPTER SUMMARY: ${params.chapterSummary}
EDUCATIONAL CONTENT TO COVER: ${params.educationalContent}

${params.previousContent ? `STORY SO FAR (brief):\n${params.previousContent.substring(0, 800)}\n` : ""}

Write the complete chapter. Start directly with the chapter content (the heading "Chapter ${params.chapterNumber}: ${params.chapterTitle}" will be added automatically). Do not write "Chapter X" at the start.

${isNonfiction ? "Use clear headings, engaging explanations, and relevant examples. Connect new information to what students already know." : "Balance story action with educational content naturally. Show educational concepts through character experiences and dialogue."}
${citationInstruction}`;

  const response = await ai.generateContent({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.75,
  });

  let content = response.content;
  const citations: any[] = [];

  if (params.factCheck && content.includes("<<<CITATIONS_START>>>")) {
    const citationMatch = content.match(/<<<CITATIONS_START>>>([\s\S]*?)<<<CITATIONS_END>>>/);
    if (citationMatch) {
      try {
        const parsed = JSON.parse(citationMatch[1].trim());
        citations.push(...(Array.isArray(parsed) ? parsed : [parsed]));
      } catch {}
      content = content.replace(/<<<CITATIONS_START>>>[\s\S]*?<<<CITATIONS_END>>>/, "").trim();
    }
  }

  return { content, citations };
}

export async function compileEducationalManuscript(params: {
  novel: any;
  chapters: string[];
  outline: any;
  seriesBible: any;
  bibliography: any[];
}): Promise<string> {
  const ageConfig = AGE_GROUP_CONFIGS[params.novel.ageGroup as keyof typeof AGE_GROUP_CONFIGS] ||
    AGE_GROUP_CONFIGS["middle-school"];

  const bookPosition = params.novel.seriesPosition;
  const totalBooks = params.novel.totalBooksInSeries;
  const seriesTitle = params.novel.seriesTitle;
  const currentBook = params.seriesBible?.books?.[bookPosition - 1];

  const lines: string[] = [
    `# ${params.novel.title}`,
    bookPosition > 1 ? `## ${seriesTitle}, Book ${bookPosition}` : `## ${seriesTitle}`,
    "",
    "---",
    "",
    "**TITLE PAGE**",
    "",
    `# ${params.novel.title}`,
    currentBook?.subtitle ? `### ${currentBook.subtitle}` : "",
    "",
    `*${seriesTitle}${totalBooks > 1 ? ` — Book ${bookPosition} of ${totalBooks}` : ""}*`,
    "",
    `**Reading Level:** ${ageConfig.label} (${ageConfig.ages})`,
    "",
    "---",
    "",
    "**COPYRIGHT PAGE**",
    "",
    `Copyright © ${new Date().getFullYear()}`,
    "All rights reserved.",
    "Independently published.",
    "",
    "---",
    "",
    "**EDUCATIONAL OBJECTIVES**",
    "",
    "By the end of this book, readers will be able to:",
    ...(outline?.educationalGoals || currentBook?.learningObjectives || []).map((g: string) => `- ${g}`),
    "",
    "---",
    "",
    "**TABLE OF CONTENTS**",
    "",
    ...(outline?.chapters || []).map((ch: any) => `Chapter ${ch.number}: ${ch.title}`),
    "",
    "---",
    "",
  ];

  params.chapters.forEach((chapter, index) => {
    const chapterInfo = outline?.chapters?.[index];
    const chapterTitle = chapterInfo?.title || `Chapter ${index + 1}`;
    lines.push(`# Chapter ${index + 1}: ${chapterTitle}`);
    lines.push("");
    lines.push(chapter);
    lines.push("");
    lines.push("---");
    lines.push("");
  });

  if (params.bibliography && params.bibliography.length > 0) {
    lines.push("# Bibliography");
    lines.push("");
    lines.push("The following sources were consulted and verified in the creation of this book:");
    lines.push("");
    params.bibliography.forEach((entry: any, i: number) => {
      const author = entry.author || "Unknown Author";
      const title = entry.title || entry.claim || "Untitled";
      const source = entry.source || "";
      const year = entry.publishDate || new Date().getFullYear();
      lines.push(`${i + 1}. ${author} (${year}). *${title}*. ${source}`);
    });
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  if (totalBooks > 1) {
    lines.push("# About This Series");
    lines.push("");
    lines.push(params.seriesBible?.seriesDescription || `This book is part of the ${seriesTitle} series.`);
    if (bookPosition < totalBooks) {
      const nextBook = params.seriesBible?.books?.[bookPosition];
      lines.push("");
      lines.push(`**Next in the series:** *${nextBook?.title || `Book ${bookPosition + 1}`}*`);
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.filter(l => l !== undefined).join("\n");
}
