import { StateGraph } from "@langchain/langgraph";
import type { DocumentProcessingState, WorkflowConfig } from "../state";

// Import node implementations (to be created)
import { inputValidationNode } from "../nodes/input-validation";
import { featureDetectionNode } from "../nodes/feature-detection";
import { medicalAnalysisNode } from "../nodes/medical-analysis";
import { signalProcessingNode } from "../nodes/signal-processing";
import { providerSelectionNode } from "../nodes/provider-selection";
import { externalValidationNode } from "../nodes/external-validation";
import { qualityGateNode } from "../nodes/quality-gate";
import { documentTypeRouterNode } from "../nodes/document-type-router";

// Conditional edge functions
const shouldProcessMedical = (state: DocumentProcessingState): string => {
  if (state.errors && state.errors.length > 0) {
    return "error";
  }

  // Check if medical processing is needed based on feature detection
  if (state.featureDetection && state.featureDetection.confidence > 0.5) {
    return "medical";
  }

  return "error";
};

const shouldValidateExternally = (state: DocumentProcessingState): string => {
  // Only validate externally if configured and signals exist
  // For Phase 1, always skip external validation
  // This will be enabled in Phase 5
  return "skip";
};

const shouldUseEnhancedSchema = (state: DocumentProcessingState): string => {
  // Route to enhanced schema processing if document type detected
  if (state.documentTypeAnalysis?.detectedType && 
      state.documentTypeAnalysis.confidence > 0.7) {
    return "enhanced";
  }
  return "standard";
};

// Create the document processing workflow
export const createDocumentProcessingWorkflow = (config?: WorkflowConfig) => {
  // Create state graph with DocumentProcessingState type
  const workflow = new StateGraph<DocumentProcessingState>({
    channels: {
      images: null,
      text: null,
      language: null,
      metadata: null,
      content: null,
      tokenUsage: null,
      featureDetection: null,
      medicalAnalysis: null,
      signals: null,
      documentTypeAnalysis: null,
      selectedSchema: null,
      processingComplexity: null,
      selectedProvider: null,
      providerMetadata: null,
      validationResults: null,
      relationships: null,
      confidence: null,
      errors: null,
      processingErrors: null,
    },
  });

  // Core processing nodes (wrapping existing functions)
  workflow.addNode("input_validation", inputValidationNode);
  workflow.addNode("feature_detection", featureDetectionNode);
  workflow.addNode("medical_analysis", medicalAnalysisNode);
  workflow.addNode("signal_processing", signalProcessingNode);

  // Enhanced nodes (new capabilities)
  workflow.addNode("provider_selection", providerSelectionNode);
  workflow.addNode("document_type_router", documentTypeRouterNode);
  workflow.addNode("external_validation", externalValidationNode);
  workflow.addNode("quality_gate", qualityGateNode);

  // Define edges
  workflow.addEdge("input_validation", "document_type_router");
  workflow.addEdge("document_type_router", "provider_selection");
  workflow.addEdge("provider_selection", "feature_detection");

  // Conditional routing after feature detection
  workflow.addConditionalEdges("feature_detection", shouldProcessMedical, {
    medical: "medical_analysis",
    error: "END",
  });

  workflow.addEdge("medical_analysis", "signal_processing");

  // Conditional external validation
  workflow.addConditionalEdges("signal_processing", shouldValidateExternally, {
    validate: "external_validation",
    skip: "quality_gate",
  });

  workflow.addEdge("external_validation", "quality_gate");
  workflow.addEdge("quality_gate", "END");

  // Set entry point
  workflow.setEntryPoint("input_validation");

  // Compile the workflow
  return workflow.compile();
};

// Helper function to run workflow with backwards compatibility
export async function runDocumentProcessingWorkflow(
  images?: string[],
  text?: string,
  language?: string,
  config?: WorkflowConfig,
) {
  const workflow = createDocumentProcessingWorkflow(config);

  // Initialize state
  const initialState: DocumentProcessingState = {
    images,
    text,
    language,
    content: [],
    tokenUsage: { total: 0 },
  };

  try {
    // Run the workflow
    const result = await workflow.invoke(initialState);

    // Return result in backwards-compatible format
    return {
      content: result.medicalAnalysis?.content || {},
      tokenUsage: result.tokenUsage,
      signals: result.signals || [],
      error:
        result.errors && result.errors.length > 0
          ? result.errors[0].error
          : undefined,
    };
  } catch (error) {
    console.error("Workflow execution error:", error);
    return {
      content: {},
      tokenUsage: { total: 0 },
      signals: [],
      error: error.message,
    };
  }
}
