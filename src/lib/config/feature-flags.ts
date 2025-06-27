import { env } from "$env/dynamic/private";

export const FEATURE_FLAGS = {
  ENHANCED_SIGNAL_PROCESSING: env.ENABLE_ENHANCED_SIGNALS === "true",
  LANGGRAPH_WORKFLOW: env.ENABLE_LANGGRAPH === "true",
  MULTI_PROVIDER_AI: env.ENABLE_MULTI_PROVIDER_AI === "true",
  EXTERNAL_VALIDATION: env.ENABLE_EXTERNAL_VALIDATION === "true",
  SPECIALIZED_UI: env.ENABLE_SPECIALIZED_UI === "true",
};

// Helper function to check if a feature is enabled
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature];
}

// Export individual flags for convenience
export const {
  ENHANCED_SIGNAL_PROCESSING,
  LANGGRAPH_WORKFLOW,
  MULTI_PROVIDER_AI,
  EXTERNAL_VALIDATION,
  SPECIALIZED_UI,
} = FEATURE_FLAGS;
