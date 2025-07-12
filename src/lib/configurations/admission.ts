import type { FunctionDefinition } from "@langchain/core/language_models/base";

export default {
  name: "admission_extractor",
  description:
    "Extract hospital admission and discharge information from medical documents. Identify admission details, length of stay, and discharge planning information.",
  parameters: {
    type: "object",
    properties: {
      hasAdmission: {
        type: "boolean",
        description:
          "Does this document contain admission/discharge information?",
      },
      admissionDate: {
        type: "string",
        description:
          "Date of hospital admission. Format: YYYY-MM-DD HH:MM:SS. Leave empty if not available.",
      },
      dischargeDate: {
        type: "string",
        description:
          "Date of hospital discharge. Format: YYYY-MM-DD HH:MM:SS. Leave empty if not available.",
      },
      lengthOfStay: {
        type: "number",
        description:
          "Length of stay in days. Calculate from admission to discharge dates if available.",
      },
      dischargeDisposition: {
        type: "string",
        description:
          "Where the patient was discharged to (home, rehabilitation facility, nursing home, etc.)",
      },
      admissionReason: {
        type: "string",
        description: "Primary reason for hospital admission",
      },
      dischargeSummary: {
        type: "string",
        description: "Summary of hospital stay and treatment provided",
      },
    },
    required: ["hasAdmission"],
  },
} as FunctionDefinition;
