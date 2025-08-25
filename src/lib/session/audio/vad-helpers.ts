import { logger } from "$lib/logging/logger";
import type { AudioFeatures } from "./audio-processing";

/**
 * Voice Activity Detection (VAD) helpers and utilities
 */

export interface VADConfig {
  energyThreshold?: number;
  silenceThreshold?: number;
  speechThreshold?: number;
  minSpeechDuration?: number;
  maxSilenceDuration?: number;
  lookAheadFrames?: number;
  lookBackFrames?: number;
}

export interface VADState {
  isSpeaking: boolean;
  speechStartTime: number | null;
  speechEndTime: number | null;
  silenceStartTime: number | null;
  consecutiveSpeechFrames: number;
  consecutiveSilenceFrames: number;
  energyHistory: number[];
  volumeHistory: number[];
}

export interface VADDecision {
  isSpeaking: boolean;
  confidence: number;
  shouldStartCapture: boolean;
  shouldEndCapture: boolean;
  speechDuration: number;
  silenceDuration: number;
}

export class VADProcessor {
  private config: Required<VADConfig>;
  private state: VADState;
  private readonly frameSize: number = 160; // 10ms at 16kHz

  constructor(config: VADConfig = {}) {
    this.config = {
      energyThreshold: config.energyThreshold ?? 0.01,
      silenceThreshold: config.silenceThreshold ?? 0.005,
      speechThreshold: config.speechThreshold ?? 0.02,
      minSpeechDuration: config.minSpeechDuration ?? 300, // 300ms
      maxSilenceDuration: config.maxSilenceDuration ?? 1000, // 1000ms
      lookAheadFrames: config.lookAheadFrames ?? 3,
      lookBackFrames: config.lookBackFrames ?? 5,
    };

    this.state = this.initializeState();
  }

  private initializeState(): VADState {
    return {
      isSpeaking: false,
      speechStartTime: null,
      speechEndTime: null,
      silenceStartTime: null,
      consecutiveSpeechFrames: 0,
      consecutiveSilenceFrames: 0,
      energyHistory: [],
      volumeHistory: [],
    };
  }

  /**
   * Process audio frame and return VAD decision
   */
  processFrame(features: AudioFeatures): VADDecision {
    const now = Date.now();

    // Update history
    this.state.energyHistory.push(features.energy);
    this.state.volumeHistory.push(features.volume);

    // Keep history limited
    const maxHistoryLength =
      this.config.lookBackFrames + this.config.lookAheadFrames;
    if (this.state.energyHistory.length > maxHistoryLength) {
      this.state.energyHistory.shift();
      this.state.volumeHistory.shift();
    }

    // Determine if current frame contains speech
    const frameHasSpeech = this.detectSpeechInFrame(features);

    // Update consecutive frame counters
    if (frameHasSpeech) {
      this.state.consecutiveSpeechFrames++;
      this.state.consecutiveSilenceFrames = 0;
    } else {
      this.state.consecutiveSpeechFrames = 0;
      this.state.consecutiveSilenceFrames++;
    }

    // Previous state
    const wasSpeaking = this.state.isSpeaking;

    // Decision logic with hysteresis
    const shouldStartSpeaking = this.shouldStartSpeaking(frameHasSpeech, now);
    const shouldStopSpeaking = this.shouldStopSpeaking(frameHasSpeech, now);

    // Update speaking state
    if (!wasSpeaking && shouldStartSpeaking) {
      this.state.isSpeaking = true;
      this.state.speechStartTime = now;
      this.state.silenceStartTime = null;
      logger.audio.debug("VAD: Speech started");
    } else if (wasSpeaking && shouldStopSpeaking) {
      this.state.isSpeaking = false;
      this.state.speechEndTime = now;
      this.state.silenceStartTime = now;
      logger.audio.debug("VAD: Speech ended");
    }

    // Calculate durations
    const speechDuration =
      this.state.isSpeaking && this.state.speechStartTime
        ? now - this.state.speechStartTime
        : 0;
    const silenceDuration =
      !this.state.isSpeaking && this.state.silenceStartTime
        ? now - this.state.silenceStartTime
        : 0;

    // Calculate confidence
    const confidence = this.calculateConfidence(features);

    return {
      isSpeaking: this.state.isSpeaking,
      confidence,
      shouldStartCapture: !wasSpeaking && this.state.isSpeaking,
      shouldEndCapture: wasSpeaking && !this.state.isSpeaking,
      speechDuration,
      silenceDuration,
    };
  }

  /**
   * Detect if current frame contains speech
   */
  private detectSpeechInFrame(features: AudioFeatures): boolean {
    // Multi-criteria speech detection
    const energyCriteria = features.energy > this.config.energyThreshold;
    const volumeCriteria = features.volume > this.config.speechThreshold;
    const silenceCriteria = !features.silence;

    // Combine criteria (at least 2 out of 3 should be true)
    const criteriaCount = [
      energyCriteria,
      volumeCriteria,
      silenceCriteria,
    ].filter(Boolean).length;

    return criteriaCount >= 2;
  }

  /**
   * Determine if speech should start
   */
  private shouldStartSpeaking(frameHasSpeech: boolean, now: number): boolean {
    if (this.state.isSpeaking) return false;

    // Require minimum consecutive speech frames
    const minConsecutiveFrames = Math.ceil(this.config.minSpeechDuration / 100); // frames per 100ms

    return (
      frameHasSpeech &&
      this.state.consecutiveSpeechFrames >= Math.min(minConsecutiveFrames, 3)
    );
  }

  /**
   * Determine if speech should stop
   */
  private shouldStopSpeaking(frameHasSpeech: boolean, now: number): boolean {
    if (!this.state.isSpeaking) return false;

    // Check minimum speech duration
    if (
      this.state.speechStartTime &&
      now - this.state.speechStartTime < this.config.minSpeechDuration
    ) {
      return false;
    }

    // Require minimum consecutive silence frames
    const minSilenceFrames = Math.ceil(this.config.maxSilenceDuration / 100);

    return (
      !frameHasSpeech &&
      this.state.consecutiveSilenceFrames >= Math.min(minSilenceFrames, 10)
    );
  }

  /**
   * Calculate confidence score for VAD decision
   */
  private calculateConfidence(features: AudioFeatures): number {
    if (this.state.energyHistory.length < 3) return 0.5;

    // Calculate signal-to-noise ratio estimate
    const recentEnergy = this.state.energyHistory.slice(-3);
    const avgRecentEnergy =
      recentEnergy.reduce((a, b) => a + b, 0) / recentEnergy.length;

    const historicalEnergy = this.state.energyHistory.slice(0, -3);
    const avgHistoricalEnergy =
      historicalEnergy.length > 0
        ? historicalEnergy.reduce((a, b) => a + b, 0) / historicalEnergy.length
        : avgRecentEnergy;

    // SNR-based confidence
    const snr =
      avgHistoricalEnergy > 0 ? avgRecentEnergy / avgHistoricalEnergy : 1;
    const snrConfidence = Math.min(1, Math.max(0, (snr - 0.5) * 2));

    // Energy-based confidence
    const energyConfidence = Math.min(
      1,
      features.energy / this.config.speechThreshold,
    );

    // Volume-based confidence
    const volumeConfidence = Math.min(
      1,
      features.volume / this.config.speechThreshold,
    );

    // Weighted combination
    return (
      snrConfidence * 0.4 + energyConfidence * 0.3 + volumeConfidence * 0.3
    );
  }

  /**
   * Get current VAD state
   */
  getState(): VADState {
    return { ...this.state };
  }

  /**
   * Reset VAD state
   */
  reset(): void {
    this.state = this.initializeState();
    logger.audio.debug("VAD state reset");
  }

  /**
   * Update VAD configuration
   */
  updateConfig(newConfig: Partial<VADConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.audio.debug("VAD config updated:", newConfig);
  }

  /**
   * Get adaptive thresholds based on environment
   */
  getAdaptiveThresholds(): {
    energyThreshold: number;
    speechThreshold: number;
    silenceThreshold: number;
  } {
    if (this.state.energyHistory.length < 10) {
      return {
        energyThreshold: this.config.energyThreshold,
        speechThreshold: this.config.speechThreshold,
        silenceThreshold: this.config.silenceThreshold,
      };
    }

    // Calculate adaptive thresholds based on recent history
    const sortedEnergies = [...this.state.energyHistory].sort((a, b) => a - b);
    const median = sortedEnergies[Math.floor(sortedEnergies.length / 2)];
    const percentile75 =
      sortedEnergies[Math.floor(sortedEnergies.length * 0.75)];
    const percentile25 =
      sortedEnergies[Math.floor(sortedEnergies.length * 0.25)];

    return {
      energyThreshold: Math.max(
        this.config.energyThreshold,
        percentile25 * 1.5,
      ),
      speechThreshold: Math.max(this.config.speechThreshold, median * 1.2),
      silenceThreshold: Math.min(
        this.config.silenceThreshold,
        percentile25 * 0.8,
      ),
    };
  }
}

/**
 * VAD utility functions
 */
export const vadHelpers = {
  /**
   * Create optimized VAD configuration for different use cases
   */
  createConfig: {
    // Sensitive - catches more speech but may have false positives
    sensitive: (): VADConfig => ({
      energyThreshold: 0.005,
      silenceThreshold: 0.003,
      speechThreshold: 0.01,
      minSpeechDuration: 200,
      maxSilenceDuration: 800,
      lookAheadFrames: 5,
      lookBackFrames: 7,
    }),

    // Balanced - good compromise between accuracy and responsiveness
    balanced: (): VADConfig => ({
      energyThreshold: 0.01,
      silenceThreshold: 0.005,
      speechThreshold: 0.02,
      minSpeechDuration: 300,
      maxSilenceDuration: 1000,
      lookAheadFrames: 3,
      lookBackFrames: 5,
    }),

    // Conservative - fewer false positives but may miss quiet speech
    conservative: (): VADConfig => ({
      energyThreshold: 0.02,
      silenceThreshold: 0.01,
      speechThreshold: 0.03,
      minSpeechDuration: 400,
      maxSilenceDuration: 1200,
      lookAheadFrames: 2,
      lookBackFrames: 3,
    }),

    // Medical - optimized for medical consultations
    medical: (): VADConfig => ({
      energyThreshold: 0.008,
      silenceThreshold: 0.004,
      speechThreshold: 0.015,
      minSpeechDuration: 250,
      maxSilenceDuration: 900,
      lookAheadFrames: 4,
      lookBackFrames: 6,
    }),
  },

  /**
   * Analyze VAD performance metrics
   */
  analyzePerformance(decisions: VADDecision[]): {
    speechPercentage: number;
    avgConfidence: number;
    speechSegments: number;
    avgSpeechDuration: number;
    avgSilenceDuration: number;
  } {
    if (decisions.length === 0) {
      return {
        speechPercentage: 0,
        avgConfidence: 0,
        speechSegments: 0,
        avgSpeechDuration: 0,
        avgSilenceDuration: 0,
      };
    }

    const speechFrames = decisions.filter((d) => d.isSpeaking).length;
    const speechPercentage = (speechFrames / decisions.length) * 100;

    const avgConfidence =
      decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length;

    const speechSegments = decisions.filter((d) => d.shouldStartCapture).length;

    const speechDurations = decisions
      .filter((d) => d.speechDuration > 0)
      .map((d) => d.speechDuration);
    const avgSpeechDuration =
      speechDurations.length > 0
        ? speechDurations.reduce((a, b) => a + b, 0) / speechDurations.length
        : 0;

    const silenceDurations = decisions
      .filter((d) => d.silenceDuration > 0)
      .map((d) => d.silenceDuration);
    const avgSilenceDuration =
      silenceDurations.length > 0
        ? silenceDurations.reduce((a, b) => a + b, 0) / silenceDurations.length
        : 0;

    return {
      speechPercentage,
      avgConfidence,
      speechSegments,
      avgSpeechDuration,
      avgSilenceDuration,
    };
  },
};

export default VADProcessor;
