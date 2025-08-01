import { transcriptionProvider } from "$lib/ai/providers/transcription-abstraction";
import { transcribeAudio as assemblyTranscribe } from "$lib/audio/assemblyai";
import { logger } from "$lib/logging/logger";

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  is_final?: boolean;
  speaker?: string;
}

export async function transcribeAudioChunk(
  audioBlob: Blob,
  language: string = "en",
): Promise<TranscriptionResult | null> {
  try {
    // Convert Blob to File for existing transcription APIs
    const audioFile = new File([audioBlob], "audio_chunk.mp3", {
      type: "audio/mp3",
    });

    // Use configured transcription provider for real-time transcription
    await transcriptionProvider.initialize();
    const result = await transcriptionProvider.transcribeAudioCompatible(
      audioFile,
      { lang: language },
    );

    if (result.text && result.text.trim().length > 0) {
      return {
        text: result.text.trim(),
        confidence: 0.8, // Whisper doesn't return confidence, estimate
        is_final: true, // For now, treat all chunks as final
        speaker: undefined, // Single speaker for now
      };
    }

    return null;
  } catch (error) {
    logger.transcript.error("Real-time transcription error:", error);
    return null;
  }
}

// Alternative: Use AssemblyAI for better accuracy but slower processing
export async function transcribeAudioChunkAssembly(
  audioBlob: Blob,
  language: string = "en",
): Promise<TranscriptionResult | null> {
  try {
    const audioFile = new File([audioBlob], "audio_chunk.mp3", {
      type: "audio/mp3",
    });
    const result = await assemblyTranscribe(audioFile, { lang: language });

    if (result.text && result.text.trim().length > 0) {
      return {
        text: result.text.trim(),
        confidence: result.confidence || 0.8,
        is_final: true,
        speaker: undefined,
      };
    }

    return null;
  } catch (error) {
    logger.transcript.error("AssemblyAI real-time transcription error:", error);
    return null;
  }
}

// Buffer for accumulating partial results
const transcriptionBuffer = new Map<string, string>();

export function addToTranscriptionBuffer(
  sessionId: string,
  text: string,
): void {
  const existing = transcriptionBuffer.get(sessionId) || "";
  transcriptionBuffer.set(sessionId, existing + " " + text);
}

export function getTranscriptionBuffer(sessionId: string): string {
  return transcriptionBuffer.get(sessionId) || "";
}

export function clearTranscriptionBuffer(sessionId: string): void {
  transcriptionBuffer.delete(sessionId);
}
