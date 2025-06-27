import type { DocumentProcessingState } from "../state";
import { fetchGpt } from "$lib/ai/gpt";
import featureDetection from "$lib/configurations/feature-detection";
import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";

export const featureDetectionNode = async (
  state: DocumentProcessingState,
): Promise<Partial<DocumentProcessingState>> => {
  try {
    // Use existing feature detection configuration
    const schema = featureDetection as FunctionDefinition;

    // Perform feature detection using existing GPT function
    const result = await fetchGpt(state.content, schema, "feature_detection");

    // Update token usage
    const tokenUsage = {
      ...state.tokenUsage,
      feature_detection: result.usage?.total_tokens || 0,
      total: state.tokenUsage.total + (result.usage?.total_tokens || 0),
    };

    // Extract feature detection results
    const detectionResult =
      result.choices[0]?.message?.function_call?.arguments;
    const parsedResult = detectionResult ? JSON.parse(detectionResult) : {};

    return {
      featureDetection: {
        type: parsedResult.category || "unknown",
        confidence: parsedResult.notMedical ? 0 : 0.9,
        features: parsedResult.tags || [],
      },
      tokenUsage,
    };
  } catch (error) {
    console.error("Feature detection error:", error);
    return {
      errors: [
        ...(state.errors || []),
        {
          node: "feature_detection",
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
};
