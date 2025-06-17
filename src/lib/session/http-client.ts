import EventEmitter from 'eventemitter3';
import type { PartialTranscript } from './manager';
import { convertFloat32ToMp3 } from '$lib/audio/microphone';

export interface HttpSessionOptions {
    sessionId: string;
    onTranscript?: (transcript: PartialTranscript) => void;
    onAnalysis?: (analysis: any) => void;
    onError?: (error: any) => void;
    pollInterval?: number;
}

export class HttpSessionClient extends EventEmitter {
    private sessionId: string;
    private pollInterval: number;
    private isPolling = false;
    private pollTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(private options: HttpSessionOptions) {
        super();
        this.sessionId = options.sessionId;
        this.pollInterval = options.pollInterval || 2000; // Poll every 2 seconds
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
    }

    async startPolling(): Promise<boolean> {
        console.log('📡 Starting HTTP polling for session:', this.sessionId);
        
        if (this.isPolling) {
            console.log('⚠️ Already polling, skipping');
            return true;
        }

        this.isPolling = true;
        this.scheduleNextPoll();
        return true;
    }

    private scheduleNextPoll() {
        if (!this.isPolling) return;

        this.pollTimer = setTimeout(async () => {
            if (this.isPolling) {
                await this.pollForUpdates();
                this.scheduleNextPoll();
            }
        }, this.pollInterval);
    }

    private async pollForUpdates() {
        try {
            console.log('📡 Polling for session updates:', this.sessionId);
            
            const response = await fetch(`/v1/session/${this.sessionId}/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('📡 Poll response:', data);
                
                // Process any new transcripts
                if (data.transcripts && data.transcripts.length > 0) {
                    data.transcripts.forEach((transcript: PartialTranscript) => {
                        this.emit('partial_transcript', transcript);
                    });
                }

                // Process analysis updates
                if (data.analysis) {
                    this.emit('analysis_update', data.analysis);
                }
            } else {
                console.warn('📡 Poll request failed:', response.status);
            }
        } catch (error) {
            console.error('📡 Poll error:', error);
            this.emit('error', { message: 'Polling failed' });
        }
    }

    async sendAudioChunk(audioData: Float32Array): Promise<boolean> {
        console.log('📡 HTTP sendAudioChunk called', {
            dataLength: audioData.length,
            sessionId: this.sessionId
        });

        try {
            // Convert to MP3 for transmission
            const mp3Blob = await convertFloat32ToMp3(audioData, 16000);
            
            // Create form data
            const formData = new FormData();
            formData.append('audio', mp3Blob, 'chunk.mp3');
            formData.append('sessionId', this.sessionId);
            formData.append('timestamp', Date.now().toString());

            console.log('📡 Sending audio chunk via HTTP...');
            
            const response = await fetch(`/v1/session/${this.sessionId}/audio`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Audio chunk sent successfully via HTTP:', result);
                
                // Process immediate response
                if (result.transcript) {
                    this.emit('partial_transcript', result.transcript);
                }
                if (result.analysis) {
                    this.emit('analysis_update', result.analysis);
                }
                
                return true;
            } else {
                console.error('❌ Audio chunk upload failed:', response.status);
                this.emit('error', { message: 'Audio upload failed' });
                return false;
            }
        } catch (error) {
            console.error('❌ Audio chunk upload error:', error);
            this.emit('error', { message: 'Audio upload error' });
            return false;
        }
    }

    stopPolling() {
        console.log('🛑 Stopping HTTP polling');
        this.isPolling = false;
        
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }
    }

    disconnect() {
        this.stopPolling();
        this.removeAllListeners();
    }

    get isConnected(): boolean {
        return this.isPolling;
    }

    get connectionState(): string {
        return this.isPolling ? 'connected' : 'disconnected';
    }
} 