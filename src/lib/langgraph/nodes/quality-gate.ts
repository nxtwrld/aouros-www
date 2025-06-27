import type { DocumentProcessingState } from "../state";

export const qualityGateNode = async (
  state: DocumentProcessingState,
): Promise<Partial<DocumentProcessingState>> => {
  let overallConfidence = 0.8; // Default confidence
  const qualityChecks = [];

  // Check for errors
  if (state.errors && state.errors.length > 0) {
    overallConfidence *= 0.5;
    qualityChecks.push("Errors detected during processing");
  }

  // Check medical analysis completion
  if (!state.medicalAnalysis?.content) {
    overallConfidence *= 0.3;
    qualityChecks.push("Medical analysis incomplete");
  }

  // Check signal extraction
  if (!state.signals || state.signals.length === 0) {
    overallConfidence *= 0.9; // Minor penalty, not all documents have signals
    qualityChecks.push("No signals extracted");
  }

  // Check provider reliability
  if (state.providerMetadata?.reliability) {
    overallConfidence *= state.providerMetadata.reliability;
  }

  // Future quality checks (Phase 4):
  // - Validate against document type expectations
  // - Check for required fields based on document type
  // - Verify signal relationships make medical sense
  // - Ensure confidence thresholds are met

  return {
    confidence: overallConfidence,
    qualityChecks,
  };
};
