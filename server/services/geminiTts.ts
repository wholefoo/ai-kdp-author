import { GoogleGenAI } from '@google/genai';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';

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
}

const PCM_SAMPLE_RATE = 24000;
const PCM_CHANNELS = 1;

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
    console.log(`🎙️ Generating audio with Gemini TTS using voice: ${options.voice}`);
    
    try {
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

  private async synthesizeChunk(text: string, options: GeminiTtsOptions): Promise<Buffer> {
    try {
      const response = await this.client.models.generateContent({
        model: options.model,
        contents: [{ parts: [{ text }] }],
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
        throw new Error('No audio content in Gemini response');
      }

      const pcmBuffer = Buffer.from(b64, 'base64');
      const mp3Buffer = await pcmToMp3Buffer(pcmBuffer, { bitrateKbps: 192 });
      
      return mp3Buffer;
    } catch (error: any) {
      console.error('Error synthesizing chunk with Gemini:', error.message);
      if (error.message?.includes('401') || error.message?.includes('UNAUTHENTICATED')) {
        console.error('❌ Authentication failed - GEMINI_API_KEY may be invalid');
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
        currentChunk = sentence;
      }
    }

    if (currentChunk) chunks.push(currentChunk);
    return chunks;
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
}
