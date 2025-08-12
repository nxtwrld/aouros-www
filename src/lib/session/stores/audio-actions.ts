import { get } from "svelte/store";
import {
  AudioState as MicrophoneAudioState,
  getAudioVAD,
  type AudioControlsVad,
} from "$lib/audio/microphone";
import type { PartialTranscript } from "../transport/sse-client";
import { SSEClient } from "../transport/sse-client";
import { logger } from "$lib/logging/logger";
import ui from "$lib/ui";
import {
  unifiedSessionStore,
  AudioState,
  type AudioButtonPosition,
} from "./unified-session-store";

// Audio processing interface
interface AudioProcessor {
  audio: AudioControlsVad | null;
  sseClient: SSEClient | null;
  isInitialized: boolean;
}

// Helper function to map microphone AudioState to unified AudioState
function mapMicrophoneAudioState(micState: MicrophoneAudioState): AudioState {
  switch (micState) {
    case MicrophoneAudioState.ready:
      return AudioState.Ready;
    case MicrophoneAudioState.listening:
      return AudioState.Listening;
    case MicrophoneAudioState.speaking:
      return AudioState.Speaking;
    case MicrophoneAudioState.stopping:
      return AudioState.Stopping;
    case MicrophoneAudioState.stopped:
      return AudioState.Stopped;
    default:
      return AudioState.Error;
  }
}

// Global audio processor instance
let audioProcessor: AudioProcessor = {
  audio: null,
  sseClient: null,
  isInitialized: false,
};

export const audioActions = {
  /**
   * Start recording with pre-initialized audio (for browser security)
   * This method accepts an already-initialized audio processor to satisfy
   * browser requirements that getUserMedia be called in direct user interaction
   */
  async startRecordingWithAudio(
    audio: AudioControlsVad,
    options: {
      language?: string;
      models?: string[];
      useRealtime?: boolean;
    } = {},
  ): Promise<boolean> {
    const {
      language = "en",
      models = ["GP"],
      useRealtime = true,
    } = options;

    logger.audio.info("Starting recording with pre-initialized audio...", {
      language,
      models,
      useRealtime,
      audioState: audio.state,
    });

    try {
      // Store the audio processor
      audioProcessor.audio = audio;
      audioProcessor.isInitialized = true;
      
      logger.audio.info("Audio processor stored globally", {
        hasStream: !!audio.stream,
        streamId: audio.stream?.id,
        trackCount: audio.stream?.getTracks().length || 0,
        audioState: audio.state
      });

      // Create session if needed and realtime is enabled
      let finalSessionId: string | null = null;
      if (useRealtime) {
        finalSessionId = await audioActions.createSession(language, models);
        if (!finalSessionId) {
          logger.audio.warn("Failed to create session, continuing with local recording");
        }
      }

      // Initialize SSE client for real-time processing if enabled
      if (useRealtime && finalSessionId) {
        const sseConnected = await audioActions.initializeSSE(finalSessionId);
        if (!sseConnected) {
          logger.audio.warn("Failed to initialize SSE, falling back to non-realtime mode");
        }
      }

      // Set up audio event handlers
      audio.onFeatures = (features) => {
        if (features.energy > 0.001) {
          ui.emit("audio:features", features);
        }
      };

      audio.onSpeechStart = () => {
        logger.audio.info("Speech started");
        unifiedSessionStore.update((state) => ({
          ...state,
          audio: {
            ...state.audio,
            state: mapMicrophoneAudioState(audio.state),
          },
        }));
        ui.emit("audio:speech-start");
      };

      audio.onSpeechEnd = (audioData: Float32Array) => {
        logger.audio.info("Speech ended, processing audio chunk...", {
          chunkSize: audioData.length,
          useRealtime,
          hasSSE: audioProcessor.sseClient !== null,
        });

        unifiedSessionStore.update((state) => ({
          ...state,
          audio: {
            ...state.audio,
            state: mapMicrophoneAudioState(audio.state),
          },
        }));

        audioActions.processAudioChunk(audioData, useRealtime);
      };

      // Start the audio recording
      audio.start();

      // Update store with successful initialization
      unifiedSessionStore.update((state) => ({
        ...state,
        audio: {
          ...state.audio,
          isRecording: true,
          state: AudioState.Listening,
          sessionId: finalSessionId,
          useRealtime,
          recordingStartTime: Date.now(),
          vadEnabled: true,
        },
        transport: {
          ...state.transport,
          realtimeEnabled: useRealtime && audioProcessor.sseClient !== null,
        },
        lastUpdated: Date.now(),
      }));

      ui.emit("audio:recording-started");
      return true;
    } catch (error) {
      logger.audio.error("Failed to start recording with audio:", error);
      audioProcessor.audio = null;
      audioProcessor.isInitialized = false;
      return false;
    }
  },
  /**
   * Initialize audio recording with microphone and VAD
   */
  async initializeAudio(
    options: {
      language?: string;
      models?: string[];
      useRealtime?: boolean;
      sessionId?: string;
    } = {},
  ): Promise<boolean> {
    const {
      language = "en",
      models = ["GP"],
      useRealtime = true,
      sessionId,
    } = options;

    logger.audio.info("Initializing audio recording...", {
      language,
      models,
      useRealtime,
      sessionId,
    });

    try {
      // Create session if needed and realtime is enabled
      let finalSessionId = sessionId;
      if (useRealtime && !finalSessionId) {
        finalSessionId = await audioActions.createSession(language, models);
        if (!finalSessionId) {
          logger.audio.warn("Failed to create session, continuing with local recording");
          // Continue without realtime features
        }
      }

      // Initialize SSE client for real-time processing if enabled
      if (useRealtime && finalSessionId) {
        const sseConnected = await audioActions.initializeSSE(finalSessionId);
        if (!sseConnected) {
          logger.audio.warn(
            "Failed to initialize SSE, falling back to non-realtime mode",
          );
        }
      }

      // Initialize audio with VAD
      logger.audio.debug("Requesting microphone access...");
      const audio = await getAudioVAD({
        analyzer: true,
      });

      if (audio instanceof Error) {
        logger.audio.error("Failed to initialize audio - returned Error:", {
          message: audio.message,
          stack: audio.stack
        });
        throw audio;
      }

      logger.audio.info("Audio successfully initialized", { 
        state: audio.state,
        hasStream: !!audio.stream,
        hasAudioContext: !!audio.audioContext
      });

      // Store audio processor
      audioProcessor.audio = audio;
      audioProcessor.isInitialized = true;

      // Set up audio event handlers
      audio.onFeatures = (features) => {
        // Handle audio features (energy levels for visualization)
        if (features.energy > 0.001) {
          ui.emit("audio:features", features);
        }
      };

      audio.onSpeechStart = () => {
        logger.audio.info("Speech started");
        unifiedSessionStore.update((state) => ({
          ...state,
          audio: {
            ...state.audio,
            state: mapMicrophoneAudioState(audio.state),
          },
        }));
        ui.emit("audio:speech-start");
      };

      audio.onSpeechEnd = (audioData: Float32Array) => {
        logger.audio.info("Speech ended, processing audio chunk...", {
          chunkSize: audioData.length,
          useRealtime,
          hasSSE: audioProcessor.sseClient !== null,
        });

        unifiedSessionStore.update((state) => ({
          ...state,
          audio: {
            ...state.audio,
            state: mapMicrophoneAudioState(audio.state),
          },
        }));

        // Handle audio chunk processing
        audioActions.processAudioChunk(audioData, useRealtime);
      };

      // Update store with successful initialization
      unifiedSessionStore.update((state) => ({
        ...state,
        audio: {
          ...state.audio,
          state: AudioState.Listening,
          sessionId: finalSessionId || null,
          useRealtime,
          recordingStartTime: Date.now(),
          vadEnabled: true,
        },
        transport: {
          ...state.transport,
          realtimeEnabled: useRealtime && audioProcessor.sseClient !== null,
        },
        lastUpdated: Date.now(),
      }));

      return true;
    } catch (error) {
      logger.audio.error("Audio initialization failed:", error);
      unifiedSessionStore.update((state) => ({
        ...state,
        audio: {
          ...state.audio,
          state: AudioState.Error,
        },
        error: `Audio initialization failed: ${(error as Error).message}`,
      }));
      return false;
    }
  },

  /**
   * Start audio recording
   */
  async startRecording(): Promise<boolean> {
    logger.audio.info("Starting audio recording...");

    if (!audioProcessor.audio) {
      logger.audio.error("Audio not initialized");
      return false;
    }

    try {
      audioProcessor.audio.start();

      unifiedSessionStore.update((state) => ({
        ...state,
        audio: {
          ...state.audio,
          isRecording: true,
          state: audioProcessor.audio ? mapMicrophoneAudioState(audioProcessor.audio.state) : AudioState.Listening,
        },
        ui: {
          ...state.ui,
          audioButtonPosition: state.ui.isOnNewSessionPage
            ? "header"
            : state.ui.audioButtonPosition,
          isAnimating: true,
        },
        lastUpdated: Date.now(),
      }));

      ui.emit("audio:recording-started");
      return true;
    } catch (error) {
      logger.audio.error("Failed to start recording:", error);
      return false;
    }
  },

  /**
   * Stop audio recording
   */
  async stopRecording(): Promise<void> {
    logger.audio.info("Stopping audio recording...");

    const currentState = get(unifiedSessionStore);

    unifiedSessionStore.update((state) => ({
      ...state,
      audio: {
        ...state.audio,
        isRecording: false,
        state: AudioState.Stopping,
      },
    }));

    try {
      // Stop audio recording
      if (audioProcessor.audio) {
        logger.audio.info("Stopping global audio processor - calling stop() method", {
          hasStream: !!audioProcessor.audio.stream,
          streamId: audioProcessor.audio.stream?.id,
          trackCount: audioProcessor.audio.stream?.getTracks().length || 0,
          audioState: audioProcessor.audio.state
        });
        audioProcessor.audio.stop();
        logger.audio.info("Global audio processor stop() method completed");
      } else {
        logger.audio.warn("No global audio processor to stop");
      }

      // Disconnect SSE
      if (audioProcessor.sseClient) {
        audioProcessor.sseClient.disconnect();
        audioProcessor.sseClient = null;
      }

      // Clean up audio processor
      audioProcessor.isInitialized = false;

      // Update final state
      unifiedSessionStore.update((state) => ({
        ...state,
        audio: {
          ...state.audio,
          state: AudioState.Ready,
          isRecording: false,
          sessionId: null,
          recordingStartTime: null,
          speechChunks: [],
        },
        ui: {
          ...state.ui,
          audioButtonPosition: state.ui.isOnNewSessionPage
            ? "center"
            : "hidden",
          isAnimating: true,
        },
        transport: {
          ...state.transport,
          sseClient: null,
          connectionStatus: "disconnected",
        },
        lastUpdated: Date.now(),
      }));

      ui.emit("audio:recording-stopped");
      logger.audio.info("Audio recording stopped successfully");
    } catch (error) {
      logger.audio.error("Error stopping recording:", error);
    }
  },

  /**
   * Toggle recording state
   */
  async toggleRecording(
    options: {
      language?: string;
      models?: string[];
      useRealtime?: boolean;
    } = {},
  ): Promise<boolean> {
    const currentState = get(unifiedSessionStore);

    if (currentState.audio.state === AudioState.Stopping) {
      logger.audio.debug("Recording is stopping, ignoring toggle");
      return false;
    }

    if (currentState.audio.isRecording) {
      await audioActions.stopRecording();
      return false;
    } else {
      const initialized = await audioActions.initializeAudio(options);
      if (initialized) {
        return await audioActions.startRecording();
      }
      return false;
    }
  },

  /**
   * Create a new session for recording
   */
  async createSession(
    language: string = "en",
    models: string[] = ["GP"],
  ): Promise<string | null> {
    logger.session.info("Creating new session...", { language, models });

    try {
      logger.session.debug("Making request to /v1/session/start...");
      const response = await fetch("/v1/session/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language,
          models: models.filter((model) => model && model.trim()),
        }),
      });

      logger.session.debug("Session creation response received", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.session.error("Session creation failed - response not ok:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: response.url
        });
        return null;
      }

      const result = await response.json();
      logger.session.debug("Session creation response JSON:", result);
      
      if (result.sessionId) {
        logger.session.info("Session created successfully:", result.sessionId);
        ui.emit("session:created", { sessionId: result.sessionId });
        return result.sessionId;
      } else {
        logger.session.error("Session creation response missing sessionId:", result);
        return null;
      }

    } catch (error) {
      logger.session.error("Session creation network/parse error:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  },

  /**
   * Initialize SSE client for real-time processing
   */
  async initializeSSE(sessionId: string): Promise<boolean> {
    logger.audio.debug("Initializing SSE client...", { sessionId });

    if (audioProcessor.sseClient) {
      logger.audio.warn("SSE client already exists");
      return true;
    }

    try {
      const sseClient = new SSEClient({
        sessionId,
        onTranscript: (transcript: PartialTranscript) => {
          logger.audio.info("SSE transcript received:", transcript);
          audioActions.handleTranscript(transcript);
        },
        onAnalysis: (analysis: any) => {
          logger.audio.info("SSE analysis received:", analysis);
          ui.emit("analysis:update", analysis);
        },
        onError: (error: string) => {
          logger.audio.error("SSE client error:", error);
          audioActions.handleSSEError(error);
        },
        onStatus: (status: any) => {
          logger.audio.debug("SSE session status:", status);
        },
      });

      const connected = await sseClient.connect();
      if (connected) {
        audioProcessor.sseClient = sseClient;

        unifiedSessionStore.update((state) => ({
          ...state,
          transport: {
            ...state.transport,
            sseClient,
            connectionStatus: "connected",
            reconnectAttempts: 0,
          },
        }));

        logger.audio.info("SSE connected successfully");
        return true;
      } else {
        logger.audio.error("Failed to connect SSE");
        return false;
      }
    } catch (error) {
      logger.audio.error("SSE connection failed:", error);
      return false;
    }
  },

  /**
   * Process audio chunk (real-time or batch)
   */
  processAudioChunk(audioData: Float32Array, useRealtime: boolean): void {
    if (useRealtime && audioProcessor.sseClient) {
      logger.audio.debug("Sending audio chunk via SSE...", {
        size: audioData.length,
      });
      audioProcessor.sseClient.sendAudioChunk(audioData);
    } else {
      logger.audio.debug("Using batch audio processing...", {
        size: audioData.length,
      });
      // Store chunk for batch processing
      unifiedSessionStore.update((state) => ({
        ...state,
        audio: {
          ...state.audio,
          speechChunks: [...state.audio.speechChunks, audioData],
        },
      }));
      ui.emit("audio:chunk", { audioData });
    }
  },

  /**
   * Handle transcript updates from SSE
   */
  handleTranscript(transcript: PartialTranscript): void {
    unifiedSessionStore.update((state) => ({
      ...state,
      transcripts: {
        ...state.transcripts,
        items: [
          ...state.transcripts.items,
          {
            id: transcript.id,
            text: transcript.text,
            confidence: transcript.confidence,
            timestamp: transcript.timestamp,
            is_final: transcript.is_final,
            speaker: transcript.speaker,
          },
        ],
        currentSegment: transcript.is_final ? "" : transcript.text,
        isStreaming: !transcript.is_final,
      },
      lastUpdated: Date.now(),
    }));

    ui.emit("transcript:update", transcript);
  },

  /**
   * Handle SSE errors
   */
  handleSSEError(error: string): void {
    logger.audio.error("SSE error occurred:", error);

    unifiedSessionStore.update((state) => ({
      ...state,
      transport: {
        ...state.transport,
        connectionStatus: "error",
        reconnectAttempts: state.transport.reconnectAttempts + 1,
      },
      error: `Connection error: ${error}`,
    }));
  },

  /**
   * Update audio button position
   */
  setButtonPosition(position: AudioButtonPosition): void {
    unifiedSessionStore.update((state) => ({
      ...state,
      ui: {
        ...state.ui,
        audioButtonPosition: position,
        isAnimating: true,
      },
    }));

    // Reset animation flag after transition
    setTimeout(() => {
      unifiedSessionStore.update((state) => ({
        ...state,
        ui: {
          ...state.ui,
          isAnimating: false,
        },
      }));
    }, 500);
  },

  /**
   * Get current audio processor state
   */
  getAudioProcessor(): AudioProcessor {
    return audioProcessor;
  },

  /**
   * Check if audio is currently recording
   */
  isRecording(): boolean {
    const state = get(unifiedSessionStore);
    return state.audio.isRecording;
  },

  /**
   * Get current audio state
   */
  getAudioState(): AudioState {
    const state = get(unifiedSessionStore);
    return state.audio.state;
  },
};

export default audioActions;
