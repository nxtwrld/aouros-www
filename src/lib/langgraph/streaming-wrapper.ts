import { createDocumentProcessingWorkflow } from "./workflows/document-processing";
import type { DocumentProcessingState, WorkflowConfig } from "./state";

interface ProgressEvent {
  type: "progress" | "complete" | "error";
  stage: string;
  progress: number;
  message: string;
  data?: any;
  timestamp: number;
}

type ProgressCallback = (event: ProgressEvent) => void;

// Streaming version of the LangGraph workflow
export async function runDocumentProcessingWorkflowWithProgress(
  images?: string[],
  text?: string,
  language?: string,
  config?: WorkflowConfig,
  onProgress?: ProgressCallback,
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
    // Send initial progress
    onProgress?.({
      type: "progress",
      stage: "input_validation",
      progress: 10,
      message: "Validating input data...",
      timestamp: Date.now(),
    });

    // For now, we'll simulate the workflow steps since the actual nodes need to be enhanced
    // TODO: Replace this with actual workflow streaming once nodes are updated

    onProgress?.({
      type: "progress",
      stage: "feature_detection",
      progress: 25,
      message: "Detecting medical features and document type...",
      timestamp: Date.now(),
    });

    onProgress?.({
      type: "progress",
      stage: "document_type_router",
      progress: 40,
      message: "Routing to appropriate processing nodes...",
      timestamp: Date.now(),
    });

    onProgress?.({
      type: "progress",
      stage: "medical_analysis",
      progress: 60,
      message: "Extracting medical content and structured data...",
      timestamp: Date.now(),
    });

    onProgress?.({
      type: "progress",
      stage: "signal_processing",
      progress: 75,
      message: "Processing medical signals and lab values...",
      timestamp: Date.now(),
    });

    onProgress?.({
      type: "progress",
      stage: "quality_gate",
      progress: 90,
      message: "Validating analysis quality and consistency...",
      timestamp: Date.now(),
    });

    // Run the actual workflow
    const result = await workflow.invoke(initialState);

    // Return result in backwards-compatible format
    const formattedResult = {
      content: result.medicalAnalysis?.content || {},
      tokenUsage: result.tokenUsage,
      signals: result.signals || [],
      confidence: result.confidence || 0,
      relationships: result.relationships || [],
      error:
        result.errors && result.errors.length > 0
          ? result.errors[0].error
          : undefined,
    };

    onProgress?.({
      type: "complete",
      stage: "completed",
      progress: 100,
      message: "Document processing completed successfully",
      data: formattedResult,
      timestamp: Date.now(),
    });

    return formattedResult;
  } catch (error) {
    console.error("Workflow execution error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown workflow error";

    onProgress?.({
      type: "error",
      stage: "error",
      progress: 0,
      message: errorMessage,
      timestamp: Date.now(),
    });

    return {
      content: {},
      tokenUsage: { total: 0 },
      signals: [],
      error: errorMessage,
    };
  }
}
