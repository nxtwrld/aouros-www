// Provider Selection Logic - Intelligent AI provider selection based on content and requirements
// Considers document type, content characteristics, cost, and reliability

import {
  ProviderRegistry,
  AIProvider,
  type ProviderCapabilities,
} from "./registry";
import type { DocumentProcessingState } from "$lib/langgraph/state";

export interface SelectionCriteria {
  documentType?: string;
  hasImages: boolean;
  estimatedTokens: number;
  requiresHighReliability: boolean;
  costSensitive: boolean;
  preferredProvider?: string;
  language?: string;
}

export interface ProviderScore {
  provider: AIProvider;
  score: number;
  reasoning: string[];
  capabilities: ProviderCapabilities;
}

export interface SelectionResult {
  selectedProvider: AIProvider;
  fallbackProviders: AIProvider[];
  reasoning: string[];
  estimatedCost: number;
  confidence: number;
}

export class ProviderSelector {
  /**
   * Select the best AI provider based on processing state and requirements
   */
  static selectProvider(state: DocumentProcessingState): SelectionResult {
    const criteria = this.extractCriteria(state);
    return this.selectOptimalProvider(criteria);
  }

  /**
   * Extract selection criteria from document processing state
   */
  private static extractCriteria(
    state: DocumentProcessingState,
  ): SelectionCriteria {
    const documentType = state.featureDetection?.type || "general";
    const hasImages = (state.images?.length || 0) > 0;
    const textLength = state.text?.length || 0;
    const estimatedTokens = Math.ceil(textLength / 4) + (hasImages ? 1000 : 0); // Rough token estimation

    return {
      documentType,
      hasImages,
      estimatedTokens,
      requiresHighReliability: this.isHighStakeDocument(documentType),
      costSensitive: estimatedTokens > 10000, // Cost matters for large documents
      preferredProvider: state.options?.preferredProvider,
      language: state.language,
    };
  }

  /**
   * Determine if document type requires high reliability
   */
  private static isHighStakeDocument(documentType: string): boolean {
    const highStakeTypes = [
      "pathology",
      "surgical",
      "oncology",
      "critical_care",
    ];
    return highStakeTypes.includes(documentType);
  }

  /**
   * Select optimal provider based on criteria
   */
  static selectOptimalProvider(criteria: SelectionCriteria): SelectionResult {
    // If preferred provider is specified, validate and use it
    if (criteria.preferredProvider) {
      const preferredProvider = criteria.preferredProvider as AIProvider;
      if (Object.values(AIProvider).includes(preferredProvider)) {
        const capabilities =
          ProviderRegistry.getCapabilities(preferredProvider);
        return {
          selectedProvider: preferredProvider,
          fallbackProviders: this.getFallbackProviders(
            preferredProvider,
            criteria,
          ),
          reasoning: [
            `User specified preferred provider: ${preferredProvider}`,
          ],
          estimatedCost: this.calculateCost(
            preferredProvider,
            criteria.estimatedTokens,
          ),
          confidence: 0.9,
        };
      }
    }

    // Score all providers
    const scores = this.scoreAllProviders(criteria);

    // Sort by score (descending)
    scores.sort((a, b) => b.score - a.score);

    const best = scores[0];
    const fallbacks = scores.slice(1, 3).map((s) => s.provider);

    return {
      selectedProvider: best.provider,
      fallbackProviders: fallbacks,
      reasoning: best.reasoning,
      estimatedCost: this.calculateCost(
        best.provider,
        criteria.estimatedTokens,
      ),
      confidence: this.calculateConfidence(best.score, scores),
    };
  }

  /**
   * Score all available providers for the given criteria
   */
  private static scoreAllProviders(
    criteria: SelectionCriteria,
  ): ProviderScore[] {
    const providers = ProviderRegistry.getAllProviders();

    return providers.map((provider) => {
      const score = this.scoreProvider(provider, criteria);
      return score;
    });
  }

  /**
   * Score a single provider based on criteria
   */
  private static scoreProvider(
    provider: AIProvider,
    criteria: SelectionCriteria,
  ): ProviderScore {
    const capabilities = ProviderRegistry.getCapabilities(provider);
    let score = 0;
    const reasoning: string[] = [];

    // Base score from reliability
    score += capabilities.reliability * 40;
    reasoning.push(`Reliability: ${capabilities.reliability}`);

    // Document type preference
    if (criteria.documentType) {
      const preferredProviders = ProviderRegistry.getPreferredProviders(
        criteria.documentType,
      );
      if (preferredProviders.includes(provider)) {
        const position = preferredProviders.indexOf(provider);
        const bonus = Math.max(20 - position * 5, 5);
        score += bonus;
        reasoning.push(`Preferred for ${criteria.documentType} (+${bonus})`);
      }
    }

    // Image processing capability
    if (criteria.hasImages) {
      if (capabilities.supportsImages) {
        if (ProviderRegistry.hasStrength(provider, "image_analysis")) {
          score += 15;
          reasoning.push("Strong image analysis (+15)");
        } else {
          score += 5;
          reasoning.push("Supports images (+5)");
        }
      } else {
        score -= 20;
        reasoning.push("No image support (-20)");
      }
    }

    // Token capacity check
    if (criteria.estimatedTokens > capabilities.maxTokens) {
      score -= 30;
      reasoning.push(`Exceeds token limit (-30)`);
    } else if (criteria.estimatedTokens > capabilities.maxTokens * 0.8) {
      score -= 10;
      reasoning.push(`Near token limit (-10)`);
    }

    // Cost consideration
    if (criteria.costSensitive) {
      const costPenalty = capabilities.cost * 10;
      score -= costPenalty;
      reasoning.push(`Cost penalty (-${costPenalty.toFixed(1)})`);
    }

    // High reliability requirement
    if (criteria.requiresHighReliability) {
      if (capabilities.reliability >= 0.93) {
        score += 10;
        reasoning.push("High reliability (+10)");
      } else {
        score -= 15;
        reasoning.push("Below reliability threshold (-15)");
      }
    }

    // Medical terminology strength
    if (ProviderRegistry.hasStrength(provider, "medical_terminology")) {
      score += 8;
      reasoning.push("Medical terminology strength (+8)");
    }

    // Ensure score is non-negative
    score = Math.max(0, score);

    return {
      provider,
      score,
      reasoning,
      capabilities,
    };
  }

  /**
   * Get fallback providers for a selected provider
   */
  private static getFallbackProviders(
    selectedProvider: AIProvider,
    criteria: SelectionCriteria,
  ): AIProvider[] {
    const allProviders = ProviderRegistry.getAllProviders();
    const alternatives = allProviders.filter((p) => p !== selectedProvider);

    // For fallbacks, prioritize reliability and compatibility
    return alternatives
      .filter((provider) => {
        const capabilities = ProviderRegistry.getCapabilities(provider);
        return (
          (!criteria.hasImages || capabilities.supportsImages) &&
          criteria.estimatedTokens <= capabilities.maxTokens
        );
      })
      .sort((a, b) => {
        const reliabilityA = ProviderRegistry.getCapabilities(a).reliability;
        const reliabilityB = ProviderRegistry.getCapabilities(b).reliability;
        return reliabilityB - reliabilityA;
      })
      .slice(0, 2);
  }

  /**
   * Calculate estimated cost for processing
   */
  private static calculateCost(
    provider: AIProvider,
    estimatedTokens: number,
  ): number {
    const capabilities = ProviderRegistry.getCapabilities(provider);
    return (estimatedTokens / 1000) * capabilities.cost;
  }

  /**
   * Calculate confidence in the selection
   */
  private static calculateConfidence(
    bestScore: number,
    allScores: ProviderScore[],
  ): number {
    if (allScores.length < 2) return 1.0;

    const secondBest = allScores[1].score;
    const gap = bestScore - secondBest;

    // Confidence based on score gap and absolute score
    const gapConfidence = Math.min(gap / 20, 1.0); // Normalize gap to 0-1
    const absoluteConfidence = Math.min(bestScore / 80, 1.0); // Normalize score to 0-1

    return gapConfidence * 0.6 + absoluteConfidence * 0.4;
  }

  /**
   * Get selection explanation for debugging/logging
   */
  static explainSelection(result: SelectionResult): string {
    return [
      `Selected: ${result.selectedProvider}`,
      `Confidence: ${(result.confidence * 100).toFixed(1)}%`,
      `Estimated Cost: $${result.estimatedCost.toFixed(4)}`,
      `Reasoning: ${result.reasoning.join(", ")}`,
      `Fallbacks: ${result.fallbackProviders.join(", ")}`,
    ].join("\n");
  }
}
