// Enhanced Oncology Report Schema - Specialized extraction for cancer treatment and monitoring
// Focuses on treatment protocols, response assessment, and disease progression

import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";

export const oncologySchema: FunctionDefinition = {
  name: "oncology_report_analysis",
  description: "Extract comprehensive oncological information from cancer treatment and monitoring reports",
  parameters: {
    type: "object",
    properties: {
      patientHistory: {
        type: "object",
        description: "Cancer history and background",
        properties: {
          primaryDiagnosis: {
            type: "object",
            properties: {
              cancer: { type: "string", description: "Primary cancer type" },
              histology: { type: "string", description: "Histological subtype" },
              grade: { type: "string", description: "Tumor grade" },
              stage: {
                type: "object",
                properties: {
                  tnm: { type: "string", description: "TNM staging" },
                  clinical: { type: "string", description: "Clinical stage" },
                  pathological: { type: "string", description: "Pathological stage" },
                  system: { type: "string", description: "Staging system used" },
                },
              },
              dateOfDiagnosis: { type: "string", description: "Initial diagnosis date" },
              site: { type: "string", description: "Primary tumor site" },
            },
            description: "Primary cancer diagnosis",
          },
          priorTreatments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                treatment: { type: "string", description: "Treatment type" },
                agent: { type: "string", description: "Specific agent or procedure" },
                startDate: { type: "string" },
                endDate: { type: "string" },
                response: { type: "string" },
                toxicity: { type: "string" },
                reasonForDiscontinuation: { type: "string" },
              },
            },
            description: "Previous cancer treatments",
          },
          familyHistory: {
            type: "array",
            items: { type: "string" },
            description: "Family history of cancer",
          },
          comorbidities: {
            type: "array",
            items: { type: "string" },
            description: "Relevant comorbid conditions",
          },
        },
      },
      currentTreatment: {
        type: "object",
        description: "Current treatment regimen",
        properties: {
          protocol: {
            type: "object",
            properties: {
              name: { type: "string", description: "Treatment protocol name" },
              phase: { type: "string", description: "Treatment phase" },
              cycle: { type: "number", description: "Current cycle number" },
              totalCycles: { type: "number", description: "Total planned cycles" },
              startDate: { type: "string", description: "Treatment start date" },
            },
            description: "Treatment protocol details",
          },
          chemotherapy: {
            type: "array",
            items: {
              type: "object",
              properties: {
                agent: { type: "string", description: "Chemotherapy agent" },
                dose: { type: "string", description: "Dose amount" },
                route: { type: "string", description: "Route of administration" },
                schedule: { type: "string", description: "Dosing schedule" },
                modifications: { type: "string", description: "Dose modifications" },
              },
            },
            description: "Chemotherapy regimen",
          },
          radiotherapy: {
            type: "object",
            properties: {
              site: { type: "string", description: "Treatment site" },
              technique: { type: "string", description: "RT technique" },
              totalDose: { type: "number", description: "Total planned dose in Gy" },
              fractions: { type: "number", description: "Number of fractions" },
              dosePerFraction: { type: "number", description: "Dose per fraction" },
              startDate: { type: "string" },
              endDate: { type: "string" },
            },
            description: "Radiation therapy details",
          },
          immunotherapy: {
            type: "array",
            items: {
              type: "object",
              properties: {
                agent: { type: "string", description: "Immunotherapy agent" },
                mechanism: { type: "string", description: "Mechanism of action" },
                dose: { type: "string" },
                schedule: { type: "string" },
                biomarkers: { type: "array", items: { type: "string" } },
              },
            },
            description: "Immunotherapy treatments",
          },
          targetedTherapy: {
            type: "array",
            items: {
              type: "object",
              properties: {
                agent: { type: "string", description: "Targeted therapy agent" },
                target: { type: "string", description: "Molecular target" },
                dose: { type: "string" },
                schedule: { type: "string" },
                companionDiagnostic: { type: "string", description: "Associated biomarker test" },
              },
            },
            description: "Targeted therapy treatments",
          },
          supportiveCare: {
            type: "array",
            items: {
              type: "object",
              properties: {
                medication: { type: "string" },
                indication: { type: "string" },
                dose: { type: "string" },
              },
            },
            description: "Supportive care medications",
          },
        },
      },
      responseAssessment: {
        type: "object",
        description: "Treatment response evaluation",
        properties: {
          assessmentDate: { type: "string", description: "Date of assessment" },
          method: {
            type: "string",
            enum: ["recist", "who", "rano", "lugano", "imrecist"],
            description: "Response assessment criteria used",
          },
          overallResponse: {
            type: "string",
            enum: ["complete_response", "partial_response", "stable_disease", "progressive_disease", "not_evaluable"],
            description: "Overall response classification",
          },
          targetLesions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                location: { type: "string" },
                baseline: { type: "number", description: "Baseline measurement" },
                current: { type: "number", description: "Current measurement" },
                change: { type: "number", description: "Percentage change" },
                response: { type: "string" },
              },
            },
            description: "Target lesion measurements",
          },
          nonTargetLesions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                location: { type: "string" },
                status: { type: "string", enum: ["present", "absent", "unequivocal_progression"] },
                description: { type: "string" },
              },
            },
            description: "Non-target lesion assessment",
          },
          newLesions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                location: { type: "string" },
                size: { type: "string" },
                characteristics: { type: "string" },
              },
            },
            description: "New lesions identified",
          },
          tumorMarkers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                marker: { type: "string" },
                baseline: { type: "number" },
                current: { type: "number" },
                trend: { type: "string", enum: ["rising", "falling", "stable"] },
                reference: { type: "string" },
              },
            },
            description: "Tumor marker levels",
          },
        },
      },
      toxicityAssessment: {
        type: "object",
        description: "Treatment toxicity evaluation",
        properties: {
          gradingSystem: {
            type: "string",
            enum: ["ctcae_v5", "ctcae_v4", "who"],
            description: "Toxicity grading system used",
          },
          adverseEvents: {
            type: "array",
            items: {
              type: "object",
              properties: {
                event: { type: "string", description: "Adverse event description" },
                grade: { type: "number", description: "Toxicity grade (1-5)" },
                attribution: { type: "string", description: "Attribution to treatment" },
                onset: { type: "string", description: "Date of onset" },
                duration: { type: "string", description: "Duration of event" },
                action: { type: "string", description: "Action taken" },
                outcome: { type: "string", description: "Event outcome" },
              },
            },
            description: "Adverse events and toxicities",
          },
          performanceStatus: {
            type: "object",
            properties: {
              ecog: { type: "number", description: "ECOG performance status" },
              karnofsky: { type: "number", description: "Karnofsky performance score" },
              assessment: { type: "string", description: "Functional status assessment" },
            },
            description: "Performance status evaluation",
          },
        },
      },
      laboratoryResults: {
        type: "object",
        description: "Relevant laboratory findings",
        properties: {
          hematology: {
            type: "object",
            properties: {
              wbc: { type: "number" },
              anc: { type: "number" },
              hemoglobin: { type: "number" },
              platelets: { type: "number" },
              nadir: { type: "string" },
            },
            description: "Hematologic parameters",
          },
          chemistry: {
            type: "object",
            properties: {
              creatinine: { type: "number" },
              bilirubin: { type: "number" },
              alt: { type: "number" },
              ast: { type: "number" },
              albumin: { type: "number" },
            },
            description: "Chemistry panel results",
          },
          coagulation: {
            type: "object",
            properties: {
              pt: { type: "number" },
              ptt: { type: "number" },
              inr: { type: "number" },
            },
            description: "Coagulation studies",
          },
        },
      },
      biomarkerAnalysis: {
        type: "object",
        description: "Molecular biomarker results",
        properties: {
          genomicTesting: {
            type: "array",
            items: {
              type: "object",
              properties: {
                test: { type: "string", description: "Genomic test performed" },
                mutations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      gene: { type: "string" },
                      mutation: { type: "string" },
                      variantAlleleFrequency: { type: "number" },
                      significance: { type: "string" },
                      therapeuticImplications: { type: "string" },
                    },
                  },
                },
                microsatelliteStatus: { type: "string" },
                tumorMutationalBurden: { type: "number" },
                pdl1Expression: { type: "string" },
              },
            },
            description: "Genomic profiling results",
          },
          immunohistochemistry: {
            type: "array",
            items: {
              type: "object",
              properties: {
                marker: { type: "string" },
                result: { type: "string" },
                percentage: { type: "number" },
                intensity: { type: "string" },
                interpretation: { type: "string" },
              },
            },
            description: "IHC biomarker results",
          },
        },
      },
      treatment_plan: {
        type: "object",
        description: "Future treatment planning",
        properties: {
          continuation: { type: "boolean", description: "Continue current treatment" },
          modifications: {
            type: "array",
            items: { type: "string" },
            description: "Treatment modifications planned",
          },
          nextTreatment: {
            type: "object",
            properties: {
              regimen: { type: "string" },
              rationale: { type: "string" },
              startDate: { type: "string" },
            },
            description: "Next treatment plan",
          },
          clinicalTrials: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                phase: { type: "string" },
                eligibility: { type: "string" },
                consideration: { type: "string" },
              },
            },
            description: "Clinical trial considerations",
          },
        },
      },
      followUp: {
        type: "object",
        description: "Follow-up planning",
        properties: {
          nextVisit: { type: "string", description: "Next appointment date" },
          imaging: {
            type: "object",
            properties: {
              modality: { type: "string" },
              interval: { type: "string" },
              indication: { type: "string" },
            },
            description: "Follow-up imaging plan",
          },
          monitoring: {
            type: "array",
            items: { type: "string" },
            description: "Parameters to monitor",
          },
          supportiveCare: {
            type: "array",
            items: { type: "string" },
            description: "Supportive care interventions",
          },
        },
      },
      prognosticFactors: {
        type: "object",
        description: "Prognostic assessment",
        properties: {
          diseaseStatus: { type: "string", description: "Current disease status" },
          prognosticScore: { type: "string", description: "Prognostic scoring if applicable" },
          survivalEstimate: { type: "string", description: "Survival estimate if discussed" },
          qualityOfLife: { type: "string", description: "Quality of life assessment" },
        },
      },
    },
    required: ["patientHistory", "currentTreatment"],
  },
};

export default oncologySchema;