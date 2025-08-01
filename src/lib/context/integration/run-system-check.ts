/**
 * Run System Check Script
 *
 * Simple script to run system health checks on the context assembly integration
 */

import {
  performSystemHealthCheck,
  quickAvailabilityCheck,
  generateDeploymentReadiness,
} from "./system-check";
import { logger } from "$lib/logging/logger";

const checkLogger = logger.namespace("SystemCheckRunner");

/**
 * Execute all system checks and log results
 */
export async function runAllSystemChecks() {
  checkLogger.info("Starting comprehensive system checks...");

  try {
    // Quick availability check
    checkLogger.info("1. Running quick availability check...");
    const quickCheck = await quickAvailabilityCheck();
    checkLogger.info("Quick check results:", quickCheck);

    // Full health check
    checkLogger.info("2. Running full system health check...");
    const healthReport = await performSystemHealthCheck();
    checkLogger.info("Health check results:", {
      overall: healthReport.overall,
      availableComponents: healthReport.components.filter((c) => c.available)
        .length,
      totalComponents: healthReport.components.length,
    });

    // Log component details
    healthReport.components.forEach((component) => {
      if (component.available) {
        checkLogger.info(`✅ ${component.component}: Available`);
      } else {
        checkLogger.error(`❌ ${component.component}: ${component.error}`);
      }
    });

    // Recommendations
    if (healthReport.recommendations.length > 0) {
      checkLogger.info("Recommendations:");
      healthReport.recommendations.forEach((rec) => {
        checkLogger.info(`  - ${rec}`);
      });
    }

    // Deployment readiness
    checkLogger.info("3. Checking deployment readiness...");
    const deploymentCheck = await generateDeploymentReadiness();
    checkLogger.info("Deployment readiness:", {
      ready: deploymentCheck.ready,
      requiredIssues: deploymentCheck.requiredComponents.length,
      optionalIssues: deploymentCheck.optionalComponents.length,
      blockers: deploymentCheck.blockers.length,
    });

    if (deploymentCheck.blockers.length > 0) {
      checkLogger.warn("Deployment blockers found:");
      deploymentCheck.blockers.forEach((blocker) => {
        checkLogger.warn(`  - ${blocker}`);
      });
    }

    return {
      quickCheck,
      healthReport,
      deploymentCheck,
      summary: {
        contextSystemReady: quickCheck.contextSystem,
        embeddingSystemReady: quickCheck.embeddingSystem,
        documentSystemReady: quickCheck.documentSystem,
        chatIntegrationReady: quickCheck.chatIntegration,
        overallHealth: healthReport.overall,
        deploymentReady: deploymentCheck.ready,
      },
    };
  } catch (error) {
    checkLogger.error("System check failed:", { error });
    throw error;
  }
}

/**
 * Run minimal check for CI/CD
 */
export async function runMinimalCheck() {
  checkLogger.info("Running minimal system check for CI/CD...");

  try {
    const quickCheck = await quickAvailabilityCheck();
    const requiredSystems = [
      "contextSystem",
      "embeddingSystem",
      "documentSystem",
    ];
    const criticalFailures = requiredSystems.filter(
      (system) => !quickCheck[system as keyof typeof quickCheck],
    );

    const isHealthy = criticalFailures.length === 0;

    checkLogger.info("Minimal check results:", {
      healthy: isHealthy,
      criticalFailures,
      details: quickCheck,
    });

    return {
      healthy: isHealthy,
      criticalFailures,
      details: quickCheck,
    };
  } catch (error) {
    checkLogger.error("Minimal check failed:", { error });
    return {
      healthy: false,
      criticalFailures: ["System check execution failed"],
      details: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
