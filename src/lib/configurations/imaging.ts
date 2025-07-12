import type { FunctionDefinition } from "@langchain/core/language_models/base";
export default {
  name: "extractor",
  description:
    "You are an expert in analysis of medical imaging data. Proceed step by step. Identify the content of the image. We are analyzing medical data, if it is not a medical imaging, mark it as notMedical. We want to identify the contents of the image. With each section provide only information contained in the document.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "Title of the observation. Respect the original report language. Generate a title based on the contents of the image. Translate result to the [LANGUAGE] langauge if the source is in a different language.",
      },
      bodyParts: {
        type: "array",
        items: {
          type: "object",
          description:
            "Provide information about individual the body parts mentioned in the report.",
          properties: {
            identification: {
              type: "string",
              description: "Identification of the body part.",
              enum: [],
            },
            status: {
              type: "string",
              description:
                "Observed status of the body part. Leave is empty if the status is not available in the original report. Translate result to the [LANGUAGE] langauge if the source is in a different language.",
            },
            diagnosis: {
              type: "string",
              description:
                "Diagnosis of the body part. Leave empty if the diagnosis is not available. Translate result to the [LANGUAGE] langauge if the source is in a different language.",
            },
            treatment: {
              type: "string",
              description:
                "Performed or suggested treatment of the body part. Leave empty if the treatment is not available. Translate result to the [LANGUAGE] langauge if the source is in a different language.",
            },
          },
          required: ["identification", "status", "diagnosis", "treatment"],
        },
      },
      date: {
        type: "string",
        description:
          "Date of the report. Format: YYYY-MM-DD HH:MM:SS. Leave as undefined if the date is not available.",
      },
    },
    required: [
      "observation_type",
      "observation",
      "results",
      "date",
      "patient",
      "performer",
    ],
  },
} as FunctionDefinition;
