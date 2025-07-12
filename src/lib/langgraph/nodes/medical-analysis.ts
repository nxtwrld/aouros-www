import type { DocumentProcessingState } from "../state";
import { analyze } from "$lib/import.server/analyzeReport";
import { FEATURE_FLAGS } from "$lib/utils/feature-flags";
import { AIProviderAbstraction } from "$lib/ai/providers/abstraction";
import { AIProvider } from "$lib/ai/providers/registry";

export const medicalAnalysisNode = async (
  state: DocumentProcessingState,
): Promise<Partial<DocumentProcessingState>> => {
  // Emit progress start
  state.emitProgress?.("medical_analysis", 0, "Starting medical analysis");

  try {
    console.log("🔬 Starting medical analysis...");
    console.log("📥 Medical Analysis Input:", {
      hasFeatureDetectionResults: !!state.featureDetectionResults,
      hasPrescriptions: state.featureDetectionResults?.hasPrescriptions,
      hasImmunizations: state.featureDetectionResults?.hasImmunizations,
      hasSignals: state.featureDetectionResults?.hasSignals,
      documentType: state.featureDetectionResults?.documentType
    });

    // Check if enhanced schema processing is enabled
    if (FEATURE_FLAGS.ENABLE_ENHANCED_SCHEMAS && state.selectedSchema) {
      console.log(
        "🎯 Using enhanced schema processing:",
        state.documentTypeAnalysis?.detectedType,
      );
      state.emitProgress?.(
        "medical_analysis",
        10,
        "Using enhanced schema processing",
      );
      return await analyzeWithEnhancedSchema(state);
    }

    // Check if multi-provider AI is enabled
    if (FEATURE_FLAGS.ENABLE_MULTI_PROVIDER_AI && state.selectedProvider) {
      console.log("🚀 Using multi-provider AI with:", state.selectedProvider);
      state.emitProgress?.(
        "medical_analysis",
        10,
        "Using multi-provider AI analysis",
      );
      return await analyzeWithMultiProvider(state);
    } else {
      console.log("📄 Using existing single-provider analysis");
      state.emitProgress?.(
        "medical_analysis",
        10,
        "Using standard medical analysis",
      );
      return await analyzeWithExistingProvider(state);
    }
  } catch (error) {
    console.error("❌ Medical analysis error:", error);

    // Emit error
    state.emitError?.("medical_analysis", "Medical analysis failed", error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      errors: [
        ...(state.errors || []),
        {
          node: "medical_analysis",
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
};

/**
 * Shared function to build analysis result from feature detection results
 * This eliminates duplicate feature detection calls across all analysis paths
 */
async function buildResultFromFeatureDetection(state: DocumentProcessingState): Promise<any> {
  if (!state.featureDetection) {
    throw new Error("Feature detection results are required");
  }

  // Build content array for specific extractions
  const content = [];
  if (state.images && state.images.length > 0) {
    content.push(...state.images.map(img => ({ type: "image_url" as const, image_url: { url: img } })));
  }
  if (state.text) {
    content.push({ type: "text" as const, text: state.text });
  }

  // Initialize result with feature detection data
  // Note: We need to get the actual feature detection results which contain boolean flags
  const featureDetectionResults = state.featureDetectionResults || {};
  
  console.log("🔍 Feature Detection Check:", {
    hasPrescriptions: featureDetectionResults.hasPrescriptions,
    hasImmunizations: featureDetectionResults.hasImmunizations,
    hasSignals: featureDetectionResults.hasSignals
  });
  
  const result: any = {
    type: featureDetectionResults.documentType || state.featureDetection.type || "report",
    isMedical: state.featureDetection.confidence > 0.5,
    tags: state.featureDetection.features || [],
    hasPrescription: featureDetectionResults.hasPrescriptions || false,
    hasImmunization: featureDetectionResults.hasImmunizations || false,
    hasLabOrVitals: featureDetectionResults.hasSignals || false,
    text: state.text || "",
    tokenUsage: { total: 0 },
    report: null,
    prescriptions: null,
    immunizations: null
  };

  // Log planned extraction steps
  const steps = [];
  if (result.type === "clinical_report" || result.type === "laboratory") {
    steps.push(`Extract ${result.type} content`);
  }
  if (result.hasPrescription) steps.push("Extract prescriptions");
  if (result.hasImmunization) steps.push("Extract immunizations");
  if (result.hasLabOrVitals) steps.push("Extract lab/vitals");
  
  console.log("📋 Planned steps:", steps.length ? steps : ["No extractions planned"]);
  console.log("📊 Flags:", {
    hasPrescription: result.hasPrescription,
    hasImmunization: result.hasImmunization,
    hasLabOrVitals: result.hasLabOrVitals
  });

  const tokenUsage = { ...state.tokenUsage };

  // Import the evaluate function and Types for specific extractions
  const { evaluate, Types } = await import("$lib/import.server/analyzeReport");
  
  // NOTE: The language localization issue exists here - the evaluate() function
  // uses module-level localizedSchemas that may not be updated with the correct language.
  // This would need to be fixed by either:
  // 1. Making evaluate() accept a language parameter, or 
  // 2. Ensuring the language is set properly before these calls
  // For now, we proceed with the current implementation
  const currentLanguage = state.language || "English";
  console.log("🌐 Individual extractions using language:", currentLanguage);

  // Extract main report based on detected type
  if (result.type === "clinical_report" || result.type === "laboratory") {
    try {
      const reportType = result.type === "laboratory" ? Types.laboratory : Types.report;
      console.log(`🏥 Extracting ${reportType}`);
      
      const reportResult = await evaluate(content, reportType, tokenUsage);
      result.report = reportResult;
      console.log("✅ Report extracted:", !!result.report);
    } catch (error) {
      console.error("❌ Report extraction failed:", error);
    }
  }

  // Extract prescriptions if detected
  if (result.hasPrescription) {
    try {
      console.log("💊 Extracting prescriptions");
      const prescriptionResult = await evaluate([{ type: "text", text: result.text }], Types.prescription, tokenUsage);
      if (prescriptionResult.prescriptions?.length > 0) {
        result.prescriptions = prescriptionResult.prescriptions;
        console.log("✅ Prescriptions found:", prescriptionResult.prescriptions.length);
      } else {
        console.log("ℹ️ No prescriptions found");
      }
    } catch (error) {
      console.error("❌ Prescription extraction failed:", error);
    }
  }

  // Extract immunizations if detected
  if (result.hasImmunization) {
    try {
      console.log("💉 Extracting immunizations");
      const immunizationResult = await evaluate([{ type: "text", text: result.text }], Types.immunization, tokenUsage);
      if (immunizationResult.immunizations?.length > 0) {
        result.immunizations = immunizationResult.immunizations;
        console.log("✅ Immunizations found:", immunizationResult.immunizations.length);
      } else {
        console.log("ℹ️ No immunizations found");
      }
    } catch (error) {
      console.error("❌ Immunization extraction failed:", error);
    }
  }

  // Update token usage
  result.tokenUsage = tokenUsage;
  
  // Log final result
  console.log("📊 Final Results:", {
    report: !!result.report,
    prescriptions: result.prescriptions?.length || 0,
    immunizations: result.immunizations?.length || 0
  });
  
  return result;
}

/**
 * Analyze using enhanced schema for specialized document types
 */
async function analyzeWithEnhancedSchema(
  state: DocumentProcessingState,
): Promise<Partial<DocumentProcessingState>> {
  console.log("🎯 Enhanced schema analysis starting");
  console.log("📋 Schema:", state.documentTypeAnalysis?.detectedType);
  console.log("🔬 Processing complexity:", state.processingComplexity);

  state.emitProgress?.(
    "medical_analysis",
    30,
    "Analyzing with enhanced schema",
  );

  // For Phase 4.2, we implement enhanced schema analysis
  // This will use the selectedSchema for more specialized extraction

  try {
    // Use the existing analyze function but with schema awareness
    // In a full implementation, this would call the AI with the specific schema
    state.emitProgress?.(
      "medical_analysis",
      50,
      "Processing document with AI model",
    );

    // FIXED: Use feature detection results instead of calling legacy analyze()
    if (!state.featureDetection) {
      throw new Error("Enhanced schema analysis requires feature detection results");
    }

    // Use the same feature-based approach as analyzeWithExistingProvider
    const result = await buildResultFromFeatureDetection(state);

    console.log("🔬 Medical Analysis Node - Raw Result:", {
      resultKeys: Object.keys(result),
      hasReport: !!result.report,
      reportKeys: result.report ? Object.keys(result.report) : [],
      reportContent: result.report,
      type: result.type,
      isMedical: result.isMedical,
      tokensUsed: result.tokenUsage?.total
    });

    // Enhance the result with schema-specific metadata
    state.emitProgress?.(
      "medical_analysis",
      80,
      "Enhancing results with schema-specific metadata",
    );

    const enhancedResult = {
      ...result,
      documentType: state.documentTypeAnalysis?.detectedType,
      schemaUsed: state.selectedSchema?.name,
      confidence: state.documentTypeAnalysis?.confidence,
      processingComplexity: state.processingComplexity,
      enhancedFields: extractEnhancedFields(result, state),
    };

    // Extract token usage
    const tokenUsage = {
      ...state.tokenUsage,
      ...result.tokenUsage,
      total: state.tokenUsage.total + result.tokenUsage.total,
    };

    console.log("✅ Enhanced schema analysis completed");
    console.log("📊 Token usage:", result.tokenUsage.total);
    console.log("🎯 Document type:", state.documentTypeAnalysis?.detectedType);

    // Emit completion
    state.emitComplete?.(
      "medical_analysis",
      "Enhanced schema analysis completed",
      {
        documentType: state.documentTypeAnalysis?.detectedType,
        schemaUsed: state.selectedSchema?.name,
        tokensUsed: result.tokenUsage.total,
        processingComplexity: state.processingComplexity,
      },
    );

    return {
      medicalAnalysis: {
        content: enhancedResult,
        tokenUsage: result.tokenUsage,
        provider: state.selectedProvider,
        documentType: state.documentTypeAnalysis?.detectedType,
        schemaConfidence: state.documentTypeAnalysis?.confidence,
      },
      tokenUsage,
    };
  } catch (error) {
    console.error("❌ Enhanced schema analysis failed:", error);

    // Fallback to standard analysis
    console.log("🔄 Falling back to standard analysis");
    return await analyzeWithExistingProvider(state);
  }
}

/**
 * Extract enhanced fields based on schema and document type
 */
function extractEnhancedFields(
  result: any,
  state: DocumentProcessingState,
): any {
  const docType = state.documentTypeAnalysis?.detectedType;

  if (!docType) return {};

  // Extract specialty-specific fields based on document type
  const enhancedFields: any = {
    documentType: docType,
    extractionMethod: "enhanced_schema",
    schemaVersion: "1.0",
  };

  // Add document type-specific enhancements
  switch (docType) {
    case "surgical":
      enhancedFields.surgicalSpecificity = {
        procedureComplexity: state.processingComplexity,
        teamIdentification: extractSurgicalTeam(result),
        postOpInstructions: extractPostOpInstructions(result),
      };
      break;

    case "pathology":
      enhancedFields.pathologySpecificity = {
        specimenAnalysis: extractSpecimenDetails(result),
        microscopicFindings: extractMicroscopicFindings(result),
        diagnosticConfidence: state.documentTypeAnalysis?.confidence,
      };
      break;

    case "cardiology":
      enhancedFields.cardiologySpecificity = {
        rhythmAnalysis: extractRhythmData(result),
        functionalAssessment: extractCardiacFunction(result),
        riskStratification: extractCardiacRisk(result),
      };
      break;

    case "radiology":
      enhancedFields.radiologySpecificity = {
        imagingModality: extractImagingModality(result),
        findingsSeverity: extractFindingsSeverity(result),
        comparisonAnalysis: extractComparisonData(result),
      };
      break;

    case "oncology":
      enhancedFields.oncologySpecificity = {
        treatmentResponse: extractTreatmentResponse(result),
        biomarkerAnalysis: extractBiomarkers(result),
        prognosticFactors: extractPrognosticFactors(result),
      };
      break;
  }

  return enhancedFields;
}

// Helper functions for specialty-specific extraction
function extractSurgicalTeam(result: any): any {
  // Extract surgical team information from the analysis result
  return {
    identified: false, // Placeholder for actual implementation
    teamSize: 0,
    specialties: [],
  };
}

function extractPostOpInstructions(result: any): any {
  return {
    identified: false,
    instructions: [],
  };
}

function extractSpecimenDetails(result: any): any {
  return {
    specimenType: null,
    adequacy: null,
  };
}

function extractMicroscopicFindings(result: any): any {
  return {
    identified: false,
    findings: [],
  };
}

function extractRhythmData(result: any): any {
  return {
    rhythm: null,
    rate: null,
    abnormalities: [],
  };
}

function extractCardiacFunction(result: any): any {
  return {
    ejectionFraction: null,
    wallMotion: null,
  };
}

function extractCardiacRisk(result: any): any {
  return {
    riskLevel: null,
    factors: [],
  };
}

function extractImagingModality(result: any): any {
  return {
    modality: null,
    quality: null,
  };
}

function extractFindingsSeverity(result: any): any {
  return {
    severity: null,
    urgency: null,
  };
}

function extractComparisonData(result: any): any {
  return {
    compared: false,
    changes: [],
  };
}

function extractTreatmentResponse(result: any): any {
  return {
    response: null,
    criteria: null,
  };
}

function extractBiomarkers(result: any): any {
  return {
    identified: false,
    markers: [],
  };
}

function extractPrognosticFactors(result: any): any {
  return {
    factors: [],
    outlook: null,
  };
}

/**
 * Analyze using the new multi-provider system
 */
async function analyzeWithMultiProvider(
  state: DocumentProcessingState,
): Promise<Partial<DocumentProcessingState>> {
  const providerAbstraction = AIProviderAbstraction.getInstance();
  const selectedProvider = state.selectedProvider as AIProvider;
  const fallbackProviders = (state.fallbackProviders as AIProvider[]) || [];

  console.log("🎯 Selected provider:", selectedProvider);
  console.log("🔄 Fallback providers:", fallbackProviders);

  state.emitProgress?.(
    "medical_analysis",
    30,
    `Checking provider availability: ${selectedProvider}`,
  );

  // Check if the selected provider is available
  if (!providerAbstraction.isProviderAvailable(selectedProvider)) {
    console.warn(
      `⚠️ Selected provider ${selectedProvider} not available, trying fallbacks...`,
    );

    // Try fallback providers
    for (const fallbackProvider of fallbackProviders) {
      if (providerAbstraction.isProviderAvailable(fallbackProvider)) {
        console.log(`✅ Using fallback provider: ${fallbackProvider}`);
        return await executeAnalysisWithProvider(state, fallbackProvider);
      }
    }

    // If no providers available, fall back to existing implementation
    console.log(
      "🔄 No multi-providers available, falling back to existing implementation",
    );
    return await analyzeWithExistingProvider(state);
  }

  return await executeAnalysisWithProvider(state, selectedProvider);
}

/**
 * Execute analysis with a specific provider
 */
async function executeAnalysisWithProvider(
  state: DocumentProcessingState,
  provider: AIProvider,
): Promise<Partial<DocumentProcessingState>> {
  // For Phase 2, we'll use the existing analyze function but with provider awareness
  // In future phases, we'll implement direct provider calling through abstraction layer

  console.log(`🎯 Executing analysis with provider: ${provider}`);
  state.emitProgress?.(
    "medical_analysis",
    50,
    `Analyzing with provider: ${provider}`,
  );

  state.emitProgress?.(
    "medical_analysis",
    70,
    "Processing document with AI model",
  );

  // FIXED: Use feature detection results instead of calling legacy analyze()
  if (!state.featureDetection) {
    throw new Error("Multi-provider analysis requires feature detection results");
  }

  // Use the same feature-based approach as analyzeWithExistingProvider
  const result = await buildResultFromFeatureDetection(state);

  // Extract token usage
  const tokenUsage = {
    ...state.tokenUsage,
    ...result.tokenUsage,
    total: state.tokenUsage.total + result.tokenUsage.total,
  };

  console.log("✅ Multi-provider analysis completed");
  console.log("📊 Token usage:", result.tokenUsage.total);

  // Emit completion
  state.emitComplete?.(
    "medical_analysis",
    "Multi-provider analysis completed",
    {
      provider,
      tokensUsed: result.tokenUsage.total,
    },
  );

  return {
    medicalAnalysis: {
      content: result,
      tokenUsage: result.tokenUsage,
      provider: provider,
    },
    tokenUsage,
  };
}

/**
 * Analyze using the existing single-provider system (backwards compatibility)
 * FIXED: Use feature detection results instead of calling legacy analyze()
 */
async function analyzeWithExistingProvider(
  state: DocumentProcessingState,
): Promise<Partial<DocumentProcessingState>> {
  state.emitProgress?.(
    "medical_analysis",
    20,
    "Processing document with feature detection results",
  );

  console.log("🔬 Medical Analysis Node - Using Feature Detection Results:", {
    hasImages: !!state.images,
    imagesCount: state.images?.length || 0,
    hasText: !!state.text,
    textLength: state.text?.length || 0,
    language: state.language,
    hasFeatureDetection: !!state.featureDetection,
    featureDetectionType: state.featureDetection?.type,
    featureDetectionConfidence: state.featureDetection?.confidence,
    featureDetectionFeatures: state.featureDetection?.features
  });

  state.emitProgress?.(
    "medical_analysis",
    40,
    "Extracting specific medical content based on detected features",
  );

  try {
    // Use shared feature detection-based analysis
    const result = await buildResultFromFeatureDetection(state);
    
    const finalTokenUsage = {
      ...state.tokenUsage,
      ...result.tokenUsage,
      total: state.tokenUsage.total + result.tokenUsage.total,
    };

    console.log("✅ Feature-based medical analysis completed");
    console.log("📊 Token usage:", result.tokenUsage.total);

    // Emit completion
    state.emitComplete?.(
      "medical_analysis",
      "Feature-based medical analysis completed",
      {
        tokensUsed: result.tokenUsage.total,
        featureDetectionUsed: true,
        extractedSections: {
          report: !!result.report,
          prescriptions: !!result.prescriptions,
          immunizations: !!result.immunizations
        }
      },
    );

    console.log("🔬 Medical Analysis Node - Feature-based result:", {
      hasResult: !!result,
      resultKeys: Object.keys(result || {}),
      hasReport: !!result?.report,
      reportKeys: result?.report ? Object.keys(result.report) : [],
      hasPrescriptions: !!result.prescriptions,
      hasImmunizations: !!result.immunizations,
      usedFeatureDetection: true
    });

    return {
      medicalAnalysis: {
        content: result,
        tokenUsage: result.tokenUsage,
      },
      tokenUsage: finalTokenUsage,
    };
  } catch (error) {
    console.error("❌ Feature-based medical analysis failed:", error);
    
    // Emit error
    state.emitError?.("medical_analysis", "Feature-based medical analysis failed", error);
    
    throw error;
  }
}
