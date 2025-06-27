// Enhanced Pathology Report Schema - Specialized extraction for pathology reports
// Focuses on histopathological findings, tumor staging, and diagnostic conclusions

import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";

export const pathologySchema: FunctionDefinition = {
  name: "pathology_report_analysis",
  description: "Extract comprehensive pathological findings from histopathology reports",
  parameters: {
    type: "object",
    properties: {
      specimen: {
        type: "object",
        description: "Specimen information",
        properties: {
          type: {
            type: "string",
            description: "Type of specimen (biopsy, resection, cytology, etc.)",
          },
          site: {
            type: "string",
            description: "Anatomical site of specimen collection",
          },
          procedure: {
            type: "string",
            description: "Collection procedure (needle biopsy, excision, etc.)",
          },
          size: {
            type: "string",
            description: "Specimen dimensions",
          },
          weight: {
            type: "number",
            description: "Specimen weight in grams",
          },
          orientation: {
            type: "string",
            description: "Specimen orientation markers",
          },
          fixation: {
            type: "string",
            description: "Fixation method (formalin, etc.)",
          },
        },
        required: ["type", "site"],
      },
      grossDescription: {
        type: "object",
        description: "Gross pathological examination",
        properties: {
          appearance: {
            type: "string",
            description: "Overall gross appearance",
          },
          color: {
            type: "string",
            description: "Color characteristics",
          },
          consistency: {
            type: "string",
            description: "Tissue consistency",
          },
          margins: {
            type: "string",
            description: "Margin assessment",
          },
          lesions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                size: { type: "string" },
                location: { type: "string" },
              },
            },
            description: "Gross lesions identified",
          },
        },
      },
      microscopicFindings: {
        type: "object",
        description: "Microscopic histopathological findings",
        properties: {
          architecture: {
            type: "string",
            description: "Tissue architecture",
          },
          cellularFeatures: {
            type: "object",
            properties: {
              cellType: { type: "string" },
              pleomorphism: { type: "string" },
              nuclei: { type: "string" },
              mitoses: { type: "string" },
              necrosis: { type: "boolean" },
            },
            description: "Cellular characteristics",
          },
          inflammation: {
            type: "object",
            properties: {
              type: { type: "string" },
              severity: { type: "string" },
              distribution: { type: "string" },
            },
            description: "Inflammatory changes",
          },
          stroma: {
            type: "string",
            description: "Stromal characteristics",
          },
          vascularInvasion: {
            type: "boolean",
            description: "Presence of vascular invasion",
          },
          lymphaticInvasion: {
            type: "boolean",
            description: "Presence of lymphatic invasion",
          },
          perineural Invasion: {
            type: "boolean",
            description: "Presence of perineural invasion",
          },
        },
      },
      immunohistochemistry: {
        type: "array",
        description: "Immunohistochemical staining results",
        items: {
          type: "object",
          properties: {
            marker: {
              type: "string",
              description: "IHC marker name",
            },
            result: {
              type: "string",
              enum: ["positive", "negative", "equivocal"],
              description: "Staining result",
            },
            intensity: {
              type: "string",
              enum: ["weak", "moderate", "strong"],
              description: "Staining intensity",
            },
            percentage: {
              type: "number",
              description: "Percentage of positive cells",
            },
            pattern: {
              type: "string",
              description: "Staining pattern",
            },
            interpretation: {
              type: "string",
              description: "Clinical interpretation of result",
            },
          },
          required: ["marker", "result"],
        },
      },
      specialStains: {
        type: "array",
        description: "Special staining results",
        items: {
          type: "object",
          properties: {
            stainType: {
              type: "string",
              description: "Type of special stain",
            },
            result: {
              type: "string",
              description: "Staining result",
            },
            interpretation: {
              type: "string",
              description: "Interpretation of stain",
            },
          },
          required: ["stainType", "result"],
        },
      },
      molecularFindings: {
        type: "object",
        description: "Molecular pathology results",
        properties: {
          mutations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                gene: { type: "string" },
                mutation: { type: "string" },
                status: { type: "string" },
                significance: { type: "string" },
              },
            },
            description: "Genetic mutations identified",
          },
          fusion: {
            type: "array",
            items: {
              type: "object",
              properties: {
                genes: { type: "string" },
                status: { type: "string" },
              },
            },
            description: "Gene fusion analysis",
          },
          msi: {
            type: "string",
            enum: ["stable", "unstable", "not_tested"],
            description: "Microsatellite instability status",
          },
          pdl1: {
            type: "object",
            properties: {
              score: { type: "number" },
              interpretation: { type: "string" },
            },
            description: "PD-L1 expression",
          },
        },
      },
      diagnosis: {
        type: "object",
        description: "Primary pathological diagnosis",
        properties: {
          primary: {
            type: "string",
            description: "Primary diagnosis",
          },
          histologicType: {
            type: "string",
            description: "Histological type/subtype",
          },
          grade: {
            type: "string",
            description: "Histological grade",
          },
          stage: {
            type: "object",
            properties: {
              t: { type: "string" },
              n: { type: "string" },
              m: { type: "string" },
              overall: { type: "string" },
              system: { type: "string" },
            },
            description: "TNM staging",
          },
          margins: {
            type: "object",
            properties: {
              status: {
                type: "string",
                enum: ["negative", "positive", "close", "cannot_assess"],
              },
              distance: { type: "string" },
              location: { type: "string" },
            },
            description: "Surgical margin status",
          },
          lymphNodes: {
            type: "object",
            properties: {
              examined: { type: "number" },
              positive: { type: "number" },
              largestDeposit: { type: "string" },
              extracapsularExtension: { type: "boolean" },
            },
            description: "Lymph node assessment",
          },
        },
        required: ["primary"],
      },
      additionalFindings: {
        type: "array",
        items: { type: "string" },
        description: "Additional pathological findings",
      },
      clinicalCorrelation: {
        type: "string",
        description: "Clinical correlation and recommendations",
      },
      prognosticFactors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            factor: { type: "string" },
            value: { type: "string" },
            significance: { type: "string" },
          },
        },
        description: "Prognostic and predictive factors",
      },
      recommendations: {
        type: "array",
        items: { type: "string" },
        description: "Recommended follow-up or additional testing",
      },
      quality: {
        type: "object",
        description: "Quality metrics",
        properties: {
          adequacy: {
            type: "string",
            enum: ["adequate", "inadequate", "limited"],
            description: "Specimen adequacy",
          },
          artifactLimitations: {
            type: "array",
            items: { type: "string" },
            description: "Technical limitations or artifacts",
          },
          consultations: {
            type: "array",
            items: { type: "string" },
            description: "Expert consultations performed",
          },
        },
      },
    },
    required: ["specimen", "diagnosis"],
  },
};

export default pathologySchema;