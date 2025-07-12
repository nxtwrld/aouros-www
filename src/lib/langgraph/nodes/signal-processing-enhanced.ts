/**
 * Enhanced Signal Processing Node with Feature Refinement
 *
 * This example demonstrates how processing nodes can provide feedback
 * to refine the initial AI feature detection, creating a self-correcting system.
 */

import type { DocumentProcessingState, EnhancedSignal } from "../state";
import type { EnhancedProcessingResult } from "../interfaces/processing-result";
import type { FeatureFlagRefinement } from "../interfaces/feature-refinement";

/**
 * Enhanced signal processing that returns feature refinements
 */
export async function signalProcessingEnhanced(
  state: DocumentProcessingState,
): Promise<
  Partial<DocumentProcessingState> & {
    processingResult?: EnhancedProcessingResult;
  }
> {
  console.log("🔬 Enhanced signal processing with feature refinement...");

  try {
    // Extract signals (existing functionality)
    const extractedSignals = await extractSignalsFromContent(state);
    const laboratoryData = await extractLaboratoryData(state);
    const vitalSigns = await extractVitalSigns(state);

    // Build feature refinements based on what we actually found
    const featureRefinements = buildFeatureRefinements(
      state.featureDetectionResults || {},
      {
        signals: extractedSignals,
        laboratory: laboratoryData,
        vitals: vitalSigns,
      },
    );

    // Generate cross-processor hints
    const crossProcessorHints = generateCrossProcessorHints({
      signals: extractedSignals,
      laboratory: laboratoryData,
      vitals: vitalSigns,
    });

    // Calculate processing quality
    const processingQuality = calculateProcessingQuality({
      expectedSections: state.documentTypeAnalysis?.detectedSections || [],
      actualFindings: {
        signalCount: extractedSignals.length,
        labCount: laboratoryData.length,
        vitalCount: vitalSigns.length,
      },
    });

    // Build enhanced result
    const processingResult: EnhancedProcessingResult = {
      extractedData: {
        signals: extractedSignals,
        laboratory: laboratoryData,
        vitalSigns: vitalSigns,
      },
      featureRefinements,
      crossProcessorHints,
      processingQuality,
      metadata: {
        processingTime: Date.now(),
        processorVersion: "1.0.0",
      },
    };

    // Return both state updates and processing result
    return {
      signals: [...extractedSignals, ...laboratoryData, ...vitalSigns],
      processingResult,
    };
  } catch (error) {
    console.error("❌ Enhanced signal processing error:", error);
    return {
      errors: [
        ...(state.errors || []),
        {
          node: "signal_processing_enhanced",
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}

/**
 * Build feature refinements based on actual findings
 */
function buildFeatureRefinements(
  originalDetection: any,
  findings: { signals: any[]; laboratory: any[]; vitals: any[] },
): FeatureFlagRefinement {
  const originalFlags = {
    hasSignals: originalDetection.hasSignals || false,
    hasECG: originalDetection.hasECG || false,
    hasEcho: originalDetection.hasEcho || false,
  };

  // Determine refined flags based on actual findings
  const refinedFlags = { ...originalFlags };
  const newlyDetectedFeatures: string[] = [];
  const confidenceAdjustments: Record<string, number> = {};

  // Check if we found signals that weren't initially detected
  if (!originalFlags.hasSignals && findings.signals.length > 0) {
    refinedFlags.hasSignals = true;
    newlyDetectedFeatures.push("hasSignals");
    confidenceAdjustments.hasSignals = 0.95;
  }

  // Check for ECG data in signals
  const hasECGData = findings.signals.some(
    (s) =>
      s.signal?.toLowerCase().includes("ecg") ||
      s.signal?.toLowerCase().includes("rhythm") ||
      s.signal?.toLowerCase().includes("qtc"),
  );

  if (!originalFlags.hasECG && hasECGData) {
    refinedFlags.hasECG = true;
    newlyDetectedFeatures.push("hasECG");
    confidenceAdjustments.hasECG = 0.9;
  }

  // Check for Echo data in signals
  const hasEchoData = findings.signals.some(
    (s) =>
      s.signal?.toLowerCase().includes("ejection") ||
      s.signal?.toLowerCase().includes("lvef") ||
      s.signal?.toLowerCase().includes("chamber"),
  );

  if (!originalFlags.hasEcho && hasEchoData) {
    refinedFlags.hasEcho = true;
    newlyDetectedFeatures.push("hasEcho");
    confidenceAdjustments.hasEcho = 0.85;
  }

  return {
    originalFlags,
    refinedFlags,
    newlyDetectedFeatures,
    confidenceAdjustments,
    processorInsights: [
      {
        processorId: "signal-processing-enhanced",
        detectedFeatures: Object.keys(refinedFlags).filter(
          (k) => refinedFlags[k],
        ),
        missedInInitialDetection: newlyDetectedFeatures,
        confidence: 0.9,
        evidence: [
          `Found ${findings.signals.length} signals`,
          `Found ${findings.laboratory.length} lab values`,
          `Found ${findings.vitals.length} vital signs`,
        ],
      },
    ],
  };
}

/**
 * Generate hints for other processors based on our findings
 */
function generateCrossProcessorHints(findings: any): any[] {
  const hints = [];

  // If we found cardiac markers, hint cardiac-analysis processor
  const cardiacMarkers = findings.signals.filter((s) =>
    ["troponin", "bnp", "nt-probnp", "ck-mb"].some((marker) =>
      s.signal?.toLowerCase().includes(marker),
    ),
  );

  if (cardiacMarkers.length > 0) {
    hints.push({
      targetProcessor: "cardiac-analysis",
      hintType: "potential_finding",
      hint: {
        cardiacMarkers: cardiacMarkers.map((m) => m.signal),
        urgency: cardiacMarkers.some((m) => m.urgency > 3) ? "high" : "normal",
      },
      confidence: 0.9,
    });
  }

  // If we found tumor markers, hint oncology processor
  const tumorMarkers = findings.laboratory.filter((l) =>
    ["cea", "ca-125", "psa", "afp", "ca19-9"].some((marker) =>
      l.signal?.toLowerCase().includes(marker),
    ),
  );

  if (tumorMarkers.length > 0) {
    hints.push({
      targetProcessor: "oncology-processing",
      hintType: "potential_finding",
      hint: {
        tumorMarkers: tumorMarkers.map((m) => ({
          marker: m.signal,
          value: m.value,
          reference: m.reference,
        })),
      },
      confidence: 0.85,
    });
  }

  return hints;
}

/**
 * Calculate processing quality metrics
 */
function calculateProcessingQuality(data: any): any {
  const { expectedSections, actualFindings } = data;

  // Simple quality calculation based on findings
  const hasExpectedData =
    expectedSections.includes("signals") ||
    expectedSections.includes("laboratory");
  const foundData =
    actualFindings.signalCount > 0 || actualFindings.labCount > 0;

  const completeness =
    hasExpectedData && foundData
      ? 0.9
      : !hasExpectedData && !foundData
        ? 1.0
        : 0.5;

  return {
    score: completeness,
    metrics: {
      completeness,
      accuracy: 0.95, // High accuracy for structured data
      consistency: 0.9,
      clinicalRelevance: 0.85,
    },
    issues: [],
  };
}

// Placeholder functions for demonstration
async function extractSignalsFromContent(
  state: DocumentProcessingState,
): Promise<any[]> {
  // Actual implementation would extract signals from state.medicalAnalysis
  return [];
}

async function extractLaboratoryData(
  state: DocumentProcessingState,
): Promise<any[]> {
  // Actual implementation would extract lab data
  return [];
}

async function extractVitalSigns(
  state: DocumentProcessingState,
): Promise<any[]> {
  // Actual implementation would extract vital signs
  return [];
}
