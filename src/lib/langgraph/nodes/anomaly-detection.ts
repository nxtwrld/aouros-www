/**
 * Anomaly Detection Node
 *
 * Identifies abnormalities and pathological findings in medical images.
 * Focuses on detecting masses, lesions, fractures, and other anomalies.
 */

import type { MedicalImagingState } from "../state-medical-imaging";
import {
  BaseProcessingNode,
  type BaseProcessingNodeConfig,
  type ProcessingNodeResult,
} from "./_base-processing-node";

export class AnomalyDetectionNode extends BaseProcessingNode {
  constructor() {
    const config: BaseProcessingNodeConfig = {
      nodeName: "anomaly-detection",
      description:
        "Detect abnormalities and pathological findings in medical images",
      schemaImportPath: "$lib/configurations/anomaly-detection",
      progressStages: [
        {
          stage: "anomaly_detection_init",
          progress: 10,
          message: "Initializing anomaly detection",
        },
        {
          stage: "anomaly_detection_scanning",
          progress: 30,
          message: "Scanning for abnormalities",
        },
        {
          stage: "anomaly_detection_analyzing",
          progress: 60,
          message: "Analyzing detected anomalies",
        },
        {
          stage: "anomaly_detection_complete",
          progress: 90,
          message: "Completing anomaly detection",
        },
      ],
      featureDetectionTriggers: ["isMedicalImaging"],
    };
    super(config);
  }

  protected getSectionName(): string {
    return "anomalyDetection";
  }

  /**
   * Validate and enhance anomaly detection results
   */
  protected async validateAndEnhance(
    aiResult: any,
    state: MedicalImagingState,
  ): Promise<ProcessingNodeResult> {
    const processingTime = Date.now();
    const tokensUsed = state.tokenUsage?.[this.config.nodeName] || 0;

    // Validate the AI result
    const validatedData = this.validateAnomalyData(aiResult);

    // Process detected anomalies
    const detectedAnomalies = this.processAnomalies(
      validatedData.anomalies || [],
    );

    return {
      data: {
        anomalies: detectedAnomalies,
        normalFindings: validatedData.normalFindings || [],
        overallAssessment: validatedData.overallAssessment || "normal",
        urgentFindings: validatedData.urgentFindings || false,
        differentialConsiderations:
          validatedData.differentialConsiderations || [],
      },
      metadata: {
        processingTime,
        tokensUsed,
        confidence: this.calculateAnomalyConfidence(validatedData),
        provider: "enhanced-openai",
      },
    };
  }

  /**
   * Validate anomaly detection data
   */
  private validateAnomalyData(data: any): any {
    if (!data) return { anomalies: [], normalFindings: [] };

    return {
      anomalies: Array.isArray(data.anomalies) ? data.anomalies : [],
      normalFindings: Array.isArray(data.normalFindings)
        ? data.normalFindings
        : [],
      overallAssessment: data.overallAssessment || "normal",
      urgentFindings: data.urgentFindings || false,
      differentialConsiderations: Array.isArray(data.differentialConsiderations)
        ? data.differentialConsiderations
        : [],
    };
  }

  /**
   * Process and structure detected anomalies
   */
  private processAnomalies(anomalies: any[]): any[] {
    return anomalies.map((anomaly) => ({
      type: anomaly.type || "other",
      description: anomaly.description || "Unspecified anomaly",
      location: anomaly.location || "Unknown location",
      size: anomaly.size || null,
      characteristics: Array.isArray(anomaly.characteristics)
        ? anomaly.characteristics
        : [],
      severity: anomaly.severity || "mild",
      confidence: anomaly.confidence || 0.5,
      id: this.generateAnomalyId(anomaly),
    }));
  }

  /**
   * Generate a unique ID for an anomaly
   */
  private generateAnomalyId(anomaly: any): string {
    const type = anomaly.type || "unknown";
    const location = anomaly.location || "unknown";
    return `${type}_${location}_${Date.now()}`
      .toLowerCase()
      .replace(/\s+/g, "_");
  }

  /**
   * Calculate confidence for anomaly detection
   */
  private calculateAnomalyConfidence(data: any): number {
    let confidence = 0.5;

    // Higher confidence if anomalies were detected with high individual confidence
    if (data.anomalies && data.anomalies.length > 0) {
      const avgAnomalyConfidence =
        data.anomalies.reduce(
          (sum: number, a: any) => sum + (a.confidence || 0.5),
          0,
        ) / data.anomalies.length;
      confidence = avgAnomalyConfidence;
    }

    // Adjust based on normal findings
    if (data.normalFindings && data.normalFindings.length > 0) {
      confidence += 0.1;
    }

    // Adjust based on overall assessment consistency
    if (data.overallAssessment) {
      if (data.anomalies.length === 0 && data.overallAssessment === "normal") {
        confidence += 0.1;
      } else if (
        data.anomalies.length > 0 &&
        data.overallAssessment !== "normal"
      ) {
        confidence += 0.1;
      }
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Check if required fields are present
   */
  protected hasRequiredFields(data: any): boolean {
    return !!(
      data.anomalies !== undefined &&
      data.overallAssessment &&
      data.urgentFindings !== undefined
    );
  }

  /**
   * Calculate confidence for the node result
   */
  protected calculateConfidence(data: any): number {
    return this.calculateAnomalyConfidence(data);
  }
}

/**
 * Export the node function for use in the workflow
 */
export const anomalyDetectionNode = async (
  state: MedicalImagingState,
): Promise<Partial<MedicalImagingState>> => {
  const node = new AnomalyDetectionNode();
  const result = await node.process(state);

  // Map the result to the state structure
  return {
    detectedAnomalies: result.anomalyDetection?.anomalies?.map(
      (anomaly: any) => ({
        id: anomaly.id,
        type: anomaly.type,
        description: anomaly.description,
        location: anomaly.location,
        severity: anomaly.severity,
        confidence: anomaly.confidence,
        characteristics: anomaly.characteristics,
        size: anomaly.size,
      }),
    ),
    urgentFindings: result.anomalyDetection?.urgentFindings || false,
  };
};
