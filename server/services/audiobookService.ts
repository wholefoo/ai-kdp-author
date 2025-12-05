import { openai } from './openai';
import { promises as fs } from 'fs';
import { join } from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { ObjectStorageService } from '../objectStorage';
import { isWrittenNumberChapterHeading } from '../utils/numberParser';

export interface AudiobookOptions {
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  model: 'tts-1' | 'tts-1-hd';
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

  constructor() {
    this.ensureAudioDirectory();
    this.ensureMusicDirectory();
    this.objectStorage = new ObjectStorageService();
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
        const audioBuffer = await this.generateChapterAudio(chapterText, audioOptions);
        
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

  /**
   * Generate audio for a single chapter using OpenAI TTS
   */
  private async generateChapterAudio(text: string, options: AudiobookOptions): Promise<Buffer> {
    return this.generateOpenAIAudio(text, options);
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
          model: options.model,
          voice: options.voice,
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
      
      // Audio normalization temporarily disabled for stability
      // Re-enable when audio normalization is fully tested
      return finalBuffer;
      
    } catch (error: any) {
      console.error('❌ OpenAI TTS API error:', error);
      throw new Error(`Failed to generate audio: ${error.message}`);
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
   * Check if content already has a chapter heading
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
   * Prepare chapter text for audio generation
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

    const hasExistingHeading = this.hasChapterHeading(content);
    let text = '';
    
    if (hasExistingHeading) {
      text = content;
      console.log(`✅ Chapter ${chapter.chapterNumber} content already includes chapter heading`);
    } else {
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
            .audioCodec(getCodec(format))
            .on('end', () => {
              clearTimeout(timeout);
              fs.readFile(tempOutputPath)
                .then((normalizedBuffer) => {
                  fs.unlink(tempInputPath).catch(() => {});
                  fs.unlink(tempOutputPath).catch(() => {});
                  console.log(`✅ Audio normalized successfully (${normalizedBuffer.length} bytes)`);
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
    provider: 'openai'
  }> {
    return [
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
      console.log(`🎤 Generating voice preview with ${options.voice} voice`);
      console.log(`📝 Sample text length: ${sampleText.length} characters`);
      
      const limitedText = sampleText.length > 500 
        ? sampleText.substring(0, 500) + '...'
        : sampleText;

      const normalizedSpeed = options.speed > 4 ? options.speed / 100 : options.speed;
      
      console.log(`🎤 Voice preview request - Original speed: ${options.speed}, Normalized: ${normalizedSpeed}`);
      
      const response = await openai.audio.speech.create({
        model: options.model,
        voice: options.voice,
        input: limitedText,
        response_format: options.format as any,
        speed: normalizedSpeed,
      });

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Audio normalization temporarily disabled for stability
      console.log(`✅ Voice preview generated successfully (${buffer.length} bytes)`);
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
