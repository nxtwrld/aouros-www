// Main entry point for LangGraph integration
// Provides backwards-compatible wrapper for existing code

import { runDocumentProcessingWorkflow } from "./workflows/document-processing";
import type { WorkflowConfig } from "./state";
import { LANGGRAPH_WORKFLOW } from "$lib/config/feature-flags";

// Backwards-compatible analyze function that can use either
// the new LangGraph workflow or the existing implementation
export async function analyzeWithLangGraph(
  images?: string[],
  text?: string,
  language?: string,
  options?: {
    useEnhancedSignals?: boolean;
    enableExternalValidation?: boolean;
    preferredProvider?: string;
  },
) {
  if (!LANGGRAPH_WORKFLOW) {
    // Fall back to existing implementation
    const { analyze } = await import("$lib/import.server/analyzeReport");
    return analyze({ images, text, language });
  }

  // Use LangGraph workflow
  const config: WorkflowConfig = {
    useEnhancedSignals: options?.useEnhancedSignals || false,
    enableExternalValidation: options?.enableExternalValidation || false,
    preferredProvider: options?.preferredProvider,
    streamResults: false,
  };

  return runDocumentProcessingWorkflow(images, text, language, config);
}

// Export types for use in other parts of the application
export type {
  EnhancedSignal,
  SignalContext,
  SignalValidation,
  SignalRelationship,
  DocumentProcessingState,
  WorkflowConfig,
} from "./state";
