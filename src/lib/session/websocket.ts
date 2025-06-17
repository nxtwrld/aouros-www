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

// WebSocket connection map
const sessionConnections = new Map<string, WebSocket>();

export function handleWebSocketConnection(ws: WebSocket, sessionId: string) {
    console.log(`WebSocket connected for session: ${sessionId}`);
    
    // Store connection
    sessionConnections.set(sessionId, ws);
    
    // Get session data
    const session = getSession(sessionId);
    if (!session) {
        ws.send(JSON.stringify({
            type: 'error',
            sessionId,
            data: { message: 'Session not found' },
            timestamp: Date.now()
        }));
        ws.close();
        return;
    }

    // Get session emitter for real-time updates
    const emitter = getSessionEmitter(sessionId);
    if (emitter) {
        // Listen for session events and broadcast to client
        emitter.on('transcript_added', (event) => {
            broadcastToSession(sessionId, {
                type: 'partial_transcript',
                sessionId,
                data: event.transcript,
                timestamp: Date.now()
            });
        });

        emitter.on('analysis_updated', (event) => {
            broadcastToSession(sessionId, {
                type: 'analysis_update',
                sessionId,
                data: event.analysis,
                timestamp: Date.now()
            });
        });
    }

    // Handle incoming messages
    ws.addEventListener('message', async (event) => {
        try {
            const message: WebSocketMessage = JSON.parse(event.data.toString());
            await handleMessage(sessionId, message);
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                sessionId,
                data: { message: 'Invalid message format' },
                timestamp: Date.now()
            }));
        }
    });

    // Handle disconnection
    ws.addEventListener('close', () => {
        console.log(`WebSocket disconnected for session: ${sessionId}`);
        sessionConnections.delete(sessionId);
        
        // Clean up emitter listeners
        if (emitter) {
            emitter.removeAllListeners();
        }
    });

    // Send initial session status
    ws.send(JSON.stringify({
        type: 'session_status',
        sessionId,
        data: { status: 'connected', session },
        timestamp: Date.now()
    }));
}

async function handleMessage(sessionId: string, message: WebSocketMessage) {
    const session = getSession(sessionId);
    if (!session) return;

    switch (message.type) {
        case 'audio_chunk':
            await handleAudioChunk(sessionId, message.data);
            break;
        
        default:
            console.warn(`Unknown message type: ${message.type}`);
    }
}

async function handleAudioChunk(sessionId: string, audioData: any) {
    try {
        const session = getSession(sessionId);
        if (!session) return;

        // Convert audio data to Float32Array if needed
        let float32Data: Float32Array;
        if (audioData.type === 'float32') {
            float32Data = new Float32Array(audioData.data);
        } else {
            // Handle other formats as needed
            console.warn('Unsupported audio format');
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
        broadcastToSession(sessionId, {
            type: 'error',
            sessionId,
            data: { message: 'Error processing audio' },
            timestamp: Date.now()
        });
    }
}

function broadcastToSession(sessionId: string, message: WebSocketMessage) {
    const ws = sessionConnections.get(sessionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

function generateTranscriptId(): string {
    return `transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function disconnectSession(sessionId: string) {
    const ws = sessionConnections.get(sessionId);
    if (ws) {
        ws.close();
        sessionConnections.delete(sessionId);
    }
} 