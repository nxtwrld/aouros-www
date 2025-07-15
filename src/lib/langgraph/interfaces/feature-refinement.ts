/**
 * Feature Flag Refinement Interface
 *
 * Enables processing nodes to provide feedback on the initial AI feature detection,
 * allowing for a self-correcting system that improves accuracy through specialized analysis.
 */

export interface FeatureFlagRefinement {
  // Original flags from initial AI detection
  originalFlags: Record<string, boolean>;

  // Refined flags after specialized processing
  refinedFlags: Record<string, boolean>;

  // Features detected by this processor but missed in initial detection
  newlyDetectedFeatures: string[];

  // Confidence adjustments for specific features
  confidenceAdjustments: Record<string, number>;

  // Detailed insights from this processor
  processorInsights: ProcessorInsight[];
}

export interface ProcessorInsight {
  // ID of the processor providing this insight
  processorId: string;

  // Features this processor detected
  detectedFeatures: string[];

  // Features that were missed in initial detection
  missedInInitialDetection: string[];

  // Processor's confidence in its findings
  confidence: number;

  // Evidence supporting the detection
  evidence: string[];
}

export interface CrossProcessorHint {
  // Target processor that might benefit from this hint
  targetProcessor: string;

  // Type of hint
  hintType: "potential_finding" | "data_location" | "processing_suggestion";

  // The actual hint data
  hint: any;

  // Confidence in this hint
  confidence: number;
}

/**
 * Example usage in a processing node:
 *
 * // Signal processing node discovers lab values that weren't initially flagged
 * const refinement: FeatureFlagRefinement = {
 *   originalFlags: { hasSignals: false, hasLaboratory: false },
 *   refinedFlags: { hasSignals: true, hasLaboratory: true },
 *   newlyDetectedFeatures: ['hasSignals', 'hasLaboratory'],
 *   confidenceAdjustments: { hasSignals: 0.95, hasLaboratory: 0.9 },
 *   processorInsights: [{
 *     processorId: 'signal-processing',
 *     detectedFeatures: ['blood_glucose', 'hemoglobin_a1c'],
 *     missedInInitialDetection: ['hasSignals', 'hasLaboratory'],
 *     confidence: 0.92,
 *     evidence: ['Found glucose: 126 mg/dL', 'Found HbA1c: 7.2%']
 *   }]
 * };
 */
