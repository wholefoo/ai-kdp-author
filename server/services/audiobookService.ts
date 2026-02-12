import { openai } from './openai';
import { GeminiTtsService, GeminiVoice } from './geminiTts';
import { DeepgramTtsService, DeepgramVoice } from './deepgramTts';
import { promises as fs } from 'fs';
import { join } from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { ObjectStorageService } from '../objectStorage';
import { isWrittenNumberChapterHeading } from '../utils/numberParser';

export type TtsProvider = 'deepgram' | 'openai' | 'gemini';
export type TtsVoice = DeepgramVoice | 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' | GeminiVoice;

const GEMINI_MALE_VOICES = new Set<string>([
  'Puck', 'Charon', 'Fenrir', 'Orus', 'Achird', 'Algenib', 'Algieba',
  'Alnilam', 'Enceladus', 'Iapetus', 'Rasalgethi', 'Sadachbia',
  'Sadaltager', 'Schedar', 'Umbriel', 'Zubenelgenubi',
]);

export interface AudiobookOptions {
  ttsProvider: TtsProvider; // gemini (primary), deepgram, or openai
  voice: TtsVoice;
  model: 'aura-2' | 'gpt-4o-mini-tts' | 'tts-1' | 'tts-1-hd' | 'gemini-2.5-flash-preview-tts' | 'gemini-2.5-pro-preview-tts';
  speed: number; // 0.25 to 4.0
  format: 'mp3' | 'opus' | 'aac' | 'flac';
  backgroundMusic?: {
    enabled: boolean;
    musicType: 'ambient' | 'classical' | 'cinematic' | 'nature' | 'fantasy' | 'mystery' | 'custom';
    volume: number; // 0.1 to 0.5 (relative to speech)
    fadeInOut: boolean;
    customMusicUrl?: string;
  };
}

export interface AudiobookChapter {
  chapterNumber: number;
  title: string;
  content: string;
  audioPath?: string;
  duration?: number; // seconds
}

export interface AudiobookProgress {
  currentChapter: number;
  totalChapters: number;
  completedChapters: number;
  estimatedTimeRemaining?: number;
  status: 'generating' | 'completed' | 'failed' | 'cancelled' | 'partial_completed';
}

export class AudiobookService {
  private baseAudioDir = './temp/audiobooks';
  private musicDir = './temp/music';
  private objectStorage: ObjectStorageService;
  private deepgramTts: DeepgramTtsService | null;
  private geminiTts: GeminiTtsService | null;

  constructor() {
    this.ensureAudioDirectory();
    this.ensureMusicDirectory();
    this.objectStorage = new ObjectStorageService();
    
    // Initialize Gemini TTS (PRIMARY provider - 30 voices with advanced caching)
    this.geminiTts = null;
    try {
      this.geminiTts = new GeminiTtsService();
      console.log('✅ Gemini TTS service initialized (PRIMARY)');
    } catch (error) {
      console.warn('⚠️ Gemini TTS not available:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Initialize Deepgram TTS (fallback)
    this.deepgramTts = null;
    try {
      this.deepgramTts = new DeepgramTtsService();
      if (this.deepgramTts.isAvailable()) {
        console.log('✅ Deepgram TTS service initialized (fallback)');
      } else {
        console.warn('⚠️ Deepgram TTS not available - DEEPGRAM_API_KEY not set');
        this.deepgramTts = null;
      }
    } catch (error) {
      console.warn('⚠️ Deepgram TTS not available:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async ensureAudioDirectory() {
    try {
      await fs.mkdir(this.baseAudioDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create audio directory:', error);
    }
  }

  private async ensureMusicDirectory() {
    try {
      await fs.mkdir(this.musicDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create music directory:', error);
    }
  }

  private getContentType(format: string): string {
    switch (format) {
      case 'mp3': return 'audio/mpeg';
      case 'opus': return 'audio/opus';
      case 'aac': return 'audio/aac';
      case 'flac': return 'audio/flac';
      default: return 'audio/mpeg';
    }
  }

  /**
   * Generate a complete audiobook from novel content
   */
  async generateAudiobook(
    novelId: string,
    title: string,
    chapters: AudiobookChapter[],
    options: AudiobookOptions,
    audiobookId: string,
    onProgress?: (progress: AudiobookProgress) => void
  ): Promise<string[]> {
    const audioFiles: string[] = [];
    const audiobookDir = join(this.baseAudioDir, audiobookId);
    
    await fs.mkdir(audiobookDir, { recursive: true });

    console.log(`🎧 Starting audiobook generation for "${title}" with ${chapters.length} chapters`);
    console.log(`📖 Using voice: ${options.voice}, model: ${options.model}, speed: ${options.speed}x`);

    // Check for existing audio files in object storage to support resuming
    let startFromChapter = 0;
    const actualFormat = options.format;
    
    for (let i = 0; i < chapters.length; i++) {
      const chapterNum = chapters[i].chapterNumber;
      const baseFileName = `chapter_${String(chapterNum).padStart(2, '0')}.${actualFormat}`;
      
      const baseObjectPath = `${this.objectStorage.getPrivateObjectDir()}/audiobooks/${audiobookId}/${baseFileName}`;
      
      // Check for existing files in object storage
      let existingPath: string | null = null;
      try {
        const exists = await this.objectStorage.fileExists(baseObjectPath);
        if (exists) {
          existingPath = baseObjectPath;
          console.log(`✅ Found existing audio for Chapter ${chapterNum} in object storage, skipping...`);
        } else {
          // File doesn't exist, start generation from this chapter
          break;
        }
      } catch (error) {
        // Error checking file, assume it doesn't exist and start generation from this chapter
        console.warn(`⚠️ Error checking existing file for Chapter ${chapterNum}:`, error);
        break;
      }
      
      if (existingPath) {
        audioFiles.push(existingPath);
        chapters[i].audioPath = existingPath;
        // Estimate duration for existing chapters for proper metadata
        const chapterText = this.prepareChapterText(chapters[i]);
        chapters[i].duration = this.estimateAudioDuration(chapterText, options.speed);
        startFromChapter = i + 1;
      }
    }

    if (startFromChapter > 0) {
      console.log(`🔄 Resuming audiobook generation from Chapter ${startFromChapter + 1} (${chapters.length - startFromChapter} remaining)`);
    }

    for (let i = startFromChapter; i < chapters.length; i++) {
      const chapter = chapters[i];
      const startTime = Date.now();

      try {
        // Update progress
        onProgress?.({
          currentChapter: i + 1,
          totalChapters: chapters.length,
          completedChapters: startFromChapter + (i - startFromChapter),
          status: 'generating'
        });

        console.log(`🎙️ Generating audio for Chapter ${chapter.chapterNumber}: ${chapter.title}`);

        // Prepare chapter text with title
        const chapterText = this.prepareChapterText(chapter);
        
        // Generate audio using OpenAI TTS
        const normalizedSpeed = options.speed > 4 ? options.speed / 100 : options.speed;
        const audioOptions = {
          ...options,
          speed: normalizedSpeed
        };
        console.log(`🔧 Speed conversion: ${options.speed} → ${normalizedSpeed}`);
        let audioBuffer = await this.generateChapterAudio(chapterText, audioOptions);
        
        // Process audio to meet all KDP audiobook requirements
        console.log(`🔄 Processing Chapter ${chapter.chapterNumber} for KDP compliance (44.1kHz, 192kbps, stereo, loudness normalization, silence padding)...`);
        audioBuffer = await this.processForKDPCompliance(audioBuffer, options.format);
        
        // Save audio file to object storage
        const audioFileName = `chapter_${String(chapter.chapterNumber).padStart(2, '0')}.${options.format}`;
        
        // Use object storage instead of local filesystem
        const objectPath = `${this.objectStorage.getPrivateObjectDir()}/audiobooks/${audiobookId}/${audioFileName}`;
        const contentType = this.getContentType(options.format);
        
        await this.objectStorage.uploadBuffer(audioBuffer, objectPath, contentType);
        
        // Store object storage path
        const audioPath = objectPath;
        audioFiles.push(audioPath);

        const duration = Date.now() - startTime;
        console.log(`✅ Chapter ${chapter.chapterNumber} completed in ${duration}ms`);

        // Apply background music if enabled (temporarily disabled for object storage migration)
        if (options.backgroundMusic?.enabled) {
          console.log(`🎵 Background music temporarily disabled during object storage migration`);
          chapter.audioPath = audioPath;
        } else {
          chapter.audioPath = audioPath;
        }

        chapter.duration = this.estimateAudioDuration(chapterText, options.speed);

      } catch (error) {
        console.error(`❌ Failed to generate audio for Chapter ${chapter.chapterNumber}:`, error);
        
        const completedChapters = startFromChapter + (i - startFromChapter);
        
        onProgress?.({
          currentChapter: i + 1,
          totalChapters: chapters.length,
          completedChapters: completedChapters,
          status: completedChapters > 0 ? 'partial_completed' : 'failed'
        });
        
        throw new Error(`Failed to generate audio for Chapter ${chapter.chapterNumber}: ${error}`);
      }
    }

    // Generate audiobook metadata
    await this.generateAudiobookMetadata(audiobookId, title, chapters, options);

    onProgress?.({
      currentChapter: chapters.length,
      totalChapters: chapters.length,
      completedChapters: chapters.length,
      status: 'completed'
    });

    console.log(`🎉 Audiobook generation completed! Audio files saved to: ${audiobookDir}`);
    return audioFiles;
  }

  private normalizeModelForProvider(options: AudiobookOptions): AudiobookOptions {
    const provider = options.ttsProvider;
    let model: string = options.model;
    
    if (provider === 'gemini') {
      if (model === 'gemini-2.5-flash-tts') model = 'gemini-2.5-flash-preview-tts';
      else if (model === 'gemini-2.5-pro-tts') model = 'gemini-2.5-pro-preview-tts';
      else if (!model?.startsWith('gemini-')) model = 'gemini-2.5-flash-preview-tts';
    } else if (provider === 'deepgram') {
      if (!model || model !== 'aura-2') model = 'aura-2';
    } else if (provider === 'openai') {
      if (!['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd'].includes(model)) model = 'gpt-4o-mini-tts';
    }
    
    return { ...options, model: model as AudiobookOptions['model'] };
  }

  /**
   * Generate audio for a single chapter using selected TTS provider
   * Provider priority: gemini (primary) > deepgram > openai
   */
  private async generateChapterAudio(text: string, options: AudiobookOptions): Promise<Buffer> {
    const normalizedOptions = this.normalizeModelForProvider(options);
    if (normalizedOptions.ttsProvider === 'gemini') {
      return this.generateGeminiAudio(text, normalizedOptions);
    }
    if (normalizedOptions.ttsProvider === 'deepgram') {
      return this.generateDeepgramAudio(text, normalizedOptions);
    }
    return this.generateOpenAIAudio(text, normalizedOptions);
  }

  /**
   * Generate audio using Deepgram Aura TTS
   */
  private async generateDeepgramAudio(text: string, options: AudiobookOptions): Promise<Buffer> {
    console.log(`🔧 Starting Deepgram TTS generation. Text length: ${text.length} characters`);
    
    if (!this.deepgramTts) {
      throw new Error('Deepgram TTS service is not available. Please check your DEEPGRAM_API_KEY configuration.');
    }

    try {
      const audioBuffer = await this.deepgramTts.generateAudio(text, {
        voice: options.voice as DeepgramVoice,
        speed: options.speed,
        encoding: options.format === 'mp3' ? 'mp3' : options.format === 'aac' ? 'aac' : options.format === 'opus' ? 'opus' : 'mp3',
      });

      console.log(`✅ Deepgram TTS completed (${audioBuffer.length} bytes)`);
      return audioBuffer;

    } catch (error: any) {
      console.error('❌ Deepgram TTS API error:', error.message);
      throw new Error(`Deepgram TTS failed: ${error.message}`);
    }
  }

  /**
   * Generate audio using OpenAI TTS
   */
  private async generateOpenAIAudio(text: string, options: AudiobookOptions): Promise<Buffer> {
    console.log(`🔧 Starting OpenAI TTS generation. Text length: ${text.length} characters`);
    
    try {
      // OpenAI TTS API has a strict 4096 character limit per request
      // Use 3500 to leave safe margin
      const chunks = this.splitTextIntoChunks(text, 3500);
      console.log(`📝 Split into ${chunks.length} chunks for OpenAI processing`);
      
      const audioBuffers: Buffer[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🎵 Processing OpenAI chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
        
        const response = await openai.audio.speech.create({
          model: options.model as 'gpt-4o-mini-tts' | 'tts-1' | 'tts-1-hd',
          voice: options.voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
          input: chunk,
          response_format: options.format as any,
          speed: options.speed,
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
      console.error('❌ OpenAI TTS API error:', error);
      throw new Error(`Failed to generate audio: ${error.message}`);
    }
  }

  /**
   * Generate audio using Gemini TTS (PRIMARY Provider)
   * Now uses audiobook text processor for natural narration
   */
  private async generateGeminiAudio(text: string, options: AudiobookOptions, useAudiobookProcessor: boolean = true): Promise<Buffer> {
    console.log(`🔧 Starting Gemini TTS generation. Text length: ${text.length} characters`);
    
    if (!this.geminiTts) {
      throw new Error('Gemini TTS service is not available. Please check your GEMINI_API_KEY configuration.');
    }

    try {
      const audioBuffer = await this.geminiTts.generateAudio(text, {
        voice: options.voice as GeminiVoice,
        model: options.model as 'gemini-2.5-flash-preview-tts' | 'gemini-2.5-pro-preview-tts',
        speed: options.speed,
        useAudiobookProcessor,
        narrationPreset: 'audiobook',
        concurrency: 1,
      });

      console.log(`✅ Gemini TTS completed (${audioBuffer.length} bytes)`);
      return audioBuffer;

    } catch (error: any) {
      console.error(`❌ Gemini TTS failed:`, error.message);
      throw new Error(`Gemini TTS failed: ${error.message}`);
    }
  }

  /**
   * Add background music to an audio file
   */
  private async addBackgroundMusic(
    voiceAudioPath: string,
    chapterNumber: number,
    musicOptions: NonNullable<AudiobookOptions['backgroundMusic']>,
    outputDir: string,
    outputFormat: string = 'mp3'
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        // Validate inputs to prevent crashes
        if (!voiceAudioPath || !musicOptions || typeof chapterNumber !== 'number') {
          console.warn(`⚠️  Invalid parameters for background music, falling back to original audio`);
          resolve(voiceAudioPath);
          return;
        }

        const musicTrackPath = await this.getBackgroundMusicTrack(musicOptions.musicType, musicOptions.customMusicUrl);
        const outputPath = join(outputDir, `chapter-${chapterNumber}-with-music.${outputFormat}`);
        
        console.log(`🎼 Mixing audio: ${voiceAudioPath} + ${musicTrackPath}`);
        console.log(`🔧 Output format: ${outputFormat}, Output path: ${outputPath}`);
        
        // Validate music track exists
        try {
          await fs.access(musicTrackPath);
        } catch (trackError) {
          console.warn(`⚠️  Background music track not found: ${musicTrackPath}, falling back to original audio`);
          resolve(voiceAudioPath);
          return;
        }

        // Use ffmpeg to mix the audio with proper error handling
        const ffmpegCommand = ffmpeg()
          .input(voiceAudioPath)
          .input(musicTrackPath)
          .complexFilter([
            '[1:a]aloop=loop=-1:size=2e+09[bg]',
            `[bg]volume=${Math.max(0.1, Math.min(0.5, musicOptions.volume || 0.2))}[bg_quiet]`,
            '[0:a][bg_quiet]amix=inputs=2:duration=first:dropout_transition=2[mixed]'
          ])
          .map('[mixed]')
          .audioCodec(outputFormat === 'mp3' ? 'mp3' : outputFormat === 'aac' ? 'aac' : outputFormat === 'opus' ? 'libopus' : 'mp3')
          .on('end', () => {
            console.log(`✅ Background music added to chapter ${chapterNumber} in ${outputFormat} format`);
            resolve(outputPath);
          })
          .on('error', (err) => {
            console.error(`❌ Failed to add background music to chapter ${chapterNumber}:`, err);
            console.log(`🔄 Falling back to original audio without background music`);
            resolve(voiceAudioPath);
          })
          .on('stderr', (stderrLine) => {
            if (stderrLine.includes('Error') || stderrLine.includes('Failed')) {
              console.warn(`⚠️  FFmpeg warning: ${stderrLine}`);
            }
          });

        // Add timeout to prevent hanging
        const mixingTimeout = setTimeout(() => {
          console.error(`⏰ Background music mixing timeout for chapter ${chapterNumber}, falling back to original audio`);
          try {
            ffmpegCommand.kill('SIGKILL');
          } catch (killError) {
            console.error('Failed to kill ffmpeg process:', killError);
          }
          resolve(voiceAudioPath);
        }, 60000);

        ffmpegCommand.save(outputPath);

        ffmpegCommand.on('end', () => clearTimeout(mixingTimeout));
        ffmpegCommand.on('error', () => clearTimeout(mixingTimeout));
          
      } catch (error) {
        console.error(`❌ Background music processing error:`, error);
        console.log(`🔄 Falling back to original audio to ensure audiobook generation continues`);
        resolve(voiceAudioPath);
      }
    });
  }

  /**
   * Get the path to a background music track
   */
  private async getBackgroundMusicTrack(musicType: string, customUrl?: string): Promise<string> {
    if (musicType === 'custom' && customUrl) {
      return customUrl;
    }
    
    const musicTracks: Record<string, string> = {
      'ambient': join(this.musicDir, 'ambient.mp3'),
      'classical': join(this.musicDir, 'classical.mp3'),
      'cinematic': join(this.musicDir, 'cinematic.mp3'),
      'nature': join(this.musicDir, 'nature.mp3'),
      'fantasy': join(this.musicDir, 'fantasy.mp3'),
      'mystery': join(this.musicDir, 'mystery.mp3')
    };
    
    const trackPath = musicTracks[musicType];
    
    try {
      await fs.access(trackPath);
      return trackPath;
    } catch {
      return await this.generatePlaceholderMusic(musicType, trackPath);
    }
  }

  /**
   * Generate placeholder background music using audio synthesis
   */
  private async generatePlaceholderMusic(musicType: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const frequencies: Record<string, string> = {
        'ambient': '220,330,440',
        'classical': '261,329,392',
        'cinematic': '196,246,293',
        'nature': '174,220,261',
        'fantasy': '246,311,369',
        'mystery': '146,184,220'
      };
      
      const freq = frequencies[musicType] || '220,330,440';
      
      ffmpeg()
        .input('anullsrc=channel_layout=stereo:sample_rate=44100')
        .inputFormat('lavfi')
        .audioFilters([
          `sine=frequency=${freq.split(',')[0]}:sample_rate=44100`,
          'volume=0.05'
        ])
        .duration(30)
        .audioCodec('libmp3lame')
        .on('end', () => {
          console.log(`✅ Generated placeholder ${musicType} music`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(`❌ Failed to generate placeholder music:`, err);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * Check if content already has a chapter heading and optionally remove it
   */
  private hasChapterHeading(content: string): boolean {
    const trimmedContent = content.trim();
    const firstLine = trimmedContent.split('\n')[0].trim();
    
    const chapterPatterns = [
      /^chapter\s+\d+/i,
      /^chapter\s+[ivxlcdm]+/i,
      /^chapter\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)/i
    ];
    
    if (isWrittenNumberChapterHeading(firstLine)) {
      return true;
    }
    
    return chapterPatterns.some(pattern => pattern.test(firstLine));
  }

  /**
   * Remove chapter heading from content if it exists at the start
   * This prevents duplicate chapter numbers in the audio
   */
  private removeChapterHeading(content: string): string {
    const trimmedContent = content.trim();
    const lines = trimmedContent.split('\n');
    const firstLine = lines[0].trim();
    
    const chapterPatterns = [
      /^chapter\s+\d+/i,
      /^chapter\s+[ivxlcdm]+/i,
      /^chapter\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)/i
    ];
    
    if (isWrittenNumberChapterHeading(firstLine) || chapterPatterns.some(pattern => pattern.test(firstLine))) {
      // Remove the first line (the chapter heading)
      return lines.slice(1).join('\n').trim();
    }
    
    return content;
  }

  /**
   * Prepare chapter text for audio generation
   * CRITICAL: Only use the exact content from DOCX, no added chapter numbers if heading already exists
   */
  private prepareChapterText(chapter: AudiobookChapter): string {
    let content: string;
    
    if (typeof chapter.content === 'string') {
      content = chapter.content;
    } else if (typeof chapter.content === 'object' && chapter.content !== null) {
      content = JSON.stringify(chapter.content);
    } else {
      console.warn(`⚠️ Chapter ${chapter.chapterNumber} has invalid content type:`, typeof chapter.content);
      content = String(chapter.content || '');
    }
    
    content = content
      .replace(/#{1,6}\s*/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+/g, ' ')
      .trim();

    // CRITICAL FIX: Check if content already has a chapter heading
    const hasExistingHeading = this.hasChapterHeading(content);
    let text = '';
    
    if (hasExistingHeading) {
      // Use content exactly as-is from DOCX (including existing heading)
      // Do NOT add another chapter announcement to avoid duplicates
      text = content;
      console.log(`✅ Chapter ${chapter.chapterNumber} content already includes chapter heading - using as-is from DOCX`);
    } else {
      // Check if the title is just the auto-assigned generic "Chapter X" (from DOCX import)
      // If so, don't add it as an announcement - just use the content as-is
      const isGenericTitle = chapter.title && /^chapter\s+\d+$/i.test(chapter.title.trim());
      
      if (isGenericTitle) {
        // Auto-assigned generic title - just use content without adding announcement
        text = content;
        console.log(`✅ Chapter ${chapter.chapterNumber} has auto-assigned generic title - using content as-is from DOCX (no announcement added)`);
      } else {
        // Real chapter title provided - add announcement
        let chapterAnnouncement = '';
        if (chapter.title && chapter.title.toLowerCase().includes('chapter')) {
          chapterAnnouncement = chapter.title;
        } else if (chapter.title && chapter.title.trim() !== '') {
          chapterAnnouncement = `Chapter ${chapter.chapterNumber}: ${chapter.title}`;
        } else {
          chapterAnnouncement = `Chapter ${chapter.chapterNumber}`;
        }
        text = `${chapterAnnouncement}\n\n${content}`;
        console.log(`📢 Added chapter announcement for Chapter ${chapter.chapterNumber}`);
      }
    }
    
    console.log(`📊 Prepared text length: ${text.length} characters`);
    return text;
  }

  /**
   * Split text into chunks that fit OpenAI's 4096 character limit
   */
  private splitTextIntoChunks(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    
    // Split by paragraphs first (double newlines)
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const trimmedPara = paragraph.trim();
      
      // Check if paragraph itself is too long
      if (trimmedPara.length > maxLength) {
        // Save current chunk before processing long paragraph
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // Split long paragraph by sentences
        const sentences = trimmedPara.split(/(?<=[.!?])\s+/);
        let sentenceChunk = '';
        
        for (const sentence of sentences) {
          if ((sentenceChunk + (sentenceChunk ? ' ' : '') + sentence).length <= maxLength) {
            sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
          } else {
            if (sentenceChunk.length > 0) {
              chunks.push(sentenceChunk);
              sentenceChunk = sentence;
            } else {
              // Sentence itself exceeds max length, split by words
              const words = sentence.split(/\s+/);
              let wordChunk = '';
              
              for (const word of words) {
                if ((wordChunk + (wordChunk ? ' ' : '') + word).length <= maxLength) {
                  wordChunk += (wordChunk ? ' ' : '') + word;
                } else {
                  if (wordChunk.length > 0) {
                    chunks.push(wordChunk);
                    wordChunk = word;
                  }
                }
              }
              
              if (wordChunk.length > 0) sentenceChunk = wordChunk;
            }
          }
        }
        
        if (sentenceChunk.length > 0) {
          chunks.push(sentenceChunk);
        }
      } else {
        // Paragraph fits within limit, try to add to current chunk
        const combined = currentChunk ? currentChunk + '\n\n' + trimmedPara : trimmedPara;
        
        if (combined.length <= maxLength) {
          currentChunk = combined;
        } else {
          // Save current chunk and start new one
          if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = trimmedPara;
        }
      }
    }

    // Save final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    // Verify all chunks are under limit
    const validChunks = chunks.filter(chunk => {
      if (chunk.length > 4096) {
        console.warn(`⚠️ Chunk exceeds 4096 char limit (${chunk.length} chars), truncating`);
        return false;
      }
      return true;
    });

    return validChunks.length > 0 ? validChunks : chunks;
  }

  /**
   * Normalize audio to ensure consistent loudness levels (asynchronous, non-blocking)
   */
  private async normalizeAudio(audioBuffer: Buffer, format: string): Promise<Buffer> {
    try {
      return await this.applyLoudnormFilter(audioBuffer, format);
    } catch (error) {
      console.warn(`⚠️ Audio normalization skipped, using original audio:`, error instanceof Error ? error.message : 'Unknown error');
      return audioBuffer;
    }
  }

  /**
   * Apply loudnorm filter using FFmpeg
   */
  private applyLoudnormFilter(audioBuffer: Buffer, format: string): Promise<Buffer> {
    return new Promise((resolve) => {
      const tempInputPath = join(this.baseAudioDir, `temp_input_${Date.now()}.${format}`);
      const tempOutputPath = join(this.baseAudioDir, `temp_output_${Date.now()}.${format}`);
      
      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.warn(`⏰ Audio normalization timeout (5s), using original audio`);
        fs.unlink(tempInputPath).catch(() => {});
        fs.unlink(tempOutputPath).catch(() => {});
        resolve(audioBuffer);
      }, 5000);

      fs.writeFile(tempInputPath, audioBuffer)
        .then(() => {
          const getCodec = (fmt: string) => {
            const codecMap: Record<string, string> = {
              'mp3': 'libmp3lame',
              'aac': 'aac',
              'opus': 'libopus',
              'flac': 'flac'
            };
            return codecMap[fmt] || 'libmp3lame';
          };

          ffmpeg(tempInputPath)
            .audioFilters('loudnorm=I=-16:TP=-1.5:LRA=11')
            .audioFrequency(44100) // KDP-compliant 44.1 kHz sample rate
            .audioCodec(getCodec(format))
            .on('end', () => {
              clearTimeout(timeout);
              fs.readFile(tempOutputPath)
                .then((normalizedBuffer) => {
                  fs.unlink(tempInputPath).catch(() => {});
                  fs.unlink(tempOutputPath).catch(() => {});
                  console.log(`✅ Audio normalized and resampled to 44.1 kHz (${normalizedBuffer.length} bytes)`);
                  resolve(normalizedBuffer);
                })
                .catch((err) => {
                  clearTimeout(timeout);
                  console.warn(`Failed to read normalized audio: ${err.message}`);
                  fs.unlink(tempInputPath).catch(() => {});
                  fs.unlink(tempOutputPath).catch(() => {});
                  resolve(audioBuffer);
                });
            })
            .on('error', (err) => {
              clearTimeout(timeout);
              console.warn(`FFmpeg normalization error: ${err.message}`);
              fs.unlink(tempInputPath).catch(() => {});
              fs.unlink(tempOutputPath).catch(() => {});
              resolve(audioBuffer);
            })
            .save(tempOutputPath);
        })
        .catch((err) => {
          clearTimeout(timeout);
          console.warn(`Failed to write temp audio file: ${err.message}`);
          resolve(audioBuffer);
        });
    });
  }

  /**
   * Process audio to meet all Amazon KDP audiobook requirements:
   * - Format: MP3
   * - Sample Rate: 44.1 kHz
   * - Bit Rate: 192 kbps CBR
   * - Channels: Stereo (consistent across all files)
   * - Loudness: -23 dB to -18 dB RMS (target: -20 dB)
   * - Peak Level: No peaks > -3 dB
   * - Silence: 2 seconds at start and end
   */
  private processForKDPCompliance(audioBuffer: Buffer, format: string): Promise<Buffer> {
    return new Promise((resolve) => {
      const timestamp = Date.now();
      const tempInputPath = join(this.baseAudioDir, `temp_kdp_in_${timestamp}.${format}`);
      const tempOutputPath = join(this.baseAudioDir, `temp_kdp_out_${timestamp}.mp3`);
      
      // 180-second timeout for processing (chapters can be ~35MB, need more time)
      const timeout = setTimeout(() => {
        console.warn(`⏰ KDP audio processing timeout (180s), using original audio`);
        fs.unlink(tempInputPath).catch(() => {});
        fs.unlink(tempOutputPath).catch(() => {});
        resolve(audioBuffer);
      }, 180000);

      fs.writeFile(tempInputPath, audioBuffer)
        .then(() => {
          // Simplified approach: Use adelay/apad for silence and loudnorm for normalization
          // This is more reliable than complex concat filters
          ffmpeg(tempInputPath)
            .audioFilters([
              // Add 2 seconds delay at start (44100 samples/sec * 2 sec = 88200 samples)
              'adelay=2000|2000',
              // Add 2 seconds padding at end
              'apad=pad_dur=2',
              // Normalize loudness to -20 LUFS (within KDP's -23 to -18 dB range) with -3 dB peak limit
              'loudnorm=I=-20:TP=-3:LRA=11',
              // Ensure stereo output
              'aformat=channel_layouts=stereo'
            ])
            .audioFrequency(44100)        // 44.1 kHz sample rate (REQUIRED by KDP)
            .audioChannels(2)              // Stereo
            .audioBitrate('192k')          // 192 kbps
            .audioCodec('libmp3lame')      // MP3 codec
            .outputOptions([
              '-write_xing', '0'           // CBR encoding (no Xing/LAME header for true CBR)
            ])
            .on('start', (cmd) => {
              console.log(`🔧 FFmpeg KDP processing started: ${cmd.substring(0, 200)}...`);
            })
            .on('progress', (progress) => {
              if (progress.percent) {
                console.log(`📊 FFmpeg progress: ${Math.round(progress.percent)}%`);
              }
            })
            .on('end', () => {
              clearTimeout(timeout);
              fs.readFile(tempOutputPath)
                .then((processedBuffer) => {
                  fs.unlink(tempInputPath).catch(() => {});
                  fs.unlink(tempOutputPath).catch(() => {});
                  console.log(`✅ Audio processed for KDP compliance: 44.1kHz, 192kbps CBR, stereo, loudness normalized (${processedBuffer.length} bytes)`);
                  resolve(processedBuffer);
                })
                .catch((err) => {
                  console.warn(`Failed to read KDP-processed audio: ${err.message}`);
                  fs.unlink(tempInputPath).catch(() => {});
                  fs.unlink(tempOutputPath).catch(() => {});
                  resolve(audioBuffer);
                });
            })
            .on('error', (err) => {
              clearTimeout(timeout);
              console.warn(`FFmpeg KDP processing error: ${err.message}, falling back to simple processing`);
              fs.unlink(tempInputPath).catch(() => {});
              // Fallback to simpler processing without complex filter
              this.processForKDPComplianceSimple(audioBuffer, format)
                .then(resolve)
                .catch(() => {
                  fs.unlink(tempOutputPath).catch(() => {});
                  resolve(audioBuffer);
                });
            })
            .save(tempOutputPath);
        })
        .catch((err) => {
          clearTimeout(timeout);
          console.warn(`Failed to write temp audio file for KDP processing: ${err.message}`);
          resolve(audioBuffer);
        });
    });
  }

  /**
   * Simplified KDP processing fallback (without complex filter)
   */
  private processForKDPComplianceSimple(audioBuffer: Buffer, format: string): Promise<Buffer> {
    return new Promise((resolve) => {
      const timestamp = Date.now();
      const tempInputPath = join(this.baseAudioDir, `temp_kdp_simple_in_${timestamp}.${format}`);
      const tempOutputPath = join(this.baseAudioDir, `temp_kdp_simple_out_${timestamp}.mp3`);
      
      // 120-second timeout for fallback processing
      const timeout = setTimeout(() => {
        console.warn(`⏰ Simple KDP processing timeout (120s), using original audio`);
        fs.unlink(tempInputPath).catch(() => {});
        fs.unlink(tempOutputPath).catch(() => {});
        resolve(audioBuffer);
      }, 120000);

      fs.writeFile(tempInputPath, audioBuffer)
        .then(() => {
          ffmpeg(tempInputPath)
            .audioFilters([
              'loudnorm=I=-20:TP=-3:LRA=11',  // Normalize loudness with peak limiting
              'aformat=channel_layouts=stereo' // Ensure stereo
            ])
            .audioFrequency(44100)        // 44.1 kHz
            .audioChannels(2)              // Stereo
            .audioBitrate('192k')          // 192 kbps
            .audioCodec('libmp3lame')      // MP3
            .on('end', () => {
              clearTimeout(timeout);
              fs.readFile(tempOutputPath)
                .then((processedBuffer) => {
                  fs.unlink(tempInputPath).catch(() => {});
                  fs.unlink(tempOutputPath).catch(() => {});
                  console.log(`✅ Audio processed (simple mode): 44.1kHz, 192kbps, stereo (${processedBuffer.length} bytes)`);
                  resolve(processedBuffer);
                })
                .catch((err) => {
                  clearTimeout(timeout);
                  console.warn(`Failed to read simple-processed audio: ${err.message}`);
                  fs.unlink(tempInputPath).catch(() => {});
                  fs.unlink(tempOutputPath).catch(() => {});
                  resolve(audioBuffer);
                });
            })
            .on('error', (err) => {
              clearTimeout(timeout);
              console.warn(`FFmpeg simple processing error: ${err.message}`);
              fs.unlink(tempInputPath).catch(() => {});
              fs.unlink(tempOutputPath).catch(() => {});
              resolve(audioBuffer);
            })
            .save(tempOutputPath);
        })
        .catch((err) => {
          clearTimeout(timeout);
          console.warn(`Failed to write temp file for simple KDP processing: ${err.message}`);
          resolve(audioBuffer);
        });
    });
  }

  /**
   * Estimate audio duration based on text length and speed
   */
  private estimateAudioDuration(text: string, speed: number): number {
    const wordsPerMinute = (180 * speed);
    const wordCount = text.split(/\s+/).length;
    return Math.ceil((wordCount / wordsPerMinute) * 60);
  }

  /**
   * Generate audiobook metadata file
   */
  private async generateAudiobookMetadata(
    audiobookId: string,
    title: string,
    chapters: AudiobookChapter[],
    options: AudiobookOptions
  ): Promise<void> {
    const totalDuration = chapters.reduce((total, chapter) => total + (chapter.duration || 0), 0);
    
    const metadata = {
      title,
      chapters: chapters.length,
      totalDuration: `${Math.floor(totalDuration / 60)}:${String(totalDuration % 60).padStart(2, '0')}`,
      voice: options.voice,
      model: options.model,
      speed: options.speed,
      format: options.format,
      generatedAt: new Date().toISOString(),
      chapterList: chapters.map(chapter => ({
        number: chapter.chapterNumber,
        title: chapter.title,
        audioFile: chapter.audioPath ? chapter.audioPath.split('/').pop() : null,
        duration: chapter.duration
      }))
    };

    const metadataPath = `${this.objectStorage.getPrivateObjectDir()}/audiobooks/${audiobookId}/audiobook-metadata.json`;
    const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2), 'utf-8');
    
    await this.objectStorage.uploadBuffer(metadataBuffer, metadataPath, 'application/json');
    
    console.log(`📋 Audiobook metadata saved to object storage: ${metadataPath}`);
  }

  /**
   * Get available voice options for audiobooks
   */
  getAvailableVoices(): Array<{
    voice: string, 
    name: string,
    description: string, 
    gender: string, 
    recommended: boolean,
    characteristics: string[],
    bestFor: string,
    provider: 'deepgram' | 'openai' | 'gemini'
  }> {
    return [
      // GEMINI VOICES (PRIMARY - Featured first with advanced caching)
      { 
        voice: 'Zephyr', 
        name: 'Zephyr',
        description: 'Dynamic, energetic voice - Perfect for audiobooks', 
        gender: 'neutral', 
        recommended: true,
        characteristics: ['Energetic', 'Clear', 'Modern'],
        bestFor: 'Contemporary fiction and tech content',
        provider: 'gemini'
      },
      { 
        voice: 'Charon', 
        name: 'Charon',
        description: 'Deep, mysterious voice - Great for thrillers', 
        gender: 'male', 
        recommended: true,
        characteristics: ['Deep', 'Mysterious', 'Commanding'],
        bestFor: 'Dark fiction and thrillers',
        provider: 'gemini'
      },
      { 
        voice: 'Kore', 
        name: 'Kore',
        description: 'Warm, inviting female voice - Best for romance', 
        gender: 'female', 
        recommended: true,
        characteristics: ['Warm', 'Friendly', 'Inviting'],
        bestFor: 'Romance and character-driven stories',
        provider: 'gemini'
      },
      { 
        voice: 'Fenrir', 
        name: 'Fenrir',
        description: 'Strong, powerful voice - Epic fantasy narration', 
        gender: 'male', 
        recommended: true,
        characteristics: ['Strong', 'Powerful', 'Bold'],
        bestFor: 'Fantasy and adventure epics',
        provider: 'gemini'
      },
      { 
        voice: 'Aoede', 
        name: 'Aoede',
        description: 'Lyrical, soulful female voice - Emotional depth', 
        gender: 'female', 
        recommended: true,
        characteristics: ['Lyrical', 'Soulful', 'Expressive'],
        bestFor: 'Poetry and emotional narratives',
        provider: 'gemini'
      },
      { 
        voice: 'Puck', 
        name: 'Puck',
        description: 'Playful, youthful voice', 
        gender: 'male', 
        recommended: false,
        characteristics: ['Playful', 'Young', 'Charming'],
        bestFor: 'Comedy and light-hearted stories',
        provider: 'gemini'
      },
      { 
        voice: 'Leda', 
        name: 'Leda',
        description: 'Elegant, refined female voice', 
        gender: 'female', 
        recommended: false,
        characteristics: ['Elegant', 'Refined', 'Sophisticated'],
        bestFor: 'Literary fiction and classics',
        provider: 'gemini'
      },
      { 
        voice: 'Orus', 
        name: 'Orus',
        description: 'Authoritative, commanding voice', 
        gender: 'male', 
        recommended: false,
        characteristics: ['Authoritative', 'Commanding', 'Professional'],
        bestFor: 'Documentary and educational content',
        provider: 'gemini'
      },
      { 
        voice: 'Callirrhoe', 
        name: 'Callirrhoe',
        description: 'Sweet, gentle female voice', 
        gender: 'female', 
        recommended: false,
        characteristics: ['Sweet', 'Gentle', 'Tender'],
        bestFor: 'Young adult romance',
        provider: 'gemini'
      },
      { 
        voice: 'Autonoe', 
        name: 'Autonoe',
        description: 'Clear, articulate female voice', 
        gender: 'female', 
        recommended: false,
        characteristics: ['Clear', 'Articulate', 'Precise'],
        bestFor: 'Technical and instructional content',
        provider: 'gemini'
      },
      { 
        voice: 'Enceladus', 
        name: 'Enceladus',
        description: 'Icy, cool male voice', 
        gender: 'male', 
        recommended: false,
        characteristics: ['Cool', 'Measured', 'Intriguing'],
        bestFor: 'Sci-fi and speculative fiction',
        provider: 'gemini'
      },
      { 
        voice: 'Iapetus', 
        name: 'Iapetus',
        description: 'Ancient, wise male voice', 
        gender: 'male', 
        recommended: false,
        characteristics: ['Wise', 'Ancient', 'Thoughtful'],
        bestFor: 'Historical fiction and mythology',
        provider: 'gemini'
      },
      { 
        voice: 'Umbriel', 
        name: 'Umbriel',
        description: 'Shadowy, enigmatic voice', 
        gender: 'neutral', 
        recommended: false,
        characteristics: ['Enigmatic', 'Shadowy', 'Mysterious'],
        bestFor: 'Mystery and noir fiction',
        provider: 'gemini'
      },
      { 
        voice: 'Algieba', 
        name: 'Algieba',
        description: 'Bright, stellar voice', 
        gender: 'neutral', 
        recommended: false,
        characteristics: ['Bright', 'Clear', 'Stellar'],
        bestFor: 'Inspirational content',
        provider: 'gemini'
      },
      { 
        voice: 'Despina', 
        name: 'Despina',
        description: 'Swift, nimble female voice', 
        gender: 'female', 
        recommended: false,
        characteristics: ['Swift', 'Nimble', 'Lively'],
        bestFor: 'Action and adventure stories',
        provider: 'gemini'
      },
      { 
        voice: 'Erinome', 
        name: 'Erinome',
        description: 'Fierce, passionate female voice', 
        gender: 'female', 
        recommended: false,
        characteristics: ['Fierce', 'Passionate', 'Intense'],
        bestFor: 'Drama and intense narratives',
        provider: 'gemini'
      },
      { 
        voice: 'Algenib', 
        name: 'Algenib',
        description: 'Distant, ethereal voice', 
        gender: 'neutral', 
        recommended: false,
        characteristics: ['Ethereal', 'Distant', 'Dreamy'],
        bestFor: 'Fantasy and dream sequences',
        provider: 'gemini'
      },
      { 
        voice: 'Laomedeia', 
        name: 'Laomedeia',
        description: 'Noble, regal female voice', 
        gender: 'female', 
        recommended: false,
        characteristics: ['Noble', 'Regal', 'Dignified'],
        bestFor: 'Royal and historical drama',
        provider: 'gemini'
      },
      { 
        voice: 'Achernar', 
        name: 'Achernar',
        description: 'End-of-river calm voice', 
        gender: 'neutral', 
        recommended: false,
        characteristics: ['Calm', 'Flowing', 'Peaceful'],
        bestFor: 'Meditation and calm narratives',
        provider: 'gemini'
      },
      { 
        voice: 'Alnilam', 
        name: 'Alnilam',
        description: 'Central, balanced voice', 
        gender: 'neutral', 
        recommended: false,
        characteristics: ['Balanced', 'Central', 'Grounded'],
        bestFor: 'General fiction and non-fiction',
        provider: 'gemini'
      },
      { 
        voice: 'Schedar', 
        name: 'Schedar',
        description: 'Breast of the queen - Nurturing voice', 
        gender: 'female', 
        recommended: false,
        characteristics: ['Nurturing', 'Warm', 'Maternal'],
        bestFor: 'Family and heartwarming stories',
        provider: 'gemini'
      },
      { 
        voice: 'Gacrux', 
        name: 'Gacrux',
        description: 'Southern cross - Guiding voice', 
        gender: 'neutral', 
        recommended: false,
        characteristics: ['Guiding', 'Steady', 'Reliable'],
        bestFor: 'Self-help and instructional content',
        provider: 'gemini'
      },
      { 
        voice: 'Pulcherrima', 
        name: 'Pulcherrima',
        description: 'Most beautiful - Graceful voice', 
        gender: 'female', 
        recommended: false,
        characteristics: ['Graceful', 'Beautiful', 'Elegant'],
        bestFor: 'Romance and beauty content',
        provider: 'gemini'
      },
      { 
        voice: 'Achird', 
        name: 'Achird',
        description: 'Girdled - Protective voice', 
        gender: 'neutral', 
        recommended: false,
        characteristics: ['Protective', 'Strong', 'Supportive'],
        bestFor: 'Adventure and hero narratives',
        provider: 'gemini'
      },
      { 
        voice: 'Zubenelgenubi', 
        name: 'Zubenelgenubi',
        description: 'Southern claw - Precise voice', 
        gender: 'neutral', 
        recommended: false,
        characteristics: ['Precise', 'Sharp', 'Analytical'],
        bestFor: 'Legal and procedural content',
        provider: 'gemini'
      },
      { 
        voice: 'Rasalgethi', 
        name: 'Rasalgethi',
        description: 'Head of the kneeler - Humble voice', 
        gender: 'male', 
        recommended: false,
        characteristics: ['Humble', 'Sincere', 'Grounded'],
        bestFor: 'Memoir and personal stories',
        provider: 'gemini'
      },
      { 
        voice: 'Sadachbia', 
        name: 'Sadachbia',
        description: 'Lucky star - Optimistic voice', 
        gender: 'neutral', 
        recommended: false,
        characteristics: ['Optimistic', 'Lucky', 'Bright'],
        bestFor: 'Uplifting and positive content',
        provider: 'gemini'
      },
      { 
        voice: 'Sadaltager', 
        name: 'Sadaltager',
        description: 'Luck of the merchant - Business voice', 
        gender: 'neutral', 
        recommended: false,
        characteristics: ['Professional', 'Business', 'Clear'],
        bestFor: 'Business and entrepreneurship content',
        provider: 'gemini'
      },
      { 
        voice: 'Sulafat', 
        name: 'Sulafat',
        description: 'Tortoise - Steady, patient voice', 
        gender: 'neutral', 
        recommended: false,
        characteristics: ['Patient', 'Steady', 'Methodical'],
        bestFor: 'Educational and tutorial content',
        provider: 'gemini'
      },
      { 
        voice: 'Vindemiatrix', 
        name: 'Vindemiatrix',
        description: 'Grape gatherer - Harvest voice', 
        gender: 'female', 
        recommended: false,
        characteristics: ['Warm', 'Earthy', 'Natural'],
        bestFor: 'Nature and pastoral content',
        provider: 'gemini'
      },
      
      // DEEPGRAM VOICES (Fallback - 45+ voices)
      { voice: 'aura-2-athena-en', name: 'Athena', description: 'Calm, smooth, professional - Perfect for storytelling', gender: 'female', recommended: false, characteristics: ['Calm', 'Smooth', 'Professional'], bestFor: 'Storytelling and audiobooks', provider: 'deepgram' },
      { voice: 'aura-2-orpheus-en', name: 'Orpheus', description: 'Professional, clear, confident, trustworthy', gender: 'male', recommended: true, characteristics: ['Professional', 'Clear', 'Confident'], bestFor: 'Customer service, storytelling', provider: 'deepgram' },
      { voice: 'aura-2-cora-en', name: 'Cora', description: 'Smooth, melodic, caring - Great for narratives', gender: 'female', recommended: true, characteristics: ['Smooth', 'Melodic', 'Caring'], bestFor: 'Storytelling', provider: 'deepgram' },
      { voice: 'aura-2-draco-en', name: 'Draco', description: 'Warm, approachable, trustworthy - British accent', gender: 'male', recommended: true, characteristics: ['Warm', 'Approachable', 'Baritone'], bestFor: 'Storytelling', provider: 'deepgram' },
      { voice: 'aura-2-pluto-en', name: 'Pluto', description: 'Smooth, calm, empathetic - Deep baritone', gender: 'male', recommended: true, characteristics: ['Smooth', 'Calm', 'Empathetic'], bestFor: 'Interview, storytelling', provider: 'deepgram' },
      { voice: 'aura-2-zeus-en', name: 'Zeus', description: 'Deep, trustworthy, smooth', gender: 'male', recommended: true, characteristics: ['Deep', 'Trustworthy', 'Smooth'], bestFor: 'IVR and formal content', provider: 'deepgram' },
      { voice: 'aura-2-thalia-en', name: 'Thalia', description: 'Clear, confident, energetic, enthusiastic', gender: 'female', recommended: false, characteristics: ['Clear', 'Confident', 'Energetic'], bestFor: 'Casual chat, customer service', provider: 'deepgram' },
      { voice: 'aura-2-andromeda-en', name: 'Andromeda', description: 'Casual, expressive, comfortable', gender: 'female', recommended: false, characteristics: ['Casual', 'Expressive', 'Comfortable'], bestFor: 'Customer service, IVR', provider: 'deepgram' },
      { voice: 'aura-2-helena-en', name: 'Helena', description: 'Caring, natural, positive, friendly', gender: 'female', recommended: false, characteristics: ['Caring', 'Natural', 'Friendly'], bestFor: 'IVR, casual chat', provider: 'deepgram' },
      { voice: 'aura-2-apollo-en', name: 'Apollo', description: 'Confident, comfortable, casual', gender: 'male', recommended: false, characteristics: ['Confident', 'Comfortable', 'Casual'], bestFor: 'Casual chat', provider: 'deepgram' },
      { voice: 'aura-2-arcas-en', name: 'Arcas', description: 'Natural, smooth, clear, comfortable', gender: 'male', recommended: false, characteristics: ['Natural', 'Smooth', 'Clear'], bestFor: 'Customer service, casual chat', provider: 'deepgram' },
      { voice: 'aura-2-aries-en', name: 'Aries', description: 'Warm, energetic, caring', gender: 'male', recommended: false, characteristics: ['Warm', 'Energetic', 'Caring'], bestFor: 'Casual chat', provider: 'deepgram' },
      { voice: 'aura-2-amalthea-en', name: 'Amalthea', description: 'Engaging, natural, cheerful - Filipino accent', gender: 'female', recommended: false, characteristics: ['Engaging', 'Natural', 'Cheerful'], bestFor: 'Casual chat', provider: 'deepgram' },
      { voice: 'aura-2-asteria-en', name: 'Asteria', description: 'Clear, confident, knowledgeable', gender: 'female', recommended: false, characteristics: ['Clear', 'Confident', 'Knowledgeable'], bestFor: 'Advertising', provider: 'deepgram' },
      { voice: 'aura-2-atlas-en', name: 'Atlas', description: 'Enthusiastic, confident, approachable', gender: 'male', recommended: false, characteristics: ['Enthusiastic', 'Confident', 'Approachable'], bestFor: 'Advertising', provider: 'deepgram' },
      { voice: 'aura-2-aurora-en', name: 'Aurora', description: 'Cheerful, expressive, energetic', gender: 'female', recommended: false, characteristics: ['Cheerful', 'Expressive', 'Energetic'], bestFor: 'Interview', provider: 'deepgram' },
      { voice: 'aura-2-callista-en', name: 'Callista', description: 'Clear, energetic, professional', gender: 'female', recommended: false, characteristics: ['Clear', 'Energetic', 'Professional'], bestFor: 'IVR', provider: 'deepgram' },
      { voice: 'aura-2-cordelia-en', name: 'Cordelia', description: 'Approachable, warm, polite', gender: 'female', recommended: false, characteristics: ['Approachable', 'Warm', 'Polite'], bestFor: 'Storytelling', provider: 'deepgram' },
      { voice: 'aura-2-delia-en', name: 'Delia', description: 'Casual, friendly, cheerful', gender: 'female', recommended: false, characteristics: ['Casual', 'Friendly', 'Cheerful'], bestFor: 'Interview', provider: 'deepgram' },
      { voice: 'aura-2-electra-en', name: 'Electra', description: 'Professional, engaging, knowledgeable', gender: 'female', recommended: false, characteristics: ['Professional', 'Engaging', 'Knowledgeable'], bestFor: 'IVR, advertising', provider: 'deepgram' },
      { voice: 'aura-2-harmonia-en', name: 'Harmonia', description: 'Empathetic, clear, calm', gender: 'female', recommended: false, characteristics: ['Empathetic', 'Clear', 'Calm'], bestFor: 'Customer service', provider: 'deepgram' },
      { voice: 'aura-2-hera-en', name: 'Hera', description: 'Smooth, warm, professional', gender: 'female', recommended: false, characteristics: ['Smooth', 'Warm', 'Professional'], bestFor: 'Informative', provider: 'deepgram' },
      { voice: 'aura-2-hermes-en', name: 'Hermes', description: 'Expressive, engaging, professional', gender: 'male', recommended: false, characteristics: ['Expressive', 'Engaging', 'Professional'], bestFor: 'Informative', provider: 'deepgram' },
      { voice: 'aura-2-hyperion-en', name: 'Hyperion', description: 'Caring, warm, empathetic - Australian', gender: 'male', recommended: false, characteristics: ['Caring', 'Warm', 'Empathetic'], bestFor: 'Interview', provider: 'deepgram' },
      { voice: 'aura-2-iris-en', name: 'Iris', description: 'Cheerful, positive, approachable', gender: 'female', recommended: false, characteristics: ['Cheerful', 'Positive', 'Approachable'], bestFor: 'IVR, advertising', provider: 'deepgram' },
      { voice: 'aura-2-janus-en', name: 'Janus', description: 'Southern, smooth, trustworthy', gender: 'female', recommended: false, characteristics: ['Southern', 'Smooth', 'Trustworthy'], bestFor: 'Storytelling', provider: 'deepgram' },
      { voice: 'aura-2-juno-en', name: 'Juno', description: 'Natural, engaging, melodic', gender: 'female', recommended: false, characteristics: ['Natural', 'Engaging', 'Melodic'], bestFor: 'Interview', provider: 'deepgram' },
      { voice: 'aura-2-jupiter-en', name: 'Jupiter', description: 'Expressive, knowledgeable, baritone', gender: 'male', recommended: false, characteristics: ['Expressive', 'Knowledgeable', 'Baritone'], bestFor: 'Informative', provider: 'deepgram' },
      { voice: 'aura-2-luna-en', name: 'Luna', description: 'Friendly, natural, engaging', gender: 'female', recommended: false, characteristics: ['Friendly', 'Natural', 'Engaging'], bestFor: 'IVR', provider: 'deepgram' },
      { voice: 'aura-2-mars-en', name: 'Mars', description: 'Smooth, patient, trustworthy', gender: 'male', recommended: false, characteristics: ['Smooth', 'Patient', 'Trustworthy'], bestFor: 'Customer service', provider: 'deepgram' },
      { voice: 'aura-2-minerva-en', name: 'Minerva', description: 'Positive, friendly, natural', gender: 'female', recommended: false, characteristics: ['Positive', 'Friendly', 'Natural'], bestFor: 'Storytelling', provider: 'deepgram' },
      { voice: 'aura-2-neptune-en', name: 'Neptune', description: 'Professional, patient, polite', gender: 'male', recommended: false, characteristics: ['Professional', 'Patient', 'Polite'], bestFor: 'Customer service', provider: 'deepgram' },
      { voice: 'aura-2-odysseus-en', name: 'Odysseus', description: 'Calm, smooth, comfortable', gender: 'male', recommended: false, characteristics: ['Calm', 'Smooth', 'Comfortable'], bestFor: 'Advertising', provider: 'deepgram' },
      { voice: 'aura-2-ophelia-en', name: 'Ophelia', description: 'Expressive, enthusiastic, cheerful', gender: 'female', recommended: false, characteristics: ['Expressive', 'Enthusiastic', 'Cheerful'], bestFor: 'Interview', provider: 'deepgram' },
      { voice: 'aura-2-orion-en', name: 'Orion', description: 'Approachable, comfortable, calm', gender: 'male', recommended: false, characteristics: ['Approachable', 'Comfortable', 'Calm'], bestFor: 'Informative', provider: 'deepgram' },
      { voice: 'aura-2-pandora-en', name: 'Pandora', description: 'Smooth, calm, melodic - British', gender: 'female', recommended: false, characteristics: ['Smooth', 'Calm', 'Melodic'], bestFor: 'IVR, informative', provider: 'deepgram' },
      { voice: 'aura-2-phoebe-en', name: 'Phoebe', description: 'Energetic, warm, casual', gender: 'female', recommended: false, characteristics: ['Energetic', 'Warm', 'Casual'], bestFor: 'Customer service', provider: 'deepgram' },
      { voice: 'aura-2-saturn-en', name: 'Saturn', description: 'Knowledgeable, confident, baritone', gender: 'male', recommended: false, characteristics: ['Knowledgeable', 'Confident', 'Baritone'], bestFor: 'Customer service', provider: 'deepgram' },
      { voice: 'aura-2-selene-en', name: 'Selene', description: 'Expressive, engaging, energetic', gender: 'female', recommended: false, characteristics: ['Expressive', 'Engaging', 'Energetic'], bestFor: 'Informative', provider: 'deepgram' },
      { voice: 'aura-2-theia-en', name: 'Theia', description: 'Expressive, polite, sincere - Australian', gender: 'female', recommended: false, characteristics: ['Expressive', 'Polite', 'Sincere'], bestFor: 'Informative', provider: 'deepgram' },
      { voice: 'aura-2-vesta-en', name: 'Vesta', description: 'Natural, expressive, patient', gender: 'female', recommended: false, characteristics: ['Natural', 'Expressive', 'Patient'], bestFor: 'Customer service, storytelling', provider: 'deepgram' },
      // DEEPGRAM Spanish Voices
      { voice: 'aura-2-celeste-es', name: 'Celeste (Spanish)', description: 'Clear, energetic, positive - Colombian', gender: 'female', recommended: false, characteristics: ['Clear', 'Energetic', 'Positive'], bestFor: 'Spanish casual chat', provider: 'deepgram' },
      { voice: 'aura-2-estrella-es', name: 'Estrella (Spanish)', description: 'Approachable, natural, calm - Mexican', gender: 'female', recommended: false, characteristics: ['Approachable', 'Natural', 'Calm'], bestFor: 'Spanish casual chat', provider: 'deepgram' },
      { voice: 'aura-2-nestor-es', name: 'Nestor (Spanish)', description: 'Calm, professional - Peninsular', gender: 'male', recommended: false, characteristics: ['Calm', 'Professional', 'Approachable'], bestFor: 'Spanish customer service', provider: 'deepgram' },
      { voice: 'aura-2-javier-es', name: 'Javier (Spanish)', description: 'Approachable, professional - Mexican', gender: 'male', recommended: false, characteristics: ['Approachable', 'Professional', 'Friendly'], bestFor: 'Spanish storytelling', provider: 'deepgram' },
      
      // OpenAI voices (fallback)
      { 
        voice: 'alloy', 
        name: 'Alloy',
        description: 'Neutral, balanced voice', 
        gender: 'neutral', 
        recommended: false,
        characteristics: ['Neutral', 'Clear', 'Versatile'],
        bestFor: 'General fiction and non-fiction',
        provider: 'openai'
      },
      { 
        voice: 'echo', 
        name: 'Echo',
        description: 'Male voice, clear and professional', 
        gender: 'male', 
        recommended: false,
        characteristics: ['Articulate', 'Professional', 'Crisp'],
        bestFor: 'Educational content and documentaries',
        provider: 'openai'
      },
      { 
        voice: 'fable', 
        name: 'Fable',
        description: 'British accent, sophisticated', 
        gender: 'male', 
        recommended: false,
        characteristics: ['Warm', 'Engaging', 'Narrative'],
        bestFor: 'Fantasy and adventure stories',
        provider: 'openai'
      },
      { 
        voice: 'onyx', 
        name: 'Onyx',
        description: 'Deep male voice, authoritative', 
        gender: 'male', 
        recommended: true,
        characteristics: ['Deep', 'Authoritative', 'Powerful'],
        bestFor: 'Thrillers and mystery novels',
        provider: 'openai'
      },
      { 
        voice: 'nova', 
        name: 'Nova',
        description: 'Female voice, warm and engaging', 
        gender: 'female', 
        recommended: true,
        characteristics: ['Bright', 'Energetic', 'Youthful'],
        bestFor: 'Young adult and contemporary fiction',
        provider: 'openai'
      },
      { 
        voice: 'shimmer', 
        name: 'Shimmer',
        description: 'Female voice, gentle and soothing', 
        gender: 'female', 
        recommended: false,
        characteristics: ['Gentle', 'Soothing', 'Calming'],
        bestFor: 'Romance and literary fiction',
        provider: 'openai'
      }
    ];
  }

  /**
   * Generate a voice preview sample for testing voices
   */
  async generateVoicePreview(
    sampleText: string,
    options: AudiobookOptions
  ): Promise<Buffer> {
    try {
      console.log(`🎤 Generating voice preview with ${options.voice} voice (${options.ttsProvider})`);
      console.log(`📝 Sample text length: ${sampleText.length} characters`);
      
      const limitedText = sampleText.length > 500 
        ? sampleText.substring(0, 500) + '...'
        : sampleText;

      const normalizedSpeed = options.speed > 4 ? options.speed / 100 : options.speed;
      
      console.log(`🎤 Voice preview request - Original speed: ${options.speed}, Normalized: ${normalizedSpeed}`);
      
      // Route to correct TTS provider - Gemini is PRIMARY
      if (options.ttsProvider === 'gemini') {
        console.log(`🔀 Routing to Gemini TTS for preview (PRIMARY)`);
        try {
          const { GeminiTtsService } = await import('./geminiTts');
          const geminiService = new GeminiTtsService();
          const audioBuffer = await geminiService.generateAudio(limitedText, {
            voice: options.voice as any,
            model: (options.model === 'gemini-2.5-flash-preview-tts' || options.model === 'gemini-2.5-pro-preview-tts' ? options.model : 'gemini-2.5-flash-preview-tts') as any,
            speed: normalizedSpeed,
            language: 'en'
          });
          console.log(`✅ Voice preview generated successfully with Gemini (${audioBuffer.length} bytes)`);
          return audioBuffer;
        } catch (geminiError: any) {
          console.warn(`⚠️ Gemini preview failed: ${geminiError.message}. Falling back to OpenAI...`);
          // Fallback to OpenAI
          const response = await openai.audio.speech.create({
            model: 'gpt-4o-mini-tts',
            voice: 'alloy' as any,
            input: limitedText,
            response_format: options.format as any,
            speed: normalizedSpeed,
          });
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          console.log(`✅ Voice preview fallback to OpenAI (${buffer.length} bytes)`);
          return buffer;
        }
      }
      
      if (options.ttsProvider === 'deepgram') {
        console.log(`🔀 Routing to Deepgram TTS for preview`);
        try {
          const { DeepgramTtsService } = await import('./deepgramTts');
          const deepgramService = new DeepgramTtsService();
          if (deepgramService.isAvailable()) {
            const audioBuffer = await deepgramService.generateAudio(limitedText, {
              voice: options.voice as any,
              speed: normalizedSpeed,
              encoding: 'mp3'
            });
            console.log(`✅ Voice preview generated successfully with Deepgram (${audioBuffer.length} bytes)`);
            return audioBuffer;
          } else {
            console.warn(`⚠️ Deepgram not available. Falling back to OpenAI...`);
          }
        } catch (deepgramError: any) {
          console.warn(`⚠️ Deepgram preview failed: ${deepgramError.message}. Falling back to OpenAI...`);
        }
        // Fallback to OpenAI
        const response = await openai.audio.speech.create({
          model: 'gpt-4o-mini-tts',
          voice: 'alloy' as any,
          input: limitedText,
          response_format: 'mp3',
          speed: normalizedSpeed
        });
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
      
      // Use OpenAI for preview (fallback)
      console.log(`🔀 Routing to OpenAI TTS for preview`);
      const response = await openai.audio.speech.create({
        model: options.model,
        voice: options.voice as any,
        input: limitedText,
        response_format: options.format as any,
        speed: normalizedSpeed,
      });

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log(`✅ Voice preview generated successfully with OpenAI (${buffer.length} bytes)`);
      return buffer;
      
    } catch (error: any) {
      console.error('❌ Voice preview generation failed:', error);
      throw new Error(`Failed to generate voice preview: ${error.message}`);
    }
  }

  /**
   * Get audio file for a specific chapter
   */
  async getChapterAudio(audiobookId: string, chapterNumber: number): Promise<Buffer> {
    try {
      const { storage } = await import('../storage');
      const audiobook = await storage.getAudiobook(audiobookId);
      
      if (!audiobook) {
        throw new Error(`Audiobook not found: ${audiobookId}`);
      }

      const chapters = Array.isArray(audiobook.chapters) ? audiobook.chapters : [];
      const chapter = chapters.find((ch: any) => ch.chapterNumber === chapterNumber);
      
      if (!chapter || !chapter.audioPath) {
        const audioFileName = `chapter_${String(chapterNumber).padStart(2, '0')}.mp3`;
        const objectPath = `${this.objectStorage.getPrivateObjectDir()}/audiobooks/${audiobookId}/${audioFileName}`;
        
        const exists = await this.objectStorage.fileExists(objectPath);
        if (!exists) {
          throw new Error(`Audio file not found for chapter ${chapterNumber}: ${audioFileName}`);
        }
        
        const audioBuffer = await this.objectStorage.downloadBuffer(objectPath);
        return audioBuffer;
      }

      const audioBuffer = await this.objectStorage.downloadBuffer(chapter.audioPath);
      return audioBuffer;
    } catch (error) {
      console.error(`Failed to get audio for chapter ${chapterNumber}:`, error);
      throw error;
    }
  }

  /**
   * Create a ZIP file containing only completed audiobook files
   */
  async createPartialAudiobookZip(audiobookId: string): Promise<Buffer> {
    try {
      const { storage } = await import('../storage');
      const audiobook = await storage.getAudiobook(audiobookId);
      
      if (!audiobook) {
        throw new Error(`Audiobook not found: ${audiobookId}`);
      }

      const chapters = Array.isArray(audiobook.chapters) ? audiobook.chapters : [];
      const completedChapters = chapters.filter((ch: any) => ch.audioPath);
      
      if (completedChapters.length === 0) {
        throw new Error('No completed audio files found');
      }
      
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      for (const chapter of completedChapters) {
        if (chapter.audioPath) {
          const fileName = chapter.audioPath.split('/').pop() || `chapter_${chapter.chapterNumber}.mp3`;
          const fileBuffer = await this.objectStorage.downloadBuffer(chapter.audioPath);
          zip.file(fileName, fileBuffer);
        }
      }
      
      const metadataContent = JSON.stringify({
        type: 'partial_audiobook',
        completedChapters: completedChapters.length,
        generatedAt: new Date().toISOString(),
        note: 'This is a partial audiobook containing only completed chapters'
      }, null, 2);
      zip.file('partial_audiobook_info.json', metadataContent);
      
      console.log(`📦 Creating partial ZIP with ${completedChapters.length} completed chapters from object storage`);
      return await zip.generateAsync({ type: 'nodebuffer' });
      
    } catch (error) {
      console.error('Error creating partial audiobook ZIP:', error);
      throw error;
    }
  }

  /**
   * Stream sample audiobook ZIP (limited number of chapters for testing)
   */
  async streamSampleAudiobookZip(audiobookId: string, res: any, maxChapters: number = 10): Promise<void> {
    try {
      const { storage } = await import('../storage');
      const audiobook = await storage.getAudiobook(audiobookId);
      
      if (!audiobook) {
        throw new Error(`Audiobook not found: ${audiobookId}`);
      }

      const chapters = Array.isArray(audiobook.chapters) ? audiobook.chapters : [];
      const sampleChapters = chapters
        .filter((ch: any) => ch.audioPath)
        .slice(0, maxChapters);
      
      if (sampleChapters.length === 0) {
        throw new Error('No completed audio files found');
      }
      
      console.log(`📦 Streaming sample ZIP with ${sampleChapters.length} chapters (max ${maxChapters}) from object storage`);
      
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      const metadataContent = JSON.stringify({
        type: 'sample_audiobook',
        includedChapters: sampleChapters.length,
        maxChapters,
        generatedAt: new Date().toISOString(),
        note: `This is a sample containing the first ${sampleChapters.length} chapters`
      }, null, 2);
      zip.file('sample_audiobook_info.json', metadataContent);
      
      let processedCount = 0;
      for (const chapter of sampleChapters) {
        if (chapter.audioPath) {
          const fileName = chapter.audioPath.split('/').pop() || `chapter_${chapter.chapterNumber}.mp3`;
          console.log(`📁 Adding sample file ${++processedCount}/${sampleChapters.length}: ${fileName}`);
          
          try {
            const fileBuffer = await this.objectStorage.downloadBuffer(chapter.audioPath);
            zip.file(fileName, fileBuffer);
          } catch (downloadError) {
            console.error(`Failed to download ${chapter.audioPath}:`, downloadError);
          }
        }
      }
      
      console.log('🔄 Generating sample ZIP stream...');
      const zipStream = zip.generateNodeStream({ 
        type: 'nodebuffer',
        compression: "DEFLATE",
        compressionOptions: { level: 1 }
      });
      
      zipStream.pipe(res);
      
      zipStream.on('end', () => {
        console.log('✅ Sample ZIP stream completed');
      });
      
      zipStream.on('error', (error) => {
        console.error('❌ Sample ZIP stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Sample ZIP generation failed' });
        }
      });
      
    } catch (error) {
      console.error('Error streaming sample audiobook ZIP:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create sample ZIP', details: (error as Error).message });
      }
      throw error;
    }
  }

  /**
   * Stream partial audiobook ZIP directly to response
   */
  async streamPartialAudiobookZip(audiobookId: string, res: any): Promise<void> {
    try {
      const { storage } = await import('../storage');
      const audiobook = await storage.getAudiobook(audiobookId);
      
      if (!audiobook) {
        throw new Error(`Audiobook not found: ${audiobookId}`);
      }

      const chapters = Array.isArray(audiobook.chapters) ? audiobook.chapters : [];
      const completedChapters = chapters.filter((ch: any) => ch.audioPath);
      
      if (completedChapters.length === 0) {
        throw new Error('No completed audio files found');
      }
      
      console.log(`📦 Streaming partial ZIP with ${completedChapters.length} completed chapters from object storage`);
      
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      const metadataContent = JSON.stringify({
        type: 'partial_audiobook',
        completedChapters: completedChapters.length,
        generatedAt: new Date().toISOString(),
        note: 'This is a partial audiobook containing only completed chapters'
      }, null, 2);
      zip.file('partial_audiobook_info.json', metadataContent);
      
      let processedCount = 0;
      for (const chapter of completedChapters) {
        if (chapter.audioPath) {
          const fileName = chapter.audioPath.split('/').pop() || `chapter_${chapter.chapterNumber}.mp3`;
          console.log(`📁 Adding file ${++processedCount}/${completedChapters.length}: ${fileName}`);
          
          try {
            const fileBuffer = await this.objectStorage.downloadBuffer(chapter.audioPath);
            zip.file(fileName, fileBuffer);
          } catch (downloadError) {
            console.error(`Failed to download ${chapter.audioPath}:`, downloadError);
          }
        }
      }
      
      console.log('🔄 Generating ZIP stream...');
      const zipStream = zip.generateNodeStream({ 
        type: 'nodebuffer',
        compression: "DEFLATE",
        compressionOptions: { level: 1 }
      });
      
      zipStream.pipe(res);
      
      zipStream.on('end', () => {
        console.log('✅ ZIP stream completed');
      });
      
      zipStream.on('error', (error) => {
        console.error('❌ ZIP stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'ZIP generation failed' });
        }
      });
      
    } catch (error) {
      console.error('Error streaming partial audiobook ZIP:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create partial ZIP', details: (error as Error).message });
      }
      throw error;
    }
  }

  /**
   * Create a ZIP file containing all audiobook files
   */
  async createAudiobookZip(audiobookId: string): Promise<Buffer> {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    try {
      const { storage } = await import('../storage');
      const audiobook = await storage.getAudiobook(audiobookId);
      
      if (!audiobook) {
        throw new Error(`Audiobook not found: ${audiobookId}`);
      }

      const chapters = Array.isArray(audiobook.chapters) ? audiobook.chapters : [];
      
      if (chapters.length === 0) {
        throw new Error(`No chapters found for audiobook ${audiobookId}`);
      }

      console.log(`📦 Creating streaming ZIP for ${audiobookId} with ${chapters.length} audio files from object storage`);
      
      for (const chapter of chapters) {
        if (chapter.audioPath) {
          try {
            const fileName = chapter.audioPath.split('/').pop() || `chapter_${chapter.chapterNumber}.mp3`;
            
            const fileBuffer = await this.objectStorage.downloadBuffer(chapter.audioPath);
            zip.file(fileName, fileBuffer);
            console.log(`✅ Added to ZIP: ${fileName} (${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB)`);
            
            if (global.gc) {
              global.gc();
            }
          } catch (downloadError) {
            console.error(`Failed to download audio file ${chapter.audioPath}:`, downloadError);
            throw new Error(`Failed to download audio file: ${downloadError}`);
          }
        }
      }
      
      const metadataObjectPath = `${this.objectStorage.getPrivateObjectDir()}/audiobooks/${audiobookId}/audiobook-metadata.json`;
      try {
        const exists = await this.objectStorage.fileExists(metadataObjectPath);
        if (exists) {
          const metadataBuffer = await this.objectStorage.downloadBuffer(metadataObjectPath);
          zip.file('audiobook-metadata.json', metadataBuffer);
          console.log(`✅ Added metadata to ZIP`);
        }
      } catch (metadataError) {
        console.warn('⚠️ Could not add metadata to ZIP:', metadataError);
      }
      
      console.log('🔄 Generating ZIP buffer...');
      return await zip.generateAsync({ 
        type: 'nodebuffer',
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });
      
    } catch (error) {
      console.error('Error creating audiobook ZIP:', error);
      throw error;
    }
  }

  /**
   * Get audiobook sample chapters for testing
   */
  async getSampleChapters(genre: string): Promise<Array<{
    id: number;
    genre: string;
    title: string;
    content: string;
  }>> {
    return [
      {
        id: 1,
        genre: 'General Fiction',
        title: 'Sample Chapter',
        content: 'It was a dark and stormy night. The wind howled through the trees, and the rain pelted against the windows. Inside the old mansion, Sarah sat by the fireplace, lost in thought. She knew something was about to change, but she couldn\'t quite put her finger on what it was. The world seemed to slow down just enough to catch its breath.'
      },
      {
        id: 2,
        genre: 'Mystery',
        title: 'The First Clue',
        content: 'Detective Morrison had seen many crime scenes in his career, but this one sent a chill down his spine. The body lay in the center of the room, surrounded by strange symbols that seemed to glow in the dim light. Nothing made sense. Yet.'
      },
      {
        id: 3,
        genre: 'Romance',
        title: 'Meeting Again',
        content: 'She turned around, and there he was. Ten years had passed, but she would recognize those eyes anywhere. "Hello, Emma," he said softly, his voice exactly as she remembered. Her heart raced as memories flooded back.'
      },
      {
        id: 4,
        genre: 'Thriller',
        title: 'The Chase',
        content: 'The footsteps behind him were getting closer. Marcus ran faster, his lungs burning. He couldn\'t let them catch him—not when he was this close to the truth. The alley ahead split into two paths. He had seconds to decide.'
      },
      {
        id: 5,
        genre: 'Fantasy',
        title: 'The Awakening',
        content: 'The ancient stone began to glow as Elena touched it. Power surged through her fingers, warm and electric. Around her, the forest came alive with whispers in a language she somehow understood. Her life would never be the same.'
      },
      {
        id: 6,
        genre: 'Science Fiction',
        title: 'First Contact',
        content: 'The signal had been repeating for three days straight. Commander Chen stared at the screen, her pulse quickening. This wasn\'t random noise. This was a message. And it was getting stronger as they approached the approaching darkness.'
      }
    ];
  }

  /**
   * Get available background music options
   */
  getBackgroundMusicOptions(): Array<{ type: string; name: string; description: string }> {
    return [
      { type: 'ambient', name: 'Ambient', description: 'Soft, atmospheric background sounds' },
      { type: 'classical', name: 'Classical', description: 'Light classical music' },
      { type: 'cinematic', name: 'Cinematic', description: 'Epic, movie-like background' },
      { type: 'nature', name: 'Nature', description: 'Natural sounds and ambience' },
      { type: 'fantasy', name: 'Fantasy', description: 'Magical, ethereal tones' },
      { type: 'mystery', name: 'Mystery', description: 'Suspenseful, mysterious atmosphere' }
    ];
  }

  /**
   * Get default sample texts for voice previews
   */
  getDefaultSampleTexts(): Array<{ id: string; text: string; genre: string }> {
    return [
      { 
        id: 'general', 
        text: 'Welcome to your audiobook experience. This is a sample of how your novel will sound when narrated with this voice.', 
        genre: 'General' 
      },
      { 
        id: 'mystery', 
        text: 'The detective knew something was wrong the moment he entered the room. The silence was too perfect, too complete.', 
        genre: 'Mystery' 
      },
      { 
        id: 'romance', 
        text: 'She looked into his eyes and felt her heart skip a beat. This was the moment she had been waiting for.', 
        genre: 'Romance' 
      }
    ];
  }

  /**
   * Generate pre-made chunks for faster downloads (optimization feature)
   */
  async generatePreMadeChunks(audiobookId: string, chunkSize: number = 20): Promise<void> {
    console.log(`📦 Background chunk generation requested for audiobook ${audiobookId} (chunk size: ${chunkSize})`);
    console.log(`⚠️  Pre-made chunk generation not fully implemented - audiobooks will be generated on-demand`);
  }

  /**
   * Get a pre-generated chunk if it exists
   */
  async getPreGeneratedChunk(audiobookId: string, chunkIndex: number): Promise<string | null> {
    return null;
  }

  /**
   * Stream a chunked audiobook ZIP to response
   */
  async streamChunkedAudiobookZip(
    audiobookId: string,
    res: any,
    chunkIndex: number,
    chunkSize: number
  ): Promise<void> {
    try {
      const { storage } = await import('../storage');
      const audiobook = await storage.getAudiobook(audiobookId);
      
      if (!audiobook) {
        throw new Error(`Audiobook not found: ${audiobookId}`);
      }

      const chapters = Array.isArray(audiobook.chapters) ? audiobook.chapters : [];
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, chapters.length);
      const chunkChapters = chapters.slice(start, end).filter((ch: any) => ch.audioPath);
      
      if (chunkChapters.length === 0) {
        throw new Error('No audio files found in this chunk');
      }
      
      console.log(`📦 Streaming chunk ${chunkIndex + 1} with ${chunkChapters.length} chapters`);
      
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      const metadataContent = JSON.stringify({
        type: 'audiobook_chunk',
        chunkIndex,
        chaptersInChunk: chunkChapters.length,
        generatedAt: new Date().toISOString()
      }, null, 2);
      zip.file('chunk_info.json', metadataContent);
      
      for (const chapter of chunkChapters) {
        if (chapter.audioPath) {
          const fileName = chapter.audioPath.split('/').pop() || `chapter_${chapter.chapterNumber}.mp3`;
          try {
            const fileBuffer = await this.objectStorage.downloadBuffer(chapter.audioPath);
            zip.file(fileName, fileBuffer);
          } catch (downloadError) {
            console.error(`Failed to download ${chapter.audioPath}:`, downloadError);
          }
        }
      }
      
      const zipStream = zip.generateNodeStream({ 
        type: 'nodebuffer',
        compression: "DEFLATE",
        compressionOptions: { level: 1 }
      });
      
      zipStream.pipe(res);
      
      zipStream.on('end', () => console.log('✅ Chunk stream completed'));
      zipStream.on('error', (error: any) => {
        console.error('❌ Chunk stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Chunk generation failed' });
        }
      });
      
    } catch (error) {
      console.error('Error streaming chunked audiobook ZIP:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create chunk', details: (error as Error).message });
      }
      throw error;
    }
  }

  /**
   * Get chunk manifest for an audiobook
   */
  async getChunkManifest(audiobookId: string): Promise<any | null> {
    return null;
  }

  /**
   * Get audiobook chunk information
   */
  async getAudiobookChunkInfo(audiobookId: string, chunkSize: number = 20): Promise<{
    totalChapters: number;
    totalChunks: number;
    chunkSize: number;
    chunks: Array<{ index: number; chapters: number; estimatedSize: string }>;
  }> {
    const { storage } = await import('../storage');
    const audiobook = await storage.getAudiobook(audiobookId);
    
    if (!audiobook) {
      throw new Error(`Audiobook not found: ${audiobookId}`);
    }

    const chapters = Array.isArray(audiobook.chapters) ? audiobook.chapters : [];
    const totalChapters = chapters.length;
    const totalChunks = Math.ceil(totalChapters / chunkSize);
    
    const chunks = [];
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, totalChapters);
      const chapterCount = end - start;
      
      chunks.push({
        index: i,
        chapters: chapterCount,
        estimatedSize: `~${(chapterCount * 5).toFixed(1)}MB`
      });
    }
    
    return {
      totalChapters,
      totalChunks,
      chunkSize,
      chunks
    };
  }
}

export const audiobookService = new AudiobookService();
