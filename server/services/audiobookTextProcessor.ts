/**
 * Audiobook Text Processor - Production-grade text preprocessing for natural TTS narration
 * 
 * Features:
 * - Narration presets (prompt prefixes for different styles)
 * - Text normalization (em dashes, ellipsis, abbreviations)
 * - Smart chunking (speech units, dialogue awareness)
 * - Variable pause logic (punctuation-based)
 * - Pronunciation dictionary
 * - Dialogue detection and handling
 */

export type NarrationPreset = 'audiobook' | 'conversational' | 'documentary' | 'bedtime' | 'dramatic';

export interface ProcessedChunk {
  text: string;
  promptPrefix: string;
  pauseMsAfter: number;
  isDialogue: boolean;
  isHeading: boolean;
  isSceneBreak: boolean;
}

export interface AudiobookProcessorOptions {
  preset?: NarrationPreset;
  targetChunkChars?: number;
  minChunkChars?: number;
  maxChunkChars?: number;
  pronunciationDictionary?: Record<string, string>;
  expandAbbreviations?: boolean;
  normalizeNumbers?: boolean;
  dialogueCues?: boolean;
}

const NARRATION_PRESETS: Record<NarrationPreset, string> = {
  audiobook: `Read as a professional audiobook narrator.
Natural pacing, warm and restrained.
Vary pitch subtly; avoid monotone.
Allow brief breaths and micro-pauses.
Dialogue should sound conversational, not theatrical.
Narration should be calm, confident, and immersive.
Do not rush. Do not sound like a list.`,

  conversational: `Read in a friendly, conversational tone.
Relaxed pacing, as if chatting with a friend.
Natural inflection and warmth.
Keep it casual but clear.`,

  documentary: `Read as a documentary narrator.
Authoritative yet engaging.
Clear enunciation, measured pace.
Convey importance without being dramatic.`,

  bedtime: `Read as a bedtime story narrator.
Soft, soothing voice.
Slow, gentle pacing.
Calming and peaceful.
Perfect for relaxation.`,

  dramatic: `Read with dramatic flair.
Expressive and engaging.
Build tension appropriately.
Emphasize emotional moments.
Still maintain clarity.`,
};

const PAUSE_MAP = {
  comma: { min: 50, max: 80 },
  period: { min: 180, max: 220 },
  question: { min: 220, max: 260 },
  exclamation: { min: 200, max: 240 },
  paragraph: { min: 420, max: 650 },
  sceneBreak: { min: 900, max: 1200 },
  ellipsis: { min: 300, max: 400 },
  colon: { min: 120, max: 180 },
  semicolon: { min: 100, max: 140 },
};

const DEFAULT_ABBREVIATIONS: Record<string, string> = {
  'Mr.': 'Mister',
  'Mrs.': 'Missus',
  'Ms.': 'Miz',
  'Dr.': 'Doctor',
  'Prof.': 'Professor',
  'Sr.': 'Senior',
  'Jr.': 'Junior',
  'St.': 'Saint',
  'Mt.': 'Mount',
  'Capt.': 'Captain',
  'Col.': 'Colonel',
  'Gen.': 'General',
  'Lt.': 'Lieutenant',
  'Sgt.': 'Sergeant',
  'Rev.': 'Reverend',
  'vs.': 'versus',
  'etc.': 'etcetera',
  'i.e.': 'that is',
  'e.g.': 'for example',
  'a.m.': 'A M',
  'p.m.': 'P M',
  'A.D.': 'A D',
  'B.C.': 'B C',
  'U.S.': 'U S',
  'U.K.': 'U K',
  'U.N.': 'U N',
};

const DEFAULT_PRONUNCIATION: Record<string, string> = {
  'COVID': 'CO-vid',
  'COVID-19': 'CO-vid nineteen',
  'NATO': 'NAY-toh',
  'NASA': 'NAH-suh',
  'FAQ': 'F A Q',
  'URL': 'U R L',
  'API': 'A P I',
  'CEO': 'C E O',
  'AI': 'A I',
  'UI': 'U I',
  'UX': 'U X',
};

export class AudiobookTextProcessor {
  private options: Required<AudiobookProcessorOptions>;
  private pronunciationDict: Map<string, string>;

  constructor(options: AudiobookProcessorOptions = {}) {
    this.options = {
      preset: options.preset ?? 'audiobook',
      targetChunkChars: options.targetChunkChars ?? 1100,
      minChunkChars: options.minChunkChars ?? 350,
      maxChunkChars: options.maxChunkChars ?? 1400,
      pronunciationDictionary: options.pronunciationDictionary ?? {},
      expandAbbreviations: options.expandAbbreviations ?? true,
      normalizeNumbers: options.normalizeNumbers ?? true,
      dialogueCues: options.dialogueCues ?? true,
    };

    this.pronunciationDict = new Map([
      ...Object.entries(DEFAULT_PRONUNCIATION),
      ...Object.entries(this.options.pronunciationDictionary),
    ]);
  }

  getPromptPrefix(): string {
    return NARRATION_PRESETS[this.options.preset];
  }

  normalizeText(text: string): string {
    let normalized = text;

    normalized = normalized
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    normalized = normalized
      .replace(/—/g, ' — ')
      .replace(/–/g, ' – ')
      .replace(/\.{3,}/g, '…')
      .replace(/…/g, '…');

    normalized = normalized
      .replace(/"([^"]+)"/g, '\u201C$1\u201D')
      .replace(/'([^']+)'/g, '\u2018$1\u2019');

    if (this.options.expandAbbreviations) {
      for (const [abbr, expanded] of Object.entries(DEFAULT_ABBREVIATIONS)) {
        const escapedAbbr = abbr.replace(/\./g, '\\.');
        const regex = new RegExp(`\\b${escapedAbbr}(?=\\s|$|,|;|:)`, 'g');
        normalized = normalized.replace(regex, expanded);
      }
    }

    normalized = normalized.replace(/\*{3,}/g, '\n(scene break)\n');
    normalized = normalized.replace(/^-{3,}$/gm, '\n(scene break)\n');
    normalized = normalized.replace(/^_{3,}$/gm, '\n(scene break)\n');

    for (const [word, pronunciation] of Array.from(this.pronunciationDict.entries())) {
      const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
      normalized = normalized.replace(regex, pronunciation);
    }

    if (this.options.normalizeNumbers) {
      normalized = this.normalizeYears(normalized);
    }

    return normalized.trim();
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private normalizeYears(text: string): string {
    return text.replace(/\b(1[0-9]{3}|20[0-2][0-9])\b/g, (match) => {
      const year = parseInt(match, 10);
      if (year >= 1000 && year <= 2029) {
        return this.yearToWords(year);
      }
      return match;
    });
  }

  private yearToWords(year: number): string {
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
      'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if (year >= 2000 && year <= 2009) {
      return `two thousand ${year === 2000 ? '' : ones[year - 2000]}`.trim();
    }
    if (year >= 2010 && year <= 2029) {
      const lastTwo = year - 2000;
      if (lastTwo < 20) return `twenty ${ones[lastTwo]}`.trim();
      const t = Math.floor(lastTwo / 10);
      const o = lastTwo % 10;
      return `twenty ${tens[t]} ${ones[o]}`.trim().replace(/\s+/g, ' ');
    }

    const century = Math.floor(year / 100);
    const lastTwo = year % 100;
    let centuryWord = '';
    if (century < 20) centuryWord = ones[century];
    else {
      const t = Math.floor(century / 10);
      const o = century % 10;
      centuryWord = `${tens[t]} ${ones[o]}`.trim();
    }

    let lastWord = '';
    if (lastTwo === 0) {
      lastWord = 'hundred';
    } else if (lastTwo < 10) {
      lastWord = `oh ${ones[lastTwo]}`;
    } else if (lastTwo < 20) {
      lastWord = ones[lastTwo];
    } else {
      const t = Math.floor(lastTwo / 10);
      const o = lastTwo % 10;
      lastWord = `${tens[t]} ${ones[o]}`.trim();
    }

    return `${centuryWord} ${lastWord}`.trim().replace(/\s+/g, ' ');
  }

  processForTts(text: string): ProcessedChunk[] {
    const normalized = this.normalizeText(text);
    const chunks = this.buildSmartChunks(normalized);
    return chunks;
  }

  private buildSmartChunks(text: string): ProcessedChunk[] {
    const paragraphs = this.splitIntoParagraphs(text);
    const chunks: ProcessedChunk[] = [];
    const promptPrefix = this.getPromptPrefix();

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      if (trimmed === '(scene break)') {
        chunks.push({
          text: '',
          promptPrefix: '',
          pauseMsAfter: this.randomInRange(PAUSE_MAP.sceneBreak),
          isDialogue: false,
          isHeading: false,
          isSceneBreak: true,
        });
        continue;
      }

      const isHeading = this.isHeading(trimmed);

      if (isHeading && trimmed.length <= this.options.maxChunkChars) {
        chunks.push({
          text: trimmed,
          promptPrefix,
          pauseMsAfter: this.randomInRange(PAUSE_MAP.paragraph),
          isDialogue: false,
          isHeading: true,
          isSceneBreak: false,
        });
        continue;
      }

      const sentences = this.splitIntoSentences(trimmed);
      let currentChunk = '';
      let hasDialogue = false;

      const flushChunk = () => {
        const chunkText = currentChunk.trim();
        if (!chunkText) return;

        const pause = this.getPauseForEnding(chunkText);
        const dialogueDetected = hasDialogue || this.containsDialogue(chunkText);

        let prefix = promptPrefix;

        chunks.push({
          text: chunkText,
          promptPrefix: prefix,
          pauseMsAfter: pause,
          isDialogue: dialogueDetected,
          isHeading: false,
          isSceneBreak: false,
        });

        currentChunk = '';
        hasDialogue = false;
      };

      for (const sentence of sentences) {
        if (this.containsDialogue(sentence)) hasDialogue = true;

        if (!currentChunk) {
          currentChunk = sentence;
          continue;
        }

        const combined = currentChunk + ' ' + sentence;

        if (combined.length <= this.options.targetChunkChars) {
          currentChunk = combined;
          continue;
        }

        if (currentChunk.length >= this.options.minChunkChars) {
          flushChunk();
          currentChunk = sentence;
          hasDialogue = this.containsDialogue(sentence);
        } else {
          if (combined.length <= this.options.maxChunkChars) {
            currentChunk = combined;
          } else {
            flushChunk();
            currentChunk = sentence;
            hasDialogue = this.containsDialogue(sentence);
          }
        }
      }

      if (currentChunk.trim()) {
        flushChunk();
      }
    }

    return this.mergeSmallChunks(chunks);
  }

  private splitIntoParagraphs(text: string): string[] {
    return text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  }

  private splitIntoSentences(paragraph: string): string[] {
    const protectedText = paragraph
      .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|Mt|Capt|Col|Gen|Lt|Sgt|Rev)\./gi, '$1◆')
      .replace(/\b([A-Z])\./g, '$1◆')
      .replace(/\b(vs|etc|i\.e|e\.g|a\.m|p\.m|A\.D|B\.C)\./gi, '$1◆');

    const sentences = protectedText
      .split(/(?<=[.!?]["'")']?)\s+(?=[A-Z""'(\[])/g)
      .map(s => s.replace(/◆/g, '.').trim())
      .filter(Boolean);

    return sentences;
  }

  private isHeading(text: string): boolean {
    if (/^#{1,6}\s+\S/.test(text)) return true;
    if (/^Chapter\s+\d+/i.test(text)) return true;
    if (/^Part\s+[IVXLCDM\d]+/i.test(text)) return true;
    if (/^[A-Z][A-Z\s,'".:;!?-]{10,}$/.test(text) && text.length < 100) return true;
    return false;
  }

  private containsDialogue(text: string): boolean {
    return /["'"'][^"'"']{5,}["'"']/.test(text);
  }

  private getDialoguePrefix(text: string): string {
    const prefixes = [
      '[Dialogue should sound natural and conversational.]',
      '[Speak the quoted text as the character would speak it.]',
    ];

    if (/whisper|quiet|soft/i.test(text)) {
      return '[Speak the following dialogue softly, almost in a whisper.]';
    }
    if (/shout|yell|scream|loud/i.test(text)) {
      return '[Speak the following dialogue with raised voice and intensity.]';
    }
    if (/hesitat|pause|stammer/i.test(text)) {
      return '[Dialogue should sound hesitant and uncertain.]';
    }
    if (/laugh|chuckle|giggle/i.test(text)) {
      return '[Speak with a hint of amusement in the voice.]';
    }
    if (/angry|furious|rage/i.test(text)) {
      return '[Speak with controlled anger in the voice.]';
    }
    if (/sad|cry|sob|tear/i.test(text)) {
      return '[Speak with emotion, a touch of sadness.]';
    }

    return prefixes[Math.floor(Math.random() * prefixes.length)];
  }

  private getPauseForEnding(text: string): number {
    const trimmed = text.trim();
    const lastChar = trimmed.slice(-1);
    const last3 = trimmed.slice(-3);

    if (last3 === '…' || last3.endsWith('...')) {
      return this.randomInRange(PAUSE_MAP.ellipsis);
    }

    switch (lastChar) {
      case '?':
        return this.randomInRange(PAUSE_MAP.question);
      case '!':
        return this.randomInRange(PAUSE_MAP.exclamation);
      case '.':
        return this.randomInRange(PAUSE_MAP.period);
      case ':':
        return this.randomInRange(PAUSE_MAP.colon);
      case ';':
        return this.randomInRange(PAUSE_MAP.semicolon);
      case ',':
        return this.randomInRange(PAUSE_MAP.comma);
      default:
        return this.randomInRange(PAUSE_MAP.period);
    }
  }

  private randomInRange(range: { min: number; max: number }): number {
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  }

  private mergeSmallChunks(chunks: ProcessedChunk[]): ProcessedChunk[] {
    const merged: ProcessedChunk[] = [];

    for (const chunk of chunks) {
      if (chunk.isSceneBreak) {
        merged.push(chunk);
        continue;
      }

      if (!merged.length) {
        merged.push(chunk);
        continue;
      }

      const prev = merged[merged.length - 1];

      if (prev.isSceneBreak || prev.isHeading) {
        merged.push(chunk);
        continue;
      }

      const combinedLength = prev.text.length + chunk.text.length + 1;
      
      if (
        chunk.text.length < this.options.minChunkChars / 2 &&
        combinedLength <= this.options.maxChunkChars
      ) {
        merged[merged.length - 1] = {
          ...prev,
          text: (prev.text + ' ' + chunk.text).trim(),
          pauseMsAfter: Math.max(prev.pauseMsAfter, chunk.pauseMsAfter),
          isDialogue: prev.isDialogue || chunk.isDialogue,
        };
      } else {
        merged.push(chunk);
      }
    }

    return merged;
  }

  addPronunciation(word: string, pronunciation: string): void {
    this.pronunciationDict.set(word, pronunciation);
  }

  addPronunciations(dict: Record<string, string>): void {
    for (const [word, pronunciation] of Object.entries(dict)) {
      this.pronunciationDict.set(word, pronunciation);
    }
  }

  estimateDurationSeconds(text: string): number {
    return text.length / 14;
  }

  static presetDescriptions(): Record<NarrationPreset, string> {
    return {
      audiobook: 'Professional audiobook narration - warm, restrained, immersive',
      conversational: 'Friendly chat style - relaxed and natural',
      documentary: 'Authoritative and engaging - clear and measured',
      bedtime: 'Soft and soothing - perfect for relaxation',
      dramatic: 'Expressive and engaging - builds tension appropriately',
    };
  }
}

export function createAudiobookProcessor(options?: AudiobookProcessorOptions): AudiobookTextProcessor {
  return new AudiobookTextProcessor(options);
}
