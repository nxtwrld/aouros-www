import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";
export default {
  type: "object",
  description:
    "Origin of the report. First extract information about the doctor and the underlaying institution, that provided the report. Leave empty if the origin is not available. Second: structure the information into a jCard format. Always prefer the doctor as the primary contact, if the doctor is not available, use the institution as the primary contact.",
  properties: {},
  required: [],
} as FunctionDefinition;
