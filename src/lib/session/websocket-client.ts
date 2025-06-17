import EventEmitter from 'eventemitter3';
import type { PartialTranscript } from './manager';

export interface SessionWebSocketOptions {
    sessionId: string;
    onTranscript?: (transcript: PartialTranscript) => void;
    onAnalysis?: (analysis: any) => void;
    onError?: (error: any) => void;
    onStatus?: (status: any) => void;
}

export class SessionWebSocketClient extends EventEmitter {
    private sessionId: string;
    private socket: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000; // Start with 1 second
    private isConnecting = false;

    constructor(private options: SessionWebSocketOptions) {
        super();
        this.sessionId = options.sessionId;
        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        if (this.options.onTranscript) {
            this.on('partial_transcript', this.options.onTranscript);
        }
        if (this.options.onAnalysis) {
            this.on('analysis_update', this.options.onAnalysis);
        }
        if (this.options.onError) {
            this.on('error', this.options.onError);
        }
        if (this.options.onStatus) {
            this.on('session_status', this.options.onStatus);
        }
    }

    async connect(): Promise<boolean> {
        console.log('🔌 WebSocket connect() called', {
            isConnecting: this.isConnecting,
            currentState: this.socket?.readyState,
            sessionId: this.sessionId
        });

        if (this.isConnecting || (this.socket && this.socket.readyState === WebSocket.OPEN)) {
            console.log('⚠️ Already connecting or connected, returning true');
            return true;
        }

        this.isConnecting = true;

        try {
            // For development, use a simple WebSocket connection
            // In production, this would connect to your WebSocket endpoint
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws/session/${this.sessionId}`;
            
            console.log('🔌 Creating WebSocket connection to:', wsUrl);
            this.socket = new WebSocket(wsUrl);

            return new Promise((resolve, reject) => {
                if (!this.socket) {
                    console.error('❌ Failed to create WebSocket instance');
                    reject(new Error('Failed to create WebSocket'));
                    return;
                }

                this.socket.onopen = () => {
                    console.log(`✅ WebSocket OPENED for session: ${this.sessionId}`);
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    this.reconnectDelay = 1000;
                    resolve(true);
                };

                this.socket.onmessage = (event) => {
                    console.log('📨 WebSocket message received:', event.data);
                    try {
                        const message = JSON.parse(event.data);
                        this.handleMessage(message);
                    } catch (error) {
                        console.error('❌ Error parsing WebSocket message:', error, event.data);
                        this.emit('error', { message: 'Invalid message format' });
                    }
                };

                this.socket.onclose = (event) => {
                    console.log(`🔌 WebSocket CLOSED for session: ${this.sessionId}`, {
                        code: event.code,
                        reason: event.reason,
                        wasClean: event.wasClean
                    });
                    this.isConnecting = false;
                    this.socket = null;
                    
                    // Attempt reconnection if not manually closed
                    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                        console.log('🔄 Scheduling reconnection...');
                        this.scheduleReconnect();
                    }
                };

                this.socket.onerror = (error) => {
                    console.error(`❌ WebSocket ERROR for session: ${this.sessionId}`, error);
                    this.isConnecting = false;
                    this.emit('error', { message: 'WebSocket connection error' });
                    reject(error);
                };

                // Set a connection timeout
                setTimeout(() => {
                    if (this.isConnecting) {
                        console.error('⏰ WebSocket connection timeout');
                        this.isConnecting = false;
                        reject(new Error('WebSocket connection timeout'));
                    }
                }, 5000);
            });

        } catch (error) {
            this.isConnecting = false;
            console.error('❌ Failed to create WebSocket:', error);
            return false;
        }
    }

    private handleMessage(message: any) {
        console.log('WebSocket message received:', message);
        
        switch (message.type) {
            case 'partial_transcript':
                this.emit('partial_transcript', message.data);
                break;
            case 'analysis_update':
                this.emit('analysis_update', message.data);
                break;
            case 'session_status':
                this.emit('session_status', message.data);
                break;
            case 'error':
                this.emit('error', message.data);
                break;
            default:
                console.warn('Unknown message type:', message.type);
        }
    }

    private scheduleReconnect() {
        this.reconnectAttempts++;
        console.log(`Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
        
        setTimeout(() => {
            if (this.reconnectAttempts <= this.maxReconnectAttempts) {
                this.connect().catch(console.error);
                this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000); // Exponential backoff, max 10s
            }
        }, this.reconnectDelay);
    }

    sendAudioChunk(audioData: Float32Array) {
        console.log('📡 sendAudioChunk called', {
            socketState: this.connectionState,
            dataLength: audioData.length,
            sessionId: this.sessionId
        });

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const message = {
                type: 'audio_chunk',
                sessionId: this.sessionId,
                data: {
                    type: 'float32',
                    data: Array.from(audioData) // Convert to regular array for JSON
                },
                timestamp: Date.now()
            };
            
            console.log('📡 Sending audio chunk message:', {
                type: message.type,
                sessionId: message.sessionId,
                dataLength: message.data.data.length,
                timestamp: message.timestamp
            });
            
            this.socket.send(JSON.stringify(message));
            console.log('✅ Audio chunk sent successfully');
        } else {
            console.warn('⚠️ Cannot send audio chunk - WebSocket not connected', {
                hasSocket: !!this.socket,
                socketState: this.socket?.readyState,
                connectionState: this.connectionState
            });
        }
    }

    getSessionStatus() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const message = {
                type: 'get_session_status',
                sessionId: this.sessionId,
                timestamp: Date.now()
            };
            
            this.socket.send(JSON.stringify(message));
        }
    }

    disconnect() {
        this.reconnectAttempts = this.maxReconnectAttempts + 1; // Prevent reconnection
        
        if (this.socket) {
            this.socket.close(1000, 'Client disconnecting');
            this.socket = null;
        }
        
        this.removeAllListeners();
    }

    get isConnected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN;
    }

    get connectionState(): string {
        if (!this.socket) return 'disconnected';
        
        switch (this.socket.readyState) {
            case WebSocket.CONNECTING: return 'connecting';
            case WebSocket.OPEN: return 'connected';
            case WebSocket.CLOSING: return 'closing';
            case WebSocket.CLOSED: return 'closed';
            default: return 'unknown';
        }
    }
} 