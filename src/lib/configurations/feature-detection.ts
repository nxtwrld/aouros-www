import type { FunctionDefinition } from "@langchain/core/language_models/base";

/**
 * Comprehensive AI Feature Detection for Medical Documents
 *
 * This AI-based detection system identifies which medical sections are present
 * in documents across all languages. It replaces the previous registry-based
 * approach with direct AI analysis that populates document sections.
 *
 * Philosophy: AI detects sections → Document contains sections → UI renders sections
 */
export default {
  name: "extractor",
  description:
    "Analyze medical documents comprehensively to identify ALL medical sections present. Carefully examine the entire document for: prescriptions/medications (drug names, dosages like '20mg 1-0-1'), procedures (surgical/endoscopic operations), lab values/measurements (numbers with units), imaging studies, diagnoses, etc. Set each boolean flag to true if that content type exists anywhere in the document. This analysis works in any language. If not medical content, mark as notMedical and skip other analysis.",
  parameters: {
    type: "object",
    properties: {
      isMedical: {
        type: "boolean",
        description:
          "Is this medical content (report, lab results, imaging, clinical notes, etc.)? true/false. If false, ignore all other parameters.",
      },
      language: {
        type: "string",
        description:
          "Language of the document content. Use ISO-639-1 two-character code (en, es, fr, de, cs, etc.)",
      },
      documentType: {
        type: "string",
        description: "Primary document type based on content analysis",
        enum: [
          "clinical_report",
          "laboratory_results",
          "imaging_report",
          "pathology_report",
          "surgical_report",
          "emergency_report",
          "consultation_note",
          "discharge_summary",
          "prescription",
          "immunization_record",
          "dental_record",
          "genetic_analysis",
          "oncology_report",
          "cardiology_report",
          "radiology_report",
        ],
      },

      // Core Medical Sections (Always Analyze)
      hasSummary: {
        type: "boolean",
        description: "Does the document contain summary or findings section?",
      },
      hasDiagnosis: {
        type: "boolean",
        description:
          "Does the document contain diagnosis information (ICD codes, conditions, etc.)?",
      },
      hasBodyParts: {
        type: "boolean",
        description:
          "Does the document reference specific body parts, anatomy, or organ systems?",
      },
      hasPerformer: {
        type: "boolean",
        description:
          "Does the document identify healthcare providers, physicians, or medical staff?",
      },
      hasRecommendations: {
        type: "boolean",
        description:
          "Does the document contain recommendations, follow-up instructions, or care plans?",
      },

      // Measurements and Data Sections
      hasSignals: {
        type: "boolean",
        description:
          "Does the document contain vital signs, lab values, measurements, or quantitative data? Look for: blood pressure, heart rate, temperature, lab test results, numerical values with units (mg, ml, %), blood counts, chemistry panels, etc.",
      },
      hasPrescriptions: {
        type: "boolean",
        description:
          "Does the document contain NEW prescriptions being issued? Look for: prescription documents, newly prescribed medications, dosage instructions for new medications (1-0-1, twice daily), drug brand names being prescribed, pharmaceutical prescriptions, medication recommendations from current visit, 'Take as directed', 'Dispense #30', refill information, etc.",
      },
      hasImmunizations: {
        type: "boolean",
        description:
          "Does the document contain vaccination records or immunization information?",
      },

      // Medical Specialty Sections
      hasImaging: {
        type: "boolean",
        description:
          "Does the document contain imaging studies (CT, MRI, X-ray, ultrasound, etc.)?",
      },
      hasDental: {
        type: "boolean",
        description:
          "Does the document contain dental examination or oral health information?",
      },
      hasAdmission: {
        type: "boolean",
        description:
          "Does the document contain hospital admission/discharge information?",
      },
      hasProcedures: {
        type: "boolean",
        description:
          "Does the document contain surgical or medical procedures? Look for: surgery descriptions, endoscopic procedures, biopsies, treatments performed, operative reports, procedure codes (CPT), surgical techniques, medical interventions, etc.",
      },
      hasAnesthesia: {
        type: "boolean",
        description:
          "Does the document contain anesthesia information or monitoring?",
      },
      hasSpecimens: {
        type: "boolean",
        description:
          "Does the document contain specimen collection or tissue sample information?",
      },
      hasMicroscopic: {
        type: "boolean",
        description:
          "Does the document contain microscopic examination or histology findings?",
      },
      hasMolecular: {
        type: "boolean",
        description:
          "Does the document contain molecular, genetic, or biomarker analysis?",
      },
      hasECG: {
        type: "boolean",
        description:
          "Does the document contain electrocardiogram or heart rhythm analysis?",
      },
      hasEcho: {
        type: "boolean",
        description:
          "Does the document contain echocardiogram or cardiac ultrasound findings?",
      },
      hasTriage: {
        type: "boolean",
        description:
          "Does the document contain emergency triage or acuity assessment?",
      },
      hasTreatments: {
        type: "boolean",
        description:
          "Does the document contain treatment protocols or therapeutic interventions?",
      },
      hasAssessment: {
        type: "boolean",
        description:
          "Does the document contain clinical assessment or specialist evaluation?",
      },

      // Enhanced Medical Specialty Sections
      hasTumorCharacteristics: {
        type: "boolean",
        description:
          "Does the document contain tumor staging, grading, or cancer characteristics?",
      },
      hasTreatmentPlan: {
        type: "boolean",
        description:
          "Does the document contain structured treatment plans (chemotherapy, radiation, etc.)?",
      },
      hasTreatmentResponse: {
        type: "boolean",
        description:
          "Does the document contain treatment response assessment (RECIST, etc.)?",
      },
      hasImagingFindings: {
        type: "boolean",
        description:
          "Does the document contain detailed radiology findings and measurements?",
      },
      hasGrossFindings: {
        type: "boolean",
        description:
          "Does the document contain gross pathological examination findings?",
      },
      hasSpecialStains: {
        type: "boolean",
        description:
          "Does the document contain special stains or immunohistochemistry results?",
      },
      hasAllergies: {
        type: "boolean",
        description:
          "Does the document contain allergy information or adverse reactions?",
      },
      hasMedications: {
        type: "boolean",
        description:
          "Does the document contain CURRENT medications or medication lists? Look for: current medication reconciliation, medication lists, home medications, ongoing medications, medication history, 'Patient takes', 'Currently on', medication compliance information, drug allergies, medication changes, discontinued medications, etc.",
      },
      hasSocialHistory: {
        type: "boolean",
        description:
          "Does the document contain social history or lifestyle factors?",
      },

      // Medical Context Tags
      medicalSpecialty: {
        type: "array",
        description: "Medical specialties relevant to this document",
        items: {
          type: "string",
          enum: [
            "general_medicine",
            "emergency_medicine",
            "surgery",
            "pathology",
            "radiology",
            "cardiology",
            "oncology",
            "dentistry",
            "genetics",
            "anesthesiology",
            "immunology",
            "dermatology",
            "neurology",
            "psychiatry",
            "orthopedics",
            "urology",
            "gynecology",
            "pediatrics",
          ],
        },
      },

      urgencyLevel: {
        type: "number",
        description:
          "Clinical urgency level (1-5, where 1=routine, 5=critical/emergency)",
        minimum: 1,
        maximum: 5,
      },

      tags: {
        type: "array",
        description:
          "Medical tags and labels from the document. Include anatomical terms, diseases, procedures, medications, and test names in their standard medical terminology (Latin/English).",
        items: {
          type: "string",
        },
      },
    },
    required: [
      "isMedical",
      "language",
      "documentType",
      "hasSummary",
      "hasDiagnosis",
      "hasSignals",
      "urgencyLevel",
      "tags",
    ],
  },
} as FunctionDefinition;
