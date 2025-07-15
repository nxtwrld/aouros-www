import type { FunctionDefinition } from "@langchain/core/language_models/base";

export default {
  name: "triage_extractor",
  description:
    "Extract emergency department triage and initial assessment information from medical documents.",
  parameters: {
    type: "object",
    properties: {
      hasTriage: {
        type: "boolean",
        description: "Does this document contain triage information?",
      },
      chiefComplaint: {
        type: "string",
        description:
          "Primary reason for emergency department visit as stated by patient",
      },
      triageLevel: {
        type: "number",
        description: "Triage acuity level (1-5, where 1 is most urgent)",
      },
      arrivalTime: {
        type: "string",
        description:
          "Time of arrival to emergency department. Format: YYYY-MM-DD HH:MM:SS",
      },
      modeOfArrival: {
        type: "string",
        description:
          "How patient arrived (ambulance, walk-in, private vehicle, etc.)",
      },
      urgencyClassification: {
        type: "string",
        description:
          "Urgency classification (emergent, urgent, less urgent, non-urgent)",
      },
      initialVitals: {
        type: "object",
        properties: {
          temperature: { type: "number", description: "Body temperature" },
          bloodPressure: {
            type: "string",
            description: "Blood pressure reading",
          },
          heartRate: { type: "number", description: "Heart rate in BPM" },
          respiratoryRate: { type: "number", description: "Respiratory rate" },
          oxygenSaturation: {
            type: "number",
            description: "Oxygen saturation percentage",
          },
          painScore: { type: "number", description: "Pain scale score (0-10)" },
        },
      },
      allergies: {
        type: "array",
        items: { type: "string" },
        description: "Known allergies mentioned during triage",
      },
      currentMedications: {
        type: "array",
        items: { type: "string" },
        description: "Current medications mentioned during triage",
      },
      triageNotes: {
        type: "string",
        description: "Additional triage assessment notes",
      },
    },
    required: ["hasTriage"],
  },
} as FunctionDefinition;
