import { GoogleGenAI } from '@google/genai';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type GeminiVoice = 
  | 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Leda' | 'Orus' | 'Aoede' | 'Callirrhoe'
  | 'Autonoe' | 'Enceladus' | 'Iapetus' | 'Umbriel' | 'Algieba' | 'Despina' | 'Erinome' | 'Algenib'
  | 'Laomedeia' | 'Achernar' | 'Alnilam' | 'Schedar' | 'Gacrux' | 'Pulcherrima' | 'Achird' | 'Zubenelgenubi'
  | 'Rasalgethi' | 'Sadachbia' | 'Sadaltager' | 'Sulafat' | 'Vindemiatrix';

export interface GeminiTtsOptions {
  voice: GeminiVoice;
  model: 'gemini-2.5-flash-preview-tts' | 'gemini-2.5-pro-preview-tts';
  speed: number;
  language?: string;
  styleHint?: string;
  maxCharsPerChunk?: number;
  concurrency?: number;
  pauseMsShort?: number;
  pauseMsParagraph?: number;
  pauseMsHeading?: number;
  skipCache?: boolean;
}

interface ChunkWithPause {
  text: string;
  pauseMsAfter: number;
}

const PCM_SAMPLE_RATE = 24000;
const PCM_CHANNELS = 1;
const PCM_BYTES_PER_SAMPLE = 2;

const CACHE_DIR = path.join(process.cwd(), 'cache', 'gemini-tts');
const inFlightByKey = new Map<string, Promise<Buffer>>();

try {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
} catch {}

function sha256(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function buildCacheKey(text: string, options: GeminiTtsOptions): string {
  const keyObj = {
    model: options.model,
    voice: options.voice,
    styleHint: options.styleHint || '',
    pauseMsShort: options.pauseMsShort ?? 120,
    pauseMsParagraph: options.pauseMsParagraph ?? 260,
    pauseMsHeading: options.pauseMsHeading ?? 420,
    maxCharsPerChunk: options.maxCharsPerChunk || 1400,
    text: text,
  };
  return sha256(JSON.stringify(keyObj));
}

function cachePathForKey(cacheKey: string): string {
  return path.join(CACHE_DIR, `${cacheKey}.mp3`);
}

function cacheExists(cacheKey: string): boolean {
  const p = cachePathForKey(cacheKey);
  try {
    return fs.existsSync(p) && fs.statSync(p).size > 0;
  } catch {
    return false;
  }
}

function readFromCache(cacheKey: string): Buffer | null {
  try {
    const p = cachePathForKey(cacheKey);
    if (fs.existsSync(p)) {
      return fs.readFileSync(p);
    }
  } catch {}
  return null;
}

function writeToCache(cacheKey: string, mp3Buffer: Buffer): void {
  try {
    const outPath = cachePathForKey(cacheKey);
    const tmpPath = outPath + '.tmp';
    fs.writeFileSync(tmpPath, mp3Buffer);
    fs.renameSync(tmpPath, outPath);
    console.log(`💾 Cached Gemini TTS audio: ${cacheKey.slice(0, 12)}...`);
  } catch (err: any) {
    console.error('Failed to write cache:', err.message);
  }
}

function pcmToMp3Buffer(pcmBuffer: Buffer, { bitrateKbps = 192 } = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("ffmpeg binary not found"));

    const args = [
      "-hide_banner",
      "-loglevel", "error",
      "-f", "s16le",
      "-ar", String(PCM_SAMPLE_RATE),
      "-ac", String(PCM_CHANNELS),
      "-i", "pipe:0",
      "-codec:a", "libmp3lame",
      "-b:a", `${bitrateKbps}k`,
      "-f", "mp3",
      "pipe:1",
    ];

    const ff = spawn(ffmpegPath, args, { stdio: ["pipe", "pipe", "pipe"] });

    const out: Buffer[] = [];
    const err: Buffer[] = [];

    ff.stdout.on("data", (d) => out.push(d));
    ff.stderr.on("data", (d) => err.push(d));

    ff.on("close", (code) => {
      if (code === 0) return resolve(Buffer.concat(out));
      reject(new Error(`ffmpeg failed (code ${code}): ${Buffer.concat(err).toString()}`));
    });

    ff.on("error", reject);

    ff.stdin.write(pcmBuffer);
    ff.stdin.end();
  });
}

function makeSilencePcm(ms: number): Buffer {
  const samples = Math.max(0, Math.floor((PCM_SAMPLE_RATE * ms) / 1000));
  const bytes = samples * PCM_CHANNELS * PCM_BYTES_PER_SAMPLE;
  return Buffer.alloc(bytes, 0);
}

function normalizeText(text: string): string {
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitByParagraphs(text: string): string[] {
  return normalizeText(text).split(/\n\s*\n/g).map(p => p.trim()).filter(Boolean);
}

function isHeading(p: string): boolean {
  return /^#{1,6}\s+\S/.test(p) || /^[A-Z0-9][A-Z0-9\s,'".:;!?-]{10,}$/.test(p);
}

function splitIntoSentences(paragraph: string): string[] {
  return paragraph.split(/(?<=[.!?]["')\]]?)\s+(?=[A-Z0-9""(\[])/g).map(s => s.trim()).filter(Boolean);
}

function buildChunksWithPauses(fullText: string, {
  maxCharsPerChunk = 1400,
  minChunkChars = 300,
  pauseMsShort = 120,
  pauseMsParagraph = 260,
  pauseMsHeading = 420,
} = {}): ChunkWithPause[] {
  const paragraphs = splitByParagraphs(fullText);
  const chunks: ChunkWithPause[] = [];

  for (let pIndex = 0; pIndex < paragraphs.length; pIndex++) {
    const para = paragraphs[pIndex];
    const heading = isHeading(para);

    if (heading && para.length <= maxCharsPerChunk) {
      chunks.push({ text: para, pauseMsAfter: pauseMsHeading });
      continue;
    }

    const sentences = splitIntoSentences(para);
    let current = "";

    const flush = (pauseMsAfter: number) => {
      const t = current.trim();
      if (t) chunks.push({ text: t, pauseMsAfter });
      current = "";
    };

    for (const s of sentences) {
      if (!current) {
        current = s;
        continue;
      }

      if ((current.length + 1 + s.length) <= maxCharsPerChunk) {
        current += " " + s;
      } else {
        flush(pauseMsShort);
        current = s;
      }
    }

    if (current.trim()) {
      const pause = heading ? pauseMsHeading : pauseMsParagraph;
      flush(pause);
    }
  }

  const merged: ChunkWithPause[] = [];
  for (const c of chunks) {
    if (!merged.length) {
      merged.push(c);
      continue;
    }
    const prev = merged[merged.length - 1];
    if (
      c.text.length < Math.floor(minChunkChars / 2) &&
      (prev.text.length + 1 + c.text.length) <= maxCharsPerChunk
    ) {
      merged[merged.length - 1] = {
        text: (prev.text + " " + c.text).trim(),
        pauseMsAfter: Math.max(prev.pauseMsAfter, c.pauseMsAfter),
      };
    } else {
      merged.push(c);
    }
  }

  const finalChunks: ChunkWithPause[] = [];
  for (const c of merged) {
    if (c.text.length <= maxCharsPerChunk) {
      finalChunks.push(c);
      continue;
    }
    let i = 0;
    while (i < c.text.length) {
      finalChunks.push({
        text: c.text.slice(i, i + maxCharsPerChunk).trim(),
        pauseMsAfter: c.pauseMsAfter,
      });
      i += maxCharsPerChunk;
    }
  }

  return finalChunks;
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, idx: number) => Promise<R>,
  onProgress?: (done: number, total: number, idx: number) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;

  async function runner() {
    while (true) {
      const idx = nextIndex++;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx], idx);
      completed++;
      onProgress?.(completed, items.length, idx);
    }
  }

  const runners: Promise<void>[] = [];
  const n = Math.max(1, Math.min(concurrency, items.length));
  for (let i = 0; i < n; i++) runners.push(runner());
  await Promise.all(runners);
  return results;
}

export class GeminiTtsService {
  private client: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateAudio(text: string, options: GeminiTtsOptions): Promise<Buffer> {
    const cacheKey = buildCacheKey(text, options);
    
    if (!options.skipCache) {
      const cached = readFromCache(cacheKey);
      if (cached) {
        console.log(`⚡ Gemini TTS cache hit: ${cacheKey.slice(0, 12)}...`);
        return cached;
      }
      
      const inFlight = inFlightByKey.get(cacheKey);
      if (inFlight) {
        console.log(`🔄 Gemini TTS de-dupe: waiting for in-flight request...`);
        return inFlight;
      }
    }

    const generatePromise = this.generateAudioInternal(text, options, cacheKey);
    
    if (!options.skipCache) {
      inFlightByKey.set(cacheKey, generatePromise);
      generatePromise.finally(() => inFlightByKey.delete(cacheKey));
    }

    return generatePromise;
  }

  private async generateAudioInternal(text: string, options: GeminiTtsOptions, cacheKey: string): Promise<Buffer> {
    const maxCharsPerChunk = options.maxCharsPerChunk || 1400;
    const concurrency = options.concurrency || 3;
    const pauseMsShort = options.pauseMsShort ?? 120;
    const pauseMsParagraph = options.pauseMsParagraph ?? 260;
    const pauseMsHeading = options.pauseMsHeading ?? 420;
    
    console.log(`🎙️ Generating audio with Gemini TTS using voice: ${options.voice}`);
    
    try {
      const chunks = buildChunksWithPauses(text, {
        maxCharsPerChunk,
        minChunkChars: 300,
        pauseMsShort,
        pauseMsParagraph,
        pauseMsHeading,
      });
      
      console.log(`📝 Split text into ${chunks.length} chunks for Gemini TTS (concurrency: ${concurrency})`);
      
      if (!chunks.length) return Buffer.alloc(0);

      const pcmChunks = await runWithConcurrency(
        chunks,
        concurrency,
        async (chunk, idx) => {
          console.log(`🎵 Processing Gemini chunk ${idx + 1}/${chunks.length} (${chunk.text.length} chars)`);
          const pcm = await this.synthesizeChunkToPcm(chunk.text, options);
          console.log(`✅ Gemini chunk ${idx + 1} completed (${pcm.length} bytes PCM)`);
          return { pcm, pauseMsAfter: chunk.pauseMsAfter };
        },
        (done, total) => {
          const pct = Math.round((done / total) * 100);
          console.log(`📊 Gemini TTS progress: ${done}/${total} chunks (${pct}%)`);
        }
      );

      console.log(`🔄 Assembling ${pcmChunks.length} PCM chunks with section-aware pauses...`);
      
      const assembled: Buffer[] = [];
      for (let i = 0; i < pcmChunks.length; i++) {
        assembled.push(pcmChunks[i].pcm);
        if (i < pcmChunks.length - 1) {
          const ms = Math.max(0, pcmChunks[i].pauseMsAfter);
          if (ms > 0) assembled.push(makeSilencePcm(ms));
        }
      }

      const fullPcm = Buffer.concat(assembled);
      console.log(`🔄 Converting ${fullPcm.length} bytes PCM to MP3...`);
      
      const mp3Buffer = await pcmToMp3Buffer(fullPcm, { bitrateKbps: 192 });
      console.log(`✅ Gemini TTS completed (${mp3Buffer.length} bytes MP3)`);
      
      if (!options.skipCache) {
        writeToCache(cacheKey, mp3Buffer);
      }
      
      return mp3Buffer;
    } catch (error: any) {
      console.error('❌ Gemini TTS API error:', error.message);
      throw new Error(`Failed to generate audio with Gemini: ${error.message}`);
    }
  }

  private async synthesizeChunkToPcm(textChunk: string, options: GeminiTtsOptions): Promise<Buffer> {
    try {
      const prompt = options.styleHint?.trim()
        ? `${options.styleHint.trim()}\n\n${textChunk.trim()}`
        : textChunk.trim();

      const response = await this.client.models.generateContent({
        model: options.model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: options.voice
              }
            }
          }
        }
      });

      const b64 = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!b64) {
        throw new Error('No audio returned from Gemini for chunk');
      }

      return Buffer.from(b64, 'base64');
    } catch (error: any) {
      console.error('Error synthesizing chunk with Gemini:', error.message);
      if (error.message?.includes('401') || error.message?.includes('UNAUTHENTICATED')) {
        console.error('❌ Authentication failed - GEMINI_API_KEY may be invalid');
      }
      throw error;
    }
  }

  static getAvailableVoices(): GeminiVoice[] {
    return [
      'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede', 'Callirrhoe',
      'Autonoe', 'Enceladus', 'Iapetus', 'Umbriel', 'Algieba', 'Despina', 'Erinome', 'Algenib',
      'Laomedeia', 'Achernar', 'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi',
      'Rasalgethi', 'Sadachbia', 'Sadaltager', 'Sulafat', 'Vindemiatrix'
    ];
  }

  static getAvailableModels() {
    return ['gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts'] as const;
  }

  static cleanupOldCache(maxAgeDays: number = 7): void {
    try {
      const now = Date.now();
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
      const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.mp3'));
      let cleaned = 0;
      
      for (const f of files) {
        const fp = path.join(CACHE_DIR, f);
        const st = fs.statSync(fp);
        if (now - st.mtimeMs > maxAgeMs) {
          fs.unlinkSync(fp);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} old Gemini TTS cache files`);
      }
    } catch {}
  }

  static getCacheStats(): { files: number; totalBytes: number } {
    try {
      const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.mp3'));
      let totalBytes = 0;
      for (const f of files) {
        totalBytes += fs.statSync(path.join(CACHE_DIR, f)).size;
      }
      return { files: files.length, totalBytes };
    } catch {
      return { files: 0, totalBytes: 0 };
    }
  }
}

setInterval(() => {
  GeminiTtsService.cleanupOldCache(7);
}, 60 * 60 * 1000);
