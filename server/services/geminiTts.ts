import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AudiobookTextProcessor, type NarrationPreset, type ProcessedChunk } from './audiobookTextProcessor';

export type GeminiVoice = 
  | 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Leda' | 'Orus' | 'Aoede' | 'Callirrhoe'
  | 'Autonoe' | 'Enceladus' | 'Iapetus' | 'Umbriel' | 'Algieba' | 'Despina' | 'Erinome' | 'Algenib'
  | 'Laomedeia' | 'Achernar' | 'Alnilam' | 'Schedar' | 'Gacrux' | 'Pulcherrima' | 'Achird' | 'Zubenelgenubi'
  | 'Rasalgethi' | 'Sadachbia' | 'Sadaltager' | 'Sulafat' | 'Vindemiatrix';

export type OutputFormat = 'mp3' | 'wav';

export type TtsJobStatus = 'queued' | 'running' | 'done' | 'error' | 'interrupted';

export interface TtsJobProgress {
  total: number;
  done: number;
  pct: number;
  message: string;
}

export interface TtsJobMeta {
  jobId: string;
  status: TtsJobStatus;
  progress: TtsJobProgress;
  outPath: string | null;
  requestKey: string;
  format: OutputFormat;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

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
  jobId?: string;
  useAudiobookProcessor?: boolean;
  narrationPreset?: 'audiobook' | 'conversational' | 'documentary' | 'bedtime' | 'dramatic';
  pronunciationDictionary?: Record<string, string>;
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
const JOB_DIR = path.join(CACHE_DIR, 'jobs');

const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const CACHE_MAX_BYTES = 800 * 1024 * 1024;
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
const JOB_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const inFlightByKey = new Map<string, Promise<Buffer>>();
const jobs = new Map<string, TtsJobMeta & { sseClients?: Set<any> }>();
const inFlightByRequestKey = new Map<string, string>();

try {
  fs.mkdirSync(PCM_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(JOB_DIR, { recursive: true });
} catch {}

function makeJobId(): string {
  return crypto.randomBytes(12).toString('hex');
}

function jobMetaPath(jobId: string): string {
  return path.join(JOB_DIR, `${jobId}.json`);
}

function atomicWriteJson(filePath: string, obj: object): void {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, filePath);
}

function persistJob(jobId: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  
  const meta: TtsJobMeta = {
    jobId,
    status: job.status,
    progress: job.progress,
    outPath: job.outPath,
    requestKey: job.requestKey,
    format: job.format,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: Date.now(),
  };
  atomicWriteJson(jobMetaPath(jobId), meta);
}

function setJobProgress(jobId: string, patch: Partial<TtsJobProgress>): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.progress = { ...job.progress, ...patch };
  persistJob(jobId);
}

function setJobStatus(jobId: string, status: TtsJobStatus, message?: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = status;
  if (message) job.progress.message = message;
  persistJob(jobId);
}

function loadPersistedJobs(): void {
  try {
    const files = fs.readdirSync(JOB_DIR).filter(f => f.endsWith('.json'));
    console.log(`📂 Loading ${files.length} persisted TTS jobs...`);
    
    for (const f of files) {
      try {
        const meta = JSON.parse(fs.readFileSync(path.join(JOB_DIR, f), 'utf8')) as TtsJobMeta;
        const outExists = meta?.outPath && fileExists(meta.outPath);
        
        const status: TtsJobStatus = 
          outExists ? 'done'
          : (meta.status === 'running' || meta.status === 'queued') ? 'interrupted'
          : meta.status || 'error';
        
        const now = Date.now();
        if (meta.createdAt && (now - meta.createdAt) > JOB_TTL_MS) {
          try { fs.unlinkSync(path.join(JOB_DIR, f)); } catch {}
          continue;
        }
        
        jobs.set(meta.jobId, {
          ...meta,
          status,
          progress: meta.progress || { total: 0, done: 0, pct: outExists ? 100 : 0, message: status },
          error: meta.error || (status === 'interrupted' ? 'Job interrupted by server restart. Please retry.' : null),
          sseClients: new Set(),
        });
        
        if (status === 'interrupted') {
          console.log(`⚠️ Job ${meta.jobId.slice(0, 8)}... marked as interrupted`);
        }
      } catch {}
    }
  } catch {}
}

loadPersistedJobs();

// Periodic job cleanup scheduler - runs every 6 hours to enforce 7-day TTL during long uptimes
const JOB_CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

function periodicJobCleanup(): void {
  console.log('🧹 Running periodic TTS job cleanup...');
  let cleaned = 0;
  
  try {
    if (!fs.existsSync(JOB_DIR)) return;
    
    const files = fs.readdirSync(JOB_DIR).filter(f => f.endsWith('.json'));
    const now = Date.now();
    
    for (const f of files) {
      try {
        const metaPath = path.join(JOB_DIR, f);
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as TtsJobMeta;
        
        if (meta.createdAt && (now - meta.createdAt) > JOB_TTL_MS) {
          // Remove job from in-memory map
          if (meta.jobId) {
            jobs.delete(meta.jobId);
          }
          // Remove job metadata file
          fs.unlinkSync(metaPath);
          // Also remove output file if exists
          if (meta.outPath && fileExists(meta.outPath)) {
            try { fs.unlinkSync(meta.outPath); } catch {}
          }
          cleaned++;
        }
      } catch {}
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired TTS job(s)`);
    }
  } catch (err) {
    console.error('Error during periodic job cleanup:', err);
  }
}

// Schedule periodic job cleanup and run once at startup
setInterval(periodicJobCleanup, JOB_CLEANUP_INTERVAL_MS);
console.log(`⏰ TTS job cleanup scheduled every ${JOB_CLEANUP_INTERVAL_MS / (60 * 60 * 1000)} hours`);

// Run cleanup immediately at startup (after loadPersistedJobs) to enforce TTL for long-idle processes
setTimeout(periodicJobCleanup, 5000); // Delay 5s to let server fully initialize

export function getJob(jobId: string): TtsJobMeta | null {
  const job = jobs.get(jobId);
  if (job) return job;
  
  const metaPath = jobMetaPath(jobId);
  if (fileExists(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as TtsJobMeta;
      const outExists = meta?.outPath && fileExists(meta.outPath);
      if (outExists && meta.status !== 'done') {
        meta.status = 'done';
        meta.progress.pct = 100;
      }
      return meta;
    } catch {}
  }
  return null;
}

export function getJobResult(jobId: string): Buffer | null {
  const job = getJob(jobId);
  if (!job || !job.outPath) return null;
  
  if (fileExists(job.outPath)) {
    touch(job.outPath);
    return fs.readFileSync(job.outPath);
  }
  return null;
}

export function getAllJobs(): TtsJobMeta[] {
  return Array.from(jobs.values()).map(j => ({
    jobId: j.jobId,
    status: j.status,
    progress: j.progress,
    outPath: j.outPath,
    requestKey: j.requestKey,
    format: j.format,
    error: j.error,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
  }));
}

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
    v: 3,
    model,
    voiceName,
    temp: 0.2,
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
  const effectiveMaxChars = options.useAudiobookProcessor 
    ? 1200
    : (options.maxCharsPerChunk || 1400);
  const keyObj = {
    v: 4,
    model: options.model,
    voice: options.voice,
    temp: 0.2,
    format: options.format || 'mp3',
    bitrateKbps: options.bitrateKbps || 192,
    pauseMsShort: options.pauseMsShort ?? 120,
    pauseMsParagraph: options.pauseMsParagraph ?? 260,
    pauseMsHeading: options.pauseMsHeading ?? 420,
    maxCharsPerChunk: effectiveMaxChars,
    useAudiobookProcessor: options.useAudiobookProcessor || false,
    narrationPreset: options.narrationPreset || 'audiobook',
    pronunciationDict: options.pronunciationDictionary ? JSON.stringify(options.pronunciationDictionary) : '',
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

  createJob(text: string, options: GeminiTtsOptions): string {
    const format = options.format || 'mp3';
    const requestKey = buildRequestKey(text, options);
    const outPath = outPathForRequest(requestKey, format);
    
    const existingJobId = inFlightByRequestKey.get(requestKey);
    if (existingJobId && jobs.has(existingJobId)) {
      console.log(`🔄 Returning existing job: ${existingJobId.slice(0, 8)}...`);
      return existingJobId;
    }
    
    const jobId = options.jobId || makeJobId();
    const now = Date.now();
    
    const job: TtsJobMeta & { sseClients: Set<any> } = {
      jobId,
      status: 'queued',
      progress: { total: 0, done: 0, pct: 0, message: 'Queued' },
      outPath,
      requestKey,
      format,
      error: null,
      createdAt: now,
      updatedAt: now,
      sseClients: new Set(),
    };
    
    jobs.set(jobId, job);
    inFlightByRequestKey.set(requestKey, jobId);
    persistJob(jobId);
    
    console.log(`📋 Created TTS job: ${jobId.slice(0, 8)}...`);
    
    this.executeJobAsync(jobId, text, options).catch(err => {
      console.error(`❌ Job ${jobId.slice(0, 8)}... failed:`, err.message);
    });
    
    return jobId;
  }

  private async executeJobAsync(jobId: string, text: string, options: GeminiTtsOptions): Promise<void> {
    const job = jobs.get(jobId);
    if (!job) return;
    
    const format = options.format || 'mp3';
    const requestKey = job.requestKey;
    const outPath = job.outPath!;
    
    try {
      if (fileExists(outPath)) {
        touch(outPath);
        setJobProgress(jobId, { pct: 100, message: 'Cache hit (instant)' });
        setJobStatus(jobId, 'done', 'Cache hit');
        return;
      }
      
      setJobStatus(jobId, 'running', 'Chunking text...');
      
      const buffer = await this.generateAudioWithJobProgress(text, options, jobId);
      
      const tmpPath = outPath + '.tmp';
      fs.writeFileSync(tmpPath, buffer);
      fs.renameSync(tmpPath, outPath);
      touch(outPath);
      
      setJobProgress(jobId, { pct: 100, message: 'Done' });
      setJobStatus(jobId, 'done', 'Done');
      
    } catch (error: any) {
      const job = jobs.get(jobId);
      if (job) {
        job.error = error?.message ?? String(error);
        setJobStatus(jobId, 'error', job.error || undefined);
      }
    } finally {
      if (inFlightByRequestKey.get(requestKey) === jobId) {
        inFlightByRequestKey.delete(requestKey);
      }
    }
  }

  private async generateAudioWithJobProgress(text: string, options: GeminiTtsOptions, jobId: string): Promise<Buffer> {
    const format = options.format || 'mp3';
    const bitrateKbps = options.bitrateKbps || 192;
    const maxCharsPerChunk = options.maxCharsPerChunk || 1400;
    const concurrency = options.concurrency || 3;
    const pauseMsShort = options.pauseMsShort ?? 120;
    const pauseMsParagraph = options.pauseMsParagraph ?? 260;
    const pauseMsHeading = options.pauseMsHeading ?? 420;
    
    let processedChunks: Array<{ text: string; pauseMsAfter: number; promptPrefix?: string }>;
    
    const audiobookMaxChars = 1200;
    if (options.useAudiobookProcessor) {
      const processor = new AudiobookTextProcessor({
        preset: options.narrationPreset || 'audiobook',
        targetChunkChars: 800,
        minChunkChars: 200,
        maxChunkChars: audiobookMaxChars,
        pronunciationDictionary: options.pronunciationDictionary,
        expandAbbreviations: true,
        normalizeNumbers: true,
        dialogueCues: true,
      });
      
      const audiobookChunks = processor.processForTts(text);
      processedChunks = audiobookChunks.map(c => ({
        text: c.text,
        pauseMsAfter: c.pauseMsAfter,
        promptPrefix: c.promptPrefix,
      }));
      
      console.log(`📚 Audiobook processor: ${processedChunks.length} chunks (target ~800 chars, max 1200) with ${options.narrationPreset || 'audiobook'} preset`);
    } else {
      const chunks = buildChunksWithPauses(text, {
        maxCharsPerChunk,
        minChunkChars: 300,
        pauseMsShort,
        pauseMsParagraph,
        pauseMsHeading,
      });
      processedChunks = chunks;
    }
    
    setJobProgress(jobId, { total: processedChunks.length, done: 0, pct: 0, message: 'Preparing chunks...' });
    
    if (!processedChunks.length) return Buffer.alloc(0);

    let cacheHits = 0;
    const pcmItems = await runWithConcurrency(
      processedChunks,
      concurrency,
      async (chunk, idx) => {
        if (!chunk.text || chunk.text.trim() === '') {
          return { pcm: makeSilencePcm(chunk.pauseMsAfter), pauseMsAfter: 0 };
        }
        
        const textForTts = chunk.text;
        const chunkKey = buildChunkKey(options.voice, '', chunk.text, options.model);
        
        const cachedPcm = readPcmFromCache(chunkKey);
        if (cachedPcm) {
          cacheHits++;
          return { pcm: cachedPcm, pauseMsAfter: chunk.pauseMsAfter };
        }
        
        const pcm = await this.synthesizeChunkToPcm(textForTts, options);
        
        if (!options.skipCache) {
          writePcmToCache(chunkKey, pcm);
        }
        
        return { pcm, pauseMsAfter: chunk.pauseMsAfter };
      },
      (done, total) => {
        const pct = Math.round((done / total) * 80);
        setJobProgress(jobId, { done, total, pct, message: `Generating audio (${done}/${total})` });
      }
    );

    setJobProgress(jobId, { pct: 85, message: 'Assembling audio...' });
    
    const assembled: Buffer[] = [];
    for (let i = 0; i < pcmItems.length; i++) {
      assembled.push(pcmItems[i].pcm);
      if (i < pcmItems.length - 1) {
        const ms = Math.max(0, pcmItems[i].pauseMsAfter);
        if (ms > 0) assembled.push(makeSilencePcm(ms));
      }
    }

    const fullPcm = Buffer.concat(assembled);
    
    setJobProgress(jobId, { pct: 90, message: 'Encoding output...' });
    
    const outputBuffer = await pcmToFormatBuffer(fullPcm, { format, bitrateKbps });
    
    return outputBuffer;
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

    const generatePromise = this.generateAudioInternal(text, options, requestKey)
      .finally(() => {
        inFlightByKey.delete(requestKey);
      });
    
    if (!options.skipCache) {
      inFlightByKey.set(requestKey, generatePromise);
    }

    return generatePromise;
  }

  private async generateAudioInternal(text: string, options: GeminiTtsOptions, requestKey: string): Promise<Buffer> {
    const format = options.format || 'mp3';
    const bitrateKbps = options.bitrateKbps || 192;
    const maxCharsPerChunk = options.maxCharsPerChunk || 1400;
    const isAudiobook = !!options.narrationPreset;
    const concurrency = options.concurrency || (isAudiobook ? 1 : 2);
    const pauseMsShort = options.pauseMsShort ?? 120;
    const pauseMsParagraph = options.pauseMsParagraph ?? 260;
    const pauseMsHeading = options.pauseMsHeading ?? 420;
    
    console.log(`🎙️ Generating audio with Gemini TTS using voice: ${options.voice} (concurrency: ${concurrency})`);
    
    try {
      let processedChunks: Array<{ text: string; pauseMsAfter: number; promptPrefix?: string }>;
      
      const audiobookMaxCharsInternal = 1200;
      if (options.useAudiobookProcessor) {
        const processor = new AudiobookTextProcessor({
          preset: options.narrationPreset || 'audiobook',
          targetChunkChars: 800,
          minChunkChars: 200,
          maxChunkChars: audiobookMaxCharsInternal,
          pronunciationDictionary: options.pronunciationDictionary,
          expandAbbreviations: true,
          normalizeNumbers: true,
          dialogueCues: true,
        });
        
        const audiobookChunks = processor.processForTts(text);
        processedChunks = audiobookChunks.map(c => ({
          text: c.text,
          pauseMsAfter: c.pauseMsAfter,
          promptPrefix: c.promptPrefix,
        }));
        
        console.log(`📚 Audiobook processor: ${processedChunks.length} chunks (target ~800 chars, max 1200) with ${options.narrationPreset || 'audiobook'} preset`);
      } else {
        const chunks = buildChunksWithPauses(text, {
          maxCharsPerChunk,
          minChunkChars: 300,
          pauseMsShort,
          pauseMsParagraph,
          pauseMsHeading,
        });
        processedChunks = chunks;
        console.log(`📝 Split text into ${processedChunks.length} chunks (concurrency: ${concurrency})`);
      }
      
      if (!processedChunks.length) return Buffer.alloc(0);

      let cacheHits = 0;
      const pcmItems = await runWithConcurrency(
        processedChunks,
        concurrency,
        async (chunk, idx) => {
          if (!chunk.text || chunk.text.trim() === '') {
            return { pcm: makeSilencePcm(chunk.pauseMsAfter), pauseMsAfter: 0 };
          }
          
          const textForTts = chunk.text;
          const chunkKey = buildChunkKey(options.voice, '', chunk.text, options.model);
          
          const cachedPcm = readPcmFromCache(chunkKey);
          if (cachedPcm) {
            cacheHits++;
            console.log(`⚡ Chunk ${idx + 1} PCM cache hit`);
            return { pcm: cachedPcm, pauseMsAfter: chunk.pauseMsAfter };
          }
          
          console.log(`🎵 Generating chunk ${idx + 1}/${processedChunks.length} (${chunk.text.length} chars)`);
          const pcm = await this.synthesizeChunkToPcm(textForTts, options);
          
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

      console.log(`📊 PCM cache hits: ${cacheHits}/${processedChunks.length}`);
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
    const maxChunkRetries = 4;
    let prompt = textChunk.trim();

    const byteLength = Buffer.byteLength(prompt, 'utf-8');
    if (byteLength > 3800) {
      console.warn(`⚠️ Chunk too large (${byteLength} bytes, ${prompt.length} chars). Truncating to ~3500 bytes.`);
      const truncated = Buffer.from(prompt, 'utf-8').subarray(0, 3500).toString('utf-8');
      const lastSpace = truncated.lastIndexOf(' ');
      prompt = lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated;
      console.log(`📝 Truncated to ${prompt.length} chars (${Buffer.byteLength(prompt, 'utf-8')} bytes)`);
    }

    for (let attempt = 1; attempt <= maxChunkRetries; attempt++) {
      try {
        const apiCallPromise = this.client.models.generateContent({
          model: options.model,
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            responseModalities: ['AUDIO'],
            temperature: 0.2,
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: options.voice
                }
              }
            },
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
          }
        });

        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Gemini TTS API call timed out after 120s')), 120000)
        );

        const response = await Promise.race([apiCallPromise, timeoutPromise]);

        const candidate = response?.candidates?.[0];
        const finishReason = candidate?.finishReason;
        const b64 = candidate?.content?.parts?.[0]?.inlineData?.data;

        if (!b64) {
          const safetyRatings = candidate?.safetyRatings?.map((r: any) => `${r.category}:${r.probability}`).join(', ') || 'none';
          const partsInfo = candidate?.content?.parts?.map((p: any) => Object.keys(p)).join(',') || 'no-parts';
          const errorDetail = `No audio data returned. finishReason=${finishReason || 'unknown'}, safetyRatings=[${safetyRatings}], parts=[${partsInfo}], textLength=${prompt.length}`;
          console.warn(`⚠️ Gemini chunk attempt ${attempt}/${maxChunkRetries}: ${errorDetail}`);
          console.warn(`⚠️ Text preview: "${prompt.substring(0, 150)}..."`);

          if (attempt < maxChunkRetries) {
            const delay = attempt * 3000;
            console.log(`⏳ Retrying chunk in ${delay / 1000}s...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          throw new Error(`No audio returned from Gemini after ${maxChunkRetries} attempts (finishReason=${finishReason || 'unknown'})`);
        }

        return Buffer.from(b64, 'base64');
      } catch (error: any) {
        if (error.message?.includes('No audio returned from Gemini after')) {
          throw error;
        }
        console.error(`Error synthesizing chunk with Gemini (attempt ${attempt}/${maxChunkRetries}):`, error.message);
        if (error.message?.includes('401') || error.message?.includes('UNAUTHENTICATED')) {
          console.error('❌ Authentication failed - GEMINI_API_KEY may be invalid');
          throw error;
        }
        if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
          console.warn('⚠️ Rate limited by Gemini API');
          if (attempt < maxChunkRetries) {
            const delay = attempt * 5000;
            console.log(`⏳ Rate limited, retrying chunk in ${delay / 1000}s...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
        }
        if (attempt < maxChunkRetries) {
          const delay = attempt * 3000;
          console.log(`⏳ Retrying chunk in ${delay / 1000}s...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Gemini chunk synthesis exhausted all retries');
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
