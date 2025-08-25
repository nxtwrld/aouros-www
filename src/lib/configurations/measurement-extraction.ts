import type { FunctionDefinition } from "@langchain/core/language_models/base";

export default {
  name: "measurement_extraction",
  description: `
Extract quantitative measurements from the medical image.

Focus on:
1. Distances between anatomical landmarks
2. Sizes of structures or abnormalities
3. Angles (e.g., spinal curvature)
4. Areas or volumes if determinable
5. Density measurements (if visible as different shades)
6. Counts of discrete items

Note: Only report measurements that can be reasonably estimated from the image.
`,
  parameters: {
    type: "object",
    properties: {
      measurements: {
        type: "array",
        description: "List of extracted measurements",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: [
                "distance",
                "width",
                "height",
                "diameter",
                "circumference",
                "area",
                "volume",
                "angle",
                "ratio",
                "count",
                "density",
              ],
              description: "Type of measurement",
            },
            description: {
              type: "string",
              description: "What is being measured",
            },
            value: {
              type: "number",
              description: "Numeric value of the measurement",
            },
            unit: {
              type: "string",
              enum: [
                "mm",
                "cm",
                "m",
                "degrees",
                "ratio",
                "count",
                "HU",
                "percent",
                "relative",
              ],
              description: "Unit of measurement",
            },
            location: {
              type: "string",
              description: "Where in the image this measurement was taken",
            },
            isEstimated: {
              type: "boolean",
              description:
                "Whether this is an estimation or precise measurement",
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Confidence in measurement accuracy (0-1)",
            },
          },
          required: [
            "type",
            "description",
            "value",
            "unit",
            "isEstimated",
            "confidence",
          ],
        },
      },

      clinicallyRelevantMeasurements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            measurement: {
              type: "string",
              description: "Reference to measurement from above",
            },
            clinicalSignificance: {
              type: "string",
              description: "Why this measurement is clinically important",
            },
            isAbnormal: {
              type: "boolean",
              description: "Whether this measurement appears abnormal",
            },
          },
          required: ["measurement", "clinicalSignificance", "isAbnormal"],
        },
        description: "Measurements with clinical significance",
      },

      measurementQuality: {
        type: "string",
        enum: ["precise", "good", "approximate", "rough_estimate"],
        description: "Overall quality/precision of measurements",
      },
    },
    required: ["measurements", "measurementQuality"],
  },
} as FunctionDefinition;
