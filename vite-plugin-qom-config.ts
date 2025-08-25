// Vite Plugin for Processing QOM Configuration at Build Time
// Extracts client-safe visualization data from full server-side configuration

import type { Plugin } from "vite";
import { readFileSync } from "fs";
import { resolve } from "path";

interface ClientSafeQOMConfig {
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
  expertTemplates: Record<
    string,
    {
      type: string;
      execution: string;
      capabilities: string[];
      variationTypes?: Array<{
        id: string;
        description: string;
        riskTolerance: string;
      }>;
      consensusAlgorithms?: Record<
        string,
        {
          description: string;
          weights?: Record<string, number>;
          safetyWeight?: number;
          conservativeBonus?: number;
          evidenceScoring?: boolean;
          requireCitations?: boolean;
        }
      >;
    }
  >;
  parallelExpertExamples: Record<
    string,
    {
      triggerConditions: string[];
      expertVariations: Array<{
        id: string;
        name: string;
        specialization: string;
        approach: string;
        weight: number;
      }>;
    }
  >;
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

function extractClientSafeConfig(fullConfig: any): ClientSafeQOMConfig {
  // Extract safe visualization data, excluding sensitive AI configuration
  return {
    id: fullConfig.id,
    description: fullConfig.description,
    version: fullConfig.version,

    defaultFlow: {
      description: fullConfig.defaultFlow.description,
      nodes: fullConfig.defaultFlow.nodes.map((node: any) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        category: node.category,
        description: node.description,
        inputs: node.inputs,
        outputs: node.outputs,
        decisionCapability: node.decisionCapability,
        expertGenerationRules: node.expertGenerationRules,
        consensusStrategies: node.consensusStrategies,
        alwaysActive: node.alwaysActive,
      })),
      connections: fullConfig.defaultFlow.connections,
    },

    expertTemplates: Object.fromEntries(
      Object.entries(fullConfig.expertTemplates).map(
        ([key, template]: [string, any]) => [
          key,
          {
            type: template.type,
            execution: template.execution,
            capabilities: template.capabilities,
            variationTypes: template.variationTypes?.map((variation: any) => ({
              id: variation.id,
              description: variation.description,
              riskTolerance: variation.riskTolerance,
              // Exclude promptModifier - that's sensitive AI instruction data
            })),
            consensusAlgorithms:
              template.consensusAlgorithms &&
              Object.fromEntries(
                Object.entries(template.consensusAlgorithms).map(
                  ([algKey, alg]: [string, any]) => [
                    algKey,
                    {
                      description: alg.description,
                      weights: alg.weights,
                      safetyWeight: alg.safetyWeight,
                      conservativeBonus: alg.conservativeBonus,
                      evidenceScoring: alg.evidenceScoring,
                      requireCitations: alg.requireCitations,
                    },
                  ],
                ),
              ),
            // Exclude modelConfig - contains API credentials and sensitive model parameters
            // Exclude expertGenerationPrompt - contains AI instruction prompts
          },
        ],
      ),
    ),

    parallelExpertExamples: Object.fromEntries(
      Object.entries(fullConfig.parallelExpertExamples).map(
        ([key, example]: [string, any]) => [
          key,
          {
            triggerConditions: example.triggerConditions,
            expertVariations: example.expertVariations.map(
              (variation: any) => ({
                id: variation.id,
                name: variation.name,
                specialization: variation.specialization,
                approach: variation.approach,
                weight: variation.weight,
                // Exclude promptTemplate - contains AI instruction prompts
              }),
            ),
          },
        ],
      ),
    ),

    dynamicExpertGeneration: {
      triggerLogic: fullConfig.dynamicExpertGeneration.triggerLogic,
      expertCreationRules:
        fullConfig.dynamicExpertGeneration.expertCreationRules,
    },

    consensusStrategies: fullConfig.consensusStrategies,
  };
}

export function qomConfigPlugin(): Plugin {
  const VIRTUAL_MODULE_ID = "virtual:qom-config";
  const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;

  return {
    name: "qom-config",
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
    },
    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        try {
          // Read the full configuration from the server-side config folder
          const configPath = resolve(
            process.cwd(),
            "config/qom-medical-analysis.json",
          );
          const fullConfig = JSON.parse(readFileSync(configPath, "utf-8"));

          // Extract only client-safe data
          const clientSafeConfig = extractClientSafeConfig(fullConfig);

          // Return as ES module
          return `export default ${JSON.stringify(clientSafeConfig, null, 2)};`;
        } catch (error) {
          console.error("Failed to load QOM configuration:", error);
          return "export default {};";
        }
      }
    },
  };
}
