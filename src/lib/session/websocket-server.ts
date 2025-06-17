import { 
    getSession, 
    addTranscript, 
    updateAnalysis, 
    getSessionEmitter,
    type WebSocketMessage,
    type PartialTranscript 
} from './manager';
import { transcribeAudioChunk } from './realtime-transcription';
import { analyzeTranscriptionRealtime } from './realtime-analysis';
import { convertFloat32ToMp3 } from '$lib/audio/microphone';

// WebSocket connection map - using socket ID as key
const sessionConnections = new Map<string, any>();
const socketSessions = new Map<string, string>(); // socketId -> sessionId

export function handleWebSocketConnection(socket: any, sessionId: string) {
    console.log(`WebSocket connected for session: ${sessionId}`);
    
    // Store connection mappings
    sessionConnections.set(socket.id, socket);
    socketSessions.set(socket.id, sessionId);
    
    // Get session data
    const session = getSession(sessionId);
    if (!session) {
        socket.emit('session_error', {
            type: 'error',
            sessionId,
            data: { message: 'Session not found' },
            timestamp: Date.now()
        });
        return;
    }

    // Get session emitter for real-time updates
    const emitter = getSessionEmitter(sessionId);
    if (emitter) {
        // Listen for session events and broadcast to client
        emitter.on('transcript_added', (event) => {
            socket.emit('partial_transcript', {
                type: 'partial_transcript',
                sessionId,
                data: event.transcript,
                timestamp: Date.now()
            });
        });

        emitter.on('analysis_updated', (event) => {
            socket.emit('analysis_update', {
                type: 'analysis_update',
                sessionId,
                data: event.analysis,
                timestamp: Date.now()
            });
        });
    }

    // Handle incoming audio chunks
    socket.on('audio_chunk', async (data: any) => {
        await handleAudioChunk(sessionId, data);
    });

    // Handle session status requests
    socket.on('get_session_status', () => {
        socket.emit('session_status', {
            type: 'session_status',
            sessionId,
            data: { status: 'connected', session },
            timestamp: Date.now()
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`WebSocket disconnected for session: ${sessionId}`);
        sessionConnections.delete(socket.id);
        socketSessions.delete(socket.id);
        
        // Clean up emitter listeners
        if (emitter) {
            emitter.removeAllListeners();
        }
    });

    // Send initial session status
    socket.emit('session_status', {
        type: 'session_status',
        sessionId,
        data: { status: 'connected', session },
        timestamp: Date.now()
    });
}

async function handleAudioChunk(sessionId: string, audioData: any) {
    try {
        const session = getSession(sessionId);
        if (!session) return;

        // Convert audio data to Float32Array if needed
        let float32Data: Float32Array;
        if (audioData.type === 'float32' && audioData.data) {
            float32Data = new Float32Array(audioData.data);
        } else {
            console.warn('Unsupported audio format:', audioData.type);
            return;
        }

        // Convert to MP3 for transcription
        const mp3Blob = await convertFloat32ToMp3(float32Data, 16000);
        
        // Process transcription in real-time
        const transcript = await transcribeAudioChunk(mp3Blob, session.language);
        
        if (transcript) {
            // Add transcript to session
            const partialTranscript: PartialTranscript = {
                id: generateTranscriptId(),
                text: transcript.text,
                confidence: transcript.confidence || 0.8,
                timestamp: Date.now(),
                is_final: transcript.is_final || false,
                speaker: transcript.speaker
            };

            addTranscript(sessionId, partialTranscript);

            // If transcript is final, trigger analysis
            if (partialTranscript.is_final) {
                const fullText = session.transcripts
                    ?.filter(t => t.is_final)
                    .map(t => t.text)
                    .join(' ') || '';

                if (fullText.length > 50) { // Minimum text length for analysis
                    const analysis = await analyzeTranscriptionRealtime(
                        fullText, 
                        session.language, 
                        session.models
                    );
                    
                    if (analysis) {
                        updateAnalysis(sessionId, analysis);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error processing audio chunk:', error);
        broadcastToSession(sessionId, 'error', {
            message: 'Error processing audio'
        });
    }
}

function broadcastToSession(sessionId: string, event: string, data: any) {
    // Find all sockets connected to this session
    for (const [socketId, activeSessionId] of socketSessions.entries()) {
        if (activeSessionId === sessionId) {
            const socket = sessionConnections.get(socketId);
            if (socket) {
                socket.emit(event, {
                    type: event,
                    sessionId,
                    data,
                    timestamp: Date.now()
                });
            }
        }
    }
}

function generateTranscriptId(): string {
    return `transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function disconnectSession(sessionId: string) {
    // Find and disconnect all sockets for this session
    for (const [socketId, activeSessionId] of socketSessions.entries()) {
        if (activeSessionId === sessionId) {
            const socket = sessionConnections.get(socketId);
            if (socket) {
                socket.disconnect();
            }
            sessionConnections.delete(socketId);
            socketSessions.delete(socketId);
        }
    }
} 