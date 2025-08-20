import type { FunctionDefinition } from "@langchain/core/language_models/base";

export default {
  name: "visual_medical_analysis",
  description: `
You are analyzing a medical image. Provide a basic visual description of what you see.

Focus on:
1. What type of medical image this appears to be
2. What anatomical region is shown
3. Overall image quality and visibility
4. Basic description of visible structures

Do NOT attempt to:
- Diagnose conditions
- Identify specific anomalies (that's for anomaly detection)
- Measure anything (that's for measurement extraction)
- Name specific body parts (that's for body parts detection)

Simply describe what is visually present in the image.
`,
  parameters: {
    type: "object",
    properties: {
      modality: {
        type: "string",
        enum: [
          "X-ray",
          "CT",
          "MRI",
          "Ultrasound",
          "Mammography",
          "PET",
          "Nuclear Medicine",
          "Fluoroscopy",
          "Unknown",
        ],
        description: "Type of medical imaging based on visual characteristics",
      },

      anatomicalRegion: {
        type: "string",
        enum: [
          "Head/Brain",
          "Neck",
          "Chest",
          "Abdomen",
          "Pelvis",
          "Spine",
          "Upper Extremity",
          "Lower Extremity",
          "Multiple Regions",
          "Unknown",
        ],
        description: "General body region shown",
      },

      viewPosition: {
        type: "string",
        description: "Image orientation (e.g., frontal, lateral, axial)",
      },

      imageQuality: {
        type: "string",
        enum: ["excellent", "good", "fair", "poor"],
        description: "Overall image quality",
      },

      visualDescription: {
        type: "string",
        description:
          "Plain language description of what is visible in the image",
      },

      technicalQuality: {
        type: "object",
        properties: {
          contrast: {
            type: "string",
            enum: ["good", "adequate", "poor"],
            description: "Image contrast quality",
          },
          brightness: {
            type: "string",
            enum: ["optimal", "too_bright", "too_dark"],
            description: "Image brightness",
          },
          artifacts: {
            type: "boolean",
            description: "Whether technical artifacts are present",
          },
        },
        required: ["contrast", "brightness", "artifacts"],
      },

      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Confidence in image type identification (0-1)",
      },
    },
    required: [
      "modality",
      "anatomicalRegion",
      "imageQuality",
      "visualDescription",
      "confidence",
    ],
  },
} as FunctionDefinition;
