// Enhanced Radiology Report Schema - Specialized extraction for imaging studies
// Focuses on diagnostic imaging findings across all modalities

import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";

export const radiologySchema: FunctionDefinition = {
  name: "radiology_report_analysis",
  description: "Extract comprehensive imaging findings from radiology reports",
  parameters: {
    type: "object",
    properties: {
      studyInformation: {
        type: "object",
        description: "Study details and technical information",
        properties: {
          modality: {
            type: "string",
            enum: ["ct", "mri", "xray", "ultrasound", "mammography", "nuclear", "pet", "dexa", "fluoroscopy"],
            description: "Imaging modality used",
          },
          anatomicalRegion: {
            type: "string",
            description: "Primary anatomical region studied",
          },
          studyType: {
            type: "string",
            description: "Specific type of study (e.g., CT chest with contrast)",
          },
          indication: {
            type: "string",
            description: "Clinical indication for the study",
          },
          contrast: {
            type: "object",
            properties: {
              used: { type: "boolean" },
              type: { type: "string" },
              route: { type: "string" },
              amount: { type: "string" },
              timing: { type: "string" },
            },
            description: "Contrast agent information",
          },
          technique: {
            type: "string",
            description: "Technical parameters and imaging technique",
          },
        },
        required: ["modality", "anatomicalRegion"],
      },
      findings: {
        type: "object",
        description: "Imaging findings organized by system",
        properties: {
          primary: {
            type: "array",
            items: {
              type: "object",
              properties: {
                location: { type: "string", description: "Anatomical location" },
                description: { type: "string", description: "Finding description" },
                size: { type: "string", description: "Size measurements" },
                characteristics: { type: "string", description: "Imaging characteristics" },
                significance: { type: "string", description: "Clinical significance" },
                comparison: { type: "string", description: "Comparison to prior studies" },
                birads: { type: "string", description: "BI-RADS category if applicable" },
                tirads: { type: "string", description: "TI-RADS category if applicable" },
              },
            },
            description: "Primary pathological findings",
          },
          incidental: {
            type: "array",
            items: {
              type: "object",
              properties: {
                location: { type: "string" },
                description: { type: "string" },
                significance: { type: "string" },
                followUp: { type: "string" },
              },
            },
            description: "Incidental findings",
          },
          normal: {
            type: "array",
            items: { type: "string" },
            description: "Normal structures and findings",
          },
        },
      },
      measurements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            structure: { type: "string", description: "Structure measured" },
            dimension: { type: "string", description: "Dimension type" },
            value: { type: "number", description: "Measurement value" },
            unit: { type: "string", description: "Unit of measurement" },
            method: { type: "string", description: "Measurement method" },
            reference: { type: "string", description: "Reference values" },
          },
        },
        description: "Quantitative measurements",
      },
      comparison: {
        type: "object",
        description: "Comparison with prior studies",
        properties: {
          priorStudyDate: { type: "string", description: "Date of comparison study" },
          interval: { type: "string", description: "Time interval between studies" },
          changes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                finding: { type: "string" },
                change: { type: "string", enum: ["new", "resolved", "improved", "worsened", "stable", "increased", "decreased"] },
                description: { type: "string" },
              },
            },
            description: "Changes from prior study",
          },
          stability: { type: "string", description: "Overall stability assessment" },
        },
      },
      organSystemFindings: {
        type: "object",
        description: "Findings organized by organ system",
        properties: {
          cardiovascular: {
            type: "array",
            items: { type: "string" },
            description: "Cardiovascular findings",
          },
          pulmonary: {
            type: "array",
            items: { type: "string" },
            description: "Pulmonary findings",
          },
          gastrointestinal: {
            type: "array",
            items: { type: "string" },
            description: "GI tract findings",
          },
          genitourinary: {
            type: "array",
            items: { type: "string" },
            description: "GU system findings",
          },
          musculoskeletal: {
            type: "array",
            items: { type: "string" },
            description: "MSK findings",
          },
          neurological: {
            type: "array",
            items: { type: "string" },
            description: "Neurological findings",
          },
          hepatobiliary: {
            type: "array",
            items: { type: "string" },
            description: "Liver and biliary findings",
          },
        },
      },
      pathologyCorrelation: {
        type: "object",
        description: "Correlation with pathology when available",
        properties: {
          biopsyPerformed: { type: "boolean" },
          biopsyGuidance: { type: "string" },
          pathologyResults: { type: "string" },
          concordance: { type: "string" },
        },
      },
      impression: {
        type: "object",
        description: "Radiologist's impression and assessment",
        properties: {
          summary: { type: "string", description: "Summary impression" },
          diagnoses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                diagnosis: { type: "string" },
                confidence: { type: "string", enum: ["definite", "probable", "possible", "unlikely"] },
                differential: { type: "array", items: { type: "string" } },
              },
            },
            description: "Diagnostic impressions",
          },
          assessment: { type: "string", description: "Clinical assessment" },
        },
        required: ["summary"],
      },
      recommendations: {
        type: "object",
        description: "Follow-up and additional recommendations",
        properties: {
          followUpImaging: {
            type: "array",
            items: {
              type: "object",
              properties: {
                modality: { type: "string" },
                timing: { type: "string" },
                indication: { type: "string" },
                urgency: { type: "string", enum: ["urgent", "routine", "optional"] },
              },
            },
            description: "Recommended follow-up imaging",
          },
          clinicalCorrelation: {
            type: "string",
            description: "Clinical correlation recommendations",
          },
          additionalTesting: {
            type: "array",
            items: { type: "string" },
            description: "Additional non-imaging tests recommended",
          },
          consultation: {
            type: "array",
            items: { type: "string" },
            description: "Specialist consultations recommended",
          },
          biopsy: {
            type: "object",
            properties: {
              recommended: { type: "boolean" },
              method: { type: "string" },
              target: { type: "string" },
              urgency: { type: "string" },
            },
            description: "Biopsy recommendations",
          },
        },
      },
      technicalQuality: {
        type: "object",
        description: "Technical quality assessment",
        properties: {
          imageQuality: {
            type: "string",
            enum: ["excellent", "good", "adequate", "suboptimal", "poor"],
            description: "Overall image quality",
          },
          limitations: {
            type: "array",
            items: { type: "string" },
            description: "Technical limitations",
          },
          artifacts: {
            type: "array",
            items: { type: "string" },
            description: "Image artifacts present",
          },
          cooperation: { type: "string", description: "Patient cooperation" },
          motionArtifact: { type: "boolean", description: "Motion artifact present" },
        },
      },
      dosimetry: {
        type: "object",
        description: "Radiation dose information",
        properties: {
          ctdi: { type: "number", description: "CT dose index" },
          dlp: { type: "number", description: "Dose length product" },
          effectiveDose: { type: "number", description: "Estimated effective dose" },
          doseReduction: { type: "string", description: "Dose reduction techniques used" },
        },
      },
      emergency: {
        type: "object",
        description: "Emergency findings requiring immediate attention",
        properties: {
          critical: { type: "boolean", description: "Critical findings present" },
          findings: {
            type: "array",
            items: { type: "string" },
            description: "Critical findings requiring immediate attention",
          },
          communication: { type: "string", description: "Communication with referring physician" },
          timeNotified: { type: "string", description: "Time critical findings were communicated" },
        },
      },
    },
    required: ["studyInformation", "impression"],
  },
};

export default radiologySchema;