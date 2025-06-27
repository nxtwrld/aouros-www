// Feature Flags Configuration - Centralized feature toggle management
// Uses SvelteKit environment variables for feature flag control

import { env } from '$env/dynamic/private';

export const FEATURE_FLAGS = {
  // Core LangGraph integration
  ENABLE_LANGGRAPH: env.ENABLE_LANGGRAPH === 'true' || false,
  
  // Multi-provider AI capabilities
  ENABLE_MULTI_PROVIDER: env.ENABLE_MULTI_PROVIDER === 'true' || false,
  ENABLE_PROVIDER_FALLBACK: env.ENABLE_PROVIDER_FALLBACK === 'true' || false,
  
  // Enhanced signal processing
  ENABLE_ENHANCED_SIGNALS: env.ENABLE_ENHANCED_SIGNALS === 'true' || false,
  ENABLE_SIGNAL_MIGRATION: env.ENABLE_SIGNAL_MIGRATION === 'true' || true, // Default enabled for lazy migration
  ENABLE_SIGNAL_RELATIONSHIPS: env.ENABLE_SIGNAL_RELATIONSHIPS === 'true' || false,
  ENABLE_DYNAMIC_SIGNAL_REGISTRY: env.ENABLE_DYNAMIC_SIGNAL_REGISTRY === 'true' || false,
  
  // Document type specialization
  ENABLE_ENHANCED_SCHEMAS: env.ENABLE_ENHANCED_SCHEMAS === 'true' || false,
  ENABLE_DOCUMENT_TYPE_ROUTING: env.ENABLE_DOCUMENT_TYPE_ROUTING === 'true' || false,
  ENABLE_SPECIALIZED_UI: env.ENABLE_SPECIALIZED_UI === 'true' || false,
  
  // External validation
  ENABLE_EXTERNAL_VALIDATION: env.ENABLE_EXTERNAL_VALIDATION === 'true' || false,
  ENABLE_MCP_INTEGRATION: env.ENABLE_MCP_INTEGRATION === 'true' || false,
  
  // Quality and monitoring
  ENABLE_QUALITY_GATES: env.ENABLE_QUALITY_GATES === 'true' || false,
  ENABLE_PROCESSING_METRICS: env.ENABLE_PROCESSING_METRICS === 'true' || false,
  
  // Development and debugging
  DEBUG_LANGGRAPH: env.DEBUG_LANGGRAPH === 'true' || false,
  LOG_AI_RESPONSES: env.LOG_AI_RESPONSES === 'true' || false,
  ENABLE_WORKFLOW_TRACING: env.ENABLE_WORKFLOW_TRACING === 'true' || false,
} as const;

// Feature flag groups for easier management
export const FEATURE_GROUPS = {
  // Core features required for basic functionality
  CORE: [
    'ENABLE_LANGGRAPH'
  ],
  
  // AI provider features
  AI_PROVIDERS: [
    'ENABLE_MULTI_PROVIDER',
    'ENABLE_PROVIDER_FALLBACK'
  ],
  
  // Signal processing features
  SIGNALS: [
    'ENABLE_ENHANCED_SIGNALS',
    'ENABLE_SIGNAL_MIGRATION',
    'ENABLE_SIGNAL_RELATIONSHIPS',
    'ENABLE_DYNAMIC_SIGNAL_REGISTRY'
  ],
  
  // Document specialization features
  DOCUMENTS: [
    'ENABLE_ENHANCED_SCHEMAS',
    'ENABLE_DOCUMENT_TYPE_ROUTING',
    'ENABLE_SPECIALIZED_UI'
  ],
  
  // External integration features
  EXTERNAL: [
    'ENABLE_EXTERNAL_VALIDATION',
    'ENABLE_MCP_INTEGRATION'
  ],
  
  // Quality and monitoring features
  QUALITY: [
    'ENABLE_QUALITY_GATES',
    'ENABLE_PROCESSING_METRICS'
  ],
  
  // Development features
  DEBUG: [
    'DEBUG_LANGGRAPH',
    'LOG_AI_RESPONSES',
    'ENABLE_WORKFLOW_TRACING'
  ]
} as const;

/**
 * Checks if a feature flag is enabled
 */
export function isFeatureEnabled(flagName: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flagName];
}

/**
 * Checks if all features in a group are enabled
 */
export function isFeatureGroupEnabled(groupName: keyof typeof FEATURE_GROUPS): boolean {
  const group = FEATURE_GROUPS[groupName];
  return group.every(flag => FEATURE_FLAGS[flag as keyof typeof FEATURE_FLAGS]);
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
    console.log('🚩 Feature Flags Status:');
    Object.entries(FEATURE_FLAGS).forEach(([flag, enabled]) => {
      console.log(`  ${flag}: ${enabled ? '✅' : '❌'}`);
    });
  }
}