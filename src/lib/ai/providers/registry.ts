// AI Provider Registry - Defines available providers and their capabilities
// Supports intelligent provider selection based on document type and content

export enum AIProvider {
  OPENAI_GPT4 = "openai-gpt4",
  OPENAI_GPT4_TURBO = "openai-gpt4-turbo",
  ANTHROPIC_CLAUDE = "anthropic-claude",
  GOOGLE_GEMINI = "google-gemini",
}

export interface ProviderCapabilities {
  strengths: string[];
  weaknesses: string[];
  cost: number; // Cost per 1K tokens
  reliability: number; // 0-1 scale
  maxTokens: number;
  supportsImages: boolean;
  supportsStreaming: boolean;
}

export const PROVIDER_CAPABILITIES: Record<AIProvider, ProviderCapabilities> = {
  [AIProvider.OPENAI_GPT4]: {
    strengths: [
      "general_medical",
      "prescription_extraction",
      "medical_terminology",
    ],
    weaknesses: ["image_analysis", "cost_efficiency"],
    cost: 0.03,
    reliability: 0.95,
    maxTokens: 8192,
    supportsImages: true,
    supportsStreaming: true,
  },
  [AIProvider.OPENAI_GPT4_TURBO]: {
    strengths: ["general_medical", "large_documents", "complex_analysis"],
    weaknesses: ["image_analysis", "cost_efficiency"],
    cost: 0.01,
    reliability: 0.93,
    maxTokens: 128000,
    supportsImages: true,
    supportsStreaming: true,
  },
  [AIProvider.ANTHROPIC_CLAUDE]: {
    strengths: ["medical_reasoning", "safety", "detailed_analysis"],
    weaknesses: ["image_analysis", "structured_output"],
    cost: 0.015,
    reliability: 0.94,
    maxTokens: 100000,
    supportsImages: true,
    supportsStreaming: true,
  },
  [AIProvider.GOOGLE_GEMINI]: {
    strengths: ["image_analysis", "multimodal", "cost_efficiency"],
    weaknesses: ["medical_terminology", "clinical_reasoning"],
    cost: 0.005,
    reliability: 0.88,
    maxTokens: 32000,
    supportsImages: true,
    supportsStreaming: true,
  },
};

export interface DocumentTypeMapping {
  documentType: string;
  preferredProviders: AIProvider[];
  requirements: {
    hasImages?: boolean;
    requiresDetailedAnalysis?: boolean;
    requiresSpecializedTerminology?: boolean;
    maxTokenLength?: number;
  };
}

export const DOCUMENT_TYPE_MAPPINGS: DocumentTypeMapping[] = [
  {
    documentType: "imaging",
    preferredProviders: [AIProvider.GOOGLE_GEMINI, AIProvider.OPENAI_GPT4],
    requirements: {
      hasImages: true,
      requiresDetailedAnalysis: false,
    },
  },
  {
    documentType: "laboratory",
    preferredProviders: [AIProvider.OPENAI_GPT4_TURBO, AIProvider.OPENAI_GPT4],
    requirements: {
      requiresSpecializedTerminology: true,
      requiresDetailedAnalysis: true,
    },
  },
  {
    documentType: "pathology",
    preferredProviders: [AIProvider.ANTHROPIC_CLAUDE, AIProvider.OPENAI_GPT4],
    requirements: {
      requiresDetailedAnalysis: true,
      requiresSpecializedTerminology: true,
      hasImages: true,
    },
  },
  {
    documentType: "surgical",
    preferredProviders: [
      AIProvider.ANTHROPIC_CLAUDE,
      AIProvider.OPENAI_GPT4_TURBO,
    ],
    requirements: {
      requiresDetailedAnalysis: true,
      maxTokenLength: 50000,
    },
  },
  {
    documentType: "cardiology",
    preferredProviders: [AIProvider.OPENAI_GPT4, AIProvider.ANTHROPIC_CLAUDE],
    requirements: {
      requiresSpecializedTerminology: true,
      hasImages: true,
    },
  },
  {
    documentType: "radiology",
    preferredProviders: [AIProvider.GOOGLE_GEMINI, AIProvider.OPENAI_GPT4],
    requirements: {
      hasImages: true,
      requiresDetailedAnalysis: true,
    },
  },
];

export class ProviderRegistry {
  /**
   * Get capabilities for a specific provider
   */
  static getCapabilities(provider: AIProvider): ProviderCapabilities {
    return PROVIDER_CAPABILITIES[provider];
  }

  /**
   * Get all available providers
   */
  static getAllProviders(): AIProvider[] {
    return Object.values(AIProvider);
  }

  /**
   * Get providers that support images
   */
  static getImageCapableProviders(): AIProvider[] {
    return this.getAllProviders().filter(
      (provider) => this.getCapabilities(provider).supportsImages,
    );
  }

  /**
   * Get providers sorted by cost efficiency
   */
  static getProvidersByCost(ascending = true): AIProvider[] {
    const providers = this.getAllProviders();
    return providers.sort((a, b) => {
      const costA = this.getCapabilities(a).cost;
      const costB = this.getCapabilities(b).cost;
      return ascending ? costA - costB : costB - costA;
    });
  }

  /**
   * Get providers sorted by reliability
   */
  static getProvidersByReliability(descending = true): AIProvider[] {
    const providers = this.getAllProviders();
    return providers.sort((a, b) => {
      const reliabilityA = this.getCapabilities(a).reliability;
      const reliabilityB = this.getCapabilities(b).reliability;
      return descending
        ? reliabilityB - reliabilityA
        : reliabilityA - reliabilityB;
    });
  }

  /**
   * Check if a provider has a specific strength
   */
  static hasStrength(provider: AIProvider, strength: string): boolean {
    return this.getCapabilities(provider).strengths.includes(strength);
  }

  /**
   * Check if a provider has a specific weakness
   */
  static hasWeakness(provider: AIProvider, weakness: string): boolean {
    return this.getCapabilities(provider).weaknesses.includes(weakness);
  }

  /**
   * Get document type mapping for a specific document type
   */
  static getDocumentTypeMapping(
    documentType: string,
  ): DocumentTypeMapping | undefined {
    return DOCUMENT_TYPE_MAPPINGS.find(
      (mapping) => mapping.documentType === documentType,
    );
  }

  /**
   * Get preferred providers for a document type
   */
  static getPreferredProviders(documentType: string): AIProvider[] {
    const mapping = this.getDocumentTypeMapping(documentType);
    return mapping?.preferredProviders || [AIProvider.OPENAI_GPT4]; // Default fallback
  }
}
