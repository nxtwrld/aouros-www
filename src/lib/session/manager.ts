import { v4 as uuidv4 } from "uuid";
import EventEmitter from "eventemitter3";
import { logger } from "$lib/logging/logger";
import { sessionContextService } from "$lib/context/integration/session-context";
import type { SessionContextResult } from "$lib/context/integration/session-context";

// Enhanced session data interface with ChatGPT thread support and context assembly
export interface SessionData {
  userId: string;
  language: string;
  models: string[];
  translate?: boolean; // Whether to translate transcriptions to English
  startTime: string;
  status: "active" | "paused" | "completed";
  profileId?: string; // Add profile ID for context assembly

  // ChatGPT Thread Management
  openaiThreadId?: string; // Persistent ChatGPT conversation thread
  conversationHistory: Message[]; // Local backup of conversation

  // Context Assembly Integration
  contextResult?: SessionContextResult;
  contextLastUpdated?: number;
  availableTools?: string[];

  // Incremental Analysis State
  analysisState: {
    lastProcessedTranscriptIndex: number;
    lastAnalysisTime: number;
    currentDiagnosis: any[];
    currentTreatment: any[];
    currentMedication: any[];
    currentFollowUp: any[];
    analysisInProgress: boolean;
    // Add context-aware analysis flags
    contextAvailable: boolean;
    lastContextUpdate: number;
  };

  // Real-time Data
  transcripts?: PartialTranscript[];
  realtimeUpdates: SSEUpdate[];

  // Analysis results - add missing property
  analysis?: any;
}

// Message structure for conversation history
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  metadata?: any;
}

// Real-time transcript interface
export interface PartialTranscript {
  id: string;
  text: string;
  confidence: number;
  timestamp: number;
  is_final: boolean;
  speaker?: string;
  sequenceNumber?: number;
  sessionId?: string;
}

// SSE update types
export interface SSEUpdate {
  type:
    | "partial_transcript"
    | "analysis_update"
    | "session_status"
    | "ai_thinking"
    | "error";
  data: any;
  timestamp: number;
}

// In-memory session store (in production, use Redis or database)
const sessions = new Map<string, SessionData>();
const sessionEmitters = new Map<string, EventEmitter>();

export function generateSessionId(): string {
  return uuidv4();
}

export async function createSession(
  sessionId: string,
  sessionData: Partial<SessionData>,
): Promise<void> {
  const defaultAnalysisState = {
    lastProcessedTranscriptIndex: 0,
    lastAnalysisTime: 0,
    currentDiagnosis: [],
    currentTreatment: [],
    currentMedication: [],
    currentFollowUp: [],
    analysisInProgress: false,
    contextAvailable: false,
    lastContextUpdate: 0,
  };

  const fullSessionData: SessionData = {
    transcripts: [],
    realtimeUpdates: [],
    conversationHistory: [],
    analysisState: defaultAnalysisState,
    ...sessionData,
  } as SessionData;

  sessions.set(sessionId, fullSessionData);

  // Create event emitter for this session
  sessionEmitters.set(sessionId, new EventEmitter());

  // Initialize context if profile ID is provided
  if (fullSessionData.profileId) {
    try {
      const contextResult =
        await sessionContextService.initializeSessionContext(
          sessionId,
          fullSessionData,
          {
            profileId: fullSessionData.profileId,
            includeRecentTranscripts: true,
            maxContextTokens: 2000,
            contextThreshold: 0.6,
          },
        );

      fullSessionData.contextResult = contextResult;
      fullSessionData.contextLastUpdated = Date.now();
      fullSessionData.availableTools = contextResult.availableTools;
      fullSessionData.analysisState.contextAvailable =
        contextResult.documentCount > 0;

      sessions.set(sessionId, fullSessionData);

      logger.session.info("Session context initialized", {
        sessionId,
        profileId: fullSessionData.profileId,
        documentCount: contextResult.documentCount,
        confidence: contextResult.confidence,
      });
    } catch (error) {
      logger.session.warn("Failed to initialize session context", {
        sessionId,
        profileId: fullSessionData.profileId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.session.info(
    `Session ${sessionId} created for user ${sessionData.userId}`,
    {
      hasOpenAIThread: !!sessionData.openaiThreadId,
      models: sessionData.models,
      language: sessionData.language,
    },
  );
}

export function getSession(sessionId: string): SessionData | undefined {
  return sessions.get(sessionId);
}

export function updateSession(
  sessionId: string,
  updates: Partial<SessionData>,
): void {
  const session = sessions.get(sessionId);
  if (session) {
    sessions.set(sessionId, { ...session, ...updates });

    // Emit session update event
    const emitter = sessionEmitters.get(sessionId);
    if (emitter) {
      emitter.emit("session_updated", { sessionId, updates });
    }
  }
}

export async function addTranscript(
  sessionId: string,
  transcript: PartialTranscript,
): Promise<void> {
  const session = sessions.get(sessionId);
  if (session) {
    if (!session.transcripts) session.transcripts = [];
    session.transcripts.push(transcript);

    // Add to conversation history
    const message: Message = {
      id: transcript.id,
      role: "user",
      content: transcript.text,
      timestamp: transcript.timestamp,
      metadata: {
        confidence: transcript.confidence,
        is_final: transcript.is_final,
        speaker: transcript.speaker,
      },
    };
    session.conversationHistory.push(message);

    // Update context if transcript is final and profile ID is available
    if (
      transcript.is_final &&
      session.profileId &&
      session.transcripts.length % 3 === 0
    ) {
      try {
        const newTranscripts = session.transcripts
          .slice(-3) // Last 3 transcripts
          .map((t) => t.text);

        const updatedContext = await sessionContextService.updateSessionContext(
          sessionId,
          session,
          newTranscripts,
          {
            profileId: session.profileId,
            maxContextTokens: 2000,
            contextThreshold: 0.7,
          },
        );

        session.contextResult = updatedContext;
        session.contextLastUpdated = Date.now();
        session.analysisState.lastContextUpdate = Date.now();
        session.analysisState.contextAvailable =
          updatedContext.documentCount > 0;

        logger.session.debug("Session context updated with new transcript", {
          sessionId,
          documentCount: updatedContext.documentCount,
          confidence: updatedContext.confidence,
        });
      } catch (error) {
        logger.session.warn("Failed to update session context", {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Emit transcript event for SSE
    const emitter = sessionEmitters.get(sessionId);
    if (emitter) {
      emitter.emit("transcript_added", { sessionId, transcript });

      // Emit SSE update
      const sseUpdate: SSEUpdate = {
        type: "partial_transcript",
        data: transcript,
        timestamp: Date.now(),
      };
      session.realtimeUpdates.push(sseUpdate);
      emitter.emit("sse_update", sseUpdate);
    }

    logger.session.debug(`Transcript added to session ${sessionId}`, {
      text: transcript.text.substring(0, 50) + "...",
      confidence: transcript.confidence,
      is_final: transcript.is_final,
    });
  }
}

export function updateAnalysis(sessionId: string, analysis: any): void {
  logger.analysis.debug("Analysis update called", { sessionId, analysis });

  const session = sessions.get(sessionId);
  if (!session) {
    logger.analysis.error("No session found in updateAnalysis", { sessionId });
    return;
  }

  logger.analysis.debug("Current analysis state before update", {
    currentDiagnosis: session.analysisState.currentDiagnosis.length,
    currentTreatment: session.analysisState.currentTreatment.length,
    currentMedication: session.analysisState.currentMedication.length,
    currentFollowUp: session.analysisState.currentFollowUp.length,
  });

  logger.analysis.debug("New analysis data structure", {
    hasDiagnosis: !!analysis.diagnosis,
    diagnosisLength: analysis.diagnosis?.length || 0,
    diagnosisType: typeof analysis.diagnosis,
    hasTreatment: !!analysis.treatment,
    treatmentLength: analysis.treatment?.length || 0,
    hasOtherFields: Object.keys(analysis).filter(
      (k) => !["diagnosis", "treatment", "medication", "followUp"].includes(k),
    ),
  });

  // Merge with existing analysis state
  if (analysis.diagnosis) {
    logger.analysis.debug("Merging diagnosis data", {
      diagnosis: analysis.diagnosis,
    });
    session.analysisState.currentDiagnosis = mergeAnalysisArray(
      session.analysisState.currentDiagnosis,
      analysis.diagnosis,
    );
  }
  if (analysis.treatment) {
    logger.analysis.debug("Merging treatment data", {
      treatment: analysis.treatment,
    });
    session.analysisState.currentTreatment = mergeAnalysisArray(
      session.analysisState.currentTreatment,
      analysis.treatment,
    );
  }
  if (analysis.medication) {
    logger.analysis.debug("Merging medication data", {
      medication: analysis.medication,
    });
    session.analysisState.currentMedication = mergeAnalysisArray(
      session.analysisState.currentMedication,
      analysis.medication,
    );
  }
  if (analysis.followUp) {
    logger.analysis.debug("Merging followUp data", {
      followUp: analysis.followUp,
    });
    session.analysisState.currentFollowUp = mergeAnalysisArray(
      session.analysisState.currentFollowUp,
      analysis.followUp,
    );
  }

  session.analysisState.lastAnalysisTime = Date.now();

  // Emit analysis event for SSE
  const emitter = sessionEmitters.get(sessionId);
  if (emitter) {
    logger.analysis.debug("Emitting analysis update via SSE");
    emitter.emit("analysis_updated", { sessionId, analysis });

    // Emit SSE update
    const sseUpdate: SSEUpdate = {
      type: "analysis_update",
      data: {
        diagnosis: session.analysisState.currentDiagnosis,
        treatment: session.analysisState.currentTreatment,
        medication: session.analysisState.currentMedication,
        followUp: session.analysisState.currentFollowUp,
        incremental: analysis,
      },
      timestamp: Date.now(),
    };

    logger.analysis.debug("SSE update data being sent", { sseUpdate });
    session.realtimeUpdates.push(sseUpdate);
    emitter.emit("sse_update", sseUpdate);
    logger.analysis.info("SSE update emitted successfully");
  } else {
    logger.analysis.error("No emitter found for session", { sessionId });
  }

  logger.analysis.info(`Analysis updated for session ${sessionId}`, {
    diagnosisCount: session.analysisState.currentDiagnosis.length,
    treatmentCount: session.analysisState.currentTreatment.length,
    medicationCount: session.analysisState.currentMedication.length,
    followUpCount: session.analysisState.currentFollowUp.length,
  });
}

// Helper function to merge analysis arrays intelligently
function mergeAnalysisArray(existing: any[], newItems: any[]): any[] {
  if (!newItems || newItems.length === 0) return existing;

  const merged = [...existing];

  newItems.forEach((newItem) => {
    // Find existing item by name or create new
    const existingIndex = merged.findIndex(
      (item) =>
        item.name === newItem.name || item.description === newItem.description,
    );

    if (existingIndex >= 0) {
      // Update existing item
      merged[existingIndex] = { ...merged[existingIndex], ...newItem };
    } else {
      // Add new item
      merged.push(newItem);
    }
  });

  return merged;
}

export function setAnalysisInProgress(
  sessionId: string,
  inProgress: boolean,
): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.analysisState.analysisInProgress = inProgress;

    // Emit AI thinking status
    const emitter = sessionEmitters.get(sessionId);
    if (emitter) {
      const sseUpdate: SSEUpdate = {
        type: "ai_thinking",
        data: { thinking: inProgress },
        timestamp: Date.now(),
      };
      session.realtimeUpdates.push(sseUpdate);
      emitter.emit("sse_update", sseUpdate);
    }
  }
}

export function getSessionEmitter(sessionId: string): EventEmitter | undefined {
  return sessionEmitters.get(sessionId);
}

export function deleteSession(sessionId: string): void {
  // Clear session context cache
  sessionContextService.clearSessionContext(sessionId);

  sessions.delete(sessionId);
  const emitter = sessionEmitters.get(sessionId);
  if (emitter) {
    emitter.removeAllListeners();
    sessionEmitters.delete(sessionId);
  }
  logger.session.info(`Session ${sessionId} deleted`);
}

// Get new SSE updates since a given timestamp
export function getSSEUpdatesSince(
  sessionId: string,
  since: number,
): SSEUpdate[] {
  const session = sessions.get(sessionId);
  if (!session) return [];

  return session.realtimeUpdates.filter((update) => update.timestamp > since);
}

// Cleanup inactive sessions (run periodically)
export function cleanupInactiveSessions(maxAgeHours: number = 24): void {
  const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000;

  for (const [sessionId, session] of sessions.entries()) {
    const sessionTime = new Date(session.startTime).getTime();
    if (sessionTime < cutoffTime) {
      deleteSession(sessionId);
    }
  }
}

/**
 * Get context for session analysis with medical history
 */
export async function getSessionAnalysisContext(
  sessionId: string,
  analysisType: "diagnosis" | "treatment" | "medication" | "followup",
): Promise<{
  medicalHistory: any[];
  relevantDocuments: any[];
  contextSummary: string;
} | null> {
  const session = sessions.get(sessionId);
  if (!session) return null;

  return await sessionContextService.getContextForAnalysis(
    sessionId,
    analysisType,
    session,
  );
}

/**
 * Get session context result
 */
export function getSessionContext(
  sessionId: string,
): SessionContextResult | null {
  const session = sessions.get(sessionId);
  return session?.contextResult || null;
}

// Session statistics
export function getSessionStats(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  return {
    sessionId,
    userId: session.userId,
    startTime: session.startTime,
    status: session.status,
    transcriptCount: session.transcripts?.length || 0,
    messageCount: session.conversationHistory.length,
    analysisState: session.analysisState,
    hasOpenAIThread: !!session.openaiThreadId,
    lastUpdate: Math.max(...session.realtimeUpdates.map((u) => u.timestamp), 0),
    // Add context statistics
    contextAvailable: session.analysisState.contextAvailable,
    documentCount: session.contextResult?.documentCount || 0,
    contextConfidence: session.contextResult?.confidence || 0,
    contextLastUpdated: session.contextLastUpdated,
    availableTools: session.availableTools || [],
  };
}
