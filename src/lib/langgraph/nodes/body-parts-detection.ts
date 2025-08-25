/**
 * Body Parts Detection Node
 *
 * Identifies specific body parts visible in medical images.
 * Uses the existing core.bodyParts.ts configuration for consistent
 * body part identification across the platform.
 */

import type { MedicalImagingState } from "../state-medical-imaging";
import {
  BaseProcessingNode,
  type BaseProcessingNodeConfig,
  type ProcessingNodeResult,
} from "./_base-processing-node";

export class BodyPartsDetectionNode extends BaseProcessingNode {
  constructor() {
    const config: BaseProcessingNodeConfig = {
      nodeName: "body-parts-detection",
      description: "Identify specific body parts visible in medical images",
      schemaImportPath: "$lib/configurations/core.bodyParts",
      progressStages: [
        {
          stage: "body_parts_detection_init",
          progress: 10,
          message: "Initializing body parts detection",
        },
        {
          stage: "body_parts_detection_scanning",
          progress: 30,
          message: "Scanning for anatomical structures",
        },
        {
          stage: "body_parts_detection_identifying",
          progress: 60,
          message: "Identifying specific body parts",
        },
        {
          stage: "body_parts_detection_complete",
          progress: 90,
          message: "Completing body parts detection",
        },
      ],
      featureDetectionTriggers: ["isMedicalImaging"],
    };
    super(config);
  }

  protected getSectionName(): string {
    return "bodyPartsDetection";
  }

  /**
   * Validate and enhance body parts detection results
   */
  protected async validateAndEnhance(
    aiResult: any,
    state: MedicalImagingState,
  ): Promise<ProcessingNodeResult> {
    const processingTime = Date.now();
    const tokensUsed = state.tokenUsage?.[this.config.nodeName] || 0;

    // Validate the AI result (expecting array format from core.bodyParts.ts)
    const validatedData = this.validateBodyPartsData(aiResult);

    // Process detected body parts
    const detectedBodyParts = this.processBodyParts(validatedData);

    return {
      data: {
        bodyParts: detectedBodyParts,
        primaryRegion: this.determinePrimaryRegion(detectedBodyParts),
        coverage: this.calculateCoverage(detectedBodyParts),
        summary: this.generateBodyPartsSummary(detectedBodyParts),
      },
      metadata: {
        processingTime,
        tokensUsed,
        confidence: this.calculateBodyPartsConfidence(detectedBodyParts),
        provider: "enhanced-openai",
      },
    };
  }

  /**
   * Validate body parts data from AI response
   */
  private validateBodyPartsData(data: any): any[] {
    if (!Array.isArray(data)) return [];

    return data.map((bodyPart) => ({
      identification: bodyPart.identification || "unknown",
      status: bodyPart.status || "",
      treatment: bodyPart.treatment || "",
      urgency: typeof bodyPart.urgency === "number" ? bodyPart.urgency : 1,
    }));
  }

  /**
   * Process and structure detected body parts
   */
  private processBodyParts(bodyPartsData: any[]): any[] {
    return bodyPartsData.map((bodyPart) => ({
      id: this.generateBodyPartId(bodyPart),
      identification: bodyPart.identification,
      status: bodyPart.status,
      treatment: bodyPart.treatment,
      urgency: bodyPart.urgency,
      confidence: this.calculateIndividualConfidence(bodyPart),
      timestamp: new Date().toISOString(),
    }));
  }

  /**
   * Generate a unique ID for a body part detection
   */
  private generateBodyPartId(bodyPart: any): string {
    const identification = (bodyPart.identification || "unknown").toLowerCase();
    return `${identification}_${Date.now()}`.replace(/[^a-z0-9_]/g, "_");
  }

  /**
   * Determine the primary anatomical region
   */
  private determinePrimaryRegion(bodyParts: any[]): string {
    if (bodyParts.length === 0) return "Unknown";

    // Count body parts by general region
    const regionCounts: Record<string, number> = {};

    bodyParts.forEach((bp) => {
      const region = this.mapToGeneralRegion(bp.identification);
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });

    // Return the most common region
    return (
      Object.entries(regionCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      "Unknown"
    );
  }

  /**
   * Map specific body part to general anatomical region
   */
  private mapToGeneralRegion(identification: string): string {
    const lower = identification.toLowerCase();

    if (
      lower.includes("head") ||
      lower.includes("brain") ||
      lower.includes("skull")
    ) {
      return "Head/Brain";
    }
    if (lower.includes("neck") || lower.includes("cervical")) {
      return "Neck";
    }
    if (
      lower.includes("chest") ||
      lower.includes("lung") ||
      lower.includes("heart") ||
      lower.includes("thorax") ||
      lower.includes("rib")
    ) {
      return "Chest";
    }
    if (
      lower.includes("abdomen") ||
      lower.includes("stomach") ||
      lower.includes("liver") ||
      lower.includes("kidney") ||
      lower.includes("intestine")
    ) {
      return "Abdomen";
    }
    if (
      lower.includes("pelvis") ||
      lower.includes("hip") ||
      lower.includes("bladder")
    ) {
      return "Pelvis";
    }
    if (
      lower.includes("spine") ||
      lower.includes("vertebra") ||
      lower.includes("lumbar") ||
      lower.includes("thoracic")
    ) {
      return "Spine";
    }
    if (
      lower.includes("arm") ||
      lower.includes("hand") ||
      lower.includes("shoulder") ||
      lower.includes("elbow") ||
      lower.includes("wrist") ||
      lower.includes("finger")
    ) {
      return "Upper Extremity";
    }
    if (
      lower.includes("leg") ||
      lower.includes("foot") ||
      lower.includes("knee") ||
      lower.includes("ankle") ||
      lower.includes("toe") ||
      lower.includes("thigh")
    ) {
      return "Lower Extremity";
    }

    return "Other";
  }

  /**
   * Calculate coverage score based on detected body parts
   */
  private calculateCoverage(bodyParts: any[]): string {
    if (bodyParts.length === 0) return "none";
    if (bodyParts.length === 1) return "single";
    if (bodyParts.length <= 3) return "limited";
    if (bodyParts.length <= 6) return "moderate";
    return "comprehensive";
  }

  /**
   * Generate a summary of detected body parts
   */
  private generateBodyPartsSummary(bodyParts: any[]): string {
    if (bodyParts.length === 0) {
      return "No specific body parts identified.";
    }

    const primaryParts = bodyParts
      .filter((bp) => bp.urgency > 1) // Filter out general statements
      .slice(0, 3)
      .map((bp) => bp.identification)
      .join(", ");

    if (primaryParts) {
      return `Primary body parts identified: ${primaryParts}${bodyParts.length > 3 ? " and others" : ""}.`;
    }

    return `${bodyParts.length} body part${bodyParts.length > 1 ? "s" : ""} identified in the image.`;
  }

  /**
   * Calculate confidence for individual body part detection
   */
  private calculateIndividualConfidence(bodyPart: any): number {
    let confidence = 0.5;

    // Higher confidence for specific identifications
    if (bodyPart.identification && bodyPart.identification !== "unknown") {
      confidence += 0.2;
    }

    // Higher confidence if status is provided
    if (bodyPart.status && bodyPart.status.length > 0) {
      confidence += 0.15;
    }

    // Higher confidence for higher urgency (indicates clear findings)
    if (bodyPart.urgency > 2) {
      confidence += 0.1;
    }

    // Higher confidence if treatment is specified
    if (bodyPart.treatment && bodyPart.treatment.length > 0) {
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate overall confidence for body parts detection
   */
  private calculateBodyPartsConfidence(bodyParts: any[]): number {
    if (bodyParts.length === 0) {
      return 0.6; // Reasonable confidence that no body parts were detected
    }

    // Average confidence of individual detections
    const avgConfidence =
      bodyParts.reduce((sum, bp) => sum + bp.confidence, 0) / bodyParts.length;

    return avgConfidence;
  }

  /**
   * Check if required fields are present
   */
  protected hasRequiredFields(data: any): boolean {
    if (!Array.isArray(data)) return true; // Empty array is valid

    return data.every(
      (bodyPart) =>
        bodyPart.identification !== undefined && bodyPart.urgency !== undefined,
    );
  }

  /**
   * Calculate confidence for the node result
   */
  protected calculateConfidence(data: any): number {
    const bodyParts = Array.isArray(data) ? data : [];
    return this.calculateBodyPartsConfidence(bodyParts);
  }
}

/**
 * Export the node function for use in the workflow
 */
export const bodyPartsDetectionNode = async (
  state: MedicalImagingState,
): Promise<Partial<MedicalImagingState>> => {
  const node = new BodyPartsDetectionNode();
  const result = await node.process(state);

  // Map the result to the state structure
  return {
    detectedBodyParts: result.bodyPartsDetection?.bodyParts?.map(
      (bodyPart: any) => ({
        id: bodyPart.id,
        identification: bodyPart.identification,
        status: bodyPart.status,
        treatment: bodyPart.treatment,
        urgency: bodyPart.urgency,
        confidence: bodyPart.confidence,
      }),
    ),
    primaryAnatomicalRegion: result.bodyPartsDetection?.primaryRegion,
  };
};
