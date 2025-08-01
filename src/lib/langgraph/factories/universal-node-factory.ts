/**
 * Universal Processing Node Factory
 *
 * Eliminates the need for individual node files by creating nodes dynamically
 * from configuration. All medical processing logic is handled by schemas + AI.
 */

import type { DocumentProcessingState } from "../state";
import {
  BaseProcessingNode,
  type BaseProcessingNodeConfig,
  type ProcessingNodeResult,
} from "../nodes/_base-processing-node";

export interface UniversalNodeConfig {
  nodeName: string;
  description: string;
  schemaPath: string;
  triggers: string[];
  priority: number;
  timeout?: number;
  customValidation?: (
    data: any,
    state: DocumentProcessingState,
  ) => any | Promise<any>;
  // Output mapping configuration
  outputMapping?: {
    reportField: string; // Field name in final report object
    unwrapField?: string; // Field to unwrap from extraction wrapper
    isMainReport?: boolean; // Whether this is the main report data to merge
  };
}

export interface NodeRegistry {
  [key: string]: UniversalNodeConfig;
}

/**
 * Configuration for all processing nodes
 * Single source of truth for node definitions
 */
export const NODE_CONFIGURATIONS: NodeRegistry = {
  // Core Medical Processing (Priority 1)
  "medical-analysis": {
    nodeName: "medical-analysis",
    description: "General medical content analysis and core sections",
    schemaPath: "$lib/configurations/report.core",
    triggers: ["isMedical"], // Always run for medical documents
    priority: 1,
    outputMapping: {
      reportField: "medical-analysis",
      isMainReport: true,
    },
  },
  "diagnosis-processing": {
    nodeName: "diagnosis-processing",
    description: "Medical diagnosis extraction and analysis",
    schemaPath: "$lib/configurations/diagnosis.extraction",
    triggers: ["hasDiagnosis"],
    priority: 1,
    outputMapping: {
      reportField: "diagnosis",
      unwrapField: "diagnosis",
    },
  },
  "performer-processing": {
    nodeName: "performer-processing",
    description: "Medical professional and healthcare provider analysis",
    schemaPath: "$lib/configurations/performer.extraction",
    triggers: ["isMedical"], // Always run for medical documents
    priority: 1,
    outputMapping: {
      reportField: "performer",
      unwrapField: "performer",
    },
  },
  "patient-processing": {
    nodeName: "patient-processing",
    description: "Patient information extraction and analysis",
    schemaPath: "$lib/configurations/patient.extraction",
    triggers: ["isMedical"], // Always run for medical documents
    priority: 1,
    outputMapping: {
      reportField: "patient",
      unwrapField: "patient",
    },
  },
  "body-parts-processing": {
    nodeName: "body-parts-processing",
    description: "Anatomical regions and body parts analysis",
    schemaPath: "$lib/configurations/bodyparts.extraction",
    triggers: ["isMedical"], // Always run for medical documents
    priority: 1,
    outputMapping: {
      reportField: "bodyParts",
      unwrapField: "bodyParts",
    },
  },
  "signal-processing": {
    nodeName: "signal-processing",
    description:
      "Lab results and medical signals analysis (includes laboratory data)",
    schemaPath: "$lib/configurations/core.signals",
    triggers: ["hasSignals"],
    priority: 1,
    outputMapping: {
      reportField: "signals",
    },
  },

  // Specialized Medical Domains (Priority 2)
  "ecg-processing": {
    nodeName: "ecg-processing",
    description: "ECG analysis using schema-driven extraction",
    schemaPath: "$lib/configurations/ecg",
    triggers: ["hasECG"],
    priority: 2,
    outputMapping: {
      reportField: "ecg",
    },
  },
  "imaging-processing": {
    nodeName: "imaging-processing",
    description: "Medical imaging analysis",
    schemaPath: "$lib/configurations/imaging",
    triggers: ["hasImaging"],
    priority: 2,
    outputMapping: {
      reportField: "imaging",
    },
  },
  "imaging-findings-processing": {
    nodeName: "imaging-findings-processing",
    description: "Detailed radiology findings and measurements analysis",
    schemaPath: "$lib/configurations/imaging-findings",
    triggers: ["hasImagingFindings"],
    priority: 2,
    outputMapping: {
      reportField: "imagingFindings",
    },
  },
  "echo-processing": {
    nodeName: "echo-processing",
    description: "Echocardiogram cardiac ultrasound analysis",
    schemaPath: "$lib/configurations/echo",
    triggers: ["hasEcho"],
    priority: 2,
    outputMapping: {
      reportField: "echo",
    },
  },
  "allergies-processing": {
    nodeName: "allergies-processing",
    description: "Patient allergy and adverse reaction analysis",
    schemaPath: "$lib/configurations/allergies",
    triggers: ["hasAllergies"],
    priority: 2,
    outputMapping: {
      reportField: "allergies",
    },
  },
  "medications-processing": {
    nodeName: "medications-processing",
    description: "Unified medication and prescription analysis",
    schemaPath: "$lib/configurations/medications",
    triggers: ["hasPrescriptions", "hasMedications"],
    priority: 2,
    outputMapping: {
      reportField: "medications",
    },
  },
  "procedures-processing": {
    nodeName: "procedures-processing",
    description: "Medical procedures analysis",
    schemaPath: "$lib/configurations/procedures",
    triggers: ["hasProcedures"],
    priority: 3,
    outputMapping: {
      reportField: "procedures",
    },
  },

  // Specialized Medical Domains (Priority 3)
  "anesthesia-processing": {
    nodeName: "anesthesia-processing",
    description: "Anesthesia records analysis using schema-driven extraction",
    schemaPath: "$lib/configurations/anesthesia",
    triggers: ["hasAnesthesia"],
    priority: 3,
    outputMapping: {
      reportField: "anesthesia",
    },
  },
  "microscopic-processing": {
    nodeName: "microscopic-processing",
    description:
      "Histological and microscopic findings analysis using schema-driven extraction",
    schemaPath: "$lib/configurations/microscopic",
    triggers: ["hasMicroscopic"],
    priority: 3,
    outputMapping: {
      reportField: "microscopic",
    },
  },
  "triage-processing": {
    nodeName: "triage-processing",
    description:
      "Emergency department triage and acuity assessment using schema-driven extraction",
    schemaPath: "$lib/configurations/triage",
    triggers: ["hasTriage"],
    priority: 3,
    outputMapping: {
      reportField: "triage",
    },
  },
  "immunization-processing": {
    nodeName: "immunization-processing",
    description:
      "Vaccination records and immunization compliance analysis using schema-driven extraction",
    schemaPath: "$lib/configurations/immunization",
    triggers: ["hasImmunizations"],
    priority: 3,
    outputMapping: {
      reportField: "immunizations",
    },
  },

  // Hospital Workflow Domains (Priority 4)
  "specimens-processing": {
    nodeName: "specimens-processing",
    description:
      "Specimen collection and handling analysis using schema-driven extraction",
    schemaPath: "$lib/configurations/specimens",
    triggers: ["hasSpecimens"],
    priority: 4,
    outputMapping: {
      reportField: "specimens",
    },
  },
  "admission-processing": {
    nodeName: "admission-processing",
    description:
      "Hospital admission and discharge analysis using schema-driven extraction",
    schemaPath: "$lib/configurations/admission",
    triggers: ["hasAdmission"],
    priority: 4,
    outputMapping: {
      reportField: "admission",
    },
  },
  "dental-processing": {
    nodeName: "dental-processing",
    description:
      "Dental and oral health records analysis using schema-driven extraction",
    schemaPath: "$lib/configurations/dental",
    triggers: ["hasDental"],
    priority: 4,
    outputMapping: {
      reportField: "dental",
    },
  },

  // Advanced Medical Analysis (Priority 5)
  "tumor-characteristics-processing": {
    nodeName: "tumor-characteristics-processing",
    description: "Tumor staging, grading, and cancer characteristics analysis",
    schemaPath: "$lib/configurations/tumor-characteristics",
    triggers: ["hasTumorCharacteristics"],
    priority: 5,
    outputMapping: {
      reportField: "tumorCharacteristics",
    },
  },
  "treatment-plan-processing": {
    nodeName: "treatment-plan-processing",
    description:
      "Structured treatment plans including chemotherapy, radiation, surgery",
    schemaPath: "$lib/configurations/treatment-plan",
    triggers: ["hasTreatmentPlan"],
    priority: 5,
    outputMapping: {
      reportField: "treatmentPlan",
    },
  },
  "treatment-response-processing": {
    nodeName: "treatment-response-processing",
    description: "Treatment response assessment including RECIST criteria",
    schemaPath: "$lib/configurations/treatment-response",
    triggers: ["hasTreatmentResponse"],
    priority: 5,
    outputMapping: {
      reportField: "treatmentResponse",
    },
  },
  "gross-findings-processing": {
    nodeName: "gross-findings-processing",
    description: "Gross pathological examination findings analysis",
    schemaPath: "$lib/configurations/gross-findings",
    triggers: ["hasGrossFindings"],
    priority: 5,
    outputMapping: {
      reportField: "grossFindings",
    },
  },
  "special-stains-processing": {
    nodeName: "special-stains-processing",
    description: "Special stains and immunohistochemistry results analysis",
    schemaPath: "$lib/configurations/special-stains",
    triggers: ["hasSpecialStains"],
    priority: 5,
    outputMapping: {
      reportField: "specialStains",
    },
  },
  "social-history-processing": {
    nodeName: "social-history-processing",
    description: "Social history and lifestyle factors analysis",
    schemaPath: "$lib/configurations/social-history",
    triggers: ["hasSocialHistory"],
    priority: 5,
    outputMapping: {
      reportField: "socialHistory",
    },
  },
  "treatments-processing": {
    nodeName: "treatments-processing",
    description: "Treatment protocols and therapeutic interventions analysis",
    schemaPath: "$lib/configurations/treatments",
    triggers: ["hasTreatments"],
    priority: 5,
    outputMapping: {
      reportField: "treatments",
    },
  },
  "assessment-processing": {
    nodeName: "assessment-processing",
    description: "Clinical assessment and specialist evaluation analysis",
    schemaPath: "$lib/configurations/assessment",
    triggers: ["hasAssessment"],
    priority: 5,
    outputMapping: {
      reportField: "assessment",
    },
  },
  "molecular-processing": {
    nodeName: "molecular-processing",
    description: "Molecular, genetic, and biomarker analysis",
    schemaPath: "$lib/configurations/molecular",
    triggers: ["hasMolecular"],
    priority: 5,
    outputMapping: {
      reportField: "molecular",
    },
  },

  // Post-Processing Nodes (Priority 10)
  "medical-terms-generation": {
    nodeName: "medical-terms-generation",
    description:
      "Generate unified medical terms array from analysis results for search optimization",
    schemaPath: "", // No schema - uses custom processing logic
    triggers: ["isMedical"], // Always run for medical documents
    priority: 10, // Run after all other medical processing
    outputMapping: {
      reportField: "medicalTermsGeneration",
    },
  },
};

/**
 * Universal Processing Node
 * Dynamic node that configures itself based on the provided configuration
 */
export class UniversalProcessingNode extends BaseProcessingNode {
  private nodeConfig: UniversalNodeConfig;

  constructor(nodeConfig: UniversalNodeConfig) {
    const baseConfig: BaseProcessingNodeConfig = {
      nodeName: nodeConfig.nodeName,
      description: nodeConfig.description,
      schemaImportPath: nodeConfig.schemaPath,
      progressStages: [
        {
          stage: `${nodeConfig.nodeName}_schema_loading`,
          progress: 10,
          message: `Loading ${nodeConfig.nodeName.replace("-processing", "")} analysis schema`,
        },
        {
          stage: `${nodeConfig.nodeName}_ai_processing`,
          progress: 50,
          message: `Extracting ${nodeConfig.nodeName.replace("-processing", "")} data with AI using structured schema`,
        },
        {
          stage: `${nodeConfig.nodeName}_completion`,
          progress: 100,
          message: `${nodeConfig.nodeName.replace("-processing", "").charAt(0).toUpperCase() + nodeConfig.nodeName.replace("-processing", "").slice(1)} processing completed`,
        },
      ],
      featureDetectionTriggers: nodeConfig.triggers,
    };

    super(baseConfig);
    this.nodeConfig = nodeConfig;
  }

  protected getSectionName(): string {
    // Use the reportField from output mapping if available, otherwise derive from nodeName
    const sectionName =
      this.nodeConfig.outputMapping?.reportField ||
      this.nodeConfig.nodeName.replace("-processing", "");
    console.log(
      `🔧 ${this.nodeConfig.nodeName} getSectionName() returning: "${sectionName}"`,
    );
    return sectionName;
  }

  /**
   * Universal validation and enhancement
   * Uses custom validation if provided, otherwise uses default
   */
  protected async validateAndEnhance(
    aiResult: any,
    state: DocumentProcessingState,
  ): Promise<ProcessingNodeResult> {
    const processingTime = Date.now();
    const tokensUsed = state.tokenUsage?.[this.config.nodeName] || 0;

    // Apply custom validation if provided (supports async)
    const enhancedData = this.nodeConfig.customValidation
      ? await this.nodeConfig.customValidation(aiResult, state)
      : this.applyDefaultEnhancement(aiResult, state);

    return {
      data: enhancedData,
      metadata: {
        processingTime,
        tokensUsed,
        confidence: this.calculateUniversalConfidence(enhancedData),
        provider: "enhanced-openai",
      },
    };
  }

  /**
   * Default enhancement applied to all nodes
   */
  private applyDefaultEnhancement(
    aiResult: any,
    state: DocumentProcessingState,
  ): any {
    return {
      ...aiResult,
      documentContext: {
        documentType:
          state.featureDetectionResults?.documentType ||
          `${this.getSectionName()}_record`,
        language: state.language || "English",
        extractedFrom: "universal_schema_driven_analysis",
        processingTimestamp: new Date().toISOString(),
        nodeId: this.nodeConfig.nodeName,
        priority: this.nodeConfig.priority,
      },
    };
  }

  /**
   * Universal confidence calculation based on data completeness
   */
  protected calculateUniversalConfidence(data: any): number {
    let confidence = 0.5; // Base confidence

    // Generic confidence indicators
    if (data && Object.keys(data).length > 1) confidence += 0.1; // Has data beyond just documentContext

    // Check for boolean trigger field (e.g., hasECG, hasTriage)
    const triggerField = this.nodeConfig.triggers[0];
    if (data[triggerField] === true) confidence += 0.2;

    // Check for structured data presence
    const structuredFields = Object.keys(data).filter(
      (key) =>
        key !== "documentContext" &&
        typeof data[key] === "object" &&
        data[key] !== null,
    );
    confidence += Math.min(structuredFields.length * 0.1, 0.2);

    return Math.min(confidence, 1.0);
  }

  /**
   * Universal required fields check
   */
  protected hasRequiredFields(data: any): boolean {
    // At minimum, check if any trigger field is true or if we have meaningful data
    return (
      this.nodeConfig.triggers.some((trigger) => data[trigger] === true) ||
      (data && Object.keys(data).length > 1)
    ); // More than just documentContext
  }
}

/**
 * Universal Node Factory
 * Creates processing nodes from configuration
 */
export class UniversalNodeFactory {
  /**
   * Create a processing node from configuration
   */
  static createNode(
    nodeId: string,
  ): (
    state: DocumentProcessingState,
  ) => Promise<Partial<DocumentProcessingState>> {
    const config = NODE_CONFIGURATIONS[nodeId];
    if (!config) {
      throw new Error(`Unknown node configuration: ${nodeId}`);
    }

    // Special case: medical-terms-generation uses custom logic instead of schema
    if (nodeId === "medical-terms-generation") {
      return async (state: DocumentProcessingState) => {
        const { medicalTermsGenerationNode } = await import(
          "../nodes/medical-terms-generation"
        );
        return medicalTermsGenerationNode(state);
      };
    }

    const nodeInstance = new UniversalProcessingNode(config);

    return async (
      state: DocumentProcessingState,
    ): Promise<Partial<DocumentProcessingState>> => {
      return nodeInstance.process(state);
    };
  }

  /**
   * Get all available node configurations
   */
  static getAllConfigurations(): NodeRegistry {
    return NODE_CONFIGURATIONS;
  }

  /**
   * Get node configuration by ID
   */
  static getConfiguration(nodeId: string): UniversalNodeConfig | undefined {
    return NODE_CONFIGURATIONS[nodeId];
  }

  /**
   * Add or update node configuration at runtime
   */
  static registerNode(nodeId: string, config: UniversalNodeConfig): void {
    NODE_CONFIGURATIONS[nodeId] = config;
  }

  /**
   * Get nodes by priority level
   */
  static getNodesByPriority(priority: number): UniversalNodeConfig[] {
    return Object.values(NODE_CONFIGURATIONS).filter(
      (config) => config.priority === priority,
    );
  }

  /**
   * Get output mapping configuration for a node
   */
  static getOutputMapping(
    nodeId: string,
  ): UniversalNodeConfig["outputMapping"] | undefined {
    const config = NODE_CONFIGURATIONS[nodeId];
    return config?.outputMapping;
  }

  /**
   * Get all nodes with their output mappings
   */
  static getAllOutputMappings(): Record<
    string,
    UniversalNodeConfig["outputMapping"]
  > {
    const mappings: Record<string, UniversalNodeConfig["outputMapping"]> = {};
    for (const [nodeId, config] of Object.entries(NODE_CONFIGURATIONS)) {
      if (config.outputMapping) {
        mappings[nodeId] = config.outputMapping;
      }
    }
    return mappings;
  }

  /**
   * Get nodes by trigger
   */
  static getNodesByTrigger(trigger: string): UniversalNodeConfig[] {
    return Object.values(NODE_CONFIGURATIONS).filter((config) =>
      config.triggers.includes(trigger),
    );
  }
}

/**
 * Convenience functions for creating specific nodes
 */
// Core Processing (Priority 1)
export const createMedicalAnalysisNode = () =>
  UniversalNodeFactory.createNode("medical-analysis");
export const createDiagnosisProcessingNode = () =>
  UniversalNodeFactory.createNode("diagnosis-processing");
export const createPerformerProcessingNode = () =>
  UniversalNodeFactory.createNode("performer-processing");
export const createPatientProcessingNode = () =>
  UniversalNodeFactory.createNode("patient-processing");
export const createBodyPartsProcessingNode = () =>
  UniversalNodeFactory.createNode("body-parts-processing");
export const createSignalProcessingNode = () =>
  UniversalNodeFactory.createNode("signal-processing");

// Specialized Medical Domains (Priority 2)
export const createECGNode = () =>
  UniversalNodeFactory.createNode("ecg-processing");
export const createImagingNode = () =>
  UniversalNodeFactory.createNode("imaging-processing");
export const createImagingFindingsNode = () =>
  UniversalNodeFactory.createNode("imaging-findings-processing");
export const createEchoNode = () =>
  UniversalNodeFactory.createNode("echo-processing");
export const createAllergiesNode = () =>
  UniversalNodeFactory.createNode("allergies-processing");
export const createMedicationsNode = () =>
  UniversalNodeFactory.createNode("medications-processing");
export const createProceduresNode = () =>
  UniversalNodeFactory.createNode("procedures-processing");

// Specialized Medical Domains (Priority 3)
export const createAnesthesiaNode = () =>
  UniversalNodeFactory.createNode("anesthesia-processing");
export const createMicroscopicNode = () =>
  UniversalNodeFactory.createNode("microscopic-processing");
export const createTriageNode = () =>
  UniversalNodeFactory.createNode("triage-processing");
export const createImmunizationNode = () =>
  UniversalNodeFactory.createNode("immunization-processing");

// Hospital Workflow Domains (Priority 4)
export const createSpecimensNode = () =>
  UniversalNodeFactory.createNode("specimens-processing");
export const createAdmissionNode = () =>
  UniversalNodeFactory.createNode("admission-processing");
export const createDentalNode = () =>
  UniversalNodeFactory.createNode("dental-processing");

// Advanced Medical Analysis (Priority 5)
export const createTumorCharacteristicsNode = () =>
  UniversalNodeFactory.createNode("tumor-characteristics-processing");
export const createTreatmentPlanNode = () =>
  UniversalNodeFactory.createNode("treatment-plan-processing");
export const createTreatmentResponseNode = () =>
  UniversalNodeFactory.createNode("treatment-response-processing");
export const createGrossFindingsNode = () =>
  UniversalNodeFactory.createNode("gross-findings-processing");
export const createSpecialStainsNode = () =>
  UniversalNodeFactory.createNode("special-stains-processing");
export const createSocialHistoryNode = () =>
  UniversalNodeFactory.createNode("social-history-processing");
export const createTreatmentsNode = () =>
  UniversalNodeFactory.createNode("treatments-processing");
export const createAssessmentNode = () =>
  UniversalNodeFactory.createNode("assessment-processing");
export const createMolecularNode = () =>
  UniversalNodeFactory.createNode("molecular-processing");

// Post-Processing Nodes (Priority 10)
export const createMedicalTermsGenerationNode = () =>
  UniversalNodeFactory.createNode("medical-terms-generation");
