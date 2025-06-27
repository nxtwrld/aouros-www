import type { DocumentProcessingState, EnhancedSignal } from "../state";
import type { Signal } from "$lib/types";
import { DynamicSignalRegistry } from "$lib/signals/dynamic-registry";
import {
  SignalRelationshipEngine,
  type PatientContext,
} from "$lib/signals/relationship-engine";
import { ENHANCED_SIGNAL_PROCESSING } from "$lib/config/feature-flags";

export const signalProcessingNode = async (
  state: DocumentProcessingState,
): Promise<Partial<DocumentProcessingState>> => {
  try {
    console.log("🔬 Starting signal processing...");

    // Check if enhanced signal processing is enabled
    if (ENHANCED_SIGNAL_PROCESSING) {
      console.log("🚀 Using enhanced signal processing");
      return await processWithEnhancedSignals(state);
    } else {
      console.log("📄 Using basic signal processing");
      return await processWithBasicSignals(state);
    }
  } catch (error) {
    console.error("❌ Signal processing error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      errors: [
        ...(state.errors || []),
        {
          node: "signal_processing",
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
};

/**
 * Process signals with enhanced capabilities
 */
async function processWithEnhancedSignals(
  state: DocumentProcessingState,
): Promise<Partial<DocumentProcessingState>> {
  const registry = DynamicSignalRegistry.getInstance();
  const relationshipEngine = new SignalRelationshipEngine();

  // Extract basic signals from medical analysis
  const basicSignals = extractBasicSignals(state.medicalAnalysis);
  console.log(`📊 Extracted ${basicSignals.length} basic signals`);

  if (basicSignals.length === 0) {
    console.log("⚠️ No signals found in medical analysis");
    return { signals: [] };
  }

  // Enhance each signal with registry and validation
  const enhancedSignals: EnhancedSignal[] = [];

  for (const signal of basicSignals) {
    try {
      // Resolve signal with dynamic registry
      const context = createSignalContext(state);
      const resolution = await registry.resolveSignal(signal.signal, context);

      // Validate signal value
      const validation = registry.validateSignalValue(
        signal.signal,
        signal.value,
        signal.unit,
        context,
      );

      // Create enhanced signal
      const enhanced: EnhancedSignal = {
        ...signal, // Preserve original structure for backwards compatibility
        context,
        validation,
        relationships: [], // Will be populated below
        metadata: {
          extractedBy: state.selectedProvider || "unknown",
          extractionConfidence: validation.confidence,
          alternativeInterpretations: resolution.alternatives.map((alt) => ({
            name: alt.name,
            confidence: alt.confidence,
            reasoning: alt.reasoning,
          })),
          clinicalNotes: resolution.isKnown
            ? `Known signal: ${resolution.definition.description}`
            : `New signal detected with ${(resolution.confidence * 100).toFixed(1)}% confidence`,
          signalDefinition: resolution.definition,
        },
      };

      enhancedSignals.push(enhanced);

      console.log(
        `✅ Enhanced signal: ${signal.signal} (confidence: ${(validation.confidence * 100).toFixed(1)}%)`,
      );
    } catch (error) {
      console.error(`Failed to enhance signal ${signal.signal}:`, error);

      // Create fallback enhanced signal
      const fallback = createFallbackEnhancedSignal(signal, state);
      enhancedSignals.push(fallback);
    }
  }

  // Analyze relationships between signals
  console.log("🔗 Analyzing signal relationships...");
  const patientContext = createPatientContext(state);
  const relationships = await relationshipEngine.analyzeRelationships(
    enhancedSignals,
    patientContext,
  );

  // Update signals with relationships
  const finalSignals = updateSignalRelationships(
    enhancedSignals,
    relationships,
  );

  // Detect clinical patterns
  const clinicalPatterns = relationshipEngine.detectClinicalPatterns(
    finalSignals,
    patientContext,
  );

  // Suggest missing signals
  const missingSignals = relationshipEngine.suggestMissingSignals(finalSignals);

  console.log(`✅ Enhanced signal processing completed`);
  console.log(`📊 Processed ${finalSignals.length} signals`);
  console.log(`🔗 Found ${relationships.length} relationships`);
  console.log(`🩺 Detected ${clinicalPatterns.length} clinical patterns`);

  return {
    signals: finalSignals,
    relationships,
    clinicalPatterns,
    missingSignals,
  };
}

/**
 * Process signals with basic capabilities (backwards compatibility)
 */
async function processWithBasicSignals(
  state: DocumentProcessingState,
): Promise<Partial<DocumentProcessingState>> {
  // Extract signals from medical analysis
  const basicSignals: Signal[] = extractBasicSignals(state.medicalAnalysis);

  // Convert basic signals to enhanced signals with minimal enhancement
  const enhancedSignals: EnhancedSignal[] = basicSignals.map((signal) => ({
    // Preserve all original fields
    ...signal,

    // Add enhanced fields with default values
    context: {
      documentType: state.featureDetection?.type || "unknown",
      specimen: undefined,
      method: "extracted",
      location:
        state.medicalAnalysis?.content?.report?.performer?.org || undefined,
      clinicalContext: state.medicalAnalysis?.content?.report?.diagnosis
        ? [state.medicalAnalysis.content.report.diagnosis.description]
        : [],
    },
    validation: {
      status: "unvalidated",
      confidence: 0.8,
      validationSources: [],
      warnings: [],
    },
    relationships: [],
    metadata: {
      extractedBy: state.selectedProvider || "gpt-4",
      extractionConfidence: 0.8,
      alternativeInterpretations: [],
      clinicalNotes: undefined,
    },
  }));

  // Apply existing signal processing logic
  const processedSignals = enhancedSignals.map((signal) => {
    // Normalize signal name to lowercase (existing logic)
    if (signal.signal) {
      signal.signal = signal.signal.toLowerCase();
    }

    // Parse numeric values (existing logic)
    if (typeof signal.value === "string" && !isNaN(parseFloat(signal.value))) {
      signal.value = parseFloat(signal.value);
    }

    return signal;
  });

  console.log(`✅ Basic signal processing completed`);
  console.log(`📊 Processed ${processedSignals.length} signals`);

  return {
    signals: processedSignals,
  };
}

/**
 * Extract basic signals from medical analysis result
 */
function extractBasicSignals(medicalAnalysis: any): Signal[] {
  // Handle different possible structures
  if (medicalAnalysis?.content?.report?.signals) {
    return medicalAnalysis.content.report.signals;
  }

  if (medicalAnalysis?.content?.signals) {
    return medicalAnalysis.content.signals;
  }

  if (medicalAnalysis?.content?.results) {
    return medicalAnalysis.content.results;
  }

  if (medicalAnalysis?.signals) {
    return medicalAnalysis.signals;
  }

  return [];
}

/**
 * Create signal context from document processing state
 */
function createSignalContext(state: DocumentProcessingState): any {
  return {
    documentType: state.featureDetection?.type || "laboratory",
    specimen: inferSpecimen(state),
    method: "extracted",
    location:
      state.medicalAnalysis?.content?.performer?.organization || "unknown",
    clinicalContext: state.medicalAnalysis?.content?.diagnosis || [],
  };
}

/**
 * Create patient context for relationship analysis
 */
function createPatientContext(state: DocumentProcessingState): PatientContext {
  const patient = state.medicalAnalysis?.content?.patient;

  return {
    age: patient?.age,
    sex: patient?.sex,
    conditions: state.medicalAnalysis?.content?.diagnosis || [],
    medications: state.medicalAnalysis?.content?.medications || [],
    allergies: patient?.allergies || [],
  };
}

/**
 * Infer specimen type from document context
 */
function inferSpecimen(state: DocumentProcessingState): string {
  const documentType = state.featureDetection?.type;
  const text = state.text?.toLowerCase() || "";

  if (
    text.includes("blood") ||
    text.includes("serum") ||
    text.includes("plasma")
  ) {
    return "blood";
  }
  if (text.includes("urine")) {
    return "urine";
  }
  if (text.includes("saliva")) {
    return "saliva";
  }
  if (documentType === "laboratory") {
    return "blood"; // Default for lab reports
  }

  return "unknown";
}

/**
 * Update signals with relationship information
 */
function updateSignalRelationships(
  signals: EnhancedSignal[],
  relationships: any[],
): EnhancedSignal[] {
  const signalMap = new Map<string, EnhancedSignal>();
  signals.forEach((signal) => {
    signalMap.set(signal.signal.toLowerCase(), signal);
  });

  // Add relationships to each signal
  relationships.forEach((relationship) => {
    const signal = signalMap.get(relationship.targetSignal.toLowerCase());
    if (signal) {
      signal.relationships.push(relationship);
    }
  });

  return Array.from(signalMap.values());
}

/**
 * Create fallback enhanced signal for errors
 */
function createFallbackEnhancedSignal(
  basicSignal: any,
  state: DocumentProcessingState,
): EnhancedSignal {
  return {
    ...basicSignal,
    context: {
      documentType: state.featureDetection?.type || "unknown",
      method: "extracted",
      location: "unknown",
      clinicalContext: [],
    },
    validation: {
      status: "unvalidated",
      confidence: 0.5,
      validationSources: [],
      warnings: ["Fallback signal created due to processing error"],
    },
    relationships: [],
    metadata: {
      extractedBy: state.selectedProvider || "fallback",
      extractionConfidence: 0.5,
      alternativeInterpretations: [],
      clinicalNotes: "Created as fallback during signal processing error",
    },
  };
}
