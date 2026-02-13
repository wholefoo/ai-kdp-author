import axios from 'axios';
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

// Deepgram Aura-2 English voices (40+ voices)
export type DeepgramEnglishVoice =
  | 'aura-2-thalia-en' | 'aura-2-andromeda-en' | 'aura-2-helena-en' | 'aura-2-apollo-en' | 'aura-2-arcas-en' | 'aura-2-aries-en'
  | 'aura-2-amalthea-en' | 'aura-2-asteria-en' | 'aura-2-athena-en' | 'aura-2-atlas-en' | 'aura-2-aurora-en' | 'aura-2-callista-en'
  | 'aura-2-cora-en' | 'aura-2-cordelia-en' | 'aura-2-delia-en' | 'aura-2-draco-en' | 'aura-2-electra-en' | 'aura-2-harmonia-en'
  | 'aura-2-hera-en' | 'aura-2-hermes-en' | 'aura-2-hyperion-en' | 'aura-2-iris-en' | 'aura-2-janus-en' | 'aura-2-juno-en'
  | 'aura-2-jupiter-en' | 'aura-2-luna-en' | 'aura-2-mars-en' | 'aura-2-minerva-en' | 'aura-2-neptune-en' | 'aura-2-odysseus-en'
  | 'aura-2-ophelia-en' | 'aura-2-orion-en' | 'aura-2-orpheus-en' | 'aura-2-pandora-en' | 'aura-2-phoebe-en' | 'aura-2-pluto-en'
  | 'aura-2-saturn-en' | 'aura-2-selene-en' | 'aura-2-theia-en' | 'aura-2-vesta-en' | 'aura-2-zeus-en';

// Deepgram Aura-2 Spanish voices (10 voices)
export type DeepgramSpanishVoice =
  | 'aura-2-celeste-es' | 'aura-2-estrella-es' | 'aura-2-nestor-es' | 'aura-2-sirio-es' | 'aura-2-carina-es'
  | 'aura-2-alvaro-es' | 'aura-2-diana-es' | 'aura-2-aquila-es' | 'aura-2-selena-es' | 'aura-2-javier-es';

// Legacy Aura 1 voices
export type DeepgramLegacyVoice =
  | 'aura-asteria-en' | 'aura-luna-en' | 'aura-stella-en' | 'aura-athena-en' | 'aura-hera-en'
  | 'aura-orion-en' | 'aura-arcas-en' | 'aura-perseus-en' | 'aura-angus-en' | 'aura-orpheus-en'
  | 'aura-helios-en' | 'aura-zeus-en';

export type DeepgramVoice = DeepgramEnglishVoice | DeepgramSpanishVoice | DeepgramLegacyVoice;

export interface DeepgramTtsOptions {
  voice: DeepgramVoice;
  speed?: number; // 0.25 to 2.0 (default 1.0)
  encoding?: 'mp3' | 'wav' | 'linear16' | 'aac' | 'opus';
  format?: OutputFormat;
  jobId?: string;
  skipCache?: boolean;
}

export interface DeepgramVoiceInfo {
  voice: DeepgramVoice;
  name: string;
  gender: 'feminine' | 'masculine';
  age: 'Young Adult' | 'Adult' | 'Mature';
  language: string;
  accent: string;
  characteristics: string;
  useCases: string;
  isRecommended?: boolean;
}

const PCM_SAMPLE_RATE = 24000;
const PCM_CHANNELS = 1;

export class DeepgramTtsService {
  private apiKey: string;
  private baseUrl = 'https://api.deepgram.com/v1/speak';

  constructor() {
    this.apiKey = process.env.DEEPGRAM_API_KEY || '';
    if (this.apiKey) {
      console.log('✅ Deepgram TTS service initialized');
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  createJob(text: string, options: DeepgramTtsOptions): string {
    const format = options.format || 'mp3';
    const jobId = createJob({
      provider: 'deepgram',
      voice: options.voice,
      format,
      text,
      jobId: options.jobId,
    });
    
    this.executeJobAsync(jobId, text, options).catch(err => {
      console.error(`❌ Deepgram job ${jobId.slice(0, 8)}... failed:`, err.message);
    });
    
    return jobId;
  }

  private async executeJobAsync(jobId: string, text: string, options: DeepgramTtsOptions): Promise<void> {
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

  private async generateAudioWithJobProgress(text: string, options: DeepgramTtsOptions, jobId: string): Promise<Buffer> {
    const format = options.format || 'mp3';
    const chunks = this.splitTextIntoChunks(text, 1800);
    
    setJobProgress(jobId, { total: chunks.length, done: 0, pct: 0, message: 'Preparing chunks...' });
    
    if (!chunks.length) return Buffer.alloc(0);

    let cacheHits = 0;
    const pcmBuffers: Buffer[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkKey = buildChunkKey('deepgram', options.voice, chunk);
      
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
      console.log(`⚡ Deepgram TTS: ${cacheHits}/${chunks.length} chunks from cache`);
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

  private async synthesizeChunkToPcm(text: string, options: DeepgramTtsOptions): Promise<Buffer> {
    const audioBuffer = await this.synthesizeChunk(text, { ...options, encoding: 'linear16' });
    return audioBuffer;
  }

  async generateAudio(text: string, options: DeepgramTtsOptions): Promise<Buffer> {
    if (!this.apiKey) {
      throw new Error('DEEPGRAM_API_KEY environment variable is not set');
    }

    console.log(`🎙️ Generating audio with Deepgram TTS using voice: ${options.voice}`);
    
    try {
      const chunks = this.splitTextIntoChunks(text, 1800);
      console.log(`📝 Split text into ${chunks.length} chunks for Deepgram TTS processing`);
      
      const audioBuffers: Buffer[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🎵 Processing Deepgram chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
        
        const audioBuffer = await this.synthesizeChunk(chunk, options);
        audioBuffers.push(audioBuffer);
        console.log(`✅ Deepgram chunk ${i + 1} completed (${audioBuffer.length} bytes)`);
      }
      
      const finalBuffer = Buffer.concat(audioBuffers);
      console.log(`✅ Deepgram TTS completed with ${chunks.length} chunks (${finalBuffer.length} bytes total)`);
      
      return finalBuffer;
    } catch (error: any) {
      console.error('❌ Deepgram TTS API error:', error.message);
      throw new Error(`Failed to generate audio with Deepgram: ${error.message}`);
    }
  }

  private async synthesizeChunk(text: string, options: DeepgramTtsOptions): Promise<Buffer> {
    const encoding = options.encoding || 'mp3';
    const url = `${this.baseUrl}?model=${options.voice}&encoding=${encoding}`;
    
    try {
      const response = await axios.post(
        url,
        { text },
        {
          headers: {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
          timeout: 60000,
        }
      );

      return Buffer.from(response.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.error('❌ Authentication failed - Deepgram API key may be invalid');
        throw new Error('Invalid Deepgram API key');
      }
      if (error.response?.status === 413) {
        console.error('❌ Text payload too large for Deepgram');
        throw new Error('Text too large for single request');
      }
      throw error;
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

  static getAvailableVoices(): DeepgramVoiceInfo[] {
    return [
      // Featured Aura-2 English Voices (Recommended)
      { voice: 'aura-2-thalia-en', name: 'Thalia', gender: 'feminine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Clear, Confident, Energetic, Enthusiastic', useCases: 'Casual chat, customer service, IVR', isRecommended: true },
      { voice: 'aura-2-andromeda-en', name: 'Andromeda', gender: 'feminine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Casual, Expressive, Comfortable', useCases: 'Customer service, IVR', isRecommended: true },
      { voice: 'aura-2-helena-en', name: 'Helena', gender: 'feminine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Caring, Natural, Positive, Friendly, Raspy', useCases: 'IVR, casual chat', isRecommended: true },
      { voice: 'aura-2-apollo-en', name: 'Apollo', gender: 'masculine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Confident, Comfortable, Casual', useCases: 'Casual chat', isRecommended: true },
      { voice: 'aura-2-arcas-en', name: 'Arcas', gender: 'masculine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Natural, Smooth, Clear, Comfortable', useCases: 'Customer service, casual chat', isRecommended: true },
      { voice: 'aura-2-aries-en', name: 'Aries', gender: 'masculine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Warm, Energetic, Caring', useCases: 'Casual chat', isRecommended: true },
      
      // All Aura-2 English Voices
      { voice: 'aura-2-amalthea-en', name: 'Amalthea', gender: 'feminine', age: 'Young Adult', language: 'en-ph', accent: 'Filipino', characteristics: 'Engaging, Natural, Cheerful', useCases: 'Casual chat' },
      { voice: 'aura-2-asteria-en', name: 'Asteria', gender: 'feminine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Clear, Confident, Knowledgeable, Energetic', useCases: 'Advertising' },
      { voice: 'aura-2-athena-en', name: 'Athena', gender: 'feminine', age: 'Mature', language: 'en-us', accent: 'American', characteristics: 'Calm, Smooth, Professional', useCases: 'Storytelling', isRecommended: true },
      { voice: 'aura-2-atlas-en', name: 'Atlas', gender: 'masculine', age: 'Mature', language: 'en-us', accent: 'American', characteristics: 'Enthusiastic, Confident, Approachable, Friendly', useCases: 'Advertising' },
      { voice: 'aura-2-aurora-en', name: 'Aurora', gender: 'feminine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Cheerful, Expressive, Energetic', useCases: 'Interview' },
      { voice: 'aura-2-callista-en', name: 'Callista', gender: 'feminine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Clear, Energetic, Professional, Smooth', useCases: 'IVR' },
      { voice: 'aura-2-cora-en', name: 'Cora', gender: 'feminine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Smooth, Melodic, Caring', useCases: 'Storytelling', isRecommended: true },
      { voice: 'aura-2-cordelia-en', name: 'Cordelia', gender: 'feminine', age: 'Young Adult', language: 'en-us', accent: 'American', characteristics: 'Approachable, Warm, Polite', useCases: 'Storytelling' },
      { voice: 'aura-2-delia-en', name: 'Delia', gender: 'feminine', age: 'Young Adult', language: 'en-us', accent: 'American', characteristics: 'Casual, Friendly, Cheerful, Breathy', useCases: 'Interview' },
      { voice: 'aura-2-draco-en', name: 'Draco', gender: 'masculine', age: 'Adult', language: 'en-gb', accent: 'British', characteristics: 'Warm, Approachable, Trustworthy, Baritone', useCases: 'Storytelling', isRecommended: true },
      { voice: 'aura-2-electra-en', name: 'Electra', gender: 'feminine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Professional, Engaging, Knowledgeable', useCases: 'IVR, advertising, customer service' },
      { voice: 'aura-2-harmonia-en', name: 'Harmonia', gender: 'feminine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Empathetic, Clear, Calm, Confident', useCases: 'Customer service' },
      { voice: 'aura-2-hera-en', name: 'Hera', gender: 'feminine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Smooth, Warm, Professional', useCases: 'Informative' },
      { voice: 'aura-2-hermes-en', name: 'Hermes', gender: 'masculine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Expressive, Engaging, Professional', useCases: 'Informative' },
      { voice: 'aura-2-hyperion-en', name: 'Hyperion', gender: 'masculine', age: 'Adult', language: 'en-au', accent: 'Australian', characteristics: 'Caring, Warm, Empathetic', useCases: 'Interview' },
      { voice: 'aura-2-iris-en', name: 'Iris', gender: 'feminine', age: 'Young Adult', language: 'en-us', accent: 'American', characteristics: 'Cheerful, Positive, Approachable', useCases: 'IVR, advertising, customer service' },
      { voice: 'aura-2-janus-en', name: 'Janus', gender: 'feminine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Southern, Smooth, Trustworthy', useCases: 'Storytelling' },
      { voice: 'aura-2-juno-en', name: 'Juno', gender: 'feminine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Natural, Engaging, Melodic, Breathy', useCases: 'Interview' },
      { voice: 'aura-2-jupiter-en', name: 'Jupiter', gender: 'masculine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Expressive, Knowledgeable, Baritone', useCases: 'Informative' },
      { voice: 'aura-2-luna-en', name: 'Luna', gender: 'feminine', age: 'Young Adult', language: 'en-us', accent: 'American', characteristics: 'Friendly, Natural, Engaging', useCases: 'IVR' },
      { voice: 'aura-2-mars-en', name: 'Mars', gender: 'masculine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Smooth, Patient, Trustworthy, Baritone', useCases: 'Customer service' },
      { voice: 'aura-2-minerva-en', name: 'Minerva', gender: 'feminine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Positive, Friendly, Natural', useCases: 'Storytelling' },
      { voice: 'aura-2-neptune-en', name: 'Neptune', gender: 'masculine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Professional, Patient, Polite', useCases: 'Customer service' },
      { voice: 'aura-2-odysseus-en', name: 'Odysseus', gender: 'masculine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Calm, Smooth, Comfortable, Professional', useCases: 'Advertising' },
      { voice: 'aura-2-ophelia-en', name: 'Ophelia', gender: 'feminine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Expressive, Enthusiastic, Cheerful', useCases: 'Interview' },
      { voice: 'aura-2-orion-en', name: 'Orion', gender: 'masculine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Approachable, Comfortable, Calm, Polite', useCases: 'Informative' },
      { voice: 'aura-2-orpheus-en', name: 'Orpheus', gender: 'masculine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Professional, Clear, Confident, Trustworthy', useCases: 'Customer service, storytelling', isRecommended: true },
      { voice: 'aura-2-pandora-en', name: 'Pandora', gender: 'feminine', age: 'Adult', language: 'en-gb', accent: 'British', characteristics: 'Smooth, Calm, Melodic, Breathy', useCases: 'IVR, informative' },
      { voice: 'aura-2-phoebe-en', name: 'Phoebe', gender: 'feminine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Energetic, Warm, Casual', useCases: 'Customer service' },
      { voice: 'aura-2-pluto-en', name: 'Pluto', gender: 'masculine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Smooth, Calm, Empathetic, Baritone', useCases: 'Interview, storytelling', isRecommended: true },
      { voice: 'aura-2-saturn-en', name: 'Saturn', gender: 'masculine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Knowledgeable, Confident, Baritone', useCases: 'Customer service' },
      { voice: 'aura-2-selene-en', name: 'Selene', gender: 'feminine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Expressive, Engaging, Energetic', useCases: 'Informative' },
      { voice: 'aura-2-theia-en', name: 'Theia', gender: 'feminine', age: 'Adult', language: 'en-au', accent: 'Australian', characteristics: 'Expressive, Polite, Sincere', useCases: 'Informative' },
      { voice: 'aura-2-vesta-en', name: 'Vesta', gender: 'feminine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Natural, Expressive, Patient, Empathetic', useCases: 'Customer service, interview, storytelling' },
      { voice: 'aura-2-zeus-en', name: 'Zeus', gender: 'masculine', age: 'Adult', language: 'en-us', accent: 'American', characteristics: 'Deep, Trustworthy, Smooth', useCases: 'IVR', isRecommended: true },
      
      // Spanish Voices
      { voice: 'aura-2-celeste-es', name: 'Celeste (Spanish)', gender: 'feminine', age: 'Young Adult', language: 'es-co', accent: 'Colombian', characteristics: 'Clear, Energetic, Positive, Friendly', useCases: 'Casual Chat, Advertising' },
      { voice: 'aura-2-estrella-es', name: 'Estrella (Spanish)', gender: 'feminine', age: 'Mature', language: 'es-mx', accent: 'Mexican', characteristics: 'Approachable, Natural, Calm', useCases: 'Casual Chat, Interview' },
      { voice: 'aura-2-nestor-es', name: 'Nestor (Spanish)', gender: 'masculine', age: 'Adult', language: 'es-es', accent: 'Peninsular', characteristics: 'Calm, Professional, Approachable', useCases: 'Casual Chat, Customer Service' },
      { voice: 'aura-2-sirio-es', name: 'Sirio (Spanish)', gender: 'masculine', age: 'Adult', language: 'es-mx', accent: 'Mexican', characteristics: 'Calm, Professional, Comfortable', useCases: 'Casual Chat, Interview' },
      { voice: 'aura-2-carina-es', name: 'Carina (Spanish)', gender: 'feminine', age: 'Adult', language: 'es-es', accent: 'Peninsular', characteristics: 'Professional, Raspy, Energetic', useCases: 'Interview, Customer Service' },
      { voice: 'aura-2-alvaro-es', name: 'Alvaro (Spanish)', gender: 'masculine', age: 'Adult', language: 'es-es', accent: 'Peninsular', characteristics: 'Calm, Professional, Clear', useCases: 'Interview, Customer Service' },
      { voice: 'aura-2-diana-es', name: 'Diana (Spanish)', gender: 'feminine', age: 'Adult', language: 'es-es', accent: 'Peninsular', characteristics: 'Professional, Confident, Expressive', useCases: 'Storytelling, Advertising' },
      { voice: 'aura-2-aquila-es', name: 'Aquila (Spanish)', gender: 'masculine', age: 'Adult', language: 'es-419', accent: 'Latin American', characteristics: 'Expressive, Enthusiastic, Confident', useCases: 'Casual Chat, Informative' },
      { voice: 'aura-2-selena-es', name: 'Selena (Spanish)', gender: 'feminine', age: 'Young Adult', language: 'es-419', accent: 'Latin American', characteristics: 'Approachable, Casual, Friendly', useCases: 'Customer Service, Informative' },
      { voice: 'aura-2-javier-es', name: 'Javier (Spanish)', gender: 'masculine', age: 'Adult', language: 'es-mx', accent: 'Mexican', characteristics: 'Approachable, Professional, Friendly', useCases: 'Casual Chat, IVR, Storytelling' },
    ];
  }

  static getVoicesForDisplay(): Array<{
    voice: string;
    name: string;
    description: string;
    provider: 'deepgram';
    isRecommended: boolean;
  }> {
    return this.getAvailableVoices().map(v => ({
      voice: v.voice,
      name: v.name,
      description: `${v.gender === 'feminine' ? '♀' : '♂'} ${v.accent} - ${v.characteristics}`,
      provider: 'deepgram' as const,
      isRecommended: v.isRecommended || false,
    }));
  }
}
