import * as env from "$env/static/public";
import { browser, dev } from "$app/environment";

// Import mode feature flags
export const IMPORT_FEATURE_FLAGS = {
  // SSE (Server-Sent Events) support for real-time progress
  ENABLE_SSE_IMPORT: (env as any).PUBLIC_ENABLE_SSE_IMPORT === "true",

  // Enhanced progress tracking with detailed file-level progress
  ENABLE_ENHANCED_PROGRESS:
    (env as any).PUBLIC_ENABLE_ENHANCED_PROGRESS === "true",

  // LangGraph workflow integration for medical analysis
  ENABLE_LANGGRAPH_IMPORT:
    (env as any).PUBLIC_ENABLE_LANGGRAPH_IMPORT === "true",

  // Automatic fallback to traditional import if SSE fails
  ENABLE_SSE_FALLBACK: (env as any).PUBLIC_ENABLE_SSE_FALLBACK === "true",

  // Parallel file processing for multiple uploads
  ENABLE_PARALLEL_PROCESSING:
    (env as any).PUBLIC_ENABLE_PARALLEL_PROCESSING === "true",

  // Advanced retry mechanisms for failed imports
  ENABLE_ADVANCED_RETRY: (env as any).PUBLIC_ENABLE_ADVANCED_RETRY === "true",

  // Real-time preview of extracted content during processing
  ENABLE_LIVE_PREVIEW: (env as any).PUBLIC_ENABLE_LIVE_PREVIEW === "true",

  // Progress persistence across page refreshes
  ENABLE_PROGRESS_PERSISTENCE:
    (env as any).PUBLIC_ENABLE_PROGRESS_PERSISTENCE === "true",

  // Enhanced error reporting with detailed diagnostics
  ENABLE_DETAILED_ERRORS: (env as any).PUBLIC_ENABLE_DETAILED_ERRORS === "true",

  // Experimental features for testing
  ENABLE_EXPERIMENTAL_FEATURES:
    (env as any).PUBLIC_ENABLE_EXPERIMENTAL_FEATURES === "true",
};

// Helper function to check if a specific import feature is enabled
// Now purely environment-based - no client-side overrides
export function isImportFeatureEnabled(
  feature: keyof typeof IMPORT_FEATURE_FLAGS,
): boolean {
  return IMPORT_FEATURE_FLAGS[feature];
}

// Import mode selection logic
export function selectImportMode(): "sse" | "traditional" | "hybrid" {
  // Check if SSE is available and enabled
  const sseEnabled = isImportFeatureEnabled("ENABLE_SSE_IMPORT");
  const fallbackEnabled = isImportFeatureEnabled("ENABLE_SSE_FALLBACK");

  // Check browser compatibility
  const sseSupported = browser && typeof EventSource !== "undefined";

  if (sseEnabled && sseSupported) {
    return fallbackEnabled ? "hybrid" : "sse";
  }

  return "traditional";
}

// Get import configuration based on enabled features
export function getImportConfig(): {
  mode: "sse" | "traditional" | "hybrid";
  features: {
    enhancedProgress: boolean;
    langGraphIntegration: boolean;
    parallelProcessing: boolean;
    advancedRetry: boolean;
    livePreview: boolean;
    progressPersistence: boolean;
    detailedErrors: boolean;
  };
  endpoints: {
    extract: string;
    report: string;
    extractStream?: string;
    reportStream?: string;
  };
} {
  const mode = selectImportMode();

  const features = {
    enhancedProgress: isImportFeatureEnabled("ENABLE_ENHANCED_PROGRESS"),
    langGraphIntegration: isImportFeatureEnabled("ENABLE_LANGGRAPH_IMPORT"),
    parallelProcessing: isImportFeatureEnabled("ENABLE_PARALLEL_PROCESSING"),
    advancedRetry: isImportFeatureEnabled("ENABLE_ADVANCED_RETRY"),
    livePreview: isImportFeatureEnabled("ENABLE_LIVE_PREVIEW"),
    progressPersistence: isImportFeatureEnabled("ENABLE_PROGRESS_PERSISTENCE"),
    detailedErrors: isImportFeatureEnabled("ENABLE_DETAILED_ERRORS"),
  };

  const endpoints = {
    extract: "/v1/import/extract",
    report: "/v1/import/report",
    ...(mode !== "traditional" && {
      extractStream: "/v1/import/extract/stream",
      reportStream: "/v1/import/report/stream",
    }),
  };

  return { mode, features, endpoints };
}

// Development utilities for testing different configurations
export const DevUtils =
  browser && dev
    ? {
        // Show current configuration
        showConfig(): void {
          const config = getImportConfig();
          console.log("📋 Current Import Configuration:", config);
          console.log(
            "💡 To change configuration, update your .env.development.local file",
          );
        },

        // Test SSE endpoint availability
        async testSSEEndpoints(): Promise<boolean> {
          try {
            const response = await fetch("/v1/import/extract/stream", {
              method: "HEAD",
            });
            console.log(
              `🔗 SSE Extract endpoint: ${response.ok ? "✅ Available" : "❌ Not Available"}`,
            );

            const reportResponse = await fetch("/v1/import/report/stream", {
              method: "HEAD",
            });
            console.log(
              `🔗 SSE Report endpoint: ${reportResponse.ok ? "✅ Available" : "❌ Not Available"}`,
            );

            return response.ok && reportResponse.ok;
          } catch (error) {
            console.log("❌ SSE endpoints not available:", error);
            return false;
          }
        },

        // Show environment configuration help
        showEnvHelp(): void {
          console.log("🔧 Environment Configuration Help:");
          console.log("Add these to your .env.development.local file:");
          console.log(
            "  PUBLIC_ENABLE_SSE_IMPORT=true          # Enable SSE import",
          );
          console.log(
            "  PUBLIC_ENABLE_LANGGRAPH_IMPORT=true    # Enable LangGraph workflow",
          );
          console.log(
            "  PUBLIC_ENABLE_ENHANCED_PROGRESS=true   # Enable enhanced progress",
          );
          console.log(
            "  PUBLIC_VERBOSE_AI_LOGGING=true         # Enable verbose AI logging",
          );
          console.log(
            "  PUBLIC_DEBUG_SSE_PROGRESS=true         # Enable SSE debugging",
          );
          console.log(
            "  PUBLIC_LOG_LEVEL=4                     # Set log level (0-5)",
          );
          console.log("💡 Restart the dev server after changing .env files");
        },
      }
    : undefined;

// Export individual flags for convenience
export const {
  ENABLE_SSE_IMPORT,
  ENABLE_ENHANCED_PROGRESS,
  ENABLE_LANGGRAPH_IMPORT,
  ENABLE_SSE_FALLBACK,
  ENABLE_PARALLEL_PROCESSING,
  ENABLE_ADVANCED_RETRY,
  ENABLE_LIVE_PREVIEW,
  ENABLE_PROGRESS_PERSISTENCE,
  ENABLE_DETAILED_ERRORS,
  ENABLE_EXPERIMENTAL_FEATURES,
} = IMPORT_FEATURE_FLAGS;

// Make DevUtils available globally in development
if (browser && dev && DevUtils) {
  (window as any).ImportDevUtils = DevUtils;
  console.log("🛠️ Import DevUtils available at window.ImportDevUtils");
  console.log("   Commands: showConfig(), testSSEEndpoints(), showEnvHelp()");
  console.log("💡 Configuration is now controlled via .env files only");
}
