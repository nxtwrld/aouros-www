import { logger } from "$lib/logging/logger";

/**
 * Microphone permission and device management utilities
 */

export interface MicrophonePermissions {
  granted: boolean;
  deviceId?: string;
  label?: string;
  error?: string;
}

export interface AudioConstraints {
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  deviceId?: string;
}

export const microphoneUtils = {
  /**
   * Request microphone permissions and get media stream
   */
  async requestMicrophoneAccess(constraints: AudioConstraints = {}): Promise<{
    stream: MediaStream | null;
    permissions: MicrophonePermissions;
  }> {
    logger.audio.debug("Requesting microphone access...", constraints);

    const audioConstraints: MediaStreamConstraints["audio"] = {
      sampleRate: constraints.sampleRate || 16000,
      channelCount: constraints.channelCount || 1,
      echoCancellation: constraints.echoCancellation !== false,
      noiseSuppression: constraints.noiseSuppression !== false,
      autoGainControl: constraints.autoGainControl !== false,
      ...(constraints.deviceId && { deviceId: constraints.deviceId }),
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });

      // Get device information
      const audioTrack = stream.getAudioTracks()[0];
      const settings = audioTrack.getSettings();

      logger.audio.info("Microphone access granted", {
        deviceId: settings.deviceId,
        label: audioTrack.label,
        sampleRate: settings.sampleRate,
        channelCount: settings.channelCount,
      });

      return {
        stream,
        permissions: {
          granted: true,
          deviceId: settings.deviceId,
          label: audioTrack.label,
        },
      };
    } catch (error) {
      logger.audio.error("Microphone access denied or failed:", error);

      return {
        stream: null,
        permissions: {
          granted: false,
          error: (error as Error).message,
        },
      };
    }
  },

  /**
   * Get available audio input devices
   */
  async getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === "audioinput");
    } catch (error) {
      logger.audio.error("Failed to enumerate audio devices:", error);
      return [];
    }
  },

  /**
   * Check if microphone is currently in use
   */
  async checkMicrophoneInUse(): Promise<boolean> {
    try {
      // Try to get microphone access temporarily
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 8000, // Low quality for quick check
          channelCount: 1,
        },
      });

      // Immediately stop the stream
      stream.getTracks().forEach((track) => track.stop());
      return false; // Not in use by another app
    } catch (error) {
      logger.audio.warn("Microphone may be in use:", (error as Error).message);
      return true; // Likely in use
    }
  },

  /**
   * Create optimized audio context for recording
   */
  async createOptimizedAudioContext(
    sampleRate: number = 16000,
  ): Promise<AudioContext | null> {
    try {
      const audioContext = new AudioContext({
        sampleRate,
        latencyHint: "interactive",
      });

      // Wait for context to be ready
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      logger.audio.debug("Audio context created", {
        sampleRate: audioContext.sampleRate,
        state: audioContext.state,
        baseLatency: audioContext.baseLatency,
      });

      return audioContext;
    } catch (error) {
      logger.audio.error("Failed to create audio context:", error);
      return null;
    }
  },

  /**
   * Stop media stream and clean up tracks
   */
  stopMediaStream(stream: MediaStream): void {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
        logger.audio.debug("Audio track stopped", {
          kind: track.kind,
          label: track.label,
          readyState: track.readyState,
        });
      });
    }
  },

  /**
   * Get microphone volume level
   */
  getMicrophoneLevel(
    stream: MediaStream,
    audioContext: AudioContext,
  ): Promise<number> {
    return new Promise((resolve) => {
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkLevel = () => {
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / bufferLength;
        const volume = average / 255;

        resolve(volume);

        // Clean up
        source.disconnect();
      };

      setTimeout(checkLevel, 100);
    });
  },
};

export default microphoneUtils;
