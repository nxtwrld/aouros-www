import type { SessionAnalysis } from "$components/session/types/visualization";
import { analysisActions } from "./stores/analysis-store";
import { globalAnalysisManager } from "./analysis-manager";
import { getSessionEmitter, type SessionData, type SSEUpdate } from "./manager";
import { logger } from "$lib/logging/logger";

/**
 * Simple bridge between session manager EventEmitter and analysis store
 * Leverages Svelte's built-in reactivity instead of custom subscription logic
 */

let currentSessionId: string | null = null;

/**
 * Transform analysis data from session manager format to SessionAnalysis format
 */
function transformAnalysisData(analysisData: any, sessionId: string): SessionAnalysis | null {
    if (!analysisData) return null;

    try {
        // If the data is already in SessionAnalysis format, return as-is
        if (analysisData.sessionId && analysisData.nodes) {
            return analysisData as SessionAnalysis;
        }

        // Transform from session manager format to visualization format
        const transformed: SessionAnalysis = {
            sessionId: sessionId,
            timestamp: new Date().toISOString(),
            analysisVersion: analysisData.version || 1,
            nodes: {
                symptoms: analysisData.currentSymptoms || analysisData.symptoms || [],
                diagnoses: analysisData.currentDiagnosis || analysisData.diagnosis || [],
                treatments: analysisData.currentTreatment || analysisData.treatment || [],
                actions: analysisData.currentActions || analysisData.actions || []
            },
            userActions: analysisData.userActions || []
        };

        return transformed;
    } catch (error) {
        logger.session.error("Failed to transform analysis data", { 
            sessionId,
            error: error instanceof Error ? error.message : String(error)
        });
        return null;
    }
}

/**
 * Handle analysis update events from session manager
 */
function handleAnalysisUpdate(event: { sessionId: string; analysis: any }): void {
    logger.session.debug("Received analysis update", { 
        sessionId: event.sessionId,
        hasAnalysis: !!event.analysis 
    });

    const sessionAnalysis = transformAnalysisData(event.analysis, event.sessionId);
    if (sessionAnalysis) {
        // Update the store - components will react automatically via $store syntax
        analysisActions.updateSession(sessionAnalysis);
        
        // Update the global manager
        globalAnalysisManager.setSessionData(sessionAnalysis);
        
        logger.session.info("Analysis data updated successfully", { 
            sessionId: event.sessionId 
        });
    }
}

/**
 * Handle SSE update events
 */
function handleSSEUpdate(sseUpdate: SSEUpdate): void {
    logger.session.debug("Received SSE update", { 
        type: sseUpdate.type,
        timestamp: sseUpdate.timestamp 
    });

    switch (sseUpdate.type) {
        case 'analysis_update':
            // Handle incremental analysis updates
            if (currentSessionId && sseUpdate.data) {
                const sessionAnalysis = transformAnalysisData(sseUpdate.data, currentSessionId);
                if (sessionAnalysis) {
                    analysisActions.updatePartial(sessionAnalysis);
                    globalAnalysisManager.setSessionData(sessionAnalysis);
                }
            }
            break;
            
        case 'ai_thinking':
            // Update loading state - components will react automatically
            analysisActions.setLoading(sseUpdate.data.thinking);
            break;
            
        case 'error':
            // Handle error updates - components will react automatically
            analysisActions.setError(sseUpdate.data.message || 'Unknown error occurred');
            break;
            
        default:
            logger.session.debug("Unhandled SSE update type", { type: sseUpdate.type });
    }
}

/**
 * Handle session update events
 */
function handleSessionUpdate(event: { sessionId: string; updates: Partial<SessionData> }): void {
    logger.session.debug("Received session update", { 
        sessionId: event.sessionId,
        updates: Object.keys(event.updates) 
    });

    // Handle specific session updates that might affect analysis
    if (event.updates.analysis) {
        const sessionAnalysis = transformAnalysisData(event.updates.analysis, event.sessionId);
        if (sessionAnalysis) {
            analysisActions.updateSession(sessionAnalysis);
            globalAnalysisManager.setSessionData(sessionAnalysis);
        }
    }
}

/**
 * Connect session manager events to analysis store
 * Components will automatically react to store changes via Svelte's reactivity
 */
export function connectSessionToAnalysisStore(sessionId: string): void {
    logger.session.info("Connecting session to analysis store", { sessionId });

    // Disconnect from previous session if any
    if (currentSessionId) {
        disconnectSessionFromAnalysisStore(currentSessionId);
    }

    currentSessionId = sessionId;
    const emitter = getSessionEmitter(sessionId);

    if (!emitter) {
        logger.session.warn("No session emitter found for session", { sessionId });
        return;
    }

    // Simple event listeners that update the store
    // Svelte components will react automatically via $store syntax
    emitter.on('analysis_updated', handleAnalysisUpdate);
    emitter.on('sse_update', handleSSEUpdate);
    emitter.on('session_updated', handleSessionUpdate);

    logger.session.info("Successfully connected session to analysis store", { sessionId });
}

/**
 * Disconnect from current session and clean up
 */
export function disconnectSessionFromAnalysisStore(sessionId: string): void {
    logger.session.info("Disconnecting session from analysis store", { sessionId });

    const emitter = getSessionEmitter(sessionId);
    if (emitter) {
        emitter.removeListener('analysis_updated', handleAnalysisUpdate);
        emitter.removeListener('sse_update', handleSSEUpdate);
        emitter.removeListener('session_updated', handleSessionUpdate);
    }

    if (currentSessionId === sessionId) {
        currentSessionId = null;
        analysisActions.clearSession();
    }

    logger.session.info("Successfully disconnected session from analysis store", { sessionId });
}

/**
 * Initialize session analysis with optional initial data
 * Components can immediately start subscribing to stores
 */
export async function initializeSessionAnalysis(sessionId: string, initialData?: SessionAnalysis): Promise<void> {
    logger.session.info("Initializing session analysis", { sessionId });
    
    try {
        analysisActions.setLoading(true);

        if (initialData) {
            // Load initial data into store
            analysisActions.loadSession(initialData);
            globalAnalysisManager.setSessionData(initialData);
        } else {
            // Create minimal session structure
            const emptySession: SessionAnalysis = {
                sessionId,
                timestamp: new Date().toISOString(),
                analysisVersion: 1,
                nodes: {
                    symptoms: [],
                    diagnoses: [],
                    treatments: [],
                    actions: []
                },
                userActions: []
            };
            
            analysisActions.loadSession(emptySession);
            globalAnalysisManager.setSessionData(emptySession);
        }

        // Connect to real-time updates
        connectSessionToAnalysisStore(sessionId);

        logger.session.info("Session analysis initialized successfully", { sessionId });

    } catch (error) {
        logger.session.error("Failed to initialize session analysis", { 
            sessionId,
            error: error instanceof Error ? error.message : String(error)
        });
        
        analysisActions.setError("Failed to initialize analysis");
    } finally {
        analysisActions.setLoading(false);
    }
}

/**
 * Cleanup session analysis
 */
export function cleanupSessionAnalysis(): void {
    if (currentSessionId) {
        disconnectSessionFromAnalysisStore(currentSessionId);
    }
}

/**
 * Get current connection status
 */
export function getAnalysisConnectionStatus(): { isConnected: boolean; sessionId: string | null } {
    return {
        isConnected: currentSessionId !== null,
        sessionId: currentSessionId
    };
}

export default {
    connectSessionToAnalysisStore,
    disconnectSessionFromAnalysisStore,
    initializeSessionAnalysis,
    cleanupSessionAnalysis,
    getAnalysisConnectionStatus
};