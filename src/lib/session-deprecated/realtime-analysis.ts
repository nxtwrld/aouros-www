import { analyze } from "./analyzeConversation";
import { ANALYZE_STEPS } from "$lib/types.d";
import { logger } from "$lib/logging/logger";

export interface RealtimeAnalysisResult {
  diagnosis?: any[];
  treatment?: any[];
  medication?: any[];
  followUp?: any[];
  isMedicalConversation?: boolean;
  confidence?: number;
}

// Analysis buffer to track what we've already analyzed
const analysisBuffer = new Map<
  string,
  {
    lastAnalyzedLength: number;
    lastAnalysisTime: number;
    pendingAnalysis: boolean;
  }
>();

export async function analyzeTranscriptionRealtime(
  fullText: string,
  language: string = "en",
  models: string[] = ["GP"],
  feedbackContext?: string,
): Promise<RealtimeAnalysisResult | null> {
  try {
    const sessionKey = `${language}_${models.join("_")}`;
    const buffer = analysisBuffer.get(sessionKey) || {
      lastAnalyzedLength: 0,
      lastAnalysisTime: 0,
      pendingAnalysis: false,
    };

    // Smart content batching - align with server-side strategy
    const now = Date.now();
    const timeSinceLastAnalysis = now - buffer.lastAnalysisTime;
    const newContentLength = fullText.length - buffer.lastAnalyzedLength;

    // Meaningful batching thresholds (same as server-side)
    const minMeaningfulContent = 100; // Meaningful content chunk
    const maxWaitTime = 15000; // Max wait before forcing analysis
    const hasEnoughContent = newContentLength >= minMeaningfulContent;
    const hasWaitedLongEnough = timeSinceLastAnalysis > maxWaitTime;

    logger.analysis.debug("Content batching analysis check:", {
      sessionKey,
      newContentLength,
      timeSinceLastAnalysis: Math.round(timeSinceLastAnalysis / 1000) + "s",
      fullTextLength: fullText.length,
      lastAnalyzedLength: buffer.lastAnalyzedLength,
      pendingAnalysis: buffer.pendingAnalysis,
      hasFeedbackContext: !!feedbackContext,
      thresholds: {
        minMeaningfulContent,
        maxWaitTime: maxWaitTime / 1000 + "s",
      },
      conditions: {
        hasEnoughContent: `${newContentLength} >= ${minMeaningfulContent}`,
        hasWaitedLongEnough: `${Math.round(timeSinceLastAnalysis / 1000)}s >= ${maxWaitTime / 1000}s`,
      },
    });

    // Skip if not enough content AND not enough time has passed
    if (!hasEnoughContent && !hasWaitedLongEnough) {
      logger.analysis.debug(
        "Batching content - waiting for more meaningful chunk",
      );
      return null;
    }

    // Prevent concurrent analysis
    if (buffer.pendingAnalysis) {
      logger.analysis.debug(
        "Analysis already in progress - batching will continue",
      );
      return null;
    }

    logger.analysis.info("Processing accumulated content batch:", {
      reason: hasEnoughContent ? "meaningful_content" : "max_wait_reached",
      contentChunk:
        fullText.substring(
          buffer.lastAnalyzedLength,
          buffer.lastAnalyzedLength + 150,
        ) + "...",
      feedbackContext: feedbackContext ? "included" : "none",
    });

    // Mark as pending
    buffer.pendingAnalysis = true;
    analysisBuffer.set(sessionKey, buffer);

    // Prepare analysis request with feedback context
    const analysisRequest = {
      language: language === "en" ? "english" : "czech", // Map to expected format
      type: ANALYZE_STEPS.transcript,
      models: models,
      text: fullText,
      feedbackContext: feedbackContext, // Add feedback context to the request
    };

    logger.analysis.debug("Analysis request for batched content:", {
      textLength: analysisRequest.text.length,
      language: analysisRequest.language,
      inputLanguage: language,
      models: analysisRequest.models,
      hasFeedbackContext: !!analysisRequest.feedbackContext,
    });

    // Use existing analyze function
    const result = await analyze(analysisRequest);

    logger.analysis.debug("Raw analysis result:", result);

    // Update buffer
    buffer.lastAnalyzedLength = fullText.length;
    buffer.lastAnalysisTime = now;
    buffer.pendingAnalysis = false;
    analysisBuffer.set(sessionKey, buffer);

    // Check if it's a medical conversation based on diagnosis content
    const hasMedicalContent =
      result.diagnosis?.length > 0 ||
      result.treatment?.length > 0 ||
      result.medication?.length > 0;

    logger.analysis.debug("Medical content analysis:", {
      hasDiagnosis: !!result.diagnosis,
      diagnosisLength: result.diagnosis?.length || 0,
      hasTreatment: !!result.treatment,
      treatmentLength: result.treatment?.length || 0,
      hasMedication: !!result.medication,
      medicationLength: result.medication?.length || 0,
      hasMedicalContent,
    });

    if (!hasMedicalContent) {
      logger.analysis.warn("No medical content detected in batched analysis");
      return {
        diagnosis: result.diagnosis || [],
        treatment: result.treatment || [],
        medication: result.medication || [],
        followUp: result.followUp || [],
        isMedicalConversation: false,
        confidence: 0.3,
      };
    }

    // Return structured result
    return {
      diagnosis: result.diagnosis || [],
      treatment: result.treatment || [],
      medication: result.medication || [],
      followUp: result.followUp || [],
      isMedicalConversation: true,
      confidence: 0.8, // Estimate confidence
    };
  } catch (error) {
    logger.analysis.error("Batched analysis error:", error);

    // Reset pending flag on error
    const sessionKey = `${language}_${models.join("_")}`;
    const buffer = analysisBuffer.get(sessionKey);
    if (buffer) {
      buffer.pendingAnalysis = false;
      analysisBuffer.set(sessionKey, buffer);
    }

    return null;
  }
}

// Progressive analysis for different medical steps
export async function analyzeProgressively(
  fullText: string,
  language: string = "en",
  models: string[] = ["GP"],
  step: ANALYZE_STEPS = ANALYZE_STEPS.transcript,
): Promise<RealtimeAnalysisResult | null> {
  try {
    const analysisRequest = {
      language: language === "en" ? "english" : "czech",
      type: step,
      models: models,
      text: fullText,
    };

    logger.analysis.debug("Progressive analysis request:", {
      step: step,
      textLength: analysisRequest.text.length,
      language: analysisRequest.language,
      inputLanguage: language,
      models: analysisRequest.models,
    });

    const result = await analyze(analysisRequest);

    // Check for medical content
    const hasMedicalContent =
      result.diagnosis?.length > 0 ||
      result.treatment?.length > 0 ||
      result.medication?.length > 0;

    return {
      diagnosis: result.diagnosis || [],
      treatment: result.treatment || [],
      medication: result.medication || [],
      followUp: result.followUp || [],
      isMedicalConversation: hasMedicalContent,
      confidence: 0.8,
    };
  } catch (error) {
    logger.analysis.error("Progressive analysis error:", error);
    return null;
  }
}

// Clear analysis buffer for a session
export function clearAnalysisBuffer(sessionKey: string): void {
  analysisBuffer.delete(sessionKey);
}

// Get analysis status
export function getAnalysisStatus(sessionKey: string): {
  isAnalyzing: boolean;
  lastAnalyzedLength: number;
  lastAnalysisTime: number;
} {
  const buffer = analysisBuffer.get(sessionKey) || {
    lastAnalyzedLength: 0,
    lastAnalysisTime: 0,
    pendingAnalysis: false,
  };

  return {
    isAnalyzing: buffer.pendingAnalysis,
    lastAnalyzedLength: buffer.lastAnalyzedLength,
    lastAnalysisTime: buffer.lastAnalysisTime,
  };
}
