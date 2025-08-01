import type { FunctionDefinition } from "@langchain/core/language_models/base";

// Clinical Inquiry Expert Schema - Strategic questioning for maximum diagnostic yield
const CLINICAL_INQUIRY_SCHEMA = {
  name: "clinical_inquiry_specialist",
  description:
    "You are a clinical inquiry specialist focused on generating strategic questions that maximize diagnostic yield. Design questions that efficiently narrow differential diagnosis, identify red flags, and optimize treatment decisions. Provide strategic questioning analysis in [LANGUAGE] language.",
  parameters: {
    type: "object",
    properties: {
      strategicInquiries: {
        type: "array",
        description:
          "Generate 5-10 high-yield clinical questions prioritized by diagnostic impact. Focus on questions that significantly change clinical management or narrow differential diagnosis. Provide questions in [LANGUAGE] language.",
        items: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description:
                "Specific, clear question for the patient. Use empathetic, understandable language while maintaining clinical precision. Provide in [LANGUAGE] language.",
            },
            category: {
              type: "string",
              enum: [
                "symptom_characterization",
                "temporal_pattern",
                "severity_assessment",
                "functional_impact",
                "associated_symptoms",
                "triggering_factors",
                "medical_history",
                "medication_history",
                "family_history",
                "social_history",
                "review_of_systems",
                "red_flag_screening",
                "differential_clarification",
                "treatment_response",
                "compliance_assessment",
              ],
              description:
                "Clinical category of the inquiry for systematic assessment",
            },
            intent: {
              type: "string",
              enum: [
                "confirmatory",
                "exclusionary",
                "exploratory",
                "risk_stratification",
                "severity_assessment",
                "functional_assessment",
                "safety_screening",
                "compliance_evaluation",
              ],
              description: "Primary clinical intent behind the question",
            },
            priority: {
              type: "string",
              enum: ["critical", "high", "medium", "low"],
              description:
                "Clinical priority: critical (safety/emergency), high (diagnostic impact), medium (helpful context), low (additional information)",
            },
            diagnosticImpact: {
              type: "object",
              description:
                "Analysis of how different responses would affect clinical decisions",
              properties: {
                ifPositive: {
                  type: "object",
                  properties: {
                    implication: {
                      type: "string",
                      description:
                        "Clinical implications of positive response. Provide in [LANGUAGE] language.",
                    },
                    probabilityChange: {
                      type: "number",
                      description:
                        "Change in diagnostic probability (-1.0 to +1.0)",
                    },
                    nextSteps: {
                      type: "array",
                      items: { type: "string" },
                      description:
                        "Recommended next steps if positive. Provide in [LANGUAGE] language.",
                    },
                  },
                },
                ifNegative: {
                  type: "object",
                  properties: {
                    implication: {
                      type: "string",
                      description:
                        "Clinical implications of negative response. Provide in [LANGUAGE] language.",
                    },
                    probabilityChange: {
                      type: "number",
                      description:
                        "Change in diagnostic probability (-1.0 to +1.0)",
                    },
                    nextSteps: {
                      type: "array",
                      items: { type: "string" },
                      description:
                        "Recommended next steps if negative. Provide in [LANGUAGE] language.",
                    },
                  },
                },
              },
              required: ["ifPositive", "ifNegative"],
            },
            relatedDiagnoses: {
              type: "array",
              items: { type: "string" },
              description:
                "Specific diagnoses this question helps clarify or differentiate. Provide in [LANGUAGE] language.",
            },
            clinicalRationale: {
              type: "string",
              description:
                "Detailed explanation of why this question is strategically important and how it impacts clinical decision-making. Provide in [LANGUAGE] language.",
            },
            questionDesign: {
              type: "object",
              description:
                "Analysis of question construction and optimal phrasing",
              properties: {
                questionType: {
                  type: "string",
                  enum: ["open_ended", "closed_ended", "scale_based", "binary"],
                  description:
                    "Type of question structure for optimal response",
                },
                phrasingSuggestions: {
                  type: "array",
                  items: { type: "string" },
                  description:
                    "Alternative phrasings for different patient populations. Provide in [LANGUAGE] language.",
                },
                culturalConsiderations: {
                  type: "string",
                  description:
                    "Cultural sensitivity considerations for this question. Provide in [LANGUAGE] language.",
                },
              },
            },
            expectedAnswerPatterns: {
              type: "array",
              description:
                "Anticipated response patterns with clinical interpretation",
              items: {
                type: "object",
                properties: {
                  response: {
                    type: "string",
                    description:
                      "Typical patient response. Provide in [LANGUAGE] language.",
                  },
                  frequency: {
                    type: "string",
                    enum: ["common", "occasional", "rare"],
                    description: "Expected frequency of this response",
                  },
                  clinicalSignificance: {
                    type: "string",
                    description:
                      "What this response indicates clinically. Provide in [LANGUAGE] language.",
                  },
                  followUpNeeded: {
                    type: "boolean",
                    description:
                      "Whether this response requires immediate follow-up",
                  },
                },
                required: ["response", "frequency", "clinicalSignificance"],
              },
            },
            timeframe: {
              type: "string",
              enum: ["immediate", "same_visit", "follow_up", "monitoring"],
              description: "When this question should optimally be asked",
            },
            complexity: {
              type: "string",
              enum: ["simple", "moderate", "complex"],
              description:
                "Cognitive complexity of the question for patient comprehension",
            },
          },
          required: [
            "question",
            "category",
            "intent",
            "priority",
            "diagnosticImpact",
            "relatedDiagnoses",
            "clinicalRationale",
            "timeframe",
          ],
        },
      },
      inquiryStrategy: {
        type: "object",
        description:
          "Overall strategic approach to clinical questioning for this case. Provide strategy in [LANGUAGE] language.",
        properties: {
          primaryObjectives: {
            type: "array",
            items: { type: "string" },
            description:
              "Main goals of the inquiry strategy. Provide in [LANGUAGE] language.",
          },
          questioningSequence: {
            type: "array",
            description: "Recommended order of questions for optimal flow",
            items: {
              type: "object",
              properties: {
                phase: { type: "string", description: "Phase of questioning" },
                focus: {
                  type: "string",
                  description: "Focus area for this phase",
                },
                questions: {
                  type: "array",
                  items: { type: "string" },
                  description: "Questions in this phase",
                },
              },
            },
          },
          adaptationGuidelines: {
            type: "array",
            items: { type: "string" },
            description:
              "How to adapt questions based on patient responses. Provide in [LANGUAGE] language.",
          },
          redFlagQuestions: {
            type: "array",
            items: { type: "string" },
            description:
              "Critical safety questions that should be prioritized. Provide in [LANGUAGE] language.",
          },
          efficiencyMetrics: {
            type: "object",
            properties: {
              estimatedTime: {
                type: "string",
                description: "Estimated time for complete inquiry",
              },
              diagnosticYield: {
                type: "string",
                enum: ["high", "medium", "low"],
                description: "Expected overall diagnostic yield",
              },
              patientBurden: {
                type: "string",
                enum: ["low", "moderate", "high"],
                description: "Patient burden assessment",
              },
            },
          },
        },
        required: [
          "primaryObjectives",
          "questioningSequence",
          "redFlagQuestions",
        ],
      },
      differentialClarification: {
        type: "array",
        description:
          "Questions specifically designed to differentiate between competing diagnoses. Focus on discriminating features. Provide analysis in [LANGUAGE] language.",
        items: {
          type: "object",
          properties: {
            diagnosisA: {
              type: "string",
              description:
                "First diagnosis in comparison. Provide in [LANGUAGE] language.",
            },
            diagnosisB: {
              type: "string",
              description:
                "Second diagnosis in comparison. Provide in [LANGUAGE] language.",
            },
            differentiatingQuestion: {
              type: "string",
              description:
                "Question that helps distinguish between these diagnoses. Provide in [LANGUAGE] language.",
            },
            keyDifferentiator: {
              type: "string",
              description:
                "The specific clinical feature this question explores. Provide in [LANGUAGE] language.",
            },
            diagnosticWeight: {
              type: "number",
              description:
                "Weight of this differentiator in diagnosis (0.0-1.0)",
            },
            interpretation: {
              type: "object",
              properties: {
                favorsDiagnosisA: {
                  type: "string",
                  description: "Response pattern favoring diagnosis A",
                },
                favorsDiagnosisB: {
                  type: "string",
                  description: "Response pattern favoring diagnosis B",
                },
                equivocal: {
                  type: "string",
                  description: "Response pattern that doesn't differentiate",
                },
              },
            },
          },
          required: [
            "diagnosisA",
            "diagnosisB",
            "differentiatingQuestion",
            "keyDifferentiator",
            "diagnosticWeight",
          ],
        },
      },
      riskAssessmentQuestions: {
        type: "array",
        description:
          "Questions focused on identifying risk factors, complications, and safety concerns. Provide questions in [LANGUAGE] language.",
        items: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description:
                "Risk assessment question. Provide in [LANGUAGE] language.",
            },
            riskCategory: {
              type: "string",
              enum: [
                "immediate_danger",
                "complication_risk",
                "medication_safety",
                "functional_decline",
                "social_risk",
                "compliance_risk",
              ],
              description: "Category of risk being assessed",
            },
            riskLevel: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Potential risk level if positive",
            },
            mitigationStrategies: {
              type: "array",
              items: { type: "string" },
              description:
                "Risk mitigation approaches if concern identified. Provide in [LANGUAGE] language.",
            },
            urgency: {
              type: "string",
              enum: ["immediate", "urgent", "routine"],
              description: "Urgency of addressing this risk",
            },
          },
          required: ["question", "riskCategory", "riskLevel", "urgency"],
        },
      },
      questionOptimization: {
        type: "object",
        description:
          "Analysis of question effectiveness and optimization recommendations. Provide analysis in [LANGUAGE] language.",
        properties: {
          totalQuestions: {
            type: "number",
            description: "Total number of questions recommended",
          },
          estimatedTime: {
            type: "string",
            description:
              "Estimated time for complete inquiry. Provide in [LANGUAGE] language.",
          },
          priorityDistribution: {
            type: "object",
            properties: {
              critical: {
                type: "number",
                description: "Number of critical priority questions",
              },
              high: {
                type: "number",
                description: "Number of high priority questions",
              },
              medium: {
                type: "number",
                description: "Number of medium priority questions",
              },
              low: {
                type: "number",
                description: "Number of low priority questions",
              },
            },
          },
          optimalSequencing: {
            type: "string",
            description:
              "Recommended approach to question sequencing. Provide in [LANGUAGE] language.",
          },
          adaptationStrategy: {
            type: "string",
            description:
              "How to adapt questions based on emerging information. Provide in [LANGUAGE] language.",
          },
        },
        required: [
          "totalQuestions",
          "estimatedTime",
          "priorityDistribution",
          "optimalSequencing",
        ],
      },
    },
    required: [
      "strategicInquiries",
      "inquiryStrategy",
      "differentialClarification",
      "riskAssessmentQuestions",
      "questionOptimization",
    ],
  },
};

export default CLINICAL_INQUIRY_SCHEMA;
