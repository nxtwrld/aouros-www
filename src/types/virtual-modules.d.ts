// Virtual Module Declarations

declare module 'virtual:dag-config' {
  interface ClientSafeDAGConfig {
    id: string;
    description: string;
    version: string;
    defaultFlow: {
      description: string;
      nodes: Array<{
        id: string;
        name: string;
        type: string;
        category: string;
        description: string;
        inputs?: string[];
        outputs?: string[];
        decisionCapability?: string;
        expertGenerationRules?: {
          maxParallelExperts: number;
          complexityThresholds: Record<string, number>;
        };
        consensusStrategies?: string[];
        alwaysActive?: boolean;
      }>;
      connections: Array<{
        from: string;
        to: string;
        type: string;
      }>;
    };
    expertTemplates: Record<string, {
      type: string;
      execution: string;
      capabilities: string[];
      variationTypes?: Array<{
        id: string;
        description: string;
        riskTolerance: string;
      }>;
      consensusAlgorithms?: Record<string, {
        description: string;
        weights?: Record<string, number>;
        safetyWeight?: number;
        conservativeBonus?: number;
        evidenceScoring?: boolean;
        requireCitations?: boolean;
      }>;
    }>;
    parallelExpertExamples: Record<string, {
      triggerConditions: string[];
      expertVariations: Array<{
        id: string;
        name: string;
        specialization: string;
        approach: string;
        weight: number;
      }>;
    }>;
    dynamicExpertGeneration: {
      triggerLogic: {
        complexityFactors: string[];
        specialtyMapping: Record<string, string[]>;
      };
      expertCreationRules: {
        minExperts: number;
        maxExperts: number;
        complexityScaling: Record<string, number>;
        diversityRequirements: {
          requireDifferentApproaches: boolean;
          maxSameSpecialty: number;
          balanceRiskTolerances: boolean;
        };
      };
    };
    consensusStrategies: {
      agreement_threshold: number;
      conflict_resolution: Record<string, string>;
      output_format: {
        include_dissenting_opinions: boolean;
        show_confidence_levels: boolean;
        attribute_recommendations: boolean;
        explain_reasoning: boolean;
      };
    };
  }

  const config: ClientSafeDAGConfig;
  export default config;
}