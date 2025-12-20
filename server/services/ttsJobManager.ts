import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';

export type TtsProvider = 'gemini' | 'openai' | 'deepgram';
export type OutputFormat = 'mp3' | 'wav' | 'aac' | 'opus';
export type TtsJobStatus = 'queued' | 'running' | 'done' | 'error' | 'interrupted';

export interface TtsJobProgress {
  total: number;
  done: number;
  pct: number;
  message: string;
}

export interface TtsJobMeta {
  jobId: string;
  provider: TtsProvider;
  status: TtsJobStatus;
  progress: TtsJobProgress;
  outPath: string | null;
  requestKey: string;
  format: OutputFormat;
  error: string | null;
  createdAt: number;
  updatedAt: number;
  voice?: string;
  model?: string;
}

export interface ChunkCacheEntry {
  chunkKey: string;
  provider: TtsProvider;
  voice: string;
  text: string;
  audioBuffer: Buffer;
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
const JOB_CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

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

function sha256(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

export function persistJob(jobId: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  
  const meta: TtsJobMeta = {
    jobId,
    provider: job.provider,
    status: job.status,
    progress: job.progress,
    outPath: job.outPath,
    requestKey: job.requestKey,
    format: job.format,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: Date.now(),
    voice: job.voice,
    model: job.model,
  };
  atomicWriteJson(jobMetaPath(jobId), meta);
}

export function setJobProgress(jobId: string, patch: Partial<TtsJobProgress>): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.progress = { ...job.progress, ...patch };
  persistJob(jobId);
}

export function setJobStatus(jobId: string, status: TtsJobStatus, message?: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = status;
  if (message) job.progress.message = message;
  persistJob(jobId);
}

export function setJobError(jobId: string, error: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.error = error;
  job.status = 'error';
  job.progress.message = error;
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
          provider: meta.provider || 'gemini',
          status,
          progress: meta.progress || { total: 0, done: 0, pct: outExists ? 100 : 0, message: status },
          error: meta.error || (status === 'interrupted' ? 'Job interrupted by server restart. Please retry.' : null),
          sseClients: new Set(),
        });
        
        if (status === 'interrupted') {
          console.log(`⚠️ Job ${meta.jobId.slice(0, 8)}... (${meta.provider || 'unknown'}) marked as interrupted`);
        }
      } catch {}
    }
  } catch {}
}

loadPersistedJobs();

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
          if (meta.jobId) {
            jobs.delete(meta.jobId);
          }
          fs.unlinkSync(metaPath);
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

setInterval(periodicJobCleanup, JOB_CLEANUP_INTERVAL_MS);
console.log(`⏰ Unified TTS job cleanup scheduled every ${JOB_CLEANUP_INTERVAL_MS / (60 * 60 * 1000)} hours`);
setTimeout(periodicJobCleanup, 5000);

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
    provider: j.provider,
    status: j.status,
    progress: j.progress,
    outPath: j.outPath,
    requestKey: j.requestKey,
    format: j.format,
    error: j.error,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
    voice: j.voice,
    model: j.model,
  }));
}

export function buildChunkKey(provider: TtsProvider, voice: string, text: string, model?: string): string {
  const obj = {
    provider,
    model: model || '',
    voice,
    text,
    pcm: { sampleRate: PCM_SAMPLE_RATE, channels: PCM_CHANNELS, fmt: 's16le' },
  };
  return sha256(JSON.stringify(obj));
}

export function buildRequestKey(provider: TtsProvider, text: string, options: { voice: string; model?: string; format?: string }): string {
  const keyObj = {
    provider,
    model: options.model || '',
    voice: options.voice,
    format: options.format || 'mp3',
    text,
  };
  return sha256(JSON.stringify(keyObj));
}

function pcmPathForChunkKey(chunkKey: string): string {
  const shard = chunkKey.slice(0, 2);
  const dir = path.join(PCM_DIR, shard);
  ensureDir(dir);
  return path.join(dir, `${chunkKey}.pcm`);
}

function outPathForRequest(requestKey: string, format: OutputFormat): string {
  const shard = requestKey.slice(0, 2);
  const dir = path.join(OUT_DIR, shard);
  ensureDir(dir);
  return path.join(dir, `${requestKey}.${format}`);
}

export function readPcmFromCache(chunkKey: string): Buffer | null {
  const p = pcmPathForChunkKey(chunkKey);
  if (fileExists(p)) {
    touch(p);
    return fs.readFileSync(p);
  }
  return null;
}

export function writePcmToCache(chunkKey: string, pcmBuffer: Buffer): void {
  try {
    const outPath = pcmPathForChunkKey(chunkKey);
    const tmpPath = outPath + '.tmp';
    fs.writeFileSync(tmpPath, pcmBuffer);
    fs.renameSync(tmpPath, outPath);
  } catch {}
}

export function readOutputFromCache(requestKey: string, format: OutputFormat): Buffer | null {
  const p = outPathForRequest(requestKey, format);
  if (fileExists(p)) {
    touch(p);
    return fs.readFileSync(p);
  }
  return null;
}

export function writeOutputToCache(requestKey: string, format: OutputFormat, buffer: Buffer, provider: TtsProvider): void {
  try {
    const outPath = outPathForRequest(requestKey, format);
    const tmpPath = outPath + '.tmp';
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, outPath);
    console.log(`💾 Cached ${provider} TTS output: ${requestKey.slice(0, 12)}...`);
  } catch {}
}

export function pcmToFormatBuffer(pcmBuffer: Buffer, { format = 'mp3', bitrateKbps = 192 }: { format?: OutputFormat; bitrateKbps?: number } = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("ffmpeg binary not found"));

    const outArgs = format === 'wav'
      ? ['-f', 'wav', 'pipe:1']
      : format === 'aac'
      ? ['-codec:a', 'aac', '-b:a', `${bitrateKbps}k`, '-f', 'adts', 'pipe:1']
      : format === 'opus'
      ? ['-codec:a', 'libopus', '-b:a', `${bitrateKbps}k`, '-f', 'opus', 'pipe:1']
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

export function makeSilencePcm(ms: number): Buffer {
  const samples = Math.max(0, Math.floor((PCM_SAMPLE_RATE * ms) / 1000));
  const bytes = samples * PCM_CHANNELS * PCM_BYTES_PER_SAMPLE;
  return Buffer.alloc(bytes, 0);
}

export interface CreateJobOptions {
  provider: TtsProvider;
  voice: string;
  model?: string;
  format?: OutputFormat;
  text: string;
  jobId?: string;
}

export function createJob(options: CreateJobOptions): string {
  const format = options.format || 'mp3';
  const requestKey = buildRequestKey(options.provider, options.text, options);
  const outPath = outPathForRequest(requestKey, format);
  
  const existingJobId = inFlightByRequestKey.get(requestKey);
  if (existingJobId && jobs.has(existingJobId)) {
    console.log(`🔄 Returning existing ${options.provider} job: ${existingJobId.slice(0, 8)}...`);
    return existingJobId;
  }
  
  const jobId = options.jobId || makeJobId();
  const now = Date.now();
  
  const job: TtsJobMeta & { sseClients: Set<any> } = {
    jobId,
    provider: options.provider,
    status: 'queued',
    progress: { total: 0, done: 0, pct: 0, message: 'Queued' },
    outPath,
    requestKey,
    format,
    error: null,
    createdAt: now,
    updatedAt: now,
    voice: options.voice,
    model: options.model,
    sseClients: new Set(),
  };
  
  jobs.set(jobId, job);
  inFlightByRequestKey.set(requestKey, jobId);
  persistJob(jobId);
  
  console.log(`📋 Created ${options.provider} TTS job: ${jobId.slice(0, 8)}...`);
  
  return jobId;
}

export function completeJob(jobId: string, audioBuffer: Buffer): void {
  const job = jobs.get(jobId);
  if (!job || !job.outPath) return;
  
  try {
    const tmpPath = job.outPath + '.tmp';
    fs.writeFileSync(tmpPath, audioBuffer);
    fs.renameSync(tmpPath, job.outPath);
    touch(job.outPath);
    
    setJobProgress(jobId, { pct: 100, message: 'Done' });
    setJobStatus(jobId, 'done', 'Done');
    
    if (inFlightByRequestKey.get(job.requestKey) === jobId) {
      inFlightByRequestKey.delete(job.requestKey);
    }
  } catch (error: any) {
    setJobError(jobId, error?.message ?? String(error));
  }
}

export function getJobOutPath(jobId: string): string | null {
  const job = jobs.get(jobId);
  return job?.outPath || null;
}

export function checkJobOutputExists(jobId: string): boolean {
  const job = jobs.get(jobId);
  if (!job?.outPath) return false;
  return fileExists(job.outPath);
}

export { JOB_TTL_MS, CACHE_TTL_MS };
