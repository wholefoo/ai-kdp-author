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

export type OutputFormat = 'mp3' | 'wav';

export interface GeminiTtsOptions {
  voice: GeminiVoice;
  model: 'gemini-2.5-flash-preview-tts' | 'gemini-2.5-pro-preview-tts';
  speed: number;
  language?: string;
  styleHint?: string;
  format?: OutputFormat;
  bitrateKbps?: number;
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

const CACHE_DIR = path.join(process.cwd(), 'cache');
const PCM_DIR = path.join(CACHE_DIR, 'pcm');
const OUT_DIR = path.join(CACHE_DIR, 'out');

const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const CACHE_MAX_BYTES = 800 * 1024 * 1024;
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;

const inFlightByKey = new Map<string, Promise<Buffer>>();

try {
  fs.mkdirSync(PCM_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
} catch {}

function sha256(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function fileExists(p: string): boolean {
  try { return fs.existsSync(p) && fs.statSync(p).isFile(); } catch { return false; }
}

function ensureDir(p: string): void {
  fs.mkdirSync(p, { recursive: true });
}

function touch(p: string): void {
  try {
    const now = new Date();
    fs.utimesSync(p, now, now);
  } catch {}
}

function listFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...listFilesRecursive(full));
      else out.push(full);
    }
  } catch {}
  return out;
}

function buildChunkKey(voiceName: string, styleHint: string, chunkText: string, model: string): string {
  const obj = {
    model,
    voiceName,
    styleHint: styleHint || '',
    chunkText,
    pcm: { sampleRate: PCM_SAMPLE_RATE, channels: PCM_CHANNELS, fmt: 's16le' },
  };
  return sha256(JSON.stringify(obj));
}

function pcmPathForChunkKey(chunkKey: string): string {
  const shard = chunkKey.slice(0, 2);
  const dir = path.join(PCM_DIR, shard);
  ensureDir(dir);
  return path.join(dir, `${chunkKey}.pcm`);
}

function buildRequestKey(text: string, options: GeminiTtsOptions): string {
  const keyObj = {
    model: options.model,
    voice: options.voice,
    styleHint: options.styleHint || '',
    format: options.format || 'mp3',
    bitrateKbps: options.bitrateKbps || 192,
    pauseMsShort: options.pauseMsShort ?? 120,
    pauseMsParagraph: options.pauseMsParagraph ?? 260,
    pauseMsHeading: options.pauseMsHeading ?? 420,
    maxCharsPerChunk: options.maxCharsPerChunk || 1400,
    text,
  };
  return sha256(JSON.stringify(keyObj));
}

function outPathForRequest(requestKey: string, format: OutputFormat): string {
  const shard = requestKey.slice(0, 2);
  const dir = path.join(OUT_DIR, shard);
  ensureDir(dir);
  return path.join(dir, `${requestKey}.${format}`);
}

function readPcmFromCache(chunkKey: string): Buffer | null {
  const p = pcmPathForChunkKey(chunkKey);
  if (fileExists(p)) {
    touch(p);
    return fs.readFileSync(p);
  }
  return null;
}

function writePcmToCache(chunkKey: string, pcmBuffer: Buffer): void {
  try {
    const outPath = pcmPathForChunkKey(chunkKey);
    const tmpPath = outPath + '.tmp';
    fs.writeFileSync(tmpPath, pcmBuffer);
    fs.renameSync(tmpPath, outPath);
  } catch {}
}

function readOutputFromCache(requestKey: string, format: OutputFormat): Buffer | null {
  const p = outPathForRequest(requestKey, format);
  if (fileExists(p)) {
    touch(p);
    return fs.readFileSync(p);
  }
  return null;
}

function writeOutputToCache(requestKey: string, format: OutputFormat, buffer: Buffer): void {
  try {
    const outPath = outPathForRequest(requestKey, format);
    const tmpPath = outPath + '.tmp';
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, outPath);
    console.log(`💾 Cached Gemini TTS output: ${requestKey.slice(0, 12)}...`);
  } catch {}
}

function pcmToFormatBuffer(pcmBuffer: Buffer, { format = 'mp3', bitrateKbps = 192 }: { format?: OutputFormat; bitrateKbps?: number } = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("ffmpeg binary not found"));

    const outArgs = format === 'wav'
      ? ['-f', 'wav', 'pipe:1']
      : ['-codec:a', 'libmp3lame', '-b:a', `${bitrateKbps}k`, '-f', 'mp3', 'pipe:1'];

    const args = [
      "-hide_banner",
      "-loglevel", "error",
      "-f", "s16le",
      "-ar", String(PCM_SAMPLE_RATE),
      "-ac", String(PCM_CHANNELS),
      "-i", "pipe:0",
      ...outArgs,
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

  for (const para of paragraphs) {
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
      if (!current) { current = s; continue; }
      if ((current.length + 1 + s.length) <= maxCharsPerChunk) current += " " + s;
      else { flush(pauseMsShort); current = s; }
    }

    if (current.trim()) flush(heading ? pauseMsHeading : pauseMsParagraph);
  }

  const merged: ChunkWithPause[] = [];
  for (const c of chunks) {
    if (!merged.length) { merged.push(c); continue; }
    const prev = merged[merged.length - 1];
    if (
      c.text.length < Math.floor(minChunkChars / 2) &&
      (prev.text.length + 1 + c.text.length) <= maxCharsPerChunk
    ) {
      merged[merged.length - 1] = {
        text: (prev.text + " " + c.text).trim(),
        pauseMsAfter: Math.max(prev.pauseMsAfter, c.pauseMsAfter),
      };
    } else merged.push(c);
  }

  const finalChunks: ChunkWithPause[] = [];
  for (const c of merged) {
    if (c.text.length <= maxCharsPerChunk) { finalChunks.push(c); continue; }
    let i = 0;
    while (i < c.text.length) {
      finalChunks.push({ text: c.text.slice(i, i + maxCharsPerChunk).trim(), pauseMsAfter: c.pauseMsAfter });
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

  const n = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: n }, runner));
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
    const format = options.format || 'mp3';
    const requestKey = buildRequestKey(text, options);
    
    if (!options.skipCache) {
      const cached = readOutputFromCache(requestKey, format);
      if (cached) {
        console.log(`⚡ Gemini TTS final cache hit: ${requestKey.slice(0, 12)}...`);
        return cached;
      }
      
      const inFlight = inFlightByKey.get(requestKey);
      if (inFlight) {
        console.log(`🔄 Gemini TTS de-dupe: waiting for in-flight request...`);
        return inFlight;
      }
    }

    const generatePromise = this.generateAudioInternal(text, options, requestKey);
    
    if (!options.skipCache) {
      inFlightByKey.set(requestKey, generatePromise);
      generatePromise.finally(() => inFlightByKey.delete(requestKey));
    }

    return generatePromise;
  }

  private async generateAudioInternal(text: string, options: GeminiTtsOptions, requestKey: string): Promise<Buffer> {
    const format = options.format || 'mp3';
    const bitrateKbps = options.bitrateKbps || 192;
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
      
      console.log(`📝 Split text into ${chunks.length} chunks (concurrency: ${concurrency})`);
      
      if (!chunks.length) return Buffer.alloc(0);

      let cacheHits = 0;
      const pcmItems = await runWithConcurrency(
        chunks,
        concurrency,
        async (chunk, idx) => {
          const chunkKey = buildChunkKey(options.voice, options.styleHint || '', chunk.text, options.model);
          
          const cachedPcm = readPcmFromCache(chunkKey);
          if (cachedPcm) {
            cacheHits++;
            console.log(`⚡ Chunk ${idx + 1} PCM cache hit`);
            return { pcm: cachedPcm, pauseMsAfter: chunk.pauseMsAfter };
          }
          
          console.log(`🎵 Generating chunk ${idx + 1}/${chunks.length} (${chunk.text.length} chars)`);
          const pcm = await this.synthesizeChunkToPcm(chunk.text, options);
          
          if (!options.skipCache) {
            writePcmToCache(chunkKey, pcm);
          }
          
          console.log(`✅ Chunk ${idx + 1} completed (${pcm.length} bytes PCM)`);
          return { pcm, pauseMsAfter: chunk.pauseMsAfter };
        },
        (done, total) => {
          const pct = Math.round((done / total) * 80);
          console.log(`📊 Progress: ${done}/${total} chunks (${pct}%)`);
        }
      );

      console.log(`📊 PCM cache hits: ${cacheHits}/${chunks.length}`);
      console.log(`🔄 Assembling ${pcmItems.length} PCM chunks...`);
      
      const assembled: Buffer[] = [];
      for (let i = 0; i < pcmItems.length; i++) {
        assembled.push(pcmItems[i].pcm);
        if (i < pcmItems.length - 1) {
          const ms = Math.max(0, pcmItems[i].pauseMsAfter);
          if (ms > 0) assembled.push(makeSilencePcm(ms));
        }
      }

      const fullPcm = Buffer.concat(assembled);
      console.log(`🔄 Encoding ${fullPcm.length} bytes PCM to ${format.toUpperCase()}...`);
      
      const outputBuffer = await pcmToFormatBuffer(fullPcm, { format, bitrateKbps });
      console.log(`✅ Gemini TTS completed (${outputBuffer.length} bytes ${format.toUpperCase()})`);
      
      if (!options.skipCache) {
        writeOutputToCache(requestKey, format, outputBuffer);
      }
      
      return outputBuffer;
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

  static cleanupCache(): void {
    try {
      const files = [
        ...listFilesRecursive(PCM_DIR),
        ...listFilesRecursive(OUT_DIR),
      ];

      const now = Date.now();
      let survivors: { f: string; st: fs.Stats }[] = [];
      
      for (const f of files) {
        try {
          const st = fs.statSync(f);
          if (now - st.mtimeMs > CACHE_TTL_MS) {
            fs.unlinkSync(f);
          } else {
            survivors.push({ f, st });
          }
        } catch {}
      }

      let total = survivors.reduce((sum, x) => sum + x.st.size, 0);
      if (total <= CACHE_MAX_BYTES) return;

      survivors.sort((a, b) => a.st.mtimeMs - b.st.mtimeMs);
      let cleaned = 0;
      
      for (const x of survivors) {
        if (total <= CACHE_MAX_BYTES) break;
        try {
          fs.unlinkSync(x.f);
          total -= x.st.size;
          cleaned++;
        } catch {}
      }
      
      if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} old Gemini TTS cache files`);
      }
    } catch {}
  }

  static getCacheStats(): { pcmFiles: number; outFiles: number; totalBytes: number } {
    try {
      const pcmFiles = listFilesRecursive(PCM_DIR);
      const outFiles = listFilesRecursive(OUT_DIR);
      let totalBytes = 0;
      for (const f of [...pcmFiles, ...outFiles]) {
        totalBytes += fs.statSync(f).size;
      }
      return { pcmFiles: pcmFiles.length, outFiles: outFiles.length, totalBytes };
    } catch {
      return { pcmFiles: 0, outFiles: 0, totalBytes: 0 };
    }
  }
}

setInterval(() => {
  GeminiTtsService.cleanupCache();
}, CLEANUP_INTERVAL_MS);
