import type { FunctionDefinition } from "@langchain/core/language_models/base";
export default {
  name: "extractor",
  description:
    "Proceed step by step. Identify the content of the image. We are analyzing medical data, if it is not medical report, lab results of medical imaging, mark it as notMedical.   All results should be in [LANGUAGE] language, except for contents which is in the original language of the report.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "Title of the observation. Translate result to the [LANGUAGE] language if the source is in a different language. Provide specific context from the report to clearly identify the report topic.",
      },
      summary: {
        type: "string",
        description:
          "Summary and findings of the observation in natural language. Translate result to the [LANGUAGE] language if the source is in a different language. Enhance comprehension by providing a clear and concise summary. Highlight abnormal findings. Result of the lab test.",
      },
      date: {
        type: "string",
        description:
          "Date of the lab test. Format: YYYY-MM-DD HH:MM:SS. Leave empty if the date is not available.",
      },
      sample_date: {
        type: "string",
        description:
          "Date of the sample extracted. Format: YYYY-MM-DD HH:MM:SS. Leave empty if the date is not available.",
      },
    },
    required: ["title", "summary", "date", "sample_date", "signals"],
  },
} as FunctionDefinition;
