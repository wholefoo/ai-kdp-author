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
  styleHint?: string;
  maxCharsPerChunk?: number;
  pauseMsBetweenChunks?: number;
}

const PCM_SAMPLE_RATE = 24000;
const PCM_CHANNELS = 1;
const PCM_BYTES_PER_SAMPLE = 2;

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

function splitIntoNarrationChunks(text: string, {
  maxChars = 1400,
  minChunkChars = 300,
} = {}): string[] {
  const normalized = String(text)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) return [];

  const parts = normalized.split(/(?<=[.!?]["')\]]?)\s+(?=[A-Z0-9""(\[])/g);

  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    const c = current.trim();
    if (c) chunks.push(c);
    current = "";
  };

  for (const p of parts) {
    const piece = p.trim();
    if (!piece) continue;

    if (!current) {
      current = piece;
      continue;
    }

    if ((current.length + 1 + piece.length) <= maxChars) {
      current += " " + piece;
      continue;
    }

    if (current.length >= minChunkChars) {
      pushCurrent();
      current = piece;
      continue;
    }

    pushCurrent();
    current = piece;
  }

  pushCurrent();

  const hardSplit: string[] = [];
  for (const c of chunks) {
    if (c.length <= maxChars) {
      hardSplit.push(c);
      continue;
    }
    let i = 0;
    while (i < c.length) {
      hardSplit.push(c.slice(i, i + maxChars).trim());
      i += maxChars;
    }
  }

  const merged: string[] = [];
  for (const c of hardSplit) {
    if (!merged.length) {
      merged.push(c);
      continue;
    }
    const prev = merged[merged.length - 1];
    if (c.length < Math.floor(minChunkChars / 2) && (prev.length + 1 + c.length) <= maxChars) {
      merged[merged.length - 1] = (prev + " " + c).trim();
    } else {
      merged.push(c);
    }
  }

  return merged;
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
    const maxCharsPerChunk = options.maxCharsPerChunk || 1400;
    const pauseMsBetweenChunks = options.pauseMsBetweenChunks ?? 120;
    
    console.log(`🎙️ Generating audio with Gemini TTS using voice: ${options.voice}`);
    
    try {
      const chunks = splitIntoNarrationChunks(text, {
        maxChars: maxCharsPerChunk,
        minChunkChars: 300,
      });
      
      console.log(`📝 Split text into ${chunks.length} chunks for Gemini TTS processing`);
      
      if (!chunks.length) return Buffer.alloc(0);

      const silence = pauseMsBetweenChunks > 0 ? makeSilencePcm(pauseMsBetweenChunks) : null;
      const pcmParts: Buffer[] = [];
      
      for (let idx = 0; idx < chunks.length; idx++) {
        console.log(`🎵 Processing Gemini chunk ${idx + 1}/${chunks.length} (${chunks[idx].length} chars)`);
        
        const pcm = await this.synthesizeChunkToPcm(chunks[idx], options);
        pcmParts.push(pcm);
        
        if (silence && idx < chunks.length - 1) {
          pcmParts.push(silence);
        }
        
        console.log(`✅ Gemini chunk ${idx + 1} completed (${pcm.length} bytes PCM)`);
      }
      
      const fullPcm = Buffer.concat(pcmParts);
      console.log(`🔄 Converting ${fullPcm.length} bytes PCM to MP3...`);
      
      const mp3Buffer = await pcmToMp3Buffer(fullPcm, { bitrateKbps: 192 });
      console.log(`✅ Gemini TTS completed (${mp3Buffer.length} bytes MP3)`);
      
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
}
