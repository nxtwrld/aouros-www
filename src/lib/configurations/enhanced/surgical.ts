// Enhanced Surgical Report Schema - Specialized extraction for surgical procedures
// Extends existing report schema with surgical-specific fields

import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";

export const surgicalSchema: FunctionDefinition = {
  name: "surgical_report_analysis",
  description: "Extract comprehensive surgical procedure information from operative reports",
  parameters: {
    type: "object",
    properties: {
      procedure: {
        type: "object",
        description: "Primary surgical procedure details",
        properties: {
          name: {
            type: "string",
            description: "Full name of the surgical procedure",
          },
          cptCode: {
            type: "string",
            description: "CPT code for the procedure",
          },
          icd10Code: {
            type: "string", 
            description: "ICD-10 procedure code",
          },
          duration: {
            type: "number",
            description: "Procedure duration in minutes",
          },
          technique: {
            type: "string",
            description: "Surgical technique or approach used",
          },
          complexity: {
            type: "string",
            enum: ["simple", "moderate", "complex", "highly_complex"],
            description: "Complexity level of the procedure",
          },
        },
        required: ["name"],
      },
      surgicalTeam: {
        type: "array",
        description: "Surgical team members and their roles",
        items: {
          type: "object",
          properties: {
            role: {
              type: "string",
              enum: ["surgeon", "assistant_surgeon", "anesthesiologist", "nurse", "technician", "resident"],
              description: "Role in the surgical team",
            },
            name: {
              type: "string",
              description: "Name of the team member",
            },
            credentials: {
              type: "string",
              description: "Medical credentials (MD, RN, etc.)",
            },
            specialty: {
              type: "string",
              description: "Medical specialty",
            },
          },
          required: ["role"],
        },
      },
      preoperativeCondition: {
        type: "object",
        description: "Patient condition before surgery",
        properties: {
          diagnosis: {
            type: "string",
            description: "Primary preoperative diagnosis",
          },
          comorbidities: {
            type: "array",
            items: { type: "string" },
            description: "Existing medical conditions",
          },
          medications: {
            type: "array",
            items: { type: "string" },
            description: "Current medications",
          },
          allergies: {
            type: "array", 
            items: { type: "string" },
            description: "Known allergies",
          },
          riskFactors: {
            type: "array",
            items: { type: "string" },
            description: "Surgical risk factors",
          },
        },
      },
      anesthesia: {
        type: "object",
        description: "Anesthesia details",
        properties: {
          type: {
            type: "string",
            enum: ["general", "regional", "local", "sedation", "spinal", "epidural"],
            description: "Type of anesthesia used",
          },
          agent: {
            type: "string",
            description: "Anesthetic agent(s) used",
          },
          complications: {
            type: "array",
            items: { type: "string" },
            description: "Anesthesia-related complications",
          },
        },
      },
      operativeFindings: {
        type: "object",
        description: "Findings during the operation",
        properties: {
          anatomicalFindings: {
            type: "array",
            items: { type: "string" },
            description: "Anatomical findings and observations",
          },
          pathology: {
            type: "array",
            items: { type: "string" },
            description: "Pathological findings",
          },
          complications: {
            type: "array",
            items: { type: "string" },
            description: "Intraoperative complications",
          },
          specimens: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                description: { type: "string" },
                sentToPathology: { type: "boolean" },
              },
            },
            description: "Specimens collected during surgery",
          },
        },
      },
      technique: {
        type: "object",
        description: "Surgical technique details",
        properties: {
          approach: {
            type: "string",
            description: "Surgical approach (open, laparoscopic, robotic, etc.)",
          },
          incision: {
            type: "string",
            description: "Type and location of incision",
          },
          instruments: {
            type: "array",
            items: { type: "string" },
            description: "Specialized instruments used",
          },
          implants: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                manufacturer: { type: "string" },
                model: { type: "string" },
                serialNumber: { type: "string" },
              },
            },
            description: "Implants or prostheses used",
          },
        },
      },
      closure: {
        type: "object",
        description: "Wound closure details",
        properties: {
          layers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                layer: { type: "string" },
                sutureMaterial: { type: "string" },
                technique: { type: "string" },
              },
            },
            description: "Layer-by-layer closure details",
          },
          dressing: {
            type: "string",
            description: "Type of dressing applied",
          },
          drains: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                location: { type: "string" },
                output: { type: "string" },
              },
            },
            description: "Surgical drains placed",
          },
        },
      },
      postoperativeStatus: {
        type: "object",
        description: "Immediate postoperative status",
        properties: {
          condition: {
            type: "string",
            enum: ["stable", "critical", "guarded", "fair", "good"],
            description: "Patient condition after surgery",
          },
          destination: {
            type: "string",
            enum: ["recovery_room", "icu", "ward", "discharge"],
            description: "Where patient was transferred",
          },
          complications: {
            type: "array",
            items: { type: "string" },
            description: "Immediate postoperative complications",
          },
          bloodLoss: {
            type: "number",
            description: "Estimated blood loss in mL",
          },
          fluidsGiven: {
            type: "number",
            description: "IV fluids administered in mL",
          },
        },
      },
      followUp: {
        type: "object",
        description: "Follow-up care instructions",
        properties: {
          instructions: {
            type: "array",
            items: { type: "string" },
            description: "Post-operative care instructions",
          },
          medications: {
            type: "array",
            items: {
              type: "object",
              properties: {
                medication: { type: "string" },
                dosage: { type: "string" },
                frequency: { type: "string" },
                duration: { type: "string" },
              },
            },
            description: "Post-operative medications",
          },
          nextAppointment: {
            type: "string",
            description: "When to schedule next appointment",
          },
          restrictions: {
            type: "array",
            items: { type: "string" },
            description: "Activity restrictions",
          },
          warningSignsPath: {
            type: "array",
            items: { type: "string" },
            description: "Warning signs to watch for",
          },
        },
      },
      qualityMetrics: {
        type: "object",
        description: "Quality and safety metrics",
        properties: {
          timeoutPerformed: {
            type: "boolean",
            description: "Whether surgical timeout was performed",
          },
          antibioticProphylaxis: {
            type: "boolean",
            description: "Whether antibiotic prophylaxis was given",
          },
          counts: {
            type: "object",
            properties: {
              sponges: { type: "string" },
              instruments: { type: "string" },
              sharps: { type: "string" },
            },
            description: "Surgical count verification",
          },
          safetyChecklist: {
            type: "boolean",
            description: "Whether WHO surgical safety checklist was completed",
          },
        },
      },
    },
    required: ["procedure"],
  },
};

export default surgicalSchema;