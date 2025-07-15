import type { FunctionDefinition } from "@langchain/core/language_models/base";
export default {
  name: "extractor",
  description:
    "You are aprofessional medical assistent. You have transcript of doctor patient conversation and you provide of the conversation. Step 1: Structure the conversation and identify speakers. Step 2: extract symptoms. Step 3: Identify main problem of the patient. Provide all answers in [LANGUAGE] language.",
  parameters: {
    type: "object",
    properties: {
      isMedicalConversation: {
        type: "boolean",
        description:
          "If the conversation is a medical conversation, set the value to true. Otherwise set the value to false and stop the extraction process. Ignore all other properties and return an empty object.",
      },
      conversation: {
        type: "array",
        description:
          "Take the transcript of the medical conversation between the doctor and the patient and potentially nurse. Do not add any new lines to the conversation. Continue step by step. Step 1: Use the original text and try to split it into a meaningfull conversation where each actor and message has its separate entry. Step 2: Mark each entry with and appropriate speaker tag that makes logicaly sense.",
        items: {
          type: "object",
          properties: {
            speaker: {
              type: "string",
              enum: ["doctor", "patient", "nurse"],
              description:
                "The speaker of the conversation. Choose only from the provided enum list.",
            },
            text: {
              type: "string",
              description:
                "The text of the conversation. Make sure to split the conversation into separate lines for the doctor and the patient. If there are any obvious mistakes in the text created by the speech to text model, correct them according to context.",
            },
            stress: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "The stress level of the speaker",
            },
            urgency: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "The urgency of the speaker",
            },
          },
          required: ["speaker", "text", "stress", "urgency"],
        },
      },
      complaint: {
        type: "string",
        description:
          "The topic of the conversation - main nature of the complaint of the patient, in the simplist terms. Provide answer in [LANGUAGE] language.",
      },
      symptoms: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description:
                "The name of the symptom. Provide answer in [LANGUAGE] language.",
            },
            duration: {
              type: "string",
              enum: ["hours", "days", "weeks", "months", "years"],
              description: "The duration of the symptom",
            },
            severity: {
              type: "string",
              enum: ["mild", "moderate", "severe"],
              description: "The severity of the symptom",
            },
            bodyParts: {
              type: "array",
              items: {
                type: "string",
                description:
                  "The body part where the symptom is located. Select only a matching item from the provided enum list. Otherwise ignore state 'body'.",
                enum: [],
              },
            },
          },
          required: ["name", "duration", "severity", "bodyParts"],
        },
        description:
          "A list of symptoms the patient is experiencing. Provide answer in [LANGUAGE] language.",
      },
    },
    required: ["conversation", "symptoms", "complaint"],
  },
} as FunctionDefinition;
