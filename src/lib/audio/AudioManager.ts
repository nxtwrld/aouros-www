import { EventEmitter } from 'eventemitter3';
import { AudioState, getAudioVAD, type AudioControlsVad } from './microphone';
import { logger } from '$lib/logging/logger';
import ui from '$lib/ui';

/**
 * Singleton AudioManager for centralized audio processing
 * Handles microphone access, VAD processing, and audio chunk generation
 * Only one instance can exist at a time to prevent multiple microphone access
 */
export class AudioManager extends EventEmitter {
  private static instance: AudioManager | null = null;
  private audio: AudioControlsVad | null = null;
  private isInitialized = false;
  private isRecording = false;
  private currentState: AudioState = AudioState.Ready;

  private constructor() {
    super();
    logger.audio.debug('AudioManager singleton created');
  }

  /**
   * Get the singleton instance
   * Throws error if trying to create multiple instances
   */
  public static getInstance(): AudioManager {
    if (AudioManager.instance === null) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Prevent multiple instances - throws error if instance already exists
   */
  public static createInstance(): AudioManager {
    if (AudioManager.instance !== null) {
      throw new Error('AudioManager instance already exists. Only one instance allowed per application.');
    }
    return AudioManager.getInstance();
  }

  /**
   * Initialize audio with microphone and VAD
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      logger.audio.warn('AudioManager already initialized');
      return true;
    }

    try {
      logger.audio.info('Initializing AudioManager with VAD...');
      
      // Request microphone access with VAD
      const audioResult = await getAudioVAD({
        analyzer: true,
      });

      if (audioResult instanceof Error) {
        logger.audio.error('Failed to initialize audio - returned Error:', {
          message: audioResult.message,
          stack: audioResult.stack,
        });
        throw audioResult;
      }

      this.audio = audioResult;
      this.isInitialized = true;
      this.currentState = AudioState.Ready;

      logger.audio.info('AudioManager initialized successfully', {
        hasStream: !!this.audio.stream,
        hasAudioContext: !!this.audio.audioContext,
      });

      // Set up audio event handlers
      this.setupAudioHandlers();

      this.emit('initialized');
      return true;
    } catch (error) {
      logger.audio.error('AudioManager initialization failed:', error);
      this.currentState = AudioState.Error;
      this.emit('error', `Audio initialization failed: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Set up audio event handlers for VAD and features
   */
  private setupAudioHandlers(): void {
    if (!this.audio) return;

    // Handle audio features for visual feedback
    this.audio.onFeatures = (features) => {
      if (features.energy && features.energy > 0.001) {
        // Emit to both internal event system and UI system for backward compatibility
        this.emit('features', features);
        ui.emit('audio:features', features);
      }
    };

    // Handle speech start detection
    this.audio.onSpeechStart = () => {
      logger.audio.info('Speech started - AudioManager');
      this.currentState = AudioState.Speaking;
      this.emit('speech-start');
      this.emit('state-change', this.currentState);
      ui.emit('audio:speech-start');
    };

    // Handle speech end and process audio chunks
    this.audio.onSpeechEnd = (audioData: Float32Array) => {
      // Calculate peak amplitude without spreading large array
      let peakAmplitude = 0;
      let sumSquares = 0;
      
      for (let i = 0; i < audioData.length; i++) {
        const absValue = Math.abs(audioData[i]);
        if (absValue > peakAmplitude) {
          peakAmplitude = absValue;
        }
        sumSquares += audioData[i] * audioData[i];
      }
      
      const chunkMetrics = {
        sampleCount: audioData.length,
        durationMs: Math.round((audioData.length / 16000) * 1000), // Assuming 16kHz sample rate
        peakAmplitude,
        rmsLevel: Math.sqrt(sumSquares / audioData.length),
        timestamp: Date.now(),
      };

      logger.audio.info('🎤 Speech ended - AudioManager', {
        chunkSize: audioData.length,
        duration: `${chunkMetrics.durationMs}ms`,
        peakAmplitude: chunkMetrics.peakAmplitude.toFixed(4),
        rmsLevel: chunkMetrics.rmsLevel.toFixed(4),
        dataRange: `[${audioData[0].toFixed(4)}...${audioData[audioData.length - 1].toFixed(4)}]`,
      });

      this.currentState = AudioState.Listening;
      
      // Emit the audio chunk for processing by session store
      this.emit('speech-end', audioData);
      this.emit('audio-chunk', audioData);
      this.emit('state-change', this.currentState);
      ui.emit('audio:speech-end', audioData);

      // Log chunk emission timing
      logger.audio.debug('📤 Audio chunk events emitted', {
        chunkId: `chunk_${chunkMetrics.timestamp}`,
        eventTypes: ['speech-end', 'audio-chunk', 'state-change'],
        totalSamples: audioData.length,
      });
    };
  }

  /**
   * Start audio recording
   */
  async start(): Promise<boolean> {
    if (!this.isInitialized || !this.audio) {
      logger.audio.error('AudioManager not initialized - cannot start recording');
      return false;
    }

    if (this.isRecording) {
      logger.audio.warn('AudioManager already recording');
      return true;
    }

    try {
      logger.audio.info('Starting AudioManager recording...');
      
      this.audio.start();
      this.isRecording = true;
      this.currentState = this.audio.state;

      this.emit('recording-started');
      this.emit('state-change', this.currentState);
      ui.emit('audio:recording-started');

      logger.audio.info('AudioManager recording started successfully');
      return true;
    } catch (error) {
      logger.audio.error('Failed to start AudioManager recording:', error);
      this.emit('error', `Failed to start recording: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Stop audio recording and cleanup resources
   */
  async stop(): Promise<void> {
    logger.audio.info('Stopping AudioManager...');

    if (this.audio) {
      try {
        // Set stopping state
        this.currentState = AudioState.Stopping;
        this.emit('state-change', this.currentState);

        logger.audio.info('Stopping audio processor...', {
          hasStream: !!this.audio.stream,
          streamId: this.audio.stream?.id,
          trackCount: this.audio.stream?.getTracks().length || 0,
        });

        // Stop the audio processor (handles VAD and MediaStream cleanup)
        this.audio.stop();
        logger.audio.info('Audio processor stopped successfully');
      } catch (error) {
        logger.audio.error('Error stopping audio processor:', error);
      }
    }

    // Reset state
    this.audio = null;
    this.isInitialized = false;
    this.isRecording = false;
    this.currentState = AudioState.Ready;

    this.emit('recording-stopped');
    this.emit('state-change', this.currentState);
    ui.emit('audio:recording-stopped');

    logger.audio.info('AudioManager stopped and cleaned up');
  }

  /**
   * Get current audio state
   */
  getState(): AudioState {
    return this.currentState;
  }

  /**
   * Check if currently recording
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Check if initialized
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current audio stream (for debugging)
   */
  getAudioStream(): MediaStream | null {
    return this.audio?.stream || null;
  }

  /**
   * Clean up and reset singleton instance
   * Should only be used in testing or complete application shutdown
   */
  static destroyInstance(): void {
    if (AudioManager.instance) {
      AudioManager.instance.stop();
      AudioManager.instance.removeAllListeners();
      AudioManager.instance = null;
      logger.audio.debug('AudioManager singleton destroyed');
    }
  }
}

// Export singleton instance for direct import
export const audioManager = AudioManager.getInstance();

// Export type for external use
export type { AudioManager as AudioManagerType };