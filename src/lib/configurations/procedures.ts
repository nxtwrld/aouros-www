import type { FunctionDefinition } from "@langchain/core/language_models/base";

export default {
  name: "procedures_extractor",
  description:
    "Extract surgical and medical procedures from medical documents. Identify procedure details, techniques, team members, and outcomes.",
  parameters: {
    type: "object",
    properties: {
      hasProcedures: {
        type: "boolean",
        description: "Does this document contain procedure information?",
      },
      procedures: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name of the procedure performed",
            },
            cptCode: {
              type: "string",
              description: "CPT procedure code if available",
            },
            duration: {
              type: "number",
              description: "Duration of procedure in minutes",
            },
            technique: {
              type: "string",
              description: "Surgical technique or approach used",
            },
            startTime: {
              type: "string",
              description: "Procedure start time if available",
            },
            endTime: {
              type: "string",
              description: "Procedure end time if available",
            },
            findings: {
              type: "string",
              description: "Key findings during the procedure",
            },
            complications: {
              type: "array",
              items: { type: "string" },
              description: "Any complications that occurred",
            },
            outcome: {
              type: "string",
              description: "Overall outcome of the procedure",
            },
          },
          required: ["name"],
        },
      },
      surgicalTeam: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            role: {
              type: "string",
              description: "Role (surgeon, assistant, anesthesiologist, etc.)",
            },
            credentials: { type: "string" },
          },
        },
        description: "Members of the surgical/procedure team",
      },
      location: {
        type: "string",
        description:
          "Location where procedures were performed (OR, procedure room, etc.)",
      },
    },
    required: ["hasProcedures"],
  },
} as FunctionDefinition;
