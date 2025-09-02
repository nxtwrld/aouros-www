import { writable, derived, get } from "svelte/store";
import type { Writable, Readable } from "svelte/store";
import { browser } from "$app/environment";
import { page } from "$app/stores";
import { logger } from "$lib/logging/logger";
import ui from "$lib/ui";
import { AudioState } from "$lib/audio/microphone";
import { audioManager } from "$lib/audio/AudioManager";
import { audioActions } from "./audio-actions";
import type {
  SessionAnalysis,
  MoEAnalysisOutput,
  ExpertContext,
} from "../index";
// Types extracted from legacy analysis-store (now removed)
interface AnalysisState {
  currentSession: SessionAnalysis | null;
  isLoading: boolean;
  lastUpdated: number | null;
  userActions: any[];
  error: string | null;
}

interface PathState {
  trigger: {
    type: "link" | "node";
    id: string;
    item: any; // SankeyLink or SankeyNode
  } | null;
  path: {
    nodes: string[];
    links: string[];
  };
}
import { SSEClient } from "../transport/sse-client";
import type { PartialTranscript } from "../transport/sse-client";

// Re-export AudioState from microphone.ts as single source of truth
export { AudioState } from "$lib/audio/microphone";

// Session state enum - controls AudioButton behavior and visibility
export enum SessionState {
  Ready = "ready", // Default state - button centered, clean slate, ready to record
  Running = "running", // Recording active - button in header, collecting data
  Paused = "paused", // Recording stopped - button in header, has data (future feature)
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
    audioButtonVisible: true,
    audioButtonPosition: "center",
    sessionState: SessionState.Ready,
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
export const unifiedSessionStore: Writable<UnifiedSessionState> =
  writable(initialState);

// Derived stores for easy access to specific parts
export const audioState: Readable<UnifiedSessionState["audio"]> = derived(
  unifiedSessionStore,
  ($store) => $store.audio,
);

export const transcriptState: Readable<UnifiedSessionState["transcripts"]> =
  derived(unifiedSessionStore, ($store) => $store.transcripts);

export const analysisState: Readable<UnifiedSessionState["analysis"]> = derived(
  unifiedSessionStore,
  ($store) => $store.analysis,
);

export const uiState: Readable<UnifiedSessionState["ui"]> = derived(
  unifiedSessionStore,
  ($store) => $store.ui,
);

export const transportState: Readable<UnifiedSessionState["transport"]> =
  derived(unifiedSessionStore, ($store) => $store.transport);

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
  ($state) => true, // Button always visible in simplified state model
);

// Derive properties FROM session state (not the other way around)
export const isRecordingFromState: Readable<boolean> = derived(
  sessionState,
  ($state) => $state === SessionState.Running,
);

export const hasSessionDataFromState: Readable<boolean> = derived(
  sessionState,
  ($state) => $state === SessionState.Paused,
);

export const buttonPositionFromState: Readable<AudioButtonPosition> = derived(
  sessionState,
  ($state) => {
    switch ($state) {
      case SessionState.Ready:
        return "center";
      case SessionState.Running:
      case SessionState.Paused:
        return "header";
      default:
        return "center";
    }
  },
);

export const showAudioButtonFromState: Readable<boolean> = derived(
  sessionState,
  ($state) => true, // Button always visible in simplified state model
);

// Actions for managing unified session state
export const unifiedSessionActions = {
  // Session State Transitions

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
  async transitionToPaused(): Promise<void> {
    logger.session.info("Transitioning to Paused state");
    unifiedSessionStore.update((state) => ({
      ...state,
      ui: {
        ...state.ui,
        sessionState: SessionState.Paused,
        audioButtonVisible: true,
        audioButtonPosition: "header",
      },
      audio: {
        ...state.audio,
        isRecording: false,
        state: AudioState.Ready,
      },
      lastUpdated: Date.now(),
    }));
    
    // Allow UI time to react to state change
    await new Promise(resolve => setTimeout(resolve, 100));
  },
  async stopSessionAndReset(): Promise<void> {
    logger.session.info("Stopping session and resetting to Ready state");
    
    // Stop AudioManager first to ensure proper cleanup
    await audioManager.stop();
    
    // Reset to clean Ready state
    await this.resetSession();
  },


  // Load existing session data (for mock data or resuming)
  loadSessionWithData(sessionData: any): void {
    logger.session.info(
      "Loading session with existing data - transitioning to Paused",
    );
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
  // Complete Session Lifecycle Methods
  async startRecordingSession(
    options: {
      language?: string;
      models?: string[];
      useRealtime?: boolean;
    } = {}
  ): Promise<boolean> {
    const { language = "en", models = ["GP"], useRealtime = true } = options;
    
    logger.session.info("Starting recording session", { language, models, useRealtime });

    const currentState = get(unifiedSessionStore);
    const { sessionState } = currentState.ui;

    // Only allow starting from Ready or Paused states
    if (sessionState !== SessionState.Ready && sessionState !== SessionState.Paused) {
      logger.session.warn("Cannot start recording session from current state", { sessionState });
      return false;
    }

    try {
      // Initialize AudioManager if needed (this must be done in user interaction context)
      if (!audioManager.getIsInitialized()) {
        logger.audio.debug('Initializing AudioManager for recording session...');
        const initialized = await audioManager.initialize();
        
        if (!initialized) {
          throw new Error('Failed to initialize AudioManager');
        }
      }
      
      logger.audio.info('AudioManager ready for session', {
        hasStream: !!audioManager.getAudioStream(),
        streamId: audioManager.getAudioStream()?.id,
        trackCount: audioManager.getAudioStream()?.getTracks().length || 0
      });
      
      // Set up AudioManager event handlers for this session
      const handleAudioChunk = (audioData: Float32Array) => {
        unifiedSessionActions.sendAudioChunk(audioData);
      };
      
      const handleStateChange = (state: AudioState) => {
        unifiedSessionStore.update((storeState) => ({
          ...storeState,
          audio: {
            ...storeState.audio,
            state: state,
          },
          lastUpdated: Date.now(),
        }));
      };
      
      // Subscribe to AudioManager events
      audioManager.on('audio-chunk', handleAudioChunk);
      audioManager.on('state-change', handleStateChange);
      
      // Transition to Running state first
      unifiedSessionActions.transitionToRunning();
      
      // Start recording with AudioManager (this is also async)
      const success = await audioManager.start();
      
      if (!success) {
        // Clean up event listeners and rollback on failure
        audioManager.off('audio-chunk', handleAudioChunk);
        audioManager.off('state-change', handleStateChange);
        await unifiedSessionActions.resetSession();
        logger.session.error('Failed to start AudioManager recording');
        return false;
      }
      
      logger.session.info('Recording session started successfully with AudioManager');
      return true;
      
    } catch (error) {
      logger.session.error('Error starting recording session:', error);
      
      // Reset to Ready state on error
      await unifiedSessionActions.resetSession();
      
      unifiedSessionStore.update(state => ({
        ...state,
        error: `Failed to start recording: ${error instanceof Error ? error.message : String(error)}`,
        lastUpdated: Date.now()
      }));
      
      return false;
    }
  },

  // Legacy method - kept for compatibility but simplified
  async startSessionWithAudio(
    audioInstance: any,
    options: {
      language?: string;
      models?: string[];
      useRealtime?: boolean;
    } = {}
  ): Promise<boolean> {
    // Delegate to new method
    return await unifiedSessionActions.startRecordingSession(options);
  },

  async stopSessionComplete(): Promise<void> {
    logger.session.info("Stopping complete session");
    
    const currentState = get(unifiedSessionStore);
    const { sessionState } = currentState.ui;

    // Only allow stopping from Running state
    if (sessionState !== SessionState.Running) {
      logger.session.warn("Cannot stop session - not in Running state", { sessionState });
      return;
    }

    // Check if we have data to determine next state
    const hasData =
      currentState.transcripts.items.length > 0 ||
      currentState.analysis.currentSession !== null ||
      currentState.audio.speechChunks.length > 0;

    // Transition to appropriate state based on data presence
    if (hasData) {
      unifiedSessionActions.transitionToPaused();
    } else {
      // No data collected, go back to Ready
      unifiedSessionStore.update(state => ({
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
      }));
    }

    logger.session.info("Complete session stopped successfully", {
      nextState: hasData ? "Paused" : "Ready"
    });
  },

  // Legacy Audio Recording Actions (keep for compatibility)
  async startRecording(useRealtime: boolean = true): Promise<boolean> {
    logger.session.info("Starting audio recording", { useRealtime });

    const currentState = get(unifiedSessionStore);
    const { sessionState } = currentState.ui;

    // Only allow starting from Ready or Paused states
    if (
      sessionState !== SessionState.Ready &&
      sessionState !== SessionState.Paused
    ) {
      logger.session.warn("Cannot start recording from current state", {
        sessionState,
      });
      return false;
    }

    try {
      // Use the new session recording method for consistency
      return await unifiedSessionActions.startRecordingSession({
        useRealtime
      });
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

    logger.session.info("Stopping audio recording", {
      sessionId,
      sessionState,
    });

    // Only allow stopping from Running state
    if (sessionState !== SessionState.Running) {
      logger.session.warn("Cannot stop recording - not in Running state", {
        sessionState,
      });
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

    // Stop AudioManager
    await audioManager.stop();

    // Disconnect SSE
    await unifiedSessionActions.disconnectSSE();

    // Check if we have data to determine next state
    const hasData =
      currentState.transcripts.items.length > 0 ||
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

    // Clean up audio resources - AudioManager handles MediaStream and AudioContext cleanup
    unifiedSessionStore.update((state) => ({
      ...state,
      audio: {
        ...state.audio,
        isRecording: false,
        state: hasData ? AudioState.Ready : AudioState.Ready,
        sessionId: null,
        recordingStartTime: null,
        speechChunks: [], // Clear speech chunks
      },
      lastUpdated: Date.now(),
    }));

    logger.session.info("Audio recording stopped", {
      sessionId,
      nextState: hasData ? "Paused" : "Ready",
    });
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
    const isNewSessionPage =
      route.includes("/session") && !route.includes("/session/");
    const currentState = get(unifiedSessionStore);
    const { sessionState } = currentState.ui;

    // No route-based state changes needed - session is always Ready by default
    // Page navigation doesn't affect session state in simplified model

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
      const success =
        currentState.transport.sseClient.sendAudioChunk(audioData);

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

  async resetSession(): Promise<void> {
    logger.session.info("Resetting unified session store");
    unifiedSessionStore.set(initialState);
    
    // Allow store reset to propagate
    await new Promise(resolve => setTimeout(resolve, 50));
  },

  // Get current state snapshot
  getState(): UnifiedSessionState {
    return get(unifiedSessionStore);
  },

  // Session data gathering methods for document storage
  getCurrentSessionData(): SessionAnalysis | null {
    const state = get(unifiedSessionStore);
    return state.analysis.currentSession;
  },

  getCurrentTranscriptData(): any[] {
    const state = get(unifiedSessionStore);
    return state.transcripts.items.map(item => ({
      id: item.id,
      text: item.text,
      confidence: item.confidence,
      timestamp: item.timestamp,
      is_final: item.is_final,
      speaker: item.speaker || 'unknown'
    }));
  },

  getSessionMetadata(): {
    sessionId: string | null;
    duration: number;
    recordingStartTime: number | null;
    hasData: boolean;
  } {
    const state = get(unifiedSessionStore);
    const duration = state.audio.recordingStartTime 
      ? Date.now() - state.audio.recordingStartTime 
      : 0;
    const hasData = state.transcripts.items.length > 0 || 
                    state.analysis.currentSession !== null;
    
    return {
      sessionId: state.audio.sessionId,
      duration,
      recordingStartTime: state.audio.recordingStartTime,
      hasData
    };
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
