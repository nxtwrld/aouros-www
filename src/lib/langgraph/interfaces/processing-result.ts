/**
 * Enhanced Processing Result Interface
 *
 * Extended result structure that allows processing nodes to return not just
 * extracted data, but also refinements to feature detection and hints for other processors.
 */

import type {
  FeatureFlagRefinement,
  CrossProcessorHint,
} from "./feature-refinement";

export interface ProcessingQuality {
  // Overall quality score (0-1)
  score: number;

  // Specific quality metrics
  metrics: {
    completeness: number;
    accuracy: number;
    consistency: number;
    clinicalRelevance: number;
  };

  // Quality issues detected
  issues: QualityIssue[];
}

export interface QualityIssue {
  severity: "low" | "medium" | "high" | "critical";
  type: string;
  description: string;
  affectedData?: string[];
}

export interface EnhancedProcessingResult {
  // Original processing results (backward compatible)
  extractedData: any;

  // Token usage for this processing step
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };

  // Feature detection refinements based on actual findings
  featureRefinements?: FeatureFlagRefinement;

  // Hints for other processors to improve their detection
  crossProcessorHints?: CrossProcessorHint[];

  // Quality assessment of this processing step
  processingQuality: ProcessingQuality;

  // Processing metadata
  metadata?: {
    processingTime: number;
    modelUsed?: string;
    processorVersion?: string;
  };
}

/**
 * Example usage in an enhanced processing node:
 *
 * const result: EnhancedProcessingResult = {
 *   extractedData: {
 *     signals: [...extractedSignals],
 *     laboratory: [...labResults]
 *   },
 *   featureRefinements: {
 *     originalFlags: { hasSignals: false },
 *     refinedFlags: { hasSignals: true, hasCardiacMarkers: true },
 *     newlyDetectedFeatures: ['hasSignals', 'hasCardiacMarkers'],
 *     confidenceAdjustments: { hasSignals: 0.95 },
 *     processorInsights: [...]
 *   },
 *   crossProcessorHints: [{
 *     targetProcessor: 'cardiac-analysis',
 *     hintType: 'potential_finding',
 *     hint: { troponinDetected: true, location: 'lab_results_section' },
 *     confidence: 0.9
 *   }],
 *   processingQuality: {
 *     score: 0.92,
 *     metrics: {
 *       completeness: 0.95,
 *       accuracy: 0.90,
 *       consistency: 0.93,
 *       clinicalRelevance: 0.88
 *     },
 *     issues: []
 *   }
 * };
 */
