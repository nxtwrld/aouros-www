/**
 * Universal Processing Node Factory
 * 
 * Eliminates the need for individual node files by creating nodes dynamically
 * from configuration. All medical processing logic is handled by schemas + AI.
 */

import type { DocumentProcessingState } from "../state";
import { BaseProcessingNode, type BaseProcessingNodeConfig, type ProcessingNodeResult } from "../nodes/_base-processing-node";

export interface UniversalNodeConfig {
  nodeName: string;
  description: string;
  schemaPath: string;
  triggers: string[];
  priority: number;
  timeout?: number;
  customValidation?: (data: any, state: DocumentProcessingState) => any | Promise<any>;
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
    schemaPath: "$lib/configurations/report",
    triggers: ["hasSummary", "hasDiagnosis", "hasBodyParts", "hasPerformer", "hasRecommendations"],
    priority: 1,
  },
  "signal-processing": {
    nodeName: "signal-processing", 
    description: "Lab results and medical signals analysis (includes laboratory data)",
    schemaPath: "$lib/configurations/core.signals",
    triggers: ["hasSignals"],
    priority: 1,
  },

  // Specialized Medical Domains (Priority 2)
  "ecg-processing": {
    nodeName: "ecg-processing",
    description: "ECG analysis using schema-driven extraction",
    schemaPath: "$lib/configurations/ecg",
    triggers: ["hasECG"],
    priority: 2,
  },
  "imaging-processing": {
    nodeName: "imaging-processing",
    description: "Medical imaging analysis",
    schemaPath: "$lib/configurations/imaging",
    triggers: ["hasImaging", "hasImagingFindings"],
    priority: 2,
  },
  "prescription-processing": {
    nodeName: "prescription-processing",
    description: "Prescription and medication analysis",
    schemaPath: "$lib/configurations/prescription",
    triggers: ["hasPrescriptions", "hasMedications"],
    priority: 2,
  },
  "procedures-processing": {
    nodeName: "procedures-processing",
    description: "Medical procedures analysis",
    schemaPath: "$lib/configurations/procedures",
    triggers: ["hasProcedures"],
    priority: 3,
  },

  // Specialized Medical Domains (Priority 3)
  "anesthesia-processing": {
    nodeName: "anesthesia-processing",
    description: "Anesthesia records analysis using schema-driven extraction",
    schemaPath: "$lib/configurations/anesthesia",
    triggers: ["hasAnesthesia"],
    priority: 3,
  },
  "microscopic-processing": {
    nodeName: "microscopic-processing",
    description: "Histological and microscopic findings analysis using schema-driven extraction",
    schemaPath: "$lib/configurations/microscopic",
    triggers: ["hasMicroscopic"],
    priority: 3,
  },
  "triage-processing": {
    nodeName: "triage-processing",
    description: "Emergency department triage and acuity assessment using schema-driven extraction",
    schemaPath: "$lib/configurations/triage",
    triggers: ["hasTriage"],
    priority: 3,
  },
  "immunization-processing": {
    nodeName: "immunization-processing",
    description: "Vaccination records and immunization compliance analysis using schema-driven extraction",
    schemaPath: "$lib/configurations/immunization",
    triggers: ["hasImmunizations"],
    priority: 3,
  },

  // Hospital Workflow Domains (Priority 4)
  "specimens-processing": {
    nodeName: "specimens-processing",
    description: "Specimen collection and handling analysis using schema-driven extraction",
    schemaPath: "$lib/configurations/specimens",
    triggers: ["hasSpecimens"],
    priority: 4,
  },
  "admission-processing": {
    nodeName: "admission-processing",
    description: "Hospital admission and discharge analysis using schema-driven extraction",
    schemaPath: "$lib/configurations/admission",
    triggers: ["hasAdmission"],
    priority: 4,
  },
  "dental-processing": {
    nodeName: "dental-processing",
    description: "Dental and oral health records analysis using schema-driven extraction",
    schemaPath: "$lib/configurations/dental",
    triggers: ["hasDental", "hasOralHealth"],
    priority: 4,
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
          message: `Loading ${nodeConfig.nodeName.replace('-processing', '')} analysis schema` 
        },
        { 
          stage: `${nodeConfig.nodeName}_ai_processing`, 
          progress: 50, 
          message: `Extracting ${nodeConfig.nodeName.replace('-processing', '')} data with AI using structured schema` 
        },
        { 
          stage: `${nodeConfig.nodeName}_completion`, 
          progress: 100, 
          message: `${nodeConfig.nodeName.replace('-processing', '').charAt(0).toUpperCase() + nodeConfig.nodeName.replace('-processing', '').slice(1)} processing completed` 
        },
      ],
      featureDetectionTriggers: nodeConfig.triggers,
    };

    super(baseConfig);
    this.nodeConfig = nodeConfig;
  }

  protected getSectionName(): string {
    return this.nodeConfig.nodeName.replace('-processing', '');
  }

  /**
   * Universal validation and enhancement
   * Uses custom validation if provided, otherwise uses default
   */
  protected async validateAndEnhance(
    aiResult: any,
    state: DocumentProcessingState
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
  private applyDefaultEnhancement(aiResult: any, state: DocumentProcessingState): any {
    return {
      ...aiResult,
      documentContext: {
        documentType: state.featureDetectionResults?.documentType || `${this.getSectionName()}_record`,
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
    const structuredFields = Object.keys(data).filter(key => 
      key !== 'documentContext' && 
      typeof data[key] === 'object' && 
      data[key] !== null
    );
    confidence += Math.min(structuredFields.length * 0.1, 0.2);

    return Math.min(confidence, 1.0);
  }

  /**
   * Universal required fields check
   */
  protected hasRequiredFields(data: any): boolean {
    // At minimum, check if any trigger field is true or if we have meaningful data
    return this.nodeConfig.triggers.some(trigger => data[trigger] === true) ||
           (data && Object.keys(data).length > 1); // More than just documentContext
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
  static createNode(nodeId: string): (state: DocumentProcessingState) => Promise<Partial<DocumentProcessingState>> {
    const config = NODE_CONFIGURATIONS[nodeId];
    if (!config) {
      throw new Error(`Unknown node configuration: ${nodeId}`);
    }

    const nodeInstance = new UniversalProcessingNode(config);
    
    return async (state: DocumentProcessingState): Promise<Partial<DocumentProcessingState>> => {
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
    return Object.values(NODE_CONFIGURATIONS).filter(config => config.priority === priority);
  }

  /**
   * Get nodes by trigger
   */
  static getNodesByTrigger(trigger: string): UniversalNodeConfig[] {
    return Object.values(NODE_CONFIGURATIONS).filter(config => 
      config.triggers.includes(trigger)
    );
  }
}

/**
 * Convenience functions for creating specific nodes
 */
export const createECGNode = () => UniversalNodeFactory.createNode("ecg-processing");
export const createTriageNode = () => UniversalNodeFactory.createNode("triage-processing");
export const createDentalNode = () => UniversalNodeFactory.createNode("dental-processing");
export const createAnesthesiaNode = () => UniversalNodeFactory.createNode("anesthesia-processing");
export const createMicroscopicNode = () => UniversalNodeFactory.createNode("microscopic-processing");
export const createSpecimensNode = () => UniversalNodeFactory.createNode("specimens-processing");
export const createAdmissionNode = () => UniversalNodeFactory.createNode("admission-processing");
export const createImmunizationNode = () => UniversalNodeFactory.createNode("immunization-processing");
export const createImagingNode = () => UniversalNodeFactory.createNode("imaging-processing");
export const createPrescriptionNode = () => UniversalNodeFactory.createNode("prescription-processing");
export const createProceduresNode = () => UniversalNodeFactory.createNode("procedures-processing");
export const createMedicalAnalysisNode = () => UniversalNodeFactory.createNode("medical-analysis");
export const createSignalProcessingNode = () => UniversalNodeFactory.createNode("signal-processing");