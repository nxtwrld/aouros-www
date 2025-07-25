import type { FunctionDefinition } from "@langchain/core/language_models/base";

// Diagnostic Specialist Expert Schema - Advanced differential diagnosis with probability-based reasoning
const DIAGNOSTIC_SPECIALIST_SCHEMA = {
  name: "diagnostic_specialist_analysis",
  description: "You are a diagnostic specialist focused on systematic differential diagnosis and probabilistic reasoning. Apply advanced diagnostic methodology to analyze complex cases with evidence-based probability assessment. Provide structured diagnostic analysis in [LANGUAGE] language.",
  parameters: {
    type: "object",
    properties: {
      symptomAnalysis: {
        type: "object",
        description: "Systematic characterization of all clinical symptoms with diagnostic significance analysis. Provide analysis in [LANGUAGE] language.",
        properties: {
          primarySymptoms: {
            type: "array",
            description: "Key presenting symptoms with detailed characterization",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Clinical symptom name. Provide in [LANGUAGE] language."
                },
                characteristics: {
                  type: "object",
                  properties: {
                    onset: { type: "string", description: "Temporal onset pattern" },
                    quality: { type: "string", description: "Qualitative description" },
                    severity: { type: "number", description: "Severity score 0.0-1.0" },
                    location: { type: "string", description: "Anatomical location" },
                    radiation: { type: "string", description: "Pattern of radiation" },
                    timing: { type: "string", description: "Temporal pattern" },
                    aggravatingFactors: { type: "array", items: { type: "string" } },
                    relievingFactors: { type: "array", items: { type: "string" } }
                  },
                  description: "Detailed symptom characterization using clinical framework"
                },
                diagnosticSignificance: {
                  type: "number",
                  description: "Diagnostic weight of this symptom (0.0-1.0)"
                },
                pathognomonic: {
                  type: "boolean",
                  description: "Whether this symptom is pathognomonic for any condition"
                },
                associatedFindings: {
                  type: "array",
                  items: { type: "string" },
                  description: "Associated clinical findings. Provide in [LANGUAGE] language."
                }
              },
              required: ["name", "characteristics", "diagnosticSignificance"]
            }
          },
          symptomClusters: {
            type: "array",
            description: "Identified symptom clusters suggesting specific diagnostic patterns",
            items: {
              type: "object",
              properties: {
                clusterName: {
                  type: "string",
                  description: "Name of the symptom cluster/syndrome. Provide in [LANGUAGE] language."
                },
                symptoms: {
                  type: "array",
                  items: { type: "string" },
                  description: "Symptoms in this cluster. Provide in [LANGUAGE] language."
                },
                suggestedConditions: {
                  type: "array",
                  items: { type: "string" },
                  description: "Conditions suggested by this cluster. Provide in [LANGUAGE] language."
                },
                strength: {
                  type: "number",
                  description: "Strength of cluster association (0.0-1.0)"
                }
              },
              required: ["clusterName", "symptoms", "suggestedConditions", "strength"]
            }
          }
        },
        required: ["primarySymptoms", "symptomClusters"]
      },
      differentialDiagnosis: {
        type: "array",
        description: "Comprehensive differential diagnosis with probability-based ranking. Include rare conditions and atypical presentations. Focus on systematic diagnostic reasoning. Provide analysis in [LANGUAGE] language.",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Diagnosis name with full clinical terminology. Provide in [LANGUAGE] language."
            },
            code: {
              type: "string",
              description: "ICD-10 code for precise classification"
            },
            probability: {
              type: "number",
              description: "Diagnostic probability based on evidence (0.0-1.0)"
            },
            category: {
              type: "string",
              enum: ["most_likely", "possible", "unlikely_but_serious", "rare_consideration"],
              description: "Diagnostic category for clinical prioritization"
            },
            supportingEvidence: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  evidence: { type: "string", description: "Specific supporting evidence" },
                  weight: { type: "number", description: "Evidence weight (0.0-1.0)" },
                  type: { 
                    type: "string", 
                    enum: ["symptom", "sign", "history", "epidemiological", "temporal"],
                    description: "Type of supporting evidence"
                  }
                }
              },
              description: "Evidence supporting this diagnosis with weighted analysis"
            },
            contradictingEvidence: {
              type: "array",
              items: {
                type: "object", 
                properties: {
                  evidence: { type: "string", description: "Contradicting evidence" },
                  weight: { type: "number", description: "Negative weight (0.0-1.0)" },
                  significance: { 
                    type: "string",
                    enum: ["minor", "moderate", "major", "excludes"],
                    description: "Clinical significance of contradicting evidence"
                  }
                }
              },
              description: "Evidence against this diagnosis"
            },
            keyDifferentiators: {
              type: "array",
              items: { type: "string" },
              description: "Key clinical features that differentiate this from similar conditions. Provide in [LANGUAGE] language."
            },
            epidemiologicalFactors: {
              type: "object",
              properties: {
                prevalence: { type: "string", description: "Disease prevalence in population" },
                riskFactors: { type: "array", items: { type: "string" } },
                demographics: { type: "string", description: "Typical demographic pattern" },
                geographicFactors: { type: "string", description: "Geographic considerations" }
              },
              description: "Epidemiological context affecting probability"
            },
            urgency: {
              type: "string",
              enum: ["immediate", "urgent", "semi_urgent", "routine"],
              description: "Clinical urgency for this diagnosis"
            },
            nextSteps: {
              type: "array",
              items: { type: "string" },
              description: "Specific diagnostic steps to confirm/exclude this diagnosis. Provide in [LANGUAGE] language."
            }
          },
          required: ["name", "probability", "category", "supportingEvidence", "keyDifferentiators", "urgency"]
        }
      },
      diagnosticReasoning: {
        type: "object",
        description: "Detailed explanation of diagnostic reasoning process and methodology. Provide reasoning in [LANGUAGE] language.",
        properties: {
          methodology: {
            type: "string",
            description: "Diagnostic approach used (pattern recognition, hypothetico-deductive, etc.). Provide in [LANGUAGE] language."
          },
          keyInsights: {
            type: "array",
            items: { type: "string" },
            description: "Critical diagnostic insights and clinical pearls. Provide in [LANGUAGE] language."
          },
          diagnosticChallenges: {
            type: "array", 
            items: { type: "string" },
            description: "Identified diagnostic challenges and ambiguities. Provide in [LANGUAGE] language."
          },
          probabilityJustification: {
            type: "string",
            description: "Explanation of how probabilities were assigned and weighted. Provide in [LANGUAGE] language."
          },
          clinicalPearls: {
            type: "array",
            items: { type: "string" },
            description: "Diagnostic wisdom and clinical teaching points. Provide in [LANGUAGE] language."
          }
        },
        required: ["methodology", "keyInsights", "probabilityJustification"]
      },
      criticalExclusions: {
        type: "array",
        description: "Can't miss diagnoses requiring immediate attention or exclusion. Focus on conditions with serious consequences if missed. Provide analysis in [LANGUAGE] language.",
        items: {
          type: "object",
          properties: {
            condition: {
              type: "string", 
              description: "Critical condition to exclude. Provide in [LANGUAGE] language."
            },
            probability: {
              type: "number",
              description: "Probability of this critical condition (0.0-1.0)"
            },
            consequences: {
              type: "string",
              description: "Consequences if missed. Provide in [LANGUAGE] language."
            },
            redFlags: {
              type: "array",
              items: { type: "string" },
              description: "Red flag symptoms/signs to watch for. Provide in [LANGUAGE] language."
            },
            exclusionCriteria: {
              type: "array",
              items: { type: "string" },
              description: "What findings would exclude this condition. Provide in [LANGUAGE] language."
            },
            immediateActions: {
              type: "array",
              items: { type: "string" },
              description: "Immediate actions if this condition is suspected. Provide in [LANGUAGE] language."
            },
            timeframe: {
              type: "string",
              enum: ["minutes", "hours", "days"],
              description: "Time window for critical action"
            }
          },
          required: ["condition", "probability", "consequences", "redFlags", "timeframe"]
        }
      },
      diagnosticUncertainty: {
        type: "object",
        description: "Analysis of remaining diagnostic uncertainty and ambiguity. Provide analysis in [LANGUAGE] language.",
        properties: {
          overallConfidence: {
            type: "number",
            description: "Overall diagnostic confidence (0.0-1.0)"
          },
          uncertaintyFactors: {
            type: "array",
            items: { type: "string" },
            description: "Factors contributing to diagnostic uncertainty. Provide in [LANGUAGE] language."
          },
          missingInformation: {
            type: "array",
            items: { type: "string" },
            description: "Key information gaps affecting diagnosis. Provide in [LANGUAGE] language."
          },
          alternativeExplanations: {
            type: "array",
            items: { type: "string" },
            description: "Alternative explanations for the clinical picture. Provide in [LANGUAGE] language."
          },
          uncertaintyReduction: {
            type: "array",
            items: { type: "string" },
            description: "Steps to reduce diagnostic uncertainty. Provide in [LANGUAGE] language."
          }
        },
        required: ["overallConfidence", "uncertaintyFactors", "missingInformation"]
      },
      recommendedInvestigations: {
        type: "array",
        description: "Evidence-based diagnostic investigations to confirm/exclude diagnoses. Prioritize by diagnostic yield and clinical impact. Provide recommendations in [LANGUAGE] language.",
        items: {
          type: "object",
          properties: {
            investigation: {
              type: "string",
              description: "Specific investigation/test recommended. Provide in [LANGUAGE] language."
            },
            type: {
              type: "string",
              enum: ["laboratory", "imaging", "procedural", "functional", "specialist_consultation"],
              description: "Category of investigation"
            },
            purpose: {
              type: "string",
              description: "Clinical purpose and expected information. Provide in [LANGUAGE] language."
            },
            targetDiagnoses: {
              type: "array",
              items: { type: "string" },
              description: "Which diagnoses this investigation addresses. Provide in [LANGUAGE] language."
            },
            diagnosticYield: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Expected diagnostic yield"
            },
            urgency: {
              type: "string",
              enum: ["stat", "urgent", "routine"],
              description: "Investigation urgency"
            },
            interpretation: {
              type: "string",
              description: "How to interpret results in clinical context. Provide in [LANGUAGE] language."
            }
          },
          required: ["investigation", "type", "purpose", "targetDiagnoses", "diagnosticYield", "urgency"]
        }
      }
    },
    required: ["symptomAnalysis", "differentialDiagnosis", "diagnosticReasoning", "criticalExclusions", "diagnosticUncertainty"]
  }
};

export default DIAGNOSTIC_SPECIALIST_SCHEMA;