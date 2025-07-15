import type { DocumentProcessingState } from "../state";
import {
  ProviderSelector,
  type SelectionResult,
} from "$lib/ai/providers/selection";
import { AIProvider } from "$lib/ai/providers/registry";

export const providerSelectionNode = async (
  state: DocumentProcessingState,
): Promise<Partial<DocumentProcessingState>> => {
  console.log("🔍 Starting provider selection...");

  try {
    // Use intelligent provider selection
    const selection: SelectionResult = ProviderSelector.selectProvider(state);

    console.log("✅ Provider selected:", selection.selectedProvider);
    console.log(
      "📊 Selection confidence:",
      (selection.confidence * 100).toFixed(1) + "%",
    );
    console.log("💰 Estimated cost:", "$" + selection.estimatedCost.toFixed(4));
    console.log(
      "🔄 Fallback providers:",
      selection.fallbackProviders.join(", "),
    );

    // Log detailed explanation if debug mode
    if (process.env.NODE_ENV === "development") {
      console.log("📝 Selection reasoning:");
      selection.reasoning.forEach((reason, index) => {
        console.log(`  ${index + 1}. ${reason}`);
      });
    }

    return {
      selectedProvider: selection.selectedProvider,
      fallbackProviders: selection.fallbackProviders,
      providerMetadata: {
        selection,
        reasoning: selection.reasoning,
        confidence: selection.confidence,
        estimatedCost: selection.estimatedCost,
      },
    };
  } catch (error) {
    console.error("❌ Provider selection failed:", error);

    // Fallback to default provider (backwards compatibility)
    const fallbackProvider = AIProvider.OPENAI_GPT4;
    console.log("🔄 Falling back to default provider:", fallbackProvider);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      selectedProvider: fallbackProvider,
      fallbackProviders: [AIProvider.OPENAI_GPT4_TURBO],
      providerMetadata: {
        error: errorMessage,
        fallback: true,
        reasoning: ["Failed to select provider, using default GPT-4"],
        confidence: 0.5,
        estimatedCost: 0.03, // Default GPT-4 cost estimate
      },
    };
  }
};
