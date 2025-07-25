import type { FunctionDefinition } from "@langchain/core/language_models/base";

// GP Core Expert Schema - Holistic patient assessment focused on common conditions
const GP_CORE_SCHEMA = {
  name: "gp_expert_analysis",
  description: "You are an experienced General Practitioner conducting a comprehensive patient assessment. Focus on holistic care, common conditions, and clear patient communication. Analyze the provided medical conversation transcript and provide structured clinical insights in [LANGUAGE] language.",
  parameters: {
    type: "object",
    properties: {
      symptoms: {
        type: "array",
        description: "Extract and characterize all symptoms mentioned by the patient. Focus on onset, duration, severity, and quality. Provide analysis in [LANGUAGE] language.",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Clear name of the symptom. Provide in [LANGUAGE] language."
            },
            description: {
              type: "string", 
              description: "Detailed description including characteristics, location, quality. Provide in [LANGUAGE] language."
            },
            severity: {
              type: "number",
              description: "Severity rating from 0.0 (mild) to 1.0 (severe) based on patient description"
            },
            onset: {
              type: "string",
              enum: ["acute", "subacute", "chronic", "intermittent"],
              description: "Temporal pattern of symptom onset"
            },
            duration: {
              type: "string",
              description: "How long the symptom has been present. Provide in [LANGUAGE] language."
            },
            triggers: {
              type: "array",
              items: { type: "string" },
              description: "Known triggers or aggravating factors. Provide in [LANGUAGE] language."
            },
            associatedSymptoms: {
              type: "array", 
              items: { type: "string" },
              description: "Other symptoms that occur together. Provide in [LANGUAGE] language."
            },
            confidence: {
              type: "number",
              description: "Confidence in symptom identification (0.0 to 1.0)"
            }
          },
          required: ["name", "description", "severity", "confidence"]
        }
      },
      diagnoses: {
        type: "array",
        description: "Provide differential diagnoses prioritizing common conditions first. Include both doctor-mentioned diagnoses (origin: doctor) and your clinical suggestions (origin: suggestion). Focus on primary care conditions. Provide analysis in [LANGUAGE] language.",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name of the condition/diagnosis. Provide in [LANGUAGE] language."
            },
            code: {
              type: "string", 
              description: "ICD-10 code for the diagnosis"
            },
            type: {
              type: "string",
              enum: ["primary", "secondary", "differential", "rule_out"],
              description: "Type of diagnosis in clinical context"
            },
            confidence: {
              type: "number",
              description: "Clinical confidence in this diagnosis (0.0 to 1.0)"
            },
            origin: {
              type: "string",
              enum: ["doctor", "suggestion"],
              description: "Source: doctor if explicitly mentioned, suggestion if inferred"
            },
            supportingSymptoms: {
              type: "array",
              items: { type: "string" },
              description: "Symptoms that support this diagnosis. Provide in [LANGUAGE] language."
            },
            supportingEvidence: {
              type: "array",
              items: { type: "string" },
              description: "Clinical evidence supporting this diagnosis. Provide in [LANGUAGE] language."
            },
            riskFactors: {
              type: "array",
              items: { type: "string" },
              description: "Patient risk factors for this condition. Provide in [LANGUAGE] language."
            },
            urgency: {
              type: "string",
              enum: ["routine", "urgent", "emergent"],
              description: "Clinical urgency level for this diagnosis"
            },
            reasoning: {
              type: "string",
              description: "Clinical reasoning for this diagnosis. Provide in [LANGUAGE] language."
            }
          },
          required: ["name", "confidence", "origin", "supportingSymptoms", "reasoning"]
        }
      },
      treatments: {
        type: "array",
        description: "Recommend evidence-based treatments including medications, procedures, lifestyle modifications. Include both doctor-mentioned treatments (origin: doctor) and evidence-based suggestions (origin: suggestion). Provide analysis in [LANGUAGE] language.",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name of the treatment intervention. Provide in [LANGUAGE] language."
            },
            type: {
              type: "string",
              enum: ["medication", "procedure", "therapy", "lifestyle", "monitoring"],
              description: "Category of treatment intervention"
            },
            description: {
              type: "string",
              description: "Detailed description of the treatment. Provide in [LANGUAGE] language."
            },
            targetDiagnoses: {
              type: "array",
              items: { type: "string" },
              description: "Which diagnoses this treatment addresses. Provide in [LANGUAGE] language."
            },
            dosage: {
              type: "string",
              description: "Specific dosage instructions if medication. Provide in [LANGUAGE] language."
            },
            duration: {
              type: "string",
              description: "Expected treatment duration. Provide in [LANGUAGE] language."
            },
            effectiveness: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Expected treatment effectiveness"
            },
            origin: {
              type: "string", 
              enum: ["doctor", "suggestion"],
              description: "Source: doctor if explicitly mentioned, suggestion if recommended"
            },
            contraindications: {
              type: "array",
              items: { type: "string" },
              description: "Important contraindications to consider. Provide in [LANGUAGE] language."
            },
            sideEffects: {
              type: "array",
              items: { type: "string" },
              description: "Common side effects to discuss. Provide in [LANGUAGE] language."
            },
            patientInstructions: {
              type: "string",
              description: "Clear instructions for the patient. Provide in [LANGUAGE] language."
            }
          },
          required: ["name", "type", "description", "targetDiagnoses", "effectiveness", "origin"]
        }
      },
      inquiries: {
        type: "array",
        description: "Generate essential follow-up questions to clarify diagnosis and optimize treatment. Focus on questions that change clinical management. Limit to 5-8 high-impact questions. Provide questions in [LANGUAGE] language.",
        items: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "Clear, specific question for the patient. Use empathetic, non-medical language. Provide in [LANGUAGE] language."
            },
            category: {
              type: "string",
              enum: ["symptom_details", "medical_history", "lifestyle_factors", "medication_history", "family_history", "social_history", "risk_assessment"],
              description: "Category of clinical inquiry"
            },
            intent: {
              type: "string",
              enum: ["confirmatory", "exclusionary", "exploratory"],
              description: "Purpose: confirmatory (supports diagnosis), exclusionary (rules out), exploratory (gathers context)"
            },
            priority: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Clinical priority based on diagnostic impact"
            },
            relatedDiagnoses: {
              type: "array",
              items: { type: "string" },
              description: "Which diagnoses this question helps clarify. Provide in [LANGUAGE] language."
            },
            expectedImpact: {
              type: "object",
              properties: {
                ifYes: {
                  type: "string",
                  description: "Clinical implications if patient answers yes. Provide in [LANGUAGE] language."
                },
                ifNo: {
                  type: "string", 
                  description: "Clinical implications if patient answers no. Provide in [LANGUAGE] language."
                }
              },
              description: "Expected diagnostic impact based on patient response"
            },
            rationale: {
              type: "string",
              description: "Why this question is clinically important. Provide in [LANGUAGE] language."
            }
          },
          required: ["question", "category", "intent", "priority", "rationale"]
        }
      },
      preventiveCare: {
        type: "array",  
        description: "Identify preventive care opportunities including screenings, vaccinations, lifestyle counseling based on patient age, risk factors, and medical history. Provide recommendations in [LANGUAGE] language.",
        items: {
          type: "object",
          properties: {
            recommendation: {
              type: "string",
              description: "Specific preventive care recommendation. Provide in [LANGUAGE] language."
            },
            type: {
              type: "string",
              enum: ["screening", "vaccination", "lifestyle", "counseling", "monitoring"],
              description: "Type of preventive intervention"
            },
            rationale: {
              type: "string",
              description: "Why this preventive measure is recommended. Provide in [LANGUAGE] language."
            },
            timeline: {
              type: "string",
              enum: ["immediate", "within_month", "within_year", "ongoing"],
              description: "Recommended timeframe for implementation"
            },
            riskFactors: {
              type: "array",
              items: { type: "string" },
              description: "Patient risk factors that warrant this intervention. Provide in [LANGUAGE] language."
            }
          },
          required: ["recommendation", "type", "rationale", "timeline"]
        }
      },
      clinicalReasoning: {
        type: "string",
        description: "Provide your clinical reasoning process. Explain how you prioritized common conditions, considered patient context, and balanced thoroughness with efficiency. Include your differential diagnostic thinking and treatment rationale. Provide in [LANGUAGE] language."
      },
      recommendations: {
        type: "array",
        description: "High-level recommendations for clinical management, care coordination, and next steps. Focus on practical guidance for healthcare providers. Provide recommendations in [LANGUAGE] language.",
        items: {
          type: "object", 
          properties: {
            recommendation: {
              type: "string",
              description: "Clear, actionable recommendation for healthcare provider. Provide in [LANGUAGE] language."
            },
            category: {
              type: "string",
              enum: ["immediate_action", "diagnostic_workup", "treatment_modification", "referral", "monitoring", "patient_education", "safety"],
              description: "Type of clinical recommendation"
            },
            priority: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Clinical priority level"
            },
            timeframe: {
              type: "string", 
              enum: ["immediate", "same_day", "within_week", "routine"],
              description: "Recommended implementation timeframe"
            },
            rationale: {
              type: "string",
              description: "Clinical reasoning behind this recommendation. Provide in [LANGUAGE] language."
            }
          },
          required: ["recommendation", "category", "priority", "timeframe", "rationale"]
        }
      }
    },
    required: ["symptoms", "diagnoses", "treatments", "inquiries", "clinicalReasoning", "recommendations"]
  }
};

export default GP_CORE_SCHEMA;