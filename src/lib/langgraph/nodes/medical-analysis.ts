import type { DocumentProcessingState } from "../state";
import { analyze } from "$lib/import.server/analyzeReport";
import { FEATURE_FLAGS } from "$lib/utils/feature-flags";
import { AIProviderAbstraction } from "$lib/ai/providers/abstraction";
import { AIProvider } from "$lib/ai/providers/registry";

export const medicalAnalysisNode = async (
  state: DocumentProcessingState,
): Promise<Partial<DocumentProcessingState>> => {
  try {
    console.log("🔬 Starting medical analysis...");

    // Check if enhanced schema processing is enabled
    if (FEATURE_FLAGS.ENABLE_ENHANCED_SCHEMAS && state.selectedSchema) {
      console.log("🎯 Using enhanced schema processing:", state.documentTypeAnalysis?.detectedType);
      return await analyzeWithEnhancedSchema(state);
    }
    
    // Check if multi-provider AI is enabled
    if (FEATURE_FLAGS.ENABLE_MULTI_PROVIDER && state.selectedProvider) {
      console.log("🚀 Using multi-provider AI with:", state.selectedProvider);
      return await analyzeWithMultiProvider(state);
    } else {
      console.log("📄 Using existing single-provider analysis");
      return await analyzeWithExistingProvider(state);
    }
  } catch (error) {
    console.error("❌ Medical analysis error:", error);
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
 * Analyze using enhanced schema for specialized document types
 */
async function analyzeWithEnhancedSchema(
  state: DocumentProcessingState,
): Promise<Partial<DocumentProcessingState>> {
  console.log("🎯 Enhanced schema analysis starting");
  console.log("📋 Schema:", state.documentTypeAnalysis?.detectedType);
  console.log("🔬 Processing complexity:", state.processingComplexity);

  // For Phase 4.2, we implement enhanced schema analysis
  // This will use the selectedSchema for more specialized extraction
  
  try {
    // Use the existing analyze function but with schema awareness
    // In a full implementation, this would call the AI with the specific schema
    const result = await analyze({
      images: state.images,
      text: state.text,
      language: state.language || "English",
      // TODO: Pass the selectedSchema to the analyze function
      // schema: state.selectedSchema
    });

    // Enhance the result with schema-specific metadata
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
function extractEnhancedFields(result: any, state: DocumentProcessingState): any {
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

  const result = await analyze({
    images: state.images,
    text: state.text,
    language: state.language || "English",
  });

  // Extract token usage
  const tokenUsage = {
    ...state.tokenUsage,
    ...result.tokenUsage,
    total: state.tokenUsage.total + result.tokenUsage.total,
  };

  console.log("✅ Multi-provider analysis completed");
  console.log("📊 Token usage:", result.tokenUsage.total);

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
 */
async function analyzeWithExistingProvider(
  state: DocumentProcessingState,
): Promise<Partial<DocumentProcessingState>> {
  const result = await analyze({
    images: state.images,
    text: state.text,
    language: state.language || "English",
  });

  // Extract token usage
  const tokenUsage = {
    ...state.tokenUsage,
    ...result.tokenUsage,
    total: state.tokenUsage.total + result.tokenUsage.total,
  };

  console.log("✅ Existing provider analysis completed");
  console.log("📊 Token usage:", result.tokenUsage.total);

  return {
    medicalAnalysis: {
      content: result,
      tokenUsage: result.tokenUsage,
    },
    tokenUsage,
  };
}
