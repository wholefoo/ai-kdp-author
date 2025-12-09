import { promises as fs } from 'fs';
import axios from 'axios';
import https from 'https';

// Gemini TTS voice options (30 voices available)
export type GeminiVoice = 
  | 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Leda' | 'Orus' | 'Aoede' | 'Callirrhoe'
  | 'Autonoe' | 'Enceladus' | 'Iapetus' | 'Umbriel' | 'Algieba' | 'Despina' | 'Erinome' | 'Algenib'
  | 'Laomedeia' | 'Achernar' | 'Alnilam' | 'Schedar' | 'Gacrux' | 'Pulcherrima' | 'Achird' | 'Zubenelgenubi'
  | 'Rasalgethi' | 'Sadachbia' | 'Sadaltager' | 'Sulafat' | 'Vindemiatrix';

export interface GeminiTtsOptions {
  voice: GeminiVoice;
  model: 'gemini-2.5-flash-tts' | 'gemini-2.5-pro-tts';
  speed: number; // 0.25 to 4.0
  language?: string; // ISO 639-1 code, defaults to 'en'
}

export class GeminiTtsService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('GOOGLE_CLOUD_TTS_API_KEY environment variable is not set');
    }
  }

  /**
   * Generate audio from text using Google Cloud Text-to-Speech API with Gemini voices
   */
  async generateAudio(text: string, options: GeminiTtsOptions): Promise<Buffer> {
    console.log(`🎙️ Generating audio with Gemini TTS using voice: ${options.voice}`);
    
    try {
      // Google Cloud TTS API has a 5000 character limit per request
      // Use 4500 to leave safe margin
      const chunks = this.splitTextIntoChunks(text, 4500);
      console.log(`📝 Split text into ${chunks.length} chunks for Gemini TTS processing`);
      
      const audioBuffers: Buffer[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🎵 Processing Gemini chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
        
        const audioBuffer = await this.synthesizeChunk(chunk, options);
        audioBuffers.push(audioBuffer);
        console.log(`✅ Gemini chunk ${i + 1} completed (${audioBuffer.length} bytes)`);
      }
      
      const finalBuffer = Buffer.concat(audioBuffers);
      console.log(`✅ Gemini TTS completed with ${chunks.length} chunks (${finalBuffer.length} bytes total)`);
      
      return finalBuffer;
    } catch (error: any) {
      console.error('❌ Gemini TTS API error:', error.message);
      throw new Error(`Failed to generate audio with Gemini: ${error.message}`);
    }
  }

  /**
   * Synthesize a single chunk of text using Google Cloud Text-to-Speech API
   * Note: Using API key authentication (may require service account for production)
   */
  private async synthesizeChunk(text: string, options: GeminiTtsOptions): Promise<Buffer> {
    try {
      // Use Google Cloud Text-to-Speech API with simple API key authentication
      const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`;
      
      const response = await axios.post(
        endpoint,
        {
          input: {
            text: text
          },
          voice: {
            languageCode: `${options.language || 'en'}-US`,
            name: options.voice
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: Math.max(0.25, Math.min(4.0, options.speed)),
            pitch: 0.0
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      // Response contains base64 encoded audio
      if (response.data.audioContent) {
        const buffer = Buffer.from(response.data.audioContent, 'base64');
        return buffer;
      }

      throw new Error('No audio content in response');
    } catch (error: any) {
      console.error('Error synthesizing chunk:', error.message);
      if (error.response?.status === 401) {
        console.error('❌ Authentication failed - Gemini TTS API key may be invalid or for wrong service');
      }
      throw error;
    }
  }

  /**
   * Split text into chunks for API processing
   */
  private splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= maxChunkSize) {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = sentence;
      }
    }

    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  }

  /**
   * Get list of available Gemini voices
   */
  static getAvailableVoices(): GeminiVoice[] {
    return [
      'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede', 'Callirrhoe',
      'Autonoe', 'Enceladus', 'Iapetus', 'Umbriel', 'Algieba', 'Despina', 'Erinome', 'Algenib',
      'Laomedeia', 'Achernar', 'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi',
      'Rasalgethi', 'Sadachbia', 'Sadaltager', 'Sulafat', 'Vindemiatrix'
    ];
  }

  /**
   * Get list of available models
   */
  static getAvailableModels() {
    return ['gemini-2.5-flash-tts', 'gemini-2.5-pro-tts'] as const;
  }
}
