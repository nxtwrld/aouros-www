import type { FunctionDefinition } from "@langchain/core/language_models/base";
import coreBodyParts from "./core.bodyParts";

/**
 * Body Parts Extraction Schema
 * 
 * Focused node for extracting anatomical regions and body parts from medical documents.
 */
export default {
  name: "extract_body_parts",
  description:
    "Extract anatomical regions and body parts mentioned in medical documents including affected areas, examination sites, and procedural locations.",
  parameters: {
    type: "object",
    properties: {
      bodyParts: coreBodyParts,
      
      // Processing metadata
      processingConfidence: {
        type: "number",
        description: "Overall confidence in body parts extraction (0.0 to 1.0)",
      },
      
      processingNotes: {
        type: "string",
        description: "Any notes about the body parts extraction process or anatomical ambiguities",
      },
    },
    required: ["bodyParts", "processingConfidence"],
  },
} as FunctionDefinition;