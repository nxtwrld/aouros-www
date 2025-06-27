import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";
export default {
  type: "object",
  description:
    "Diagnosis of the patient. Leave empty if the diagnosis is not available in the document.",
  properties: {
    code: {
      type: "string",
      description: "The ICD-10 code of the diagnosis",
    },
    description: {
      type: "string",
      description:
        "Description of the diagnosis if given.  Translate result to the [LANGUAGE] langauge if the source is in a different language.",
    },
  },
} as FunctionDefinition;
