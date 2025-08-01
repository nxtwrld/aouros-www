/**
 * Context Integration Validation Test (Simplified for Medical Terms System)
 *
 * Tests the basic flow of profile context → medical terms search → chat integration
 */

import { profileContextManager } from "./profile-context";
import { chatContextService } from "./chat-service";
import { medicalExpertTools } from "../mcp-tools/medical-expert-tools";
import { logger } from "$lib/logging/logger";

export interface ValidationResult {
  success: boolean;
  details: {
    profileContext: boolean;
    medicalTermsSearch: boolean;
    chatIntegration: boolean;
    mcpTools: boolean;
  };
  errors: string[];
  performance: {
    contextInitTime: number;
    searchTime: number;
    totalTime: number;
  };
}

/**
 * Simplified validation of medical terms context integration
 */
export async function runContextValidationTest(
  profileId: string,
): Promise<ValidationResult> {
  const startTime = performance.now();
  const result: ValidationResult = {
    success: false,
    details: {
      profileContext: false,
      medicalTermsSearch: false,
      chatIntegration: false,
      mcpTools: false,
    },
    errors: [],
    performance: {
      contextInitTime: 0,
      searchTime: 0,
      totalTime: 0,
    },
  };

  try {
    // Test 1: Profile Context Initialization
    const contextStartTime = performance.now();
    await profileContextManager.initializeProfileContext(profileId);
    result.details.profileContext =
      profileContextManager.isContextReady(profileId);
    result.performance.contextInitTime = performance.now() - contextStartTime;

    // Test 2: Medical Terms Search
    const searchStartTime = performance.now();
    const searchResult = await medicalExpertTools.searchDocuments(
      { terms: ["blood", "test", "latest"], limit: 5 },
      profileId,
    );
    result.details.medicalTermsSearch = !searchResult.isError;
    result.performance.searchTime = performance.now() - searchStartTime;

    // Test 3: Chat Integration (basic check)
    try {
      const contextResult = await chatContextService.prepareContextForChat(
        "latest blood test results",
        { profileId, maxResults: 5 },
      );
      result.details.chatIntegration = !!contextResult;
    } catch (error) {
      result.details.chatIntegration = false;
      result.errors.push(
        `Chat integration test failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Test 4: MCP Tools (basic availability check)
    result.details.mcpTools =
      typeof medicalExpertTools.searchDocuments === "function";

    result.success = Object.values(result.details).every((test) => test);
    result.performance.totalTime = performance.now() - startTime;

    logger.namespace("ValidationTest").info("Context validation completed", {
      success: result.success,
      details: result.details,
      performance: result.performance,
    });
  } catch (error) {
    result.errors.push(
      `Validation test failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    result.performance.totalTime = performance.now() - startTime;

    logger.namespace("ValidationTest").error("Context validation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return result;
}

// Backward compatibility export
export const validateContextAssemblyIntegration = runContextValidationTest;
