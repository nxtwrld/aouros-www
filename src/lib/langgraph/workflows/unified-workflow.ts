/**
 * Unified Workflow - Clean Implementation
 * 
 * This replaces the existing document-processing.ts with a cleaner, 
 * unified approach using the multi-node orchestrator for ALL specialized processing.
 */

import { StateGraph, END } from "@langchain/langgraph";
import type {
  DocumentProcessingState,
  WorkflowConfig,
  ProgressCallback,
} from "../state";
import { 
  isLangGraphDebuggingEnabled,
} from "$lib/config/logging-config";
import { 
  startWorkflowRecording, 
  finishWorkflowRecording, 
  isWorkflowReplayMode,
  workflowRecorder,
} from "$lib/debug/workflow-recorder";
import { createWorkflowReplay } from "$lib/debug/workflow-replay";

// Import essential workflow nodes only
import { inputValidationNode } from "../nodes/input-validation";
import { featureDetectionNode } from "../nodes/feature-detection";
import { providerSelectionNode } from "../nodes/provider-selection";
import { externalValidationNode } from "../nodes/external-validation";
import { qualityGateNode } from "../nodes/quality-gate";
import { documentTypeRouterNode } from "../nodes/document-type-router";

// Import unified multi-node processing
import { executeMultiNodeProcessing } from "./multi-node-orchestrator";

// Simplified conditional edge functions
const shouldProcessMedical = (state: DocumentProcessingState): string => {
  if (state.errors && state.errors.length > 0) {
    console.log("🚫 Errors detected - skipping processing");
    return "error";
  }

  // Check if medical processing is needed
  const isMedical = state.featureDetectionResults?.isMedical || 
                   (state.featureDetection && state.featureDetection.confidence > 0.5);

  if (isMedical) {
    console.log("✅ Medical content detected - proceeding to multi-node processing");
    return "medical";
  }

  console.log("🚫 Non-medical content - skipping processing");
  return "error";
};

const shouldValidateExternally = (state: DocumentProcessingState): string => {
  // For Phase 1, always skip external validation
  // This will be enabled in Phase 3
  return "skip";
};

// Create the unified document processing workflow  
export const createUnifiedDocumentProcessingWorkflow = (config?: WorkflowConfig, progressCallback?: ProgressCallback) => {
  // Create wrapper functions for nodes that have access to the progress callback
  const createNodeWrapper = (nodeFn: any) => {
    return async (state: DocumentProcessingState) => {
      const enhancedState = {
        ...state,
        progressCallback: progressCallback || state.progressCallback,
      };
      return await nodeFn(enhancedState);
    };
  };

  // Create state graph with simplified channels
  const workflow = new StateGraph({
    channels: {
      // Input
      images: null,
      text: null,
      language: null,
      metadata: null,
      content: null,
      
      // Core processing
      tokenUsage: null,
      featureDetection: null,
      featureDetectionResults: null,
      
      // Multi-node results (replaces individual medical analysis, signals, etc.)
      medicalAnalysis: null,
      signals: null,
      imaging: null,
      medications: null,
      procedures: null,
      multiNodeResults: null,
      report: null, // Add report channel
      
      // Workflow control
      documentTypeAnalysis: null,
      selectedProvider: null,
      providerMetadata: null,
      validationResults: null,
      confidence: null,
      errors: null,
      
      // Progress tracking
      progressCallback: null,
      currentStage: null,
      emitProgress: null,
      emitComplete: null,
      emitError: null,
    },
  });

  // Add essential workflow nodes
  workflow.addNode("input_validation", createNodeWrapper(inputValidationNode));
  workflow.addNode("document_type_router", createNodeWrapper(documentTypeRouterNode));
  workflow.addNode("provider_selection", createNodeWrapper(providerSelectionNode));
  workflow.addNode("feature_detection", createNodeWrapper(featureDetectionNode));
  workflow.addNode("multi_node_processing", createNodeWrapper(executeMultiNodeProcessing));
  workflow.addNode("external_validation", createNodeWrapper(externalValidationNode));
  workflow.addNode("quality_gate", createNodeWrapper(qualityGateNode));

  // Define clean workflow flow
  workflow.addEdge("input_validation", "document_type_router");
  workflow.addEdge("document_type_router", "provider_selection");
  workflow.addEdge("provider_selection", "feature_detection");

  // Route to unified multi-node processing or end
  workflow.addConditionalEdges("feature_detection", shouldProcessMedical, {
    medical: "multi_node_processing",
    error: END,
  });

  // External validation (optional)
  workflow.addConditionalEdges("multi_node_processing", shouldValidateExternally, {
    validate: "external_validation",
    skip: "quality_gate",
  });

  workflow.addEdge("external_validation", "quality_gate");
  workflow.addEdge("quality_gate", END);

  // Set entry point
  workflow.setEntryPoint("input_validation");

  // Compile the workflow
  return workflow.compile();
};

// Main execution function with debugging support
export async function runUnifiedDocumentProcessingWorkflow(
  images: any[],
  text: string,
  language: string,
  config: WorkflowConfig = {},
  progressCallback?: ProgressCallback,
): Promise<DocumentProcessingState> {
  const debugEnabled = isLangGraphDebuggingEnabled();
  
  console.log("🎯 Starting Unified Document Processing Workflow", {
    hasImages: images && images.length > 0,
    hasText: !!text,
    language,
    config,
    debugEnabled,
  });

  // Check if we're in replay mode
  if (isWorkflowReplayMode()) {
    const replayFilePath = workflowRecorder.getReplayFilePath();
    if (replayFilePath) {
      console.log("🔄 Using workflow replay mode with file:", replayFilePath);
      return await replayWorkflowFromFile(replayFilePath, progressCallback);
    } else {
      console.warn("⚠️ Replay mode enabled but no replay file path found, falling back to live execution");
    }
  }

  // Start recording if debugging enabled
  let recordingId: string | undefined;
  if (debugEnabled) {
    recordingId = startWorkflowRecording("analysis", {
      workflowType: "unified-document-processing",
      inputs: { images, text, language, config },
    });
  }

  try {
    // Create workflow
    const workflow = createUnifiedDocumentProcessingWorkflow(config, progressCallback);

    // Create initial state
    const initialState: DocumentProcessingState = {
      images,
      text,
      language: language || "English",
      content: text ? [{ type: "text" as const, text }] : [], // Fix content to be proper array
      metadata: {},
      tokenUsage: { total: 0 },
      errors: [],
      progressCallback,
      // Explicitly initialize report as empty to prevent any default array assignment
      report: undefined,
    };

    console.log("🚀 Executing unified workflow...");
    
    // Execute workflow
    const result = await workflow.invoke(initialState);

    console.log("✅ Unified workflow completed successfully");
    
    if (debugEnabled) {
      console.log("📊 Final workflow result:", {
        hasMultiNodeResults: !!result.multiNodeResults,
        processedNodes: result.multiNodeResults?.processedNodes || [],
        errors: result.errors?.length || 0,
        tokenUsage: result.tokenUsage?.total || 0,
      });
    }

    return result;

  } catch (error) {
    console.error("❌ Unified workflow error:", error);
    throw error;
  } finally {
    // Finish recording if we started one
    if (recordingId && debugEnabled) {
      finishWorkflowRecording(recordingId);
    }
  }
}

/**
 * Replay a workflow from a saved recording file
 */
async function replayWorkflowFromFile(
  filePath: string,
  progressCallback?: ProgressCallback
): Promise<any> {
  const replay = createWorkflowReplay(filePath);
  if (!replay) {
    throw new Error(`Failed to load workflow recording from: ${filePath}`);
  }

  const summary = replay.getWorkflowSummary();
  console.log("🔄 Replaying workflow:", {
    recordingId: summary.recordingId,
    phase: summary.phase,
    steps: summary.totalSteps,
    originalDuration: summary.totalDuration,
    originalTokens: summary.totalTokenUsage.total
  });

  // Emit initial progress - continue from where extraction left off
  if (progressCallback) {
    progressCallback({
      type: "progress",
      stage: "analysis_start",
      progress: 30, // Continue from extraction progress
      message: `Starting analysis replay: ${summary.recordingId}`,
      data: { 
        originalSteps: summary.totalSteps,
        originalDuration: summary.totalDuration,
        phase: "analysis" 
      },
      timestamp: Date.now(),
    });
  }

  // Replay the workflow step by step with live progress events
  const replayResults: any[] = [];
  const totalSteps = summary.totalSteps;
  let stepIndex = 0;

  while (true) {
    const result = replay.executeNextStep();
    if (!result) break;

    replayResults.push(result);
    stepIndex++;

    // Emit progress for each step as it's replayed
    if (progressCallback) {
      // Calculate progress as continuation from extraction (assume extraction was ~30% of total)
      const analysisProgress = (stepIndex / totalSteps) * 100;
      const overallProgress = 30 + (analysisProgress * 0.7); // Analysis takes remaining 70%
      
      progressCallback({
        type: "progress",
        stage: result.stepName,
        progress: Math.min(overallProgress, 100),
        message: `Replaying step: ${result.stepName}`,
        data: { 
          stepId: result.stepId,
          success: result.success,
          stepIndex,
          totalSteps
        },
        timestamp: Date.now(),
      });
    }

    // Add configurable delay between steps to show progress
    const delayMs = workflowRecorder.getReplayDelay();
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  // Get the final result from the recording
  const recording = replay.exportResults().recording;
  
  // Apply our new aggregation logic to the final result
  console.log("🔄 Applying updated aggregation logic to replayed data");
  const finalState = recording.steps[recording.steps.length - 1].outputState;
  
  // Run the multi-node aggregation on the replayed data
  const { executeMultiNodeProcessing } = await import("./multi-node-orchestrator");
  
  // Ensure progressCallback and progress functions are available for the aggregation
  const stateWithCallback = {
    ...finalState,
    progressCallback,
    emitProgress: (stage: string, progress: number, message: string) => {
      if (progressCallback) {
        progressCallback({
          type: "progress",
          stage,
          progress,
          message,
          timestamp: Date.now(),
        });
      }
    },
    emitComplete: (stage: string, message: string, data?: any) => {
      if (progressCallback) {
        progressCallback({
          type: "progress",
          stage,
          progress: 100,
          message,
          data,
          timestamp: Date.now(),
        });
      }
    },
    emitError: (stage: string, message: string, error?: any) => {
      if (progressCallback) {
        progressCallback({
          type: "error",
          stage,
          progress: 0,
          message,
          data: error,
          timestamp: Date.now(),
        });
      }
    },
  };
  
  const aggregatedResult = await executeMultiNodeProcessing(stateWithCallback);
  
  
  console.log("✅ Workflow replay completed with updated aggregation:", {
    stepsReplayed: replayResults.length,
    successful: replayResults.filter(r => r.success).length,
    failed: replayResults.filter(r => !r.success).length,
    hasReport: !!(aggregatedResult as any)?.report,
    reportType: typeof (aggregatedResult as any)?.report
  });

  // Emit completion
  if (progressCallback) {
    progressCallback({
      type: "progress",
      stage: "analysis_complete",
      progress: 100,
      message: "Analysis replay completed successfully",
      data: {
        stepsReplayed: replayResults.length,
        originalTokens: recording.totalTokenUsage.total,
        phase: "analysis"
      },
      timestamp: Date.now(),
    });
  }

  // Return the aggregated result instead of just the recording's final result
  // Ensure we always return a valid result object
  const finalResult = {
    ...finalState,
    ...(aggregatedResult || {}),
    // Fallback values if aggregation failed
    tokenUsage: aggregatedResult?.tokenUsage || finalState.tokenUsage || { total: 0 },
    errors: aggregatedResult?.errors || finalState.errors || [],
  };
  
  console.log("🎯 Final result being returned:", {
    resultType: typeof finalResult,
    hasTokenUsage: !!finalResult.tokenUsage,
    hasReport: !!(finalResult as any).report,
    reportType: typeof (finalResult as any).report,
    keysCount: Object.keys(finalResult).length
  });
  
  return finalResult;
}

// Backward compatibility export
export const runDocumentProcessingWorkflow = runUnifiedDocumentProcessingWorkflow;