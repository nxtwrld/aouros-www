// Feature Flags Configuration - Centralized feature toggle management
// Uses SvelteKit environment variables for feature flag control

import * as env from "$env/static/public";

export const FEATURE_FLAGS = {
  // Core LangGraph integration
  ENABLE_LANGGRAPH: (env as any).PUBLIC_ENABLE_LANGGRAPH === "true",

  // Multi-provider AI capabilities
  ENABLE_MULTI_PROVIDER_AI: (env as any).PUBLIC_ENABLE_MULTI_PROVIDER_AI === "true",
  ENABLE_PROVIDER_FALLBACK: (env as any).PUBLIC_ENABLE_PROVIDER_FALLBACK === "true",

  // Enhanced signal processing
  ENABLE_ENHANCED_SIGNALS: (env as any).PUBLIC_ENABLE_ENHANCED_SIGNALS === "true",
  ENABLE_SIGNAL_MIGRATION: (env as any).PUBLIC_ENABLE_SIGNAL_MIGRATION === "true",
  ENABLE_SIGNAL_RELATIONSHIPS: (env as any).PUBLIC_ENABLE_SIGNAL_RELATIONSHIPS === "true",
  ENABLE_DYNAMIC_SIGNAL_REGISTRY: (env as any).PUBLIC_ENABLE_DYNAMIC_SIGNAL_REGISTRY === "true",

  // Document type specialization
  ENABLE_ENHANCED_SCHEMAS: (env as any).PUBLIC_ENABLE_ENHANCED_SCHEMAS === "true",
  ENABLE_DOCUMENT_TYPE_ROUTING: (env as any).PUBLIC_ENABLE_DOCUMENT_TYPE_ROUTING === "true",
  ENABLE_SPECIALIZED_UI: (env as any).PUBLIC_ENABLE_SPECIALIZED_UI === "true",

  // External validation
  ENABLE_EXTERNAL_VALIDATION: (env as any).PUBLIC_ENABLE_EXTERNAL_VALIDATION === "true",
  ENABLE_MCP_INTEGRATION: (env as any).PUBLIC_ENABLE_MCP_INTEGRATION === "true",

  // Quality and monitoring
  ENABLE_QUALITY_GATES: (env as any).PUBLIC_ENABLE_QUALITY_GATES === "true",
  ENABLE_PROCESSING_METRICS: (env as any).PUBLIC_ENABLE_PROCESSING_METRICS === "true",

  // Development and debugging
  DEBUG_LANGGRAPH: (env as any).PUBLIC_DEBUG_LANGGRAPH === "true",
  LOG_AI_RESPONSES: (env as any).PUBLIC_LOG_AI_RESPONSES === "true",
  ENABLE_WORKFLOW_TRACING: (env as any).PUBLIC_ENABLE_WORKFLOW_TRACING === "true",
} as const;

// Feature flag groups for easier management
export const FEATURE_GROUPS = {
  // Core features required for basic functionality
  CORE: ["ENABLE_LANGGRAPH"],

  // AI provider features
  AI_PROVIDERS: ["ENABLE_MULTI_PROVIDER_AI", "ENABLE_PROVIDER_FALLBACK"],

  // Signal processing features
  SIGNALS: [
    "ENABLE_ENHANCED_SIGNALS",
    "ENABLE_SIGNAL_MIGRATION",
    "ENABLE_SIGNAL_RELATIONSHIPS",
    "ENABLE_DYNAMIC_SIGNAL_REGISTRY",
  ],

  // Document specialization features
  DOCUMENTS: [
    "ENABLE_ENHANCED_SCHEMAS",
    "ENABLE_DOCUMENT_TYPE_ROUTING",
    "ENABLE_SPECIALIZED_UI",
  ],

  // External integration features
  EXTERNAL: ["ENABLE_EXTERNAL_VALIDATION", "ENABLE_MCP_INTEGRATION"],

  // Quality and monitoring features
  QUALITY: ["ENABLE_QUALITY_GATES", "ENABLE_PROCESSING_METRICS"],

  // Development features
  DEBUG: ["DEBUG_LANGGRAPH", "LOG_AI_RESPONSES", "ENABLE_WORKFLOW_TRACING"],
} as const;

/**
 * Checks if a feature flag is enabled
 */
export function isFeatureEnabled(
  flagName: keyof typeof FEATURE_FLAGS,
): boolean {
  return FEATURE_FLAGS[flagName];
}

/**
 * Checks if all features in a group are enabled
 */
export function isFeatureGroupEnabled(
  groupName: keyof typeof FEATURE_GROUPS,
): boolean {
  const group = FEATURE_GROUPS[groupName];
  return group.every(
    (flag) => FEATURE_FLAGS[flag as keyof typeof FEATURE_FLAGS],
  );
}

/**
 * Gets the current feature flag configuration
 */
export function getFeatureConfiguration(): typeof FEATURE_FLAGS {
  return FEATURE_FLAGS;
}

/**
 * Logs the current feature flag status (for debugging)
 */
export function logFeatureFlags(): void {
  if (FEATURE_FLAGS.DEBUG_LANGGRAPH) {
    console.log("🚩 Feature Flags Status:");
    Object.entries(FEATURE_FLAGS).forEach(([flag, enabled]) => {
      console.log(`  ${flag}: ${enabled ? "✅" : "❌"}`);
    });
  }
}
