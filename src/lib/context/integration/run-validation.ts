/**
 * Context Assembly Validation Runner
 *
 * Simple script to run validation tests for the context assembly system
 */

import {
  validateContextAssemblyIntegration,
  quickHealthCheck,
  performanceBenchmark,
} from "./validation-test";
import { logger } from "$lib/logging/logger";

const validationLogger = logger.namespace("ContextValidation");

/**
 * Run all validation tests
 */
export async function runFullValidation(profileId: string) {
  validationLogger.info("Starting full context assembly validation", {
    profileId,
  });

  try {
    // Step 1: Quick health check
    validationLogger.info("Step 1: Quick health check...");
    const healthCheck = await quickHealthCheck(profileId);

    if (!healthCheck.healthy) {
      validationLogger.warn("Health check found issues", {
        issues: healthCheck.issues,
      });
      // Continue anyway for comprehensive testing
    } else {
      validationLogger.info("✅ Health check passed");
    }

    // Step 2: Performance benchmark
    validationLogger.info("Step 2: Performance benchmark...");
    const benchmark = await performanceBenchmark(profileId);
    validationLogger.info("Performance results", {
      contextAssembly: `${benchmark.results.contextAssembly}ms`,
      embeddingSearch: `${benchmark.results.embeddingSearch}ms`,
      toolGeneration: `${benchmark.results.toolGeneration}ms`,
      recommendations: benchmark.recommendations,
    });

    // Step 3: Full integration test
    validationLogger.info("Step 3: Full integration validation...");
    const testDocument = {
      content: {
        text: "Patient John Doe, age 45, presents with acute chest pain radiating to left arm. Blood pressure 150/95, heart rate 88 bpm. ECG shows ST elevation in leads II, III, aVF. Troponin levels elevated at 15.2 ng/mL. Diagnosed with inferior STEMI. Initiated dual antiplatelet therapy and prepared for emergency PCI.",
        title: "Emergency Department - Acute MI Case",
        date: new Date().toISOString(),
        tags: ["cardiology", "emergency", "STEMI", "acute-care"],
      },
    };

    const validation = await validateContextAssemblyIntegration(
      profileId,
      testDocument,
    );

    // Report results
    validationLogger.info("Validation Summary", {
      overallSuccess: validation.success,
      details: validation.details,
      performance: validation.performance,
      errorCount: validation.errors.length,
    });

    if (validation.errors.length > 0) {
      validationLogger.error("Validation errors found", {
        errors: validation.errors,
      });
    }

    // Generate recommendations
    const recommendations = generateRecommendations(
      validation,
      benchmark,
      healthCheck,
    );
    if (recommendations.length > 0) {
      validationLogger.info("Recommendations", { recommendations });
    }

    return {
      success: validation.success && healthCheck.healthy,
      healthCheck,
      benchmark,
      validation,
      recommendations,
    };
  } catch (error) {
    validationLogger.error("Validation runner failed", { error });
    throw error;
  }
}

/**
 * Generate actionable recommendations based on test results
 */
function generateRecommendations(
  validation: any,
  benchmark: any,
  healthCheck: any,
): string[] {
  const recommendations: string[] = [];

  // Health check recommendations
  if (!healthCheck.healthy) {
    recommendations.push(
      "Address health check issues before proceeding with production deployment",
    );
    healthCheck.issues.forEach((issue: string) => {
      recommendations.push(`Fix: ${issue}`);
    });
  }

  // Performance recommendations
  recommendations.push(...benchmark.recommendations);

  // Validation-specific recommendations
  if (!validation.details.initialization) {
    recommendations.push(
      "Fix context initialization - this is critical for all other features",
    );
  }

  if (!validation.details.embeddingGeneration) {
    recommendations.push(
      "Fix embedding generation - required for semantic search functionality",
    );
  }

  if (!validation.details.contextAssembly) {
    recommendations.push(
      "Fix context assembly - core functionality for intelligent document retrieval",
    );
  }

  if (!validation.details.chatIntegration) {
    recommendations.push(
      "Fix chat integration - required for AI conversations with context",
    );
  }

  if (!validation.details.sessionIntegration) {
    recommendations.push(
      "Fix session integration - required for real-time medical consultations",
    );
  }

  if (!validation.details.mcpTools) {
    recommendations.push(
      "Fix MCP tools - required for AI to access and analyze documents",
    );
  }

  // Performance-based recommendations
  if (validation.performance.totalTime > 5000) {
    recommendations.push(
      "Overall integration is slow (>5s), consider optimizing critical path operations",
    );
  }

  if (validation.performance.embeddingTime > 3000) {
    recommendations.push(
      "Embedding generation is slow (>3s), consider switching to a faster model or caching strategy",
    );
  }

  return recommendations;
}

/**
 * Run a lightweight validation suitable for CI/CD
 */
export async function runLightweightValidation(profileId: string) {
  validationLogger.info("Running lightweight validation for CI/CD", {
    profileId,
  });

  try {
    const healthCheck = await quickHealthCheck(profileId);
    const validation = await validateContextAssemblyIntegration(profileId); // No test document

    return {
      success: healthCheck.healthy && validation.success,
      details: {
        healthy: healthCheck.healthy,
        initialized: validation.details.initialization,
        contextAssembly: validation.details.contextAssembly,
        chatIntegration: validation.details.chatIntegration,
        mcpTools: validation.details.mcpTools,
      },
      issues: healthCheck.issues.concat(validation.errors),
      performance: validation.performance,
    };
  } catch (error) {
    validationLogger.error("Lightweight validation failed", { error });
    return {
      success: false,
      details: {},
      issues: [
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
      performance: {
        totalTime: 0,
        initializationTime: 0,
        embeddingTime: 0,
        assemblyTime: 0,
      },
    };
  }
}
