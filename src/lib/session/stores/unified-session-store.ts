import { writable, derived, get } from "svelte/store";
import type { Writable, Readable } from "svelte/store";
import { browser } from "$app/environment";
import { page } from "$app/stores";
import { logger } from "$lib/logging/logger";
import ui from "$lib/ui";
import type { 
  SessionAnalysis,
  MoEAnalysisOutput,
  ExpertContext
} from "../index";
import type { 
  AnalysisState, 
  PathState
} from "./analysis-store";
import { SSEClient } from "../transport/sse-client";
import type { PartialTranscript } from "../transport/sse-client";

// Audio recording state enum - unified across all modules
export enum AudioState {
  Ready = "ready",
  Listening = "listening",
  Speaking = "speaking",
  Stopping = "stopping",
  Stopped = "stopped",
  Error = "error"
}

// Session state enum - controls AudioButton behavior and visibility
export enum SessionState {
  Off = "off",        // Button is hidden (no session context)
  Ready = "ready",    // Button is centered (new session, no data)
  Running = "running", // Button is in header, actively recording
  Paused = "paused",  // Button is in header, session has data but not recording
  Final = "final"     // Session complete, button hidden, show "New Session" button
}

// UI positioning types
export type AudioButtonPosition = "hidden" | "center" | "header";

// Transcript item for real-time updates
export interface TranscriptItem {
  id: string;
  text: string;
  confidence: number;
  timestamp: number;
  is_final: boolean;
  speaker?: string;
}

// Main unified session state interface
export interface UnifiedSessionState {
  // Audio Recording State
  audio: {
    isRecording: boolean;
    state: AudioState;
    sessionId: string | null;
    useRealtime: boolean;
    speechChunks: Float32Array[];
    recordingStartTime: number | null;
    audioContext: AudioContext | null;
    mediaStream: MediaStream | null;
    vadEnabled: boolean;
  };

  // Real-time Transcripts
  transcripts: {
    items: TranscriptItem[];
    isStreaming: boolean;
    currentSegment: string;
    speakerMap: Record<string, string>;
    buffer: string;
  };

  // Analysis Integration
  analysis: AnalysisState & {
    expertAnalyses: Map<string, any>;
    consensus: any | null;
    moeAnalysis: MoEAnalysisOutput | null;
    isAnalyzing: boolean;
  };

  // UI State for AudioButton positioning and visibility
  ui: {
    audioButtonVisible: boolean;
    audioButtonPosition: AudioButtonPosition;
    sessionState: SessionState;
    currentRoute: string;
    isOnNewSessionPage: boolean;
    isAnimating: boolean;
    showTranscripts: boolean;
    sidebarOpen: boolean;
  };

  // Real-time Transport
  transport: {
    sseClient: SSEClient | null;
    realtimeEnabled: boolean;
    connectionStatus: "disconnected" | "connecting" | "connected" | "error";
    reconnectAttempts: number;
  };

  // Error and Status
  error: string | null;
  lastUpdated: number | null;
}

// Initial state
const initialState: UnifiedSessionState = {
  audio: {
    isRecording: false,
    state: AudioState.Ready,
    sessionId: null,
    useRealtime: true,
    speechChunks: [],
    recordingStartTime: null,
    audioContext: null,
    mediaStream: null,
    vadEnabled: true,
  },
  transcripts: {
    items: [],
    isStreaming: false,
    currentSegment: "",
    speakerMap: {},
    buffer: "",
  },
  analysis: {
    currentSession: null,
    isLoading: false,
    lastUpdated: null,
    userActions: [],
    error: null,
    expertAnalyses: new Map(),
    consensus: null,
    moeAnalysis: null,
    isAnalyzing: false,
  },
  ui: {
    audioButtonVisible: false,
    audioButtonPosition: "hidden",
    sessionState: SessionState.Off,
    currentRoute: "",
    isOnNewSessionPage: false,
    isAnimating: false,
    showTranscripts: true,
    sidebarOpen: false,
  },
  transport: {
    sseClient: null,
    realtimeEnabled: true,
    connectionStatus: "disconnected",
    reconnectAttempts: 0,
  },
  error: null,
  lastUpdated: null,
};

// Main store
export const unifiedSessionStore: Writable<UnifiedSessionState> = writable(initialState);

// Derived stores for easy access to specific parts
export const audioState: Readable<UnifiedSessionState["audio"]> = derived(
  unifiedSessionStore,
  ($store) => $store.audio,
);

export const transcriptState: Readable<UnifiedSessionState["transcripts"]> = derived(
  unifiedSessionStore,
  ($store) => $store.transcripts,
);

export const analysisState: Readable<UnifiedSessionState["analysis"]> = derived(
  unifiedSessionStore,
  ($store) => $store.analysis,
);

export const uiState: Readable<UnifiedSessionState["ui"]> = derived(
  unifiedSessionStore,
  ($store) => $store.ui,
);

export const transportState: Readable<UnifiedSessionState["transport"]> = derived(
  unifiedSessionStore,
  ($store) => $store.transport,
);

// Route-aware derived stores
export const isRecording: Readable<boolean> = derived(
  audioState,
  ($audio) => $audio.isRecording,
);

export const currentTranscripts: Readable<TranscriptItem[]> = derived(
  transcriptState,
  ($transcripts) => $transcripts.items,
);

export const audioButtonPosition: Readable<AudioButtonPosition> = derived(
  uiState,
  ($ui) => $ui.audioButtonPosition,
);

export const sessionState: Readable<SessionState> = derived(
  uiState,
  ($ui) => $ui.sessionState,
);

// Legacy - keep for backward compatibility but prefer showAudioButtonFromState
export const shouldShowAudioButton: Readable<boolean> = derived(
  sessionState,
  ($state) => $state !== SessionState.Off && $state !== SessionState.Final,
);

// Derive properties FROM session state (not the other way around)
export const isRecordingFromState: Readable<boolean> = derived(
  sessionState,
  ($state) => $state === SessionState.Running,
);

export const hasSessionDataFromState: Readable<boolean> = derived(
  sessionState,
  ($state) => $state === SessionState.Paused || $state === SessionState.Final,
);

export const buttonPositionFromState: Readable<AudioButtonPosition> = derived(
  sessionState,
  ($state) => {
    switch ($state) {
      case SessionState.Off:
      case SessionState.Final:
        return "hidden";
      case SessionState.Ready:
        return "center";
      case SessionState.Running:
      case SessionState.Paused:
        return "header";
      default:
        return "hidden";
    }
  },
);

export const showAudioButtonFromState: Readable<boolean> = derived(
  sessionState,
  ($state) => $state !== SessionState.Off && $state !== SessionState.Final,
);

// Actions for managing unified session state
export const unifiedSessionActions = {
  // Session State Transitions
  initializeSession(): void {
    logger.session.info("Initializing session - transitioning to Ready state");
    unifiedSessionStore.update((state) => ({
      ...state,
      ui: {
        ...state.ui,
        sessionState: SessionState.Ready,
        audioButtonVisible: true,
        audioButtonPosition: "center",
      },
      lastUpdated: Date.now(),
    }));
  },

  transitionToRunning(): void {
    logger.session.info("Transitioning to Running state");
    unifiedSessionStore.update((state) => ({
      ...state,
      ui: {
        ...state.ui,
        sessionState: SessionState.Running,
        audioButtonPosition: "header",
      },
      audio: {
        ...state.audio,
        isRecording: true,
        state: AudioState.Listening,
      },
      lastUpdated: Date.now(),
    }));
  },

  transitionToPaused(): void {
    logger.session.info("Transitioning to Paused state");
    unifiedSessionStore.update((state) => ({
      ...state,
      ui: {
        ...state.ui,
        sessionState: SessionState.Paused,
        audioButtonPosition: "header",
      },
      audio: {
        ...state.audio,
        isRecording: false,
        state: AudioState.Ready,
      },
      lastUpdated: Date.now(),
    }));
  },

  transitionToFinal(): void {
    logger.session.info("Transitioning to Final state");
    unifiedSessionStore.update((state) => ({
      ...state,
      ui: {
        ...state.ui,
        sessionState: SessionState.Final,
        audioButtonVisible: false,
        audioButtonPosition: "hidden",
      },
      audio: {
        ...state.audio,
        isRecording: false,
        state: AudioState.Stopped,
      },
      lastUpdated: Date.now(),
    }));
  },

  transitionToOff(): void {
    logger.session.info("Transitioning to Off state");
    unifiedSessionStore.update((state) => ({
      ...state,
      ui: {
        ...state.ui,
        sessionState: SessionState.Off,
        audioButtonVisible: false,
        audioButtonPosition: "hidden",
      },
      lastUpdated: Date.now(),
    }));
  },

  // Load existing session data (for mock data or resuming)
  loadSessionWithData(sessionData: any): void {
    logger.session.info("Loading session with existing data - transitioning to Paused");
    unifiedSessionStore.update((state) => ({
      ...state,
      ui: {
        ...state.ui,
        sessionState: SessionState.Paused,
        audioButtonVisible: true,
        audioButtonPosition: "header",
      },
      analysis: {
        ...state.analysis,
        currentSession: sessionData,
      },
      lastUpdated: Date.now(),
    }));
  },
  // Audio Recording Actions
  async startRecording(useRealtime: boolean = true): Promise<boolean> {
    logger.session.info("Starting audio recording", { useRealtime });
    
    const currentState = get(unifiedSessionStore);
    const { sessionState } = currentState.ui;
    
    // Only allow starting from Ready or Paused states
    if (sessionState !== SessionState.Ready && sessionState !== SessionState.Paused) {
      logger.session.warn("Cannot start recording from current state", { sessionState });
      return false;
    }

    try {
      // Request microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio context
      const audioContext = new AudioContext({ sampleRate: 16000 });

      // Generate new session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Transition to Running state
      unifiedSessionActions.transitionToRunning();
      
      // Update audio-specific data
      unifiedSessionStore.update((state) => ({
        ...state,
        audio: {
          ...state.audio,
          sessionId,
          useRealtime,
          recordingStartTime: Date.now(),
          audioContext,
          mediaStream: stream,
        },
        lastUpdated: Date.now(),
      }));

      // Start SSE connection if using realtime
      if (useRealtime) {
        await unifiedSessionActions.connectSSE(sessionId);
      }

      // Initialize audio processing (microphone setup will be done in AudioButton component)
      logger.session.info("Audio recording started successfully", { sessionId });

      // Trigger UI events
      ui.emit("audio:recording-started", { sessionId });

      return true;
    } catch (error) {
      logger.session.error("Failed to start recording", { error });
      unifiedSessionStore.update((state) => ({
        ...state,
        audio: { ...state.audio, state: AudioState.Error },
        error: "Failed to start recording: " + (error as Error).message,
      }));
      return false;
    }
  },

  async stopRecording(): Promise<void> {
    const currentState = get(unifiedSessionStore);
    const { sessionId } = currentState.audio;
    const { sessionState } = currentState.ui;

    logger.session.info("Stopping audio recording", { sessionId, sessionState });
    
    // Only allow stopping from Running state
    if (sessionState !== SessionState.Running) {
      logger.session.warn("Cannot stop recording - not in Running state", { sessionState });
      return;
    }

    // Set stopping state temporarily
    unifiedSessionStore.update((state) => ({
      ...state,
      audio: {
        ...state.audio,
        state: AudioState.Stopping,
      },
    }));

    // Stop media stream
    if (currentState.audio.mediaStream) {
      currentState.audio.mediaStream.getTracks().forEach(track => track.stop());
    }

    // Close audio context
    if (currentState.audio.audioContext) {
      await currentState.audio.audioContext.close();
    }

    // Disconnect SSE
    await unifiedSessionActions.disconnectSSE();
    
    // Check if we have data to determine next state
    const hasData = currentState.transcripts.items.length > 0 || 
                    currentState.analysis.currentSession !== null ||
                    currentState.audio.speechChunks.length > 0;

    // Transition to appropriate state based on data presence
    if (hasData) {
      unifiedSessionActions.transitionToPaused();
    } else {
      // No data collected, go back to Ready
      unifiedSessionStore.update((state) => ({
        ...state,
        ui: {
          ...state.ui,
          sessionState: SessionState.Ready,
          audioButtonPosition: "center",
        },
        audio: {
          ...state.audio,
          isRecording: false,
          state: AudioState.Ready,
        },
        lastUpdated: Date.now(),
      }));
    }

    // Clean up audio resources
    unifiedSessionStore.update((state) => ({
      ...state,
      audio: {
        ...state.audio,
        sessionId: null,
        recordingStartTime: null,
        audioContext: null,
        mediaStream: null,
      },
      lastUpdated: Date.now(),
    }));

    logger.session.info("Audio recording stopped", { sessionId, nextState: hasData ? "Paused" : "Ready" });
    ui.emit("audio:recording-stopped", { sessionId });
  },

  // Transcript Management
  addTranscript(transcript: PartialTranscript): void {
    const transcriptItem: TranscriptItem = {
      id: transcript.id,
      text: transcript.text,
      confidence: transcript.confidence,
      timestamp: transcript.timestamp,
      is_final: transcript.is_final,
      speaker: transcript.speaker,
    };

    unifiedSessionStore.update((state) => ({
      ...state,
      transcripts: {
        ...state.transcripts,
        items: [...state.transcripts.items, transcriptItem],
        currentSegment: transcript.is_final ? "" : transcript.text,
        buffer: transcript.is_final 
          ? state.transcripts.buffer + " " + transcript.text
          : state.transcripts.buffer,
      },
      lastUpdated: Date.now(),
    }));

    logger.session.debug("Transcript added", {
      id: transcript.id,
      text: transcript.text.substring(0, 50) + "...",
      is_final: transcript.is_final,
    });
  },

  clearTranscripts(): void {
    unifiedSessionStore.update((state) => ({
      ...state,
      transcripts: {
        ...state.transcripts,
        items: [],
        currentSegment: "",
        buffer: "",
      },
      lastUpdated: Date.now(),
    }));
    logger.session.info("Transcripts cleared");
  },

  // Analysis Integration
  loadAnalysis(analysis: MoEAnalysisOutput): void {
    unifiedSessionStore.update((state) => ({
      ...state,
      analysis: {
        ...state.analysis,
        moeAnalysis: analysis,
        isAnalyzing: false,
        lastUpdated: Date.now(),
      },
      lastUpdated: Date.now(),
    }));
    logger.session.info("MoE analysis loaded", {
      diagnosesCount: analysis.analysis.diagnoses.length,
      symptomsCount: analysis.analysis.symptoms.length,
    });
  },

  startAnalysis(): void {
    unifiedSessionStore.update((state) => ({
      ...state,
      analysis: {
        ...state.analysis,
        isAnalyzing: true,
      },
    }));
    logger.session.info("Analysis started");
  },

  // UI State Management
  setRoute(route: string): void {
    const isNewSessionPage = route.includes("/session") && !route.includes("/session/");
    const currentState = get(unifiedSessionStore);
    const { sessionState } = currentState.ui;
    
    // Determine session state based on route change
    if (isNewSessionPage) {
      // Only initialize session if currently Off
      if (sessionState === SessionState.Off) {
        unifiedSessionActions.initializeSession();
      }
    } else {
      // Leaving session page - transition to Off if not recording or paused
      if (sessionState === SessionState.Ready) {
        unifiedSessionActions.transitionToOff();
      }
    }
    
    // Update route tracking
    unifiedSessionStore.update((state) => ({
      ...state,
      ui: {
        ...state.ui,
        currentRoute: route,
        isOnNewSessionPage: isNewSessionPage,
      },
    }));

    logger.session.debug("Route updated", { 
      route, 
      isNewSessionPage,
      sessionState: get(unifiedSessionStore).ui.sessionState,
    });
  },

  setAudioButtonPosition(position: AudioButtonPosition): void {
    unifiedSessionStore.update((state) => ({
      ...state,
      ui: {
        ...state.ui,
        audioButtonPosition: position,
        isAnimating: true,
      },
    }));

    // Reset animation flag after animation completes
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

  toggleSidebar(): void {
    unifiedSessionStore.update((state) => ({
      ...state,
      ui: {
        ...state.ui,
        sidebarOpen: !state.ui.sidebarOpen,
      },
    }));
  },

  // SSE Transport Management
  async connectSSE(sessionId: string): Promise<boolean> {
    const currentState = get(unifiedSessionStore);
    
    if (currentState.transport.sseClient) {
      logger.session.warn("SSE already connected", { sessionId });
      return true;
    }

    unifiedSessionStore.update((state) => ({
      ...state,
      transport: {
        ...state.transport,
        connectionStatus: "connecting",
      },
    }));

    try {
      const sseClient = new SSEClient({
        sessionId,
        onTranscript: unifiedSessionActions.addTranscript,
        onAnalysis: (analysis) => {
          logger.session.info("Analysis update received via SSE", analysis);
          // Handle analysis updates
        },
        onError: (error) => {
          logger.session.error("SSE error", { error });
          unifiedSessionActions.handleSSEError(error);
        },
        onStatus: (status) => {
          logger.session.info("SSE status update", { status });
        },
      });

      const connected = await sseClient.connect();
      
      if (connected) {
        unifiedSessionStore.update((state) => ({
          ...state,
          transport: {
            ...state.transport,
            sseClient,
            connectionStatus: "connected",
            reconnectAttempts: 0,
          },
        }));
        logger.session.info("SSE connected successfully", { sessionId });
        return true;
      } else {
        unifiedSessionStore.update((state) => ({
          ...state,
          transport: {
            ...state.transport,
            connectionStatus: "error",
          },
        }));
        logger.session.error("Failed to connect SSE", { sessionId });
        return false;
      }
    } catch (error) {
      logger.session.error("SSE connection error", { error });
      unifiedSessionActions.handleSSEError(error as string);
      return false;
    }
  },

  async disconnectSSE(): Promise<void> {
    const currentState = get(unifiedSessionStore);
    
    if (currentState.transport.sseClient) {
      currentState.transport.sseClient.disconnect();
      
      unifiedSessionStore.update((state) => ({
        ...state,
        transport: {
          ...state.transport,
          sseClient: null,
          connectionStatus: "disconnected",
        },
      }));
      
      logger.session.info("SSE disconnected");
    }
  },

  handleSSEError(error: string): void {
    unifiedSessionStore.update((state) => ({
      ...state,
      transport: {
        ...state.transport,
        connectionStatus: "error",
        reconnectAttempts: state.transport.reconnectAttempts + 1,
      },
      error: `SSE Error: ${error}`,
    }));
  },

  // Audio Chunk Processing
  async sendAudioChunk(audioData: Float32Array): Promise<boolean> {
    const currentState = get(unifiedSessionStore);
    
    if (!currentState.audio.isRecording || !currentState.transport.sseClient) {
      return false;
    }

    try {
      const success = currentState.transport.sseClient.sendAudioChunk(audioData);
      
      if (success) {
        unifiedSessionStore.update((state) => ({
          ...state,
          audio: {
            ...state.audio,
            speechChunks: [...state.audio.speechChunks, audioData],
          },
        }));
      }
      
      return success;
    } catch (error) {
      logger.session.error("Failed to send audio chunk", { error });
      return false;
    }
  },

  // Utility Actions
  clearError(): void {
    unifiedSessionStore.update((state) => ({
      ...state,
      error: null,
    }));
  },

  resetSession(): void {
    logger.session.info("Resetting unified session store");
    unifiedSessionStore.set(initialState);
  },

  // Get current state snapshot
  getState(): UnifiedSessionState {
    return get(unifiedSessionStore);
  },
};

// Initialize route tracking if in browser
if (browser) {
  // Subscribe to page store for route changes
  page.subscribe(($page) => {
    if ($page && $page.url) {
      unifiedSessionActions.setRoute($page.url.pathname);
    }
  });
}

// Export main store as default
export { unifiedSessionStore as default };