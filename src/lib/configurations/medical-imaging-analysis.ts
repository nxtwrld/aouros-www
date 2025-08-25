import type { FunctionDefinition } from "@langchain/core/language_models/base";
import coreBodyParts from "./core.bodyParts";

export default {
  name: "unified_medical_imaging_analysis",
  description: `
You are analyzing a medical image (X-ray, CT, MRI, ultrasound, etc.). You have access to patient context and technical metadata to inform your analysis.

Provide a comprehensive analysis that includes:

1. **Basic Visual Assessment**: What type of medical imaging and anatomical region (consider the technical metadata for context)
2. **Body Parts Detection**: Identify visible anatomical structures using the standard body parts taxonomy
3. **Anomaly Detection**: Identify any abnormalities, their locations, and measurements (use technical parameters like pixelSpacing for accurate measurements)
4. **Overall Assessment**: Summary with clinical significance and urgent findings (consider patient demographics and study context)

Use the provided patient information and technical metadata to contextualize your findings. Be thorough but focused.

IMPORTANT: Only analyze what is actually visible in the image. Use the metadata for context and measurement accuracy, but do not speculate beyond visual evidence.
`,
  parameters: {
    type: "object",
    properties: {
      // Basic imaging information
      modality: {
        type: "string",
        enum: [
          "X-ray",
          "CT",
          "MRI",
          "Ultrasound", 
          "Mammography",
          "Nuclear Medicine",
          "PET",
          "Fluoroscopy",
          "Unknown"
        ],
        description: "Type of medical imaging modality"
      },
      anatomicalRegion: {
        type: "string",
        enum: [
          "Head",
          "Neck", 
          "Chest",
          "Abdomen",
          "Pelvis",
          "Spine",
          "Upper Extremity",
          "Lower Extremity",
          "Multiple Regions",
          "Unknown"
        ],
        description: "Primary anatomical region shown"
      },
      viewPosition: {
        type: "string",
        enum: [
          "AP", // Anterior-Posterior
          "PA", // Posterior-Anterior  
          "Lateral",
          "Oblique",
          "Axial",
          "Coronal",
          "Sagittal",
          "Cross-sectional",
          "Longitudinal",
          "Unknown"
        ],
        description: "Imaging view or projection"
      },
      imageQuality: {
        type: "string", 
        enum: ["excellent", "good", "fair", "poor"],
        description: "Overall technical quality of the image"
      },
      
      // Use existing body parts structure from core configuration
      bodyParts: coreBodyParts,
      
      // Anomaly detection with measurements
      anomalies: {
        type: "array",
        items: {
          type: "object", 
          properties: {
            type: {
              type: "string",
              enum: [
                "mass",
                "fracture", 
                "foreign_object",
                "inflammation",
                "deformity",
                "calcification",
                "fluid_collection",
                "pneumothorax",
                "enlarged_organ",
                "atrophy",
                "other"
              ],
              description: "Type of abnormality detected"
            },
            description: {
              type: "string",
              description: "Detailed description of the finding"
            },
            location: {
              type: "object",
              properties: {
                bodyPart: {
                  type: "string",
                  description: "Affected anatomical structure (use body parts identification from above)"
                },
                region: {
                  type: "string", 
                  description: "Specific location within the body part"
                },
                side: {
                  type: "string",
                  enum: ["left", "right", "bilateral", "central", "not_applicable"],
                  description: "Laterality if applicable"
                }
              },
              required: ["bodyPart", "region"]
            },
            measurements: {
              type: "object",
              properties: {
                size: {
                  type: "string",
                  description: "Dimensions in mm or cm (e.g., '15x12 mm', '3.2 cm diameter')"
                },
                area: {
                  type: "string", 
                  description: "Area measurement if applicable"
                },
                volume: {
                  type: "string",
                  description: "Volume measurement if applicable"  
                },
                other: {
                  type: "string",
                  description: "Other relevant measurements"
                }
              },
              description: "Quantitative measurements when visible"
            },
            severity: {
              type: "string",
              enum: ["mild", "moderate", "severe", "critical"],
              description: "Assessed severity level"
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Confidence in detection (0.0-1.0)"
            },
            urgentFinding: {
              type: "boolean",
              description: "Whether this requires immediate attention"
            }
          },
          required: ["type", "description", "location", "severity", "confidence", "urgentFinding"]
        },
        description: "Detected abnormalities with measurements"
      },
      
      // Overall assessment
      overallAssessment: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "Brief overall summary of findings"
          },
          primaryFindings: {
            type: "array",
            items: {
              type: "string"
            },
            description: "List of most significant findings"
          },
          hasUrgentFindings: {
            type: "boolean", 
            description: "Whether any findings require immediate attention"
          },
          recommendedActions: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Recommended next steps or follow-up"
          },
          overallConfidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Overall confidence in the analysis"
          }
        },
        required: ["summary", "primaryFindings", "hasUrgentFindings", "overallConfidence"]
      },
      
      // Technical details
      visualDescription: {
        type: "string",
        description: "Detailed description of what is visually present in the image"
      },
      technicalQuality: {
        type: "object",
        properties: {
          contrast: {
            type: "string",
            enum: ["excellent", "adequate", "poor"], 
            description: "Image contrast quality"
          },
          brightness: {
            type: "string",
            enum: ["optimal", "too_bright", "too_dark"],
            description: "Image brightness assessment"
          },
          artifacts: {
            type: "boolean",
            description: "Presence of imaging artifacts"
          },
          positioning: {
            type: "string",
            enum: ["optimal", "acceptable", "suboptimal"],
            description: "Patient positioning quality"
          }
        },
        required: ["contrast", "brightness", "artifacts", "positioning"]
      }
    },
    required: [
      "modality", 
      "anatomicalRegion", 
      "viewPosition",
      "imageQuality",
      "bodyParts",
      "anomalies", 
      "overallAssessment",
      "visualDescription",
      "technicalQuality"
    ]
  }
} as FunctionDefinition;