import type { FunctionDefinition } from "@langchain/core/language_models/base";
import corePatient from "./core.patient";
import corePerformer from "./core.performer";

/**
 * Patient and Performer Detection Schema with Technical Metadata
 *
 * Reuses core.patient and core.performer schemas with additional technical metadata
 * for DICOM medical imaging analysis.
 */
export default {
  name: "extract_patient_performer_metadata",
  description:
    "Extract patient information, medical performers, and technical imaging metadata from DICOM metadata",
  parameters: {
    type: "object",
    properties: {
      // Patient Information (reusing core.patient schema)
      patient: corePatient,

      // Performers Information (reusing core.performer schema as array)
      performers: {
        type: "array",
        description: "Medical professionals involved in the imaging study",
        items: corePerformer,
      },

      // Technical Study and Device Information
      technical: {
        type: "object",
        description:
          "Technical parameters for the imaging study and devices used",
        properties: {
          // Study Information
          study: {
            type: "object",
            properties: {
              modality: {
                type: "string",
                description: "Imaging modality (CT, MR, CR, DR, US, etc.)",
              },
              bodyPartExamined: {
                type: "string",
                description: "Body part or anatomical region examined",
              },
              viewPosition: {
                type: "string",
                description: "Patient position or view (AP, PA, LAT, etc.)",
              },
              studyDescription: {
                type: "string",
                description: "Description of the imaging study",
              },
              studyDate: {
                type: "string",
                description: "Date of the imaging study",
              },
            },
          },

          // Device Information
          device: {
            type: "object",
            properties: {
              manufacturer: {
                type: "string",
                description: "Manufacturer of the imaging device",
              },
              modelName: {
                type: "string",
                description: "Model name of the imaging device",
              },
              stationName: {
                type: "string",
                description: "Name of the imaging station/workstation",
              },
              institutionName: {
                type: "string",
                description: "Name of the healthcare institution",
              },
            },
          },

          // Image Parameters
          imageParameters: {
            type: "object",
            properties: {
              pixelSpacing: {
                type: "array",
                items: { type: "number" },
                description:
                  "Pixel spacing in mm [row spacing, column spacing]",
              },
              windowCenter: {
                type: "array",
                items: { type: "number" },
                description: "Window center values for display",
              },
              windowWidth: {
                type: "array",
                items: { type: "number" },
                description: "Window width values for display",
              },
            },
          },
        },
      },

      // Processing confidence
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Overall confidence in extracted information (0.0-1.0)",
      },
    },
    required: ["patient", "technical"],
  },
} as FunctionDefinition;
