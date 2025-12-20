import OpenAI from 'openai';
import {
  TtsProvider,
  OutputFormat,
  createJob,
  setJobProgress,
  setJobStatus,
  setJobError,
  completeJob,
  buildChunkKey,
  readPcmFromCache,
  writePcmToCache,
  pcmToFormatBuffer,
  makeSilencePcm,
  getJob,
  getJobResult,
  checkJobOutputExists,
} from './ttsJobManager';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';

export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
export type OpenAIModel = 'tts-1' | 'tts-1-hd';

export interface OpenAITtsOptions {
  voice: OpenAIVoice;
  model?: OpenAIModel;
  speed?: number;
  format?: OutputFormat;
  jobId?: string;
  skipCache?: boolean;
}

export interface OpenAIVoiceInfo {
  voice: OpenAIVoice;
  name: string;
  description: string;
  provider: 'openai';
  isRecommended: boolean;
}

const PCM_SAMPLE_RATE = 24000;
const PCM_CHANNELS = 1;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class OpenAITtsService {
  private client: OpenAI;

  constructor() {
    this.client = openai;
    console.log('✅ OpenAI TTS service initialized');
  }

  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  createJob(text: string, options: OpenAITtsOptions): string {
    const format = options.format || 'mp3';
    const model = options.model || 'tts-1';
    const jobId = createJob({
      provider: 'openai',
      voice: options.voice,
      model,
      format,
      text,
      jobId: options.jobId,
    });
    
    this.executeJobAsync(jobId, text, options).catch(err => {
      console.error(`❌ OpenAI job ${jobId.slice(0, 8)}... failed:`, err.message);
    });
    
    return jobId;
  }

  private async executeJobAsync(jobId: string, text: string, options: OpenAITtsOptions): Promise<void> {
    const job = getJob(jobId);
    if (!job) return;
    
    try {
      if (checkJobOutputExists(jobId)) {
        setJobProgress(jobId, { pct: 100, message: 'Cache hit (instant)' });
        setJobStatus(jobId, 'done', 'Cache hit');
        return;
      }
      
      setJobStatus(jobId, 'running', 'Chunking text...');
      
      const buffer = await this.generateAudioWithJobProgress(text, options, jobId);
      
      completeJob(jobId, buffer);
      
    } catch (error: any) {
      setJobError(jobId, error?.message ?? String(error));
    }
  }

  private async generateAudioWithJobProgress(text: string, options: OpenAITtsOptions, jobId: string): Promise<Buffer> {
    const format = options.format || 'mp3';
    const model = options.model || 'tts-1';
    const chunks = this.splitTextIntoChunks(text, 3500);
    
    setJobProgress(jobId, { total: chunks.length, done: 0, pct: 0, message: 'Preparing chunks...' });
    
    if (!chunks.length) return Buffer.alloc(0);

    let cacheHits = 0;
    const pcmBuffers: Buffer[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkKey = buildChunkKey('openai', options.voice, chunk, model);
      
      const cachedPcm = readPcmFromCache(chunkKey);
      if (cachedPcm && !options.skipCache) {
        cacheHits++;
        pcmBuffers.push(cachedPcm);
      } else {
        const pcm = await this.synthesizeChunkToPcm(chunk, options);
        
        if (!options.skipCache) {
          writePcmToCache(chunkKey, pcm);
        }
        
        pcmBuffers.push(pcm);
      }
      
      const done = i + 1;
      const pct = Math.round((done / chunks.length) * 80);
      setJobProgress(jobId, { done, total: chunks.length, pct, message: `Generating audio (${done}/${chunks.length})` });
    }

    if (cacheHits > 0) {
      console.log(`⚡ OpenAI TTS: ${cacheHits}/${chunks.length} chunks from cache`);
    }

    setJobProgress(jobId, { pct: 85, message: 'Assembling audio...' });
    
    const assembled: Buffer[] = [];
    for (let i = 0; i < pcmBuffers.length; i++) {
      assembled.push(pcmBuffers[i]);
      if (i < pcmBuffers.length - 1) {
        assembled.push(makeSilencePcm(120));
      }
    }

    const fullPcm = Buffer.concat(assembled);
    
    setJobProgress(jobId, { pct: 90, message: 'Encoding output...' });
    
    const outputBuffer = await pcmToFormatBuffer(fullPcm, { format, bitrateKbps: 192 });
    
    return outputBuffer;
  }

  private async synthesizeChunkToPcm(text: string, options: OpenAITtsOptions): Promise<Buffer> {
    const model = options.model || 'tts-1';
    const voice = options.voice;
    const speed = options.speed || 1.0;
    
    const response = await this.client.audio.speech.create({
      model,
      voice,
      input: text,
      response_format: 'pcm',
      speed,
    });

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async generateAudio(text: string, options: OpenAITtsOptions): Promise<Buffer> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    console.log(`🎙️ Generating audio with OpenAI TTS using voice: ${options.voice}`);
    
    try {
      const chunks = this.splitTextIntoChunks(text, 3500);
      console.log(`📝 Split text into ${chunks.length} chunks for OpenAI TTS processing`);
      
      const audioBuffers: Buffer[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🎵 Processing OpenAI chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
        
        const response = await this.client.audio.speech.create({
          model: options.model || 'tts-1',
          voice: options.voice,
          input: chunk,
          response_format: (options.format || 'mp3') as any,
          speed: options.speed || 1.0,
        });

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        audioBuffers.push(buffer);
        console.log(`✅ OpenAI chunk ${i + 1} completed (${buffer.length} bytes)`);
      }
      
      const finalBuffer = Buffer.concat(audioBuffers);
      console.log(`✅ OpenAI TTS completed with ${chunks.length} chunks (${finalBuffer.length} bytes total)`);
      
      return finalBuffer;
    } catch (error: any) {
      console.error('❌ OpenAI TTS API error:', error.message);
      throw new Error(`Failed to generate audio with OpenAI: ${error.message}`);
    }
  }

  private splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= maxChunkSize) {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        if (sentence.length > maxChunkSize) {
          const words = sentence.split(' ');
          let wordChunk = '';
          for (const word of words) {
            if ((wordChunk + ' ' + word).length <= maxChunkSize) {
              wordChunk += (wordChunk ? ' ' : '') + word;
            } else {
              if (wordChunk) chunks.push(wordChunk);
              wordChunk = word;
            }
          }
          currentChunk = wordChunk;
        } else {
          currentChunk = sentence;
        }
      }
    }

    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  }

  static getAvailableVoices(): OpenAIVoiceInfo[] {
    return [
      { voice: 'alloy', name: 'Alloy', description: 'Neutral and balanced', provider: 'openai', isRecommended: true },
      { voice: 'echo', name: 'Echo', description: 'Warm and conversational', provider: 'openai', isRecommended: false },
      { voice: 'fable', name: 'Fable', description: 'Expressive and dynamic', provider: 'openai', isRecommended: true },
      { voice: 'onyx', name: 'Onyx', description: 'Deep and authoritative', provider: 'openai', isRecommended: false },
      { voice: 'nova', name: 'Nova', description: 'Warm and engaging', provider: 'openai', isRecommended: true },
      { voice: 'shimmer', name: 'Shimmer', description: 'Clear and expressive', provider: 'openai', isRecommended: false },
    ];
  }

  static getVoicesForDisplay(): Array<{
    voice: string;
    name: string;
    description: string;
    provider: 'openai';
    isRecommended: boolean;
  }> {
    return this.getAvailableVoices();
  }
}
